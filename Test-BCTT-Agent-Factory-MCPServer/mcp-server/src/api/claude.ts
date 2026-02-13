import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { getPrompt } from "../prompts/index.js";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

// ============================================
// CLAUDE CODE CLI INTEGRATION
// Uses Claude Code (included in Max plan) instead of Anthropic API
// ============================================

// Types for conversation management
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentConversation {
  agentId: string;
  messages: ConversationMessage[];
  systemPrompt: string;
  claudeSessionId: string;
}

// Map to store active conversations by session
const conversations = new Map<string, AgentConversation>();

// ============================================
// CROSS-AGENT HANDOFF
// ============================================

const AGENT_UPSTREAM: Record<string, string[]> = {
  // Phase 1
  fa: ["ba"],
  da: ["fa"],
  pa: ["da"],
  dsla: ["da", "pa"],
  // Phase 2
  fde: ["taa"],
  fde_planning: ["taa"],
  bde: ["taa"],
  bde_planning: ["taa"],
  ute: ["fde", "bde"],
  fbs: ["ute"],
  bbs: ["ute"],
};

const HANDOFF_FALLBACK_CHARS = 8000;
const HANDOFF_MAX_RETRIES = 1; // At least 1 retry when HANDOFF block not found

/**
 * Extrai o bloco ### HANDOFF de uma lista de mensagens.
 * Procura nas últimas 3 mensagens assistant.
 * Retorna null se não encontrar.
 */
