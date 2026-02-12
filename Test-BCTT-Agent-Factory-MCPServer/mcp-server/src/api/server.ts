import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  sendMessageToClaude,
  sendMessageWithPipeline,
  sendMessageWithFastPipeline,
  clearConversation,
  resetSession,
  getConversationHistory,
  isClaudeCodeAvailable,
  hasPhases,
  hasFastPipeline,
  getAgentPhases,
} from "./claude.js";
import { tools } from "../tools/index.js";
import { listPrototypes } from "../prototype/storage.js";
import { exportPrototype } from "../prototype/index.js";
import { exportPrototypeToDisk, stopPrototypeServer } from "../prototype/export-to-disk.js";
import { getJiraClient } from "../jira/client.js";
import {
  startBugWatcher,
  stopBugWatcher,
  getBugWatcherStatus,
  updateBugStatus,
  resetBugWatcher,
  BugWatcherEvent,
} from "../jira/bug-watcher.js";
import { resetToTag } from "../git/index.js";
import {
  triggerCICDPipeline,
  getCICDStatus,
  rerunFailedSteps,
  getCICDReport,
  setCICDEventHandler,
  CICDEvent,
} from "../cicd/pipeline.js";
import {
  startDeploy,
  getDeployStatus,
  healthCheck as deployHealthCheck,
  stopService as deployStopService,
  startService as deployStartService,
  rollback as deployRollback,
  setDeployEventHandler,
  DeployEvent,
} from "../deploy/manager.js";

// Load environment variables
dotenv.config();

// Dev-plan approval gate for two-phase BDE/FDE execution
const MCP_SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
function getDataDir(...subPaths: string[]): string {
  const dir = path.join(MCP_SERVER_ROOT, 'data', ...subPaths);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const devPlanApprovals = new Map<string, { approved: boolean; comments?: string }>();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// API ROUTES
// ============================================

/**
 * Health check endpoint
 */
app.get("/health", async (_req: Request, res: Response) => {
  const claudeCodeReady = await isClaudeCodeAvailable();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasAnthropicKey: claudeCodeReady, // Now checks Claude Code CLI instead of API key
    claudeCodeAvailable: claudeCodeReady,
    hasJiraConfig: !!(
      process.env.JIRA_BASE_URL &&
      process.env.JIRA_USER_EMAIL &&
      process.env.JIRA_API_TOKEN
    ),
  });
});

/**
 * List available tools
 */
app.get("/tools", (_req: Request, res: Response) => {
  const toolList = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  }));

  res.json({
    total: toolList.length,
    tools: toolList,
  });
});

/**
 * Send message to an agent
 * POST /chat
 * Body: { sessionId: string, agentId: string, message: string }
 */
app.post("/chat", async (req: Request, res: Response) => {
  try {
    const { sessionId, agentId, message } = req.body;

    // Validate required fields
    if (!sessionId || !agentId || !message) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["sessionId", "agentId", "message"],
      });
      return;
    }

    // Auto-reset session when BA starts a new BDEV (FA already completed in this session)
    if (agentId === 'ba') {
      const faHistory = getConversationHistory(sessionId, 'fa');
      if (faHistory.length > 0) {
        console.log(`[session] New BDEV detected (FA already completed) — resetting session ${sessionId}`);
        resetSession(sessionId);
      }
    }

    console.log(`[${agentId}] Received message from session ${sessionId}`);

    // Send message to Claude
    const result = await sendMessageToClaude(sessionId, agentId, message);

    res.json({
      success: true,
      agentId,
      response: result.response,
      toolsUsed:
        result.toolsUsed.length > 0
          ? result.toolsUsed.map((t) => t.name)
          : undefined,
    });
  } catch (error) {
    console.error("Error in /chat:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for specific error types
    if (errorMessage.includes("ANTHROPIC_API_KEY")) {
      res.status(503).json({
        error: "API not configured",
        message:
          "Claude API key not configured. Set ANTHROPIC_API_KEY in .env file.",
      });
      return;
    }

    res.status(500).json({
      error: "Failed to process message",
      message: errorMessage,
    });
  }
});

/**
 * Clear conversation history
 * DELETE /chat/:sessionId/:agentId
 */
app.delete("/chat/:sessionId/:agentId", (req: Request, res: Response) => {
  const { sessionId, agentId } = req.params;

  clearConversation(sessionId, agentId);

  res.json({
    success: true,
    message: `Conversation cleared for ${agentId} in session ${sessionId}`,
  });
});

/**
 * Reset all conversations for a session
 * DELETE /chat/:sessionId
 */
app.delete("/chat/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  resetSession(sessionId);
  res.json({
    success: true,
    message: `Session ${sessionId} reset — all agent conversations cleared`,
  });
});

/**
 * Get conversation history
 * GET /chat/:sessionId/:agentId/history
 */
