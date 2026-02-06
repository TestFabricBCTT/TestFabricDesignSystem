import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  sendMessageToClaude,
  sendMessageWithPipeline,
  clearConversation,
  getConversationHistory,
  isClaudeCodeAvailable,
  hasPhases,
  getAgentPhases,
} from "./claude.js";
import { tools } from "../tools/index.js";

// Load environment variables
dotenv.config();

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
 * Body: { sessionId: string, agentId: string, message: string, pipeline?: boolean }
 *
 * When pipeline=true (or auto-detected for agents with phases like FA/DA),
 * the response is broken into multiple phases with progress events:
 *   { type: "phases", phases: [...] }       — list of all phases at start
 *   { type: "phase", ...PhaseProgress }     — phase status updates
 *   { type: "chunk", content: string }      — final response text chunks
 *   { type: "end" }                         — stream complete
 */
app.post("/chat/stream", async (req: Request, res: Response) => {
  try {
    const { sessionId, agentId, message, pipeline } = req.body;

    if (!sessionId || !agentId || !message) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["sessionId", "agentId", "message"],
      });
      return;
    }

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    console.log(
      `[${agentId}] Starting stream for session ${sessionId}`
    );

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: "start", agentId })}\n\n`);

    // Decide whether to use pipeline mode
    const usePipeline = pipeline === true || (pipeline !== false && hasPhases(agentId));

    // Track full response for HANDOFF detection
    let responseText = "";

    if (usePipeline) {
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

    // Auto-advance: detect HANDOFF in response and signal next agent
    const AGENT_DOWNSTREAM: Record<string, string> = {
      ba: "fa", fa: "da", da: "pa"
    };
    const nextAgent = AGENT_DOWNSTREAM[agentId];
    const hasHandoff = responseText.includes("### HANDOFF");

    const endEvent: Record<string, unknown> = { type: "end" };
    if (hasHandoff && nextAgent) {
      console.log(`[auto-advance] ${agentId} → ${nextAgent} (HANDOFF detected)`);
      endEvent.autoAdvance = { nextAgent };
    }
    res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error in /chat/stream:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
    res.end();
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
// ERROR HANDLING
// ============================================

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

export default app;