function findHandoffBlock(
  messages: ConversationMessage[]
): string | null {
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  if (assistantMsgs.length === 0) return null;

  // Flexible regex: accepts ## HANDOFF, ### HANDOFF, ### HANDOFF:, ### Handoff, etc.
  const handoffRegex = /^#{2,3}\s*HANDOFF\s*:?\s*$/im;

  for (
    let i = assistantMsgs.length - 1;
    i >= Math.max(0, assistantMsgs.length - 3);
    i--
  ) {
    const content = assistantMsgs[i].content;
    const match = handoffRegex.exec(content);
    if (match) {
      let handoff = content.substring(match.index);
      // Cut at next section heading (## or ###)
      const nextSection = handoff.match(/\n#{2,3}\s+(?!HANDOFF)/);
      if (nextSection && nextSection.index && nextSection.index > 0) {
        handoff = handoff.substring(0, nextSection.index);
      }
      return handoff.trim();
    }
  }
  return null;
}

/**
 * Fallback: extrai os últimos N chars da última mensagem assistant.
 */
function extractFallback(
  messages: ConversationMessage[]
): string | null {
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  if (assistantMsgs.length === 0) return null;

  const lastMsg = assistantMsgs[assistantMsgs.length - 1].content;
  const isTruncated = lastMsg.length > HANDOFF_FALLBACK_CHARS;
  const truncated = isTruncated
    ? lastMsg.slice(-HANDOFF_FALLBACK_CHARS)
    : lastMsg;

  // Explicit truncation marker so downstream agents (DSLA) can detect incomplete context
  const marker = isTruncated
    ? `[AVISO: Handoff TRUNCADO — output do agente excedeu ${HANDOFF_FALLBACK_CHARS} chars. Informação pode estar incompleta. Extrai o máximo possível.]\n\n`
    : "[Resumo automático - sem bloco HANDOFF estruturado]\n\n";
  return marker + truncated;
}

/**
 * Pede explicitamente ao agente upstream para produzir o bloco HANDOFF.
 * Envia uma mensagem na conversa existente e espera pela resposta.
 */
async function requestHandoffFromAgent(
  sessionId: string,
  agentId: string
): Promise<string | null> {
  console.log(`[handoff] Requesting HANDOFF block from ${agentId}...`);
  try {
    const result = await sendMessageToClaude(
      sessionId,
      agentId,
      "Produz agora o bloco ### HANDOFF conforme as regras do teu prompt. " +
        "Inclui TODOS os deliverables do trabalho que fizeste nesta sessão. " +
        'Formato obrigatório: começar com "### HANDOFF" seguido dos campos estruturados.'
    );
    // Use same flexible regex as findHandoffBlock
    const handoffRegex = /^#{2,3}\s*HANDOFF\s*:?\s*$/im;
    const match = handoffRegex.exec(result.response);
    if (match) {
      let handoff = result.response.substring(match.index);
      const nextSection = handoff.match(/\n#{2,3}\s+(?!HANDOFF)/);
      if (nextSection && nextSection.index && nextSection.index > 0) {
        handoff = handoff.substring(0, nextSection.index);
      }
      console.log(
        `[handoff] ${agentId} produced HANDOFF block (${handoff.length} chars)`
      );
      return handoff.trim();
    }
    return null;
  } catch (error) {
    console.error(
      `[handoff] Failed to request HANDOFF from ${agentId}:`,
      error
    );
    return null;
  }
}

/**
 * Obtém o handoff consolidado dos agentes upstream.
 * Estratégia com retries:
 *   1. Procurar bloco ### HANDOFF na conversa existente
 *   2. Se não encontrar, pedir ao agente para o produzir (até 2x)
 *   3. Se falhar tudo, fallback aos últimos 4000 chars
 */
async function getUpstreamHandoff(
  sessionId: string,
  agentId: string
): Promise<string | null> {
  const upstreamIds = AGENT_UPSTREAM[agentId];
  if (!upstreamIds || upstreamIds.length === 0) return null;

  const parts: string[] = [];

  for (const upId of upstreamIds) {
    const conv = conversations.get(`${sessionId}:${upId}`);
    if (!conv || conv.messages.length === 0) continue;

    // 1. Tentar encontrar bloco HANDOFF existente
    let handoff = findHandoffBlock(conv.messages);
    let quality: 'STRUCTURED' | 'RETRY' | 'FALLBACK' | 'TRUNCATED' = 'STRUCTURED';

    // 2. Se não encontrar, pedir ao agente (retries)
    if (!handoff) {
      console.log(
        `[handoff] No HANDOFF block found in ${upId} conversation, requesting...`
      );
      for (let retry = 0; retry < HANDOFF_MAX_RETRIES && !handoff; retry++) {
        console.log(
          `[handoff] Retry ${retry + 1}/${HANDOFF_MAX_RETRIES} for ${upId}`
        );
        handoff = await requestHandoffFromAgent(sessionId, upId);
        if (handoff) quality = 'RETRY';
      }
    }

    // 3. Fallback se tudo falhar
    if (!handoff) {
      const lastMsg = conv.messages.filter(m => m.role === 'assistant').pop();
      const isTruncated = lastMsg && lastMsg.content.length > HANDOFF_FALLBACK_CHARS;
      quality = isTruncated ? 'TRUNCATED' : 'FALLBACK';
      console.log(
        `[handoff] All retries failed for ${upId}, using fallback (${HANDOFF_FALLBACK_CHARS} chars, ${quality})`
      );
      handoff = extractFallback(conv.messages);
    }

    if (handoff) {
      console.log(`[handoff] ${upId} → ${agentId}: quality=${quality}, ${handoff.length} chars`);
      parts.push(`## Entrega do ${upId.toUpperCase()}\n${handoff}`);
    }
  }

  if (parts.length === 0) return null;

  const result = parts.join("\n\n---\n\n");
  console.log(
    `[handoff] ${agentId} ← [${upstreamIds.join(",")}]: ${result.length} chars`
  );
  return result;
}

// ============================================
// CLAUDE CODE CLI DETECTION
// ============================================

let cachedCLIPath: string | null = null;

function getClaudeCLIPath(): string {
  if (cachedCLIPath) return cachedCLIPath;

  // 1. Check env var
  if (process.env.CLAUDE_CLI_PATH) {
    cachedCLIPath = process.env.CLAUDE_CLI_PATH;
    return cachedCLIPath;
  }

  // 2. Try to find in VS Code extensions
  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const extensionsDir = path.join(homeDir, ".vscode", "extensions");

  try {
    const entries = fs.readdirSync(extensionsDir);
    const claudeExts = entries
      .filter((e) => e.startsWith("anthropic.claude-code-"))
      .sort()
      .reverse(); // Latest version first

    for (const ext of claudeExts) {
      const binaryName =
        process.platform === "win32" ? "claude.exe" : "claude";
      const binaryPath = path.join(
        extensionsDir,
        ext,
        "resources",
        "native-binary",
        binaryName
      );
      if (fs.existsSync(binaryPath)) {
        cachedCLIPath = binaryPath;
        console.log(`[claude-code] Found CLI at: ${binaryPath}`);
        return cachedCLIPath;
      }
    }
  } catch {
    // Extension dir not found
  }

  // 3. Fallback to PATH
  cachedCLIPath = "claude";
  return cachedCLIPath;
}

/**
 * Check if Claude Code CLI is available
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  try {
    const cliPath = getClaudeCLIPath();
    const { stdout } = await execFileAsync(cliPath, ["--version"], {
      timeout: 5000,
    });
    console.log(`[claude-code] CLI version: ${stdout.trim()}`);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// MCP CONFIG GENERATION
// ============================================

let mcpConfigPath: string | null = null;

function getOrCreateMCPConfig(): string {
  if (mcpConfigPath && fs.existsSync(mcpConfigPath)) return mcpConfigPath;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  mcpConfigPath = path.join(__dirname, "..", "claude-mcp-config.json");

  // Get the dist/index.js path for the MCP server
  const mcpServerPath = path
    .join(__dirname, "..", "index.js")
    .replace(/\\/g, "/");

  const envVars: Record<string, string> = {};
  const envKeys = [
    "JIRA_BASE_URL",
    "JIRA_USER_EMAIL",
    "JIRA_API_TOKEN",
    "JIRA_PROJECT_KEY",
    "FIGMA_ACCESS_TOKEN",
    "FIGMA_FILE_KEY",
  ];
  for (const key of envKeys) {
    if (process.env[key]) {
      envVars[key] = process.env[key]!;
    }
  }

  const config = {
    mcpServers: {
      "agent-factory": {
        command: "node",
        args: [mcpServerPath],
        env: envVars,
      },
    },
  };

  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
  console.log(`[claude-code] MCP config written to: ${mcpConfigPath}`);
  return mcpConfigPath;
}

// ============================================
// AGENT CONFIGURATION
// ============================================

function getAgentSystemPrompt(agentId: string): string {
  try {
    const promptResult = getPrompt(`agent_${agentId}`, {});
    const message = promptResult.messages[0];
    if (message && message.content && typeof message.content === "object") {
      const textContent = message.content as { type: string; text: string };
      return textContent.text;
    }
    return "";
  } catch {
    return `Tu és um assistente especializado da Fábrica de Agentes do Banco CTT.
Responde sempre em português de Portugal. Sê conciso mas completo.`;
  }
}

// Pre-seeded first messages
const agentFirstMessages: Record<string, string> = {
  ba: `Olá! Antes de começar o levantamento de requisitos, preciso saber:

**A) Modo Demo** - Levantamento rápido com ~5 perguntas essenciais
**B) Modo Completo** - Levantamento exaustivo e detalhado

Qual preferes? (A ou B)`,
};

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

export function getOrCreateConversation(
  sessionId: string,
  agentId: string
): AgentConversation {
  const key = `${sessionId}:${agentId}`;

  if (!conversations.has(key)) {
    const messages: ConversationMessage[] = [];

    const firstMessage = agentFirstMessages[agentId];
    if (firstMessage) {
      messages.push({
        role: "assistant",
        content: firstMessage,
      });
    }

    conversations.set(key, {
      agentId,
      messages,
      systemPrompt: getAgentSystemPrompt(agentId),
      claudeSessionId: crypto.randomUUID(),
    });
  }

  return conversations.get(key)!;
}

export function clearConversation(sessionId: string, agentId: string): void {
  const key = `${sessionId}:${agentId}`;
  conversations.delete(key);
}

/**
 * Reset all agent conversations for a session.
 * Used when starting a new project from the dashboard.
 */
export function resetSession(sessionId: string): void {
  for (const aid of ['ba', 'fa', 'da', 'dsla', 'pa', 'taa', 'fde', 'bde', 'ute', 'fbs', 'bbs']) {
    conversations.delete(`${sessionId}:${aid}`);
  }
  console.log(`[session] Full reset for ${sessionId}`);
}

// ============================================
// FORMAT CONVERSATION FOR CLAUDE CODE
// ============================================

function formatConversationPrompt(
  previousMessages: ConversationMessage[],
  newUserMessage: string
): string {
  if (previousMessages.length === 0) {
    return newUserMessage;
  }

  let formatted = "CONVERSA ANTERIOR (contexto):\n";
  formatted += "---\n";

  for (const msg of previousMessages) {
    const label = msg.role === "user" ? "Utilizador" : "Assistente";
    formatted += `${label}: ${msg.content}\n\n`;
  }

  formatted += "---\n\n";
  formatted += `Responde à mensagem mais recente do utilizador:\n\n`;
  formatted += newUserMessage;

  return formatted;
}

// ============================================
// SPAWN CLAUDE CODE CLI (robust for long text)
// ============================================

// Model per agent — Opus for critical, Sonnet for structured, Haiku for mechanical
const MODEL_PER_AGENT: Record<string, string> = {
  ba: "claude-opus-4-6",
  fa: "claude-sonnet-4-5-20250929",
  da: "claude-sonnet-4-5-20250929",
  dsla: "claude-opus-4-6",
  pa: "claude-sonnet-4-5-20250929",
  taa: "claude-opus-4-6",
  fde: "claude-opus-4-6",
  bde: "claude-opus-4-6",
  ute: "claude-haiku-4-5-20251001",
  fbs: "claude-sonnet-4-5-20250929",
  bbs: "claude-sonnet-4-5-20250929",
};
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "sonnet";
const CLAUDE_TIMEOUT_MS = parseInt(process.env.CLAUDE_TIMEOUT_MS || "600000"); // 10 min default (configurable)

/** Get the model for a specific agent (falls back to CLAUDE_MODEL env var) */
export function getModelForAgent(agentId: string): string {
  return MODEL_PER_AGENT[agentId] || process.env.CLAUDE_MODEL || CLAUDE_MODEL;
}

/**
 * Spawn Claude Code CLI and pipe prompt via stdin.
 * This avoids Windows command-line length limits with long prompts/system prompts.
 * The system prompt is written to a temp file to avoid arg length issues.
 */
export async function spawnClaudeCode(
  prompt: string,
  systemPrompt: string,
  mcpConfigPath: string,
  maxTurns?: number,
  agentId?: string
): Promise<{ stdout: string; stderr: string }> {
  const MAX_RETRIES = 1; // 1 retry for transient failures
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await spawnClaudeCodeOnce(prompt, systemPrompt, mcpConfigPath, maxTurns, agentId);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      // Only retry on exit code 1 with empty/short stderr (transient failure)
      const isTransient = msg.includes('exited with code 1') && (msg.includes('stderr: .') || msg.includes('stderr: \n') || /stderr:\s*$/.test(msg) || /stderr:\s+stdout:/.test(msg));
      if (isTransient && attempt < MAX_RETRIES) {
        console.log(`[claude-code] Transient failure (attempt ${attempt + 1}), retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError!;
}

function spawnClaudeCodeOnce(
  prompt: string,
  systemPrompt: string,
  mcpConfigPath: string,
  maxTurns?: number,
  agentId?: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cliPath = getClaudeCLIPath();

    // Write system prompt to a temp file (avoids CLI arg length limits)
    const tmpDir = os.tmpdir();
    const systemPromptFile = path.join(tmpDir, `claude-sp-${Date.now()}.txt`);
    fs.writeFileSync(systemPromptFile, systemPrompt, "utf-8");

    const effectiveMaxTurns = maxTurns || 10;

    const effectiveModel = agentId ? getModelForAgent(agentId) : CLAUDE_MODEL;

    const args: string[] = [
      "-p", // print mode (non-interactive), prompt comes from stdin when no positional arg
      "--output-format", "json",
      "--model", effectiveModel,
      "--max-turns", String(effectiveMaxTurns),
      "--system-prompt-file", systemPromptFile, // read from temp file to avoid Windows arg escaping issues
      "--mcp-config", mcpConfigPath,
      "--strict-mcp-config",
      "--no-session-persistence",
      "--dangerously-skip-permissions",
      "--disallowed-tools", "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,NotebookEdit,Task,TodoWrite",
    ];

    const cwd = process.cwd();
    console.log(`[claude-code] Spawning CLI: ${cliPath}`);
    console.log(`[claude-code] CWD: ${cwd}`);
    console.log(`[claude-code] Model: ${effectiveModel}, maxTurns: ${effectiveMaxTurns}, agent: ${agentId || 'none'}`);
    console.log(`[claude-code] System prompt file: ${systemPromptFile}`);
    console.log(`[claude-code] MCP config: ${mcpConfigPath}`);
    console.log(`[claude-code] Args: ${args.join(' ')}`);
    console.log(`[claude-code] Prompt length: ${prompt.length}, system prompt length: ${systemPrompt.length}`);

    const child = spawn(cliPath, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    // Write prompt to stdin and close it
    child.stdin.write(prompt);
    child.stdin.end();

    // Timeout protection
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      // Cleanup temp file
      try { fs.unlinkSync(systemPromptFile); } catch {}
      reject(new Error(`Claude Code timed out after ${CLAUDE_TIMEOUT_MS / 1000}s`));
    }, CLAUDE_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      // Cleanup temp file
      try { fs.unlinkSync(systemPromptFile); } catch {}

      console.log(`[claude-code] Process exited with code ${code}`);
      if (stdout) console.log(`[claude-code] stdout (first 500): ${stdout.substring(0, 500)}`);
      if (stderr) console.log(`[claude-code] stderr (first 500): ${stderr.substring(0, 500)}`);

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `Claude Code exited with code ${code}. stderr: ${stderr.substring(0, 500)}. stdout: ${stdout.substring(0, 500)}`
          )
        );
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      try { fs.unlinkSync(systemPromptFile); } catch {}
      reject(err);
    });
  });
}

// ============================================
// SEND MESSAGE VIA CLAUDE CODE CLI
// ============================================

export async function sendMessageToClaude(
  sessionId: string,
  agentId: string,
  userMessage: string
): Promise<{
  response: string;
  toolsUsed: Array<{ name: string; result: string }>;
}> {
  const conversation = getOrCreateConversation(sessionId, agentId);
  const configPath = getOrCreateMCPConfig();

  // HANDOFF: enrich with upstream agent context (if not already injected)
  let enrichedMessage = userMessage;
  if (!conversation.systemPrompt.includes("## CONTEXTO RECEBIDO")) {
    const handoff = await getUpstreamHandoff(sessionId, agentId);
    if (handoff) {
      // Inject into system prompt (persists for all subsequent messages)
      conversation.systemPrompt +=
        "\n\n" +
        "═".repeat(50) +
        "\n## CONTEXTO RECEBIDO (handoff automático)\n\n" +
        handoff +
        "\n" +
        "═".repeat(50);
      // Inject into message (higher weight in attention window)
      enrichedMessage =
        `CONTEXTO DO AGENTE ANTERIOR:\n${handoff}\n\n---\n\nPEDIDO DO UTILIZADOR:\n${userMessage}`;
    }
  }

  // Add ORIGINAL user message to history (not enriched)
  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  // Format prompt with conversation history (use enriched for current message)
  const allMessagesExceptLast = conversation.messages.slice(0, -1);
  const prompt = formatConversationPrompt(allMessagesExceptLast, enrichedMessage);

  const agentModel = getModelForAgent(agentId);
  console.log(`[${agentId}] Sending message via Claude Code CLI...`);
  console.log(`[${agentId}] Model: ${agentModel}`);
  console.log(`[${agentId}] Conversation messages: ${conversation.messages.length}`);

  try {
    const { stdout, stderr } = await spawnClaudeCode(
      prompt,
      conversation.systemPrompt,
      configPath,
      undefined,
      agentId
    );

    if (stderr) {
      console.log(`[${agentId}] Claude Code stderr:`, stderr.substring(0, 500));
    }

    // Parse JSON response from Claude Code
    let responseText = "";
    const toolsUsed: Array<{ name: string; result: string }> = [];

    try {
      const result = JSON.parse(stdout);

      if (result.is_error) {
        throw new Error(result.result || "Claude Code returned an error");
      }

      responseText = result.result || "";

      if (result.session_id) {
        conversation.claudeSessionId = result.session_id;
      }

      console.log(
        `[${agentId}] Response received (${responseText.length} chars, ${result.num_turns || 1} turns, $${result.cost_usd?.toFixed(4) || "0"} cost)`
      );
    } catch {
      // If not valid JSON, use raw output as text
      console.log(`[${agentId}] Non-JSON response, using raw output`);
      responseText = stdout.trim();
    }

    // Add assistant response to history
    conversation.messages.push({
      role: "assistant",
      content: responseText,
    });

    return { response: responseText, toolsUsed };
  } catch (error) {
    // Remove the user message from history on failure
    conversation.messages.pop();

    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${agentId}] Error calling Claude Code:`, errorMsg);

    if (errorMsg.includes("ENOENT")) {
      throw new Error(
        "Claude Code CLI not found. Install Claude Code or set CLAUDE_CLI_PATH in .env"
      );
    }
    if (errorMsg.includes("timed out")) {
      throw new Error(
        "Claude Code response timed out. Try again with a shorter message."
      );
    }

    throw error;
  }
}

// ============================================
// CONVERSATION HISTORY
// ============================================

export function getConversationHistory(
  sessionId: string,
  agentId: string
): ConversationMessage[] {
  const conversation = getOrCreateConversation(sessionId, agentId);
  return [...conversation.messages];
}

// ============================================
// PIPELINE-BASED EXECUTION (multi-phase)
// ============================================

import {
  executePipeline,
  hasPhases,
  getAgentPhases,
  type ProgressCallback,
  type PhaseProgress,
} from "./pipeline.js";
import { executeFastPipeline, hasFastPipeline } from "./pipeline-fast.js";

// Re-export for server.ts convenience
export { hasPhases, getAgentPhases, hasFastPipeline, type PhaseProgress, type ProgressCallback };

/**
 * Send a message using the multi-phase pipeline.
 * Each phase is a separate CLI call with focused context.
 * Progress is emitted via the onProgress callback (for SSE events).
 */
export async function sendMessageWithPipeline(
  sessionId: string,
  agentId: string,
  userMessage: string,
  onProgress: ProgressCallback
): Promise<{
  response: string;
  toolsUsed: Array<{ name: string; result: string }>;
}> {
  const conversation = getOrCreateConversation(sessionId, agentId);
  const configPath = getOrCreateMCPConfig();

  // HANDOFF: enrich with upstream agent context (if not already injected)
  let enrichedMessage = userMessage;
  if (!conversation.systemPrompt.includes("## CONTEXTO RECEBIDO")) {
    const handoff = await getUpstreamHandoff(sessionId, agentId);
    if (handoff) {
      // Inject into system prompt (propagates to all pipeline phases)
      conversation.systemPrompt +=
        "\n\n" +
        "═".repeat(50) +
        "\n## CONTEXTO RECEBIDO (handoff automático)\n\n" +
        handoff +
        "\n" +
        "═".repeat(50);
      // Inject into message (phase 1 sees it directly)
      enrichedMessage =
        `CONTEXTO DO AGENTE ANTERIOR:\n${handoff}\n\n---\n\nPEDIDO DO UTILIZADOR:\n${userMessage}`;
    }
  }

  // Add ORIGINAL user message to history (not enriched)
  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  // Build the original message with conversation context (use enriched for current)
  const allMessagesExceptLast = conversation.messages.slice(0, -1);
  const fullPrompt = formatConversationPrompt(allMessagesExceptLast, enrichedMessage);

  console.log(`[${agentId}] Starting pipeline execution...`);
  console.log(`[${agentId}] Model: ${CLAUDE_MODEL}`);
  console.log(`[${agentId}] Conversation messages: ${conversation.messages.length}`);

  try {
    const finalResponse = await executePipeline(
      agentId,
      conversation.systemPrompt,
      fullPrompt,
      configPath,
      spawnClaudeCode, // inject the spawn function
      onProgress
    );

    // Add only the final summary to conversation history
    conversation.messages.push({
      role: "assistant",
      content: finalResponse,
    });

    return { response: finalResponse, toolsUsed: [] };
  } catch (error) {
    // Remove user message on failure
    conversation.messages.pop();

    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${agentId}] Pipeline error:`, errorMsg);

    if (errorMsg.includes("timed out")) {
      throw new Error(
        "Claude Code response timed out during pipeline execution. Try again."
      );
    }

    throw error;
  }
}

/**
 * Send a message using the fast single-call pipeline.
 * Instead of N separate CLI calls, uses ONE call with a consolidated prompt.
 * ~50-65% faster than multi-phase pipeline.
 */
export async function sendMessageWithFastPipeline(
  sessionId: string,
  agentId: string,
  userMessage: string,
  onProgress: ProgressCallback
): Promise<{
  response: string;
  toolsUsed: Array<{ name: string; result: string }>;
}> {
  const conversation = getOrCreateConversation(sessionId, agentId);
  const configPath = getOrCreateMCPConfig();

  // HANDOFF: enrich with upstream agent context (if not already injected)
  let enrichedMessage = userMessage;
  if (!conversation.systemPrompt.includes("## CONTEXTO RECEBIDO")) {
    const handoff = await getUpstreamHandoff(sessionId, agentId);
    if (handoff) {
      conversation.systemPrompt +=
        "\n\n" +
        "═".repeat(50) +
        "\n## CONTEXTO RECEBIDO (handoff automático)\n\n" +
        handoff +
        "\n" +
        "═".repeat(50);
      enrichedMessage =
        `CONTEXTO DO AGENTE ANTERIOR:\n${handoff}\n\n---\n\nPEDIDO DO UTILIZADOR:\n${userMessage}`;
    }
  }

  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  const allMessagesExceptLast = conversation.messages.slice(0, -1);
  const fullPrompt = formatConversationPrompt(allMessagesExceptLast, enrichedMessage);

  console.log(`[${agentId}] Starting FAST pipeline execution...`);
  console.log(`[${agentId}] Model: ${CLAUDE_MODEL}`);

  try {
    const finalResponse = await executeFastPipeline(
      agentId,
      conversation.systemPrompt,
      fullPrompt,
      configPath,
      spawnClaudeCode,
      onProgress
    );

    conversation.messages.push({
      role: "assistant",
      content: finalResponse,
    });

    return { response: finalResponse, toolsUsed: [] };
  } catch (error) {
    conversation.messages.pop();

    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${agentId}] Fast pipeline error:`, errorMsg);

    if (errorMsg.includes("timed out")) {
      throw new Error(
        "Claude Code response timed out during fast pipeline execution. Try again."
      );
    }

    throw error;
  }
}