app.get(
  "/chat/:sessionId/:agentId/history",
  (req: Request, res: Response) => {
    const { sessionId, agentId } = req.params;

    const history = getConversationHistory(sessionId, agentId);

    res.json({
      agentId,
      sessionId,
      messages: history,
    });
  }
);

/**
 * Stream response (SSE endpoint for streaming)
 * POST /chat/stream
 * Body: { sessionId: string, agentId: string, message: string, pipeline?: boolean, fast?: boolean }
 *
 * When fast=true and agent supports it, uses single-call fast pipeline (~50% faster).
 * When pipeline=true (or auto-detected for agents with phases like FA/DA),
 * the response is broken into multiple phases with progress events:
 *   { type: "phases", phases: [...] }       — list of all phases at start
 *   { type: "phase", ...PhaseProgress }     — phase status updates
 *   { type: "chunk", content: string }      — final response text chunks
 *   { type: "end" }                         — stream complete
 */
app.post("/chat/stream", async (req: Request, res: Response) => {
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  try {
    const { sessionId, agentId, message, pipeline, fast } = req.body;

    if (!sessionId || !agentId || !message) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["sessionId", "agentId", "message"],
      });
      return;
    }

    // Auto-reset session when BA starts a new BDEV (FA already completed in this session)
    if (agentId === 'ba') {
      const faHistory = getConversationHistory(sessionId, 'fa');
      if (faHistory.length > 0) {
        console.log(`[session] New BDEV detected (FA already completed) — resetting session ${sessionId}`);
        resetSession(sessionId);
      }
    }

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Decide whether to use fast mode (single-call per agent) — DEFAULT when available
    const useFast = fast !== false && hasFastPipeline(agentId);

    console.log(
      `[${agentId}] Starting stream for session ${sessionId}${useFast ? " (FAST MODE)" : ""}`
    );

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: "start", agentId })}\n\n`);

    // Decide whether to use pipeline mode
    const usePipeline = !useFast && (pipeline === true || (pipeline !== false && hasPhases(agentId)));

    // Track full response for HANDOFF detection
    let responseText = "";

    // SSE heartbeat to keep connection alive during long operations (every 30s)
    heartbeat = setInterval(() => {
      try {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`);
        } else {
          if (heartbeat) clearInterval(heartbeat);
        }
      } catch { if (heartbeat) clearInterval(heartbeat); }
    }, 30000);

    try {
      // --- TWO-PHASE BDE/FDE: Planning → Approval → Execution ---
      if (useFast && (agentId === 'bde' || agentId === 'fde')) {
        const planKey = `${sessionId}:${agentId}`;
        const approval = devPlanApprovals.get(planKey);

        if (!approval) {
          // === PHASE 1: PLANNING ===
          console.log(`[${agentId}] Phase 1: Planning (approval gate)`);
          res.write(`data: ${JSON.stringify({
            type: "phases",
            phases: [
              { id: "planning", name: "Planeamento" },
              { id: "approval", name: "Aprovação" },
              { id: "execute", name: "Implementação" },
            ],
          })}\n\n`);

          const planningAgentId = `${agentId}_planning`;
          const planResult = await sendMessageWithFastPipeline(
            sessionId,
            planningAgentId,
            message,
            (progress) => {
              res.write(`data: ${JSON.stringify({ type: "phase", ...progress })}\n\n`);
            }
          );

          // Stream planning response as chunks
          if (planResult.response.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < planResult.response.length; i += chunkSize) {
              const chunk = planResult.response.slice(i, i + chunkSize);
              res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
            }
          }

          // Read the submitted plan file from data/dev-plans/
          const planDir = getDataDir('dev-plans');
          let planData: any = null;
          try {
            const planFiles = fs.readdirSync(planDir).filter(f => f.endsWith(`-${agentId}.json`));
            // Get the most recent plan file (by modification time)
            if (planFiles.length > 0) {
              const sorted = planFiles
                .map(f => ({ name: f, mtime: fs.statSync(path.join(planDir, f)).mtimeMs }))
                .sort((a, b) => b.mtime - a.mtime);
              planData = JSON.parse(fs.readFileSync(path.join(planDir, sorted[0].name), 'utf-8'));
            }
          } catch (err) {
            console.error(`[${agentId}] Error reading plan file:`, err);
          }

          // Emit approval-gate SSE event
          res.write(`data: ${JSON.stringify({
            type: "approval-gate",
            gateId: "dev-plan",
            agentId,
            plan: planData,
            message: "Revise o plano de desenvolvimento antes de aprovar a implementação.",
          })}\n\n`);

          // End stream — user must approve before Phase 2
          res.write(`data: ${JSON.stringify({ type: "end" })}\n\n`);
          res.end();
          if (heartbeat) clearInterval(heartbeat);
          return;
        }

        // === PHASE 2: EXECUTION (plan already approved) ===
        console.log(`[${agentId}] Phase 2: Execution (plan approved)`);
        devPlanApprovals.delete(planKey);

        // Inject approved plan context into user message
        let enrichedMessage = message;
        const planDir = getDataDir('dev-plans');
        try {
          const planFiles = fs.readdirSync(planDir).filter(f => f.endsWith(`-${agentId}.json`));
          if (planFiles.length > 0) {
            const sorted = planFiles
              .map(f => ({ name: f, mtime: fs.statSync(path.join(planDir, f)).mtimeMs }))
              .sort((a, b) => b.mtime - a.mtime);
            const plan = JSON.parse(fs.readFileSync(path.join(planDir, sorted[0].name), 'utf-8'));
            if (plan.status === 'approved') {
              enrichedMessage = `${message}\n\nPLANO APROVADO:\n${JSON.stringify(plan.plan, null, 2)}\n\nIMPLEMENTA exactamente este plano aprovado.${plan.approval_comments ? `\n\nCOMENTÁRIOS DO UTILIZADOR:\n${plan.approval_comments}` : ''}`;
            }
          }
        } catch (err) {
          console.error(`[${agentId}] Error reading approved plan:`, err);
        }

        res.write(`data: ${JSON.stringify({
          type: "phases",
          phases: [
            { id: "planning", name: "Planeamento" },
            { id: "approval", name: "Aprovação" },
            { id: "execute", name: "Implementação" },
          ],
        })}\n\n`);

        // Mark planning and approval as completed
        res.write(`data: ${JSON.stringify({ type: "phase", phaseId: "planning", status: "completed" })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "phase", phaseId: "approval", status: "completed" })}\n\n`);

        const result = await sendMessageWithFastPipeline(
          sessionId,
          agentId,
          enrichedMessage,
          (progress) => {
            res.write(`data: ${JSON.stringify({ type: "phase", ...progress })}\n\n`);
          }
        );

        responseText = result.response;

        if (responseText.length > 0) {
          const chunkSize = 500;
          for (let i = 0; i < responseText.length; i += chunkSize) {
            const chunk = responseText.slice(i, i + chunkSize);
            res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
          }
        }
      } else if (useFast) {
      // --- FAST MODE (single call per agent) ---
      res.write(`data: ${JSON.stringify({
        type: "phases",
        phases: [{ id: "execute", name: "Execução completa (modo rápido)" }],
      })}\n\n`);

      const result = await sendMessageWithFastPipeline(
        sessionId,
        agentId,
        message,
        (progress) => {
          res.write(`data: ${JSON.stringify({ type: "phase", ...progress })}\n\n`);
        }
      );

      responseText = result.response;

      // Stream response to client as chunks (fast mode needs this — webapp builds content from chunk events)
      if (responseText.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < responseText.length; i += chunkSize) {
          const chunk = responseText.slice(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        }
      }
    } else if (usePipeline) {
      // --- PIPELINE MODE ---
      const phases = getAgentPhases(agentId);
      if (phases) {
        // Send phase list so frontend can show progress
        res.write(`data: ${JSON.stringify({
          type: "phases",
          phases: phases.map((p) => ({ id: p.id, name: p.name })),
        })}\n\n`);
      }

      const result = await sendMessageWithPipeline(
        sessionId,
        agentId,
        message,
        (progress) => {
          // Emit phase progress as SSE event
          res.write(`data: ${JSON.stringify({ type: "phase", ...progress })}\n\n`);
        }
      );

      responseText = result.response;

      // Stream the final response in chunks
      const chunkSize = 50;
      for (let i = 0; i < result.response.length; i += chunkSize) {
        const chunk = result.response.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } else {
      // --- STANDARD MODE (single call) ---
      const result = await sendMessageToClaude(sessionId, agentId, message);

      responseText = result.response;

      // Send tool events if any
      for (const tool of result.toolsUsed) {
        res.write(
          `data: ${JSON.stringify({ type: "tool", name: tool.name })}\n\n`
        );
      }

      // Stream response in chunks
      const chunkSize = 50;
      for (let i = 0; i < result.response.length; i += chunkSize) {
        const chunk = result.response.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    // Auto-advance: signal next agent transition
    const AGENT_DOWNSTREAM: Record<string, string> = {
      // Phase 1
      ba: "fa", fa: "da", da: "dsla", dsla: "pa",
      // Phase 2 (sequential parts — parallel FDE+BDE handled by workflow endpoints)
      fbs: "ute", bbs: "ute",
    };
    const nextAgent = AGENT_DOWNSTREAM[agentId];

    const shouldAutoAdvance = nextAgent && (
      useFast || usePipeline || responseText.includes("### HANDOFF")
    );

    const endEvent: Record<string, unknown> = { type: "end" };
    if (shouldAutoAdvance) {
      // Clear ALL downstream conversations to ensure fresh handoff
      let downstream: string | undefined = nextAgent;
      while (downstream) {
        clearConversation(sessionId, downstream);
        downstream = AGENT_DOWNSTREAM[downstream];
      }
      const reason = (useFast || usePipeline) ? "pipeline completed" : "HANDOFF detected";
      console.log(`[auto-advance] ${agentId} → ${nextAgent} (${reason})`);
      endEvent.autoAdvance = { nextAgent };
    }
    res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
    res.end();
    } finally {
      clearInterval(heartbeat);
    }
  } catch (error) {
    if (heartbeat) clearInterval(heartbeat);
    console.error("Error in /chat/stream:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
        res.end();
      }
    } catch {
      // Connection already closed
    }
  }
});

// ============================================
// AGENT-SPECIFIC ENDPOINTS
// ============================================

/**
 * Advance from BA to FA (human approval checkpoint)
 * POST /workflow/advance-to-fa
 * Body: { sessionId: string, requirements: object }
 */
app.post("/workflow/advance-to-fa", (req: Request, res: Response) => {
  const { sessionId, requirements } = req.body;

  if (!sessionId || !requirements) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["sessionId", "requirements"],
    });
    return;
  }

  // Store requirements for FA to pick up
  // In a real implementation, this would persist to a database
  console.log(
    `[workflow] Advancing session ${sessionId} from BA to FA with requirements`
  );

  res.json({
    success: true,
    message: "Ready to proceed to FA. Use the FA agent with this session.",
    sessionId,
    nextAgent: "fa",
  });
});

/**
 * Approve FA output and create in Jira
 * POST /workflow/create-jira
 * Body: { sessionId: string }
 */
app.post("/workflow/create-jira", async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({
      error: "Missing sessionId",
    });
    return;
  }

  console.log(
    `[workflow] Creating Jira items for session ${sessionId}`
  );

  // The actual Jira creation is handled by the FA agent tools
  // This endpoint just logs the approval

  res.json({
    success: true,
    message:
      "Jira creation approved. Send a message to the FA agent to trigger creation.",
    sessionId,
  });
});

// ============================================
// WEBSOCKET SERVER FOR FIGMA PLUGIN
// ============================================

// Create HTTP server from Express app
const httpServer = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: "/figma" });

// Store connected Figma plugins
const figmaClients = new Map<string, WebSocket>();

wss.on("connection", (ws: WebSocket) => {
  let clientId = `figma-${Date.now()}`;
  console.log(`[WebSocket] Figma plugin connected: ${clientId}`);

  ws.on("message", (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[WebSocket] Received from ${clientId}:`, message.type);

      switch (message.type) {
        case "register":
          clientId = `figma-${message.client}-${Date.now()}`;
          figmaClients.set(clientId, ws);
          ws.send(JSON.stringify({ type: "registered", clientId }));
          console.log(`[WebSocket] Client registered: ${clientId}`);
          break;

        case "result":
        case "error":
          // Log results from Figma operations
          console.log(`[WebSocket] Figma result:`, message);
          break;
      }
    } catch (err) {
      console.error("[WebSocket] Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    figmaClients.delete(clientId);
    console.log(`[WebSocket] Figma plugin disconnected: ${clientId}`);
  });

  ws.on("error", (err) => {
    console.error(`[WebSocket] Error from ${clientId}:`, err);
  });
});

// Function to send commands to Figma plugin
export function sendToFigma(command: {
  type: string;
  [key: string]: unknown;
}): boolean {
  if (figmaClients.size === 0) {
    console.warn("[WebSocket] No Figma clients connected");
    return false;
  }

  const message = JSON.stringify(command);
  let sent = false;

  figmaClients.forEach((client, id) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      console.log(`[WebSocket] Sent command to ${id}:`, command.type);
      sent = true;
    }
  });

  return sent;
}

// API endpoint to send commands to Figma
app.post("/figma/command", (req: Request, res: Response) => {
  const command = req.body;

  if (!command || !command.type) {
    res.status(400).json({ error: "Command must have a type" });
    return;
  }

  const sent = sendToFigma(command);

  if (sent) {
    res.json({ success: true, message: "Command sent to Figma plugin" });
  } else {
    res.status(503).json({
      error: "No Figma plugin connected",
      message: "Please open the BCTT Bridge plugin in Figma and connect",
    });
  }
});

// Get connected Figma clients
app.get("/figma/clients", (_req: Request, res: Response) => {
  const clients = Array.from(figmaClients.keys());
  res.json({
    connected: clients.length,
    clients,
  });
});

// ============================================
// PROTOTYPE ENDPOINTS
// ============================================

/**
 * List prototypes
 * GET /api/prototypes?bdevCode=BDEV00000007
 */
app.get("/api/prototypes", (_req: Request, res: Response) => {
  try {
    const bdevCode = _req.query.bdevCode as string | undefined;
    const prototypes = listPrototypes(bdevCode);

    res.json({
      success: true,
      total: prototypes.length,
      prototypes,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to list prototypes", message: msg });
  }
});

/**
 * Export prototype (in-memory)
 * GET /api/prototypes/:bdevCode/export?version=2
 */
app.get("/api/prototypes/:bdevCode/export", (req: Request, res: Response) => {
  try {
    const { bdevCode } = req.params;
    const version = req.query.version ? parseInt(req.query.version as string) : undefined;

    const result = exportPrototype(bdevCode, version);
    if (!result) {
      res.status(404).json({ error: `No prototype found for ${bdevCode}` });
      return;
    }

    res.json({
      success: true,
      files: {
        screens: result.screens,
        app: result.app,
        translations: result.translations,
      },
      readme: result.readme,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to export prototype", message: msg });
  }
});

/**
 * Export prototype to disk (standalone Vite+React project)
 * POST /api/prototypes/:bdevCode/export-to-disk
 * Body: { version?: number }
 */
app.post("/api/prototypes/:bdevCode/export-to-disk", (req: Request, res: Response) => {
  try {
    const { bdevCode } = req.params;
    const { version } = req.body || {};

    const result = exportPrototypeToDisk(bdevCode, version);

    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to export prototype to disk", message: msg });
  }
});

// ============================================
// PHASE 2 WORKFLOW ENDPOINTS
// ============================================

/**
 * Gate 1: Approve architecture (TAA → FDE+BDE)
 * POST /workflow/approve-architecture
 * Body: { sessionId: string, bdevCode: string }
 */
app.post("/workflow/approve-architecture", async (req: Request, res: Response) => {
  const { sessionId, bdevCode } = req.body;
  if (!sessionId || !bdevCode) {
    res.status(400).json({ error: "Missing sessionId or bdevCode" });
    return;
  }
  console.log(`[workflow] Gate 1 approved: TAA → FDE+BDE for ${bdevCode}`);
  // Clear FDE and BDE conversations for fresh start
  clearConversation(sessionId, "fde");
  clearConversation(sessionId, "bde");
  res.json({
    success: true,
    message: "Architecture approved. FDE and BDE ready for parallel execution.",
    nextAgents: ["fde", "bde"],
  });
});

/**
 * Approve dev plan (Planning → Execution for BDE/FDE)
 * POST /workflow/approve-dev-plan
 * Body: { sessionId: string, agentId: string, bdevCode?: string, approved: boolean, comments?: string }
 */
app.post("/workflow/approve-dev-plan", async (req: Request, res: Response) => {
  const { sessionId, agentId, bdevCode, approved, comments } = req.body;
  if (!sessionId || !agentId) {
    res.status(400).json({ error: "Missing sessionId or agentId" });
    return;
  }

  const planKey = `${sessionId}:${agentId}`;
  devPlanApprovals.set(planKey, { approved, comments });

  // Update plan file status
  const planDir = getDataDir('dev-plans');
  try {
    const planFiles = fs.readdirSync(planDir).filter(f => f.endsWith(`-${agentId}.json`));
    if (planFiles.length > 0) {
      const sorted = planFiles
        .map(f => ({ name: f, mtime: fs.statSync(path.join(planDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      const planFile = path.join(planDir, sorted[0].name);
      const plan = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
      plan.status = approved ? 'approved' : 'rejected';
      plan.approval_comments = comments;
      plan.approved_at = new Date().toISOString();
      fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
    }
  } catch (err) {
    console.error(`[workflow] Error updating plan file:`, err);
  }

  console.log(`[workflow] Dev plan ${approved ? 'APPROVED' : 'REJECTED'} for ${agentId} (${sessionId})`);
  res.json({
    success: true,
    message: approved ? "Plan approved. Agent ready for execution." : "Plan rejected.",
    nextAgent: approved ? agentId : null,
  });
});

/**
 * Gate 2: Approve development (Review → CI/CD)
 * POST /workflow/approve-development
 * Body: { sessionId: string, bdevCode: string }
 */
app.post("/workflow/approve-development", async (req: Request, res: Response) => {
  const { sessionId, bdevCode } = req.body;
  if (!sessionId || !bdevCode) {
    res.status(400).json({ error: "Missing sessionId or bdevCode" });
    return;
  }
  console.log(`[workflow] Gate 2 approved: Development review passed for ${bdevCode}`);

  // Auto-trigger CI/CD pipeline
  const branch = req.body.branch || `feature/${bdevCode}-mvp1`;
  const mvp = req.body.mvp || 'MVP1';
  try {
    const pipeline = await triggerCICDPipeline(bdevCode, mvp, branch);
    res.json({
      success: true,
      message: "Development approved. CI/CD pipeline triggered.",
      nextStep: "cicd",
      pipelineId: pipeline.id,
    });
  } catch (err: any) {
    res.json({
      success: true,
      message: `Development approved. CI/CD trigger failed: ${err.message}`,
      nextStep: "cicd",
    });
  }
});

/**
 * Gate 3: Approve merge (Merge → Deploy)
 * POST /workflow/approve-merge
 * Body: { sessionId: string, bdevCode: string }
 */
app.post("/workflow/approve-merge", async (req: Request, res: Response) => {
  const { sessionId, bdevCode } = req.body;
  if (!sessionId || !bdevCode) {
    res.status(400).json({ error: "Missing sessionId or bdevCode" });
    return;
  }
  console.log(`[workflow] Gate 3 approved: Merge for ${bdevCode}`);

  // Auto-trigger deploy
  const branch = req.body.branch || `feature/${bdevCode}-mvp1`;
  const mvp = req.body.mvp || 'MVP1';
  try {
    const deployStatus = await startDeploy(bdevCode, mvp, branch);
    res.json({
      success: true,
      message: "Merge approved. Deploy started.",
      nextStep: "deploy",
      deployStatus: deployStatus.status,
    });
  } catch (err: any) {
    res.json({
      success: true,
      message: `Merge approved. Deploy trigger failed: ${err.message}`,
      nextStep: "deploy",
    });
  }
});

/**
 * Gate MVP: Advance to next MVP
 * POST /workflow/advance-mvp
 * Body: { sessionId: string, bdevCode: string, currentMvp: string }
 */
app.post("/workflow/advance-mvp", (req: Request, res: Response) => {
  const { sessionId, bdevCode, currentMvp } = req.body;
  if (!sessionId || !bdevCode) {
    res.status(400).json({ error: "Missing sessionId or bdevCode" });
    return;
  }
  const nextMvp = currentMvp === "MVP1" ? "MVP2" : currentMvp === "MVP2" ? "MVP3" : null;
  console.log(`[workflow] MVP advance: ${currentMvp} → ${nextMvp} for ${bdevCode}`);
  // Reset Phase 2 agent conversations for new MVP
  for (const aid of ["taa", "fde", "bde", "ute", "fbs", "bbs"]) {
    clearConversation(sessionId, aid);
  }
  res.json({
    success: true,
    message: nextMvp ? `Advancing to ${nextMvp}` : "All MVPs completed",
    nextMvp,
    nextAgent: nextMvp ? "taa" : null,
  });
});

/**
 * List BDEVs available for Phase 2 (status "Ready for Development")
 * GET /jira/bdevs-available
 */
app.get("/jira/bdevs-available", async (_req: Request, res: Response) => {
  try {
    const jira = getJiraClient();
    const jql = `project = ${process.env.JIRA_PROJECT_KEY || 'BCTT'} AND issuetype = Epic AND labels = "bdev" AND status = "Ready for Development" ORDER BY created DESC`;
    const result = await jira.searchIssues(jql, 50);
    const bdevs = (result.issues || []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields?.summary || '',
      status: issue.fields?.status?.name || 'Unknown',
      created: issue.fields?.created,
    }));
    res.json({ success: true, bdevs, total: bdevs.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to fetch BDEVs", message: msg });
  }
});

// ============================================
// BUG WATCHER ENDPOINTS
// ============================================

// SSE clients for bug-watcher events
const bugWatcherClients: Set<Response> = new Set();

/**
 * Bug Watcher SSE Stream
 * GET /bug-watcher/events
 */
app.get("/bug-watcher/events", (_req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  bugWatcherClients.add(res);
  _req.on("close", () => { bugWatcherClients.delete(res); });
});

function broadcastBugEvent(event: BugWatcherEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of bugWatcherClients) {
    try { client.write(data); } catch { bugWatcherClients.delete(client); }
  }
}

/**
 * Get bug watcher status
 * GET /bug-watcher/status
 */
app.get("/bug-watcher/status", (_req: Request, res: Response) => {
  res.json(getBugWatcherStatus());
});

/**
 * Start bug watcher
 * POST /bug-watcher/start
 * Body: { intervalMs?: number }
 */
app.post("/bug-watcher/start", (req: Request, res: Response) => {
  const { intervalMs } = req.body || {};
  startBugWatcher({
    intervalMs,
    onEvent: broadcastBugEvent,
  });
  res.json({ success: true, message: "Bug watcher started", ...getBugWatcherStatus() });
});

/**
 * Stop bug watcher
 * POST /bug-watcher/stop
 */
app.post("/bug-watcher/stop", (_req: Request, res: Response) => {
  stopBugWatcher();
  res.json({ success: true, message: "Bug watcher stopped" });
});

/**
 * Reset bug watcher (stop + clear history)
 * POST /bug-watcher/reset
 */
app.post("/bug-watcher/reset", (_req: Request, res: Response) => {
  resetBugWatcher();
  res.json({ success: true, message: "Bug watcher reset" });
});

/**
 * Reset entire bug environment: git reset WithErrors + Jira bugs → "To Do"
 * POST /bug-watcher/reset-environment
 */
app.post("/bug-watcher/reset-environment", async (_req: Request, res: Response) => {
  const results: Array<{ step: string; success: boolean; detail: string }> = [];

  // Step 1: Stop bug watcher
  try {
    stopBugWatcher();
    results.push({ step: "stop_bug_watcher", success: true, detail: "Bug watcher parado" });
  } catch (err) {
    results.push({ step: "stop_bug_watcher", success: false, detail: String(err) });
  }

  // Step 2: Git reset WithErrors to initial-bugs tag
  try {
    const gitResult = await resetToTag('digitalChannelsWithErrors', 'initial-bugs');
    results.push({ step: "git_reset", success: true, detail: gitResult });
  } catch (err) {
    results.push({ step: "git_reset", success: false, detail: String(err) });
  }

  // Step 3: Transition all 6 bugs back to "To Do" in Jira
  const bugKeys = ['BCTT-368', 'BCTT-369', 'BCTT-370', 'BCTT-371', 'BCTT-372', 'BCTT-373'];
  const jira = getJiraClient();

  for (const bugKey of bugKeys) {
    try {
      const result = await jira.transitionIssue(bugKey, 'To Do');
      results.push({ step: `jira_reset_${bugKey}`, success: true, detail: `${result.from} → ${result.to}` });
    } catch (err) {
      results.push({ step: `jira_reset_${bugKey}`, success: false, detail: String(err) });
    }
  }

  // Step 4: Reset bug watcher state (clear processedBugs)
  try {
    resetBugWatcher();
    results.push({ step: "reset_watcher_state", success: true, detail: "processedBugs limpo" });
  } catch (err) {
    results.push({ step: "reset_watcher_state", success: false, detail: String(err) });
  }

  const allSuccess = results.every(r => r.success);
  res.json({
    success: allSuccess,
    steps: results,
    message: allSuccess
      ? "Ambiente de bugs reposto ao estado inicial."
      : `Reset parcial: ${results.filter(r => r.success).length}/${results.length} passos OK.`,
  });
});

/**
 * Update bug status (used by FBS/BBS agents after fixing)
 * POST /bug-watcher/update-status
 * Body: { issueKey: string, status: string }
 */
app.post("/bug-watcher/update-status", (req: Request, res: Response) => {
  const { issueKey, status } = req.body;
  if (!issueKey || !status) {
    res.status(400).json({ error: "Missing issueKey or status" });
    return;
  }
  updateBugStatus(issueKey, status);
  res.json({ success: true, message: `${issueKey} → ${status}` });
});

// ============================================
// ERROR HANDLING
// ============================================

// ============================================
// CI/CD PIPELINE ENDPOINTS
// ============================================

const cicdClients: Set<Response> = new Set();

app.get("/cicd/events", (_req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  cicdClients.add(res);
  _req.on("close", () => { cicdClients.delete(res); });
});

function broadcastCICDEvent(event: CICDEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of cicdClients) {
    try { client.write(data); } catch { cicdClients.delete(client); }
  }
}

// Wire CI/CD events to SSE
setCICDEventHandler(broadcastCICDEvent);

app.get("/cicd/status", (_req: Request, res: Response) => {
  const status = getCICDStatus();
  res.json(status || { status: "idle" });
});

app.post("/cicd/trigger", async (req: Request, res: Response) => {
  const { bdev, mvp, branch } = req.body;
  if (!bdev || !mvp || !branch) {
    res.status(400).json({ error: "Missing bdev, mvp, or branch" });
    return;
  }
  try {
    const pipeline = await triggerCICDPipeline(bdev, mvp, branch);
    res.json({ success: true, pipelineId: pipeline.id, status: pipeline.status });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

app.post("/cicd/rerun-failed", async (_req: Request, res: Response) => {
  try {
    const pipeline = await rerunFailedSteps();
    if (!pipeline) {
      res.status(404).json({ error: "No pipeline to rerun" });
      return;
    }
    res.json({ success: true, status: pipeline.status });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

app.get("/cicd/report", (_req: Request, res: Response) => {
  const report = getCICDReport();
  res.json(report || { error: "No report available" });
});

// ============================================
// DEPLOY ENDPOINTS
// ============================================

const deployClients: Set<Response> = new Set();

app.get("/deploy/events", (_req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  deployClients.add(res);
  _req.on("close", () => { deployClients.delete(res); });
});

function broadcastDeployEvent(event: DeployEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of deployClients) {
    try { client.write(data); } catch { deployClients.delete(client); }
  }
}

// Wire deploy events to SSE
setDeployEventHandler(broadcastDeployEvent);

app.get("/deploy/status", (_req: Request, res: Response) => {
  res.json(getDeployStatus());
});

app.post("/deploy/start", async (req: Request, res: Response) => {
  const { bdev, mvp, branch } = req.body;
  if (!bdev || !mvp || !branch) {
    res.status(400).json({ error: "Missing bdev, mvp, or branch" });
    return;
  }
  try {
    const status = await startDeploy(bdev, mvp, branch);
    res.json({ success: true, status: status.status });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

app.post("/deploy/stop-service", async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "Missing service name" }); return; }
  try {
    await deployStopService(name);
    res.json({ success: true, message: `Service ${name} stopped` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/deploy/start-service", async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "Missing service name" }); return; }
  try {
    await deployStartService(name);
    res.json({ success: true, message: `Service ${name} started` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/deploy/health", async (_req: Request, res: Response) => {
  try {
    const results = await deployHealthCheck();
    res.json({ services: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/deploy/rollback", async (req: Request, res: Response) => {
  const { bdev } = req.body;
  if (!bdev) { res.status(400).json({ error: "Missing bdev" }); return; }
  try {
    await deployRollback(bdev);
    res.json({ success: true, message: `Rollback complete for ${bdev}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================
// START SERVER
// ============================================

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       Agent Factory API Server                               ║
╠══════════════════════════════════════════════════════════════╣
║  Status: Running                                             ║
║  Port: ${String(PORT).padEnd(54, " ")}║
║  Endpoints:                                                  ║
║    GET  /health              - Health check                  ║
║    GET  /tools               - List available tools          ║
║    POST /chat                - Send message to agent         ║
║    POST /chat/stream         - Stream response (SSE)         ║
║    DEL  /chat/:sid/:aid      - Clear conversation            ║
║    GET  /chat/:sid/:aid/history - Get history                ║
║    POST /workflow/advance-to-fa - Approve BA → FA            ║
║    POST /workflow/create-jira   - Approve Jira creation      ║
║  Prototypes:                                                   ║
║    GET  /api/prototypes         - List prototypes              ║
║    GET  /api/prototypes/:b/export - Export prototype            ║
║    POST /api/prototypes/:b/export-to-disk - Export to disk     ║
║  Bug Watcher:                                                ║
║    GET  /bug-watcher/status  - Bug watcher status            ║
║    POST /bug-watcher/start   - Start polling                 ║
║    POST /bug-watcher/stop    - Stop polling                  ║
║    POST /bug-watcher/reset   - Reset watcher state           ║
║    POST /bug-watcher/reset-environment - Full env reset      ║
║  CI/CD Pipeline:                                             ║
║    GET  /cicd/status         - Pipeline status               ║
║    POST /cicd/trigger        - Trigger CI/CD pipeline        ║
║    POST /cicd/rerun-failed   - Rerun failed steps            ║
║    GET  /cicd/report         - Full pipeline report           ║
║    GET  /cicd/events         - SSE stream                    ║
║  Deploy:                                                     ║
║    GET  /deploy/status       - Deploy status                 ║
║    POST /deploy/start        - Start deploy                  ║
║    POST /deploy/stop-service - Stop a specific service       ║
║    POST /deploy/start-service- Start a specific service      ║
║    GET  /deploy/health       - Health check all services     ║
║    POST /deploy/rollback     - Rollback last deploy          ║
║    GET  /deploy/events       - SSE stream                    ║
║  Figma Integration:                                          ║
║    WS   /figma               - WebSocket for Figma plugin    ║
║    POST /figma/command       - Send command to Figma         ║
║    GET  /figma/clients       - List connected plugins        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Check configuration
  isClaudeCodeAvailable().then((available) => {
    if (available) {
      console.log("✅ Claude Code CLI detected. Using Max plan for LLM calls.");
    } else {
      console.warn(
        "⚠️  Warning: Claude Code CLI not found. Set CLAUDE_CLI_PATH in .env or install Claude Code."
      );
    }
  });
  if (
    !process.env.JIRA_BASE_URL ||
    !process.env.JIRA_USER_EMAIL ||
    !process.env.JIRA_API_TOKEN
  ) {
    console.warn(
      "⚠️  Warning: Jira configuration incomplete. Jira integration will not work."
    );
  }
});

// Cleanup on shutdown
process.on('SIGINT', () => { stopPrototypeServer(); stopBugWatcher(); process.exit(0); });
process.on('SIGTERM', () => { stopPrototypeServer(); stopBugWatcher(); process.exit(0); });

export default app;
