import Anthropic from "@anthropic-ai/sdk";
import { tools, handleToolCall } from "../tools/index.js";
import { getPrompt } from "../prompts/index.js";

// ============================================
// DEMO MODE PROTECTIONS
// ============================================

// Maximum tool calls per response to prevent infinite loops
const MAX_TOOL_CALLS_PER_RESPONSE = 5;

// Types for conversation management
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentConversation {
  agentId: string;
  messages: ConversationMessage[];
  systemPrompt: string;
}

// Map to store active conversations by session
const conversations = new Map<string, AgentConversation>();

// Initialize Anthropic client
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY not configured. Set it in your .env file."
      );
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Convert MCP tools to Anthropic tool format
function convertToolsToAnthropicFormat(): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));
}

// Get system prompt for an agent
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
    // Return default prompt if agent not found
    return `Tu és um assistente especializado da Fábrica de Agentes do Banco CTT.
Responde sempre em português de Portugal. Sê conciso mas completo.`;
  }
}

// Filter tools based on agent type
function getToolsForAgent(agentId: string): Anthropic.Tool[] {
  const allTools = convertToolsToAnthropicFormat();

  // Filter tools based on agent type
  const toolPrefixes: Record<string, string[]> = {
    ba: ["ba_", "jira_test_connection"],
    fa: ["fa_", "jira_"],
    da: ["da_"],
    dsla: ["dsla_"],
  };

  const prefixes = toolPrefixes[agentId];
  if (!prefixes) {
    // Return all tools if agent not specifically configured
    return allTools;
  }

  return allTools.filter((tool) =>
    prefixes.some((prefix) => tool.name.startsWith(prefix))
  );
}

// Start or get a conversation
export function getOrCreateConversation(
  sessionId: string,
  agentId: string
): AgentConversation {
  const key = `${sessionId}:${agentId}`;

  if (!conversations.has(key)) {
    conversations.set(key, {
      agentId,
      messages: [],
      systemPrompt: getAgentSystemPrompt(agentId),
    });
  }

  return conversations.get(key)!;
}

// Clear a conversation
export function clearConversation(sessionId: string, agentId: string): void {
  const key = `${sessionId}:${agentId}`;
  conversations.delete(key);
}

// Send message to Claude and get response
export async function sendMessageToClaude(
  sessionId: string,
  agentId: string,
  userMessage: string
): Promise<{
  response: string;
  toolsUsed: Array<{ name: string; result: string }>;
}> {
  const client = getAnthropicClient();
  const conversation = getOrCreateConversation(sessionId, agentId);
  const agentTools = getToolsForAgent(agentId);

  // Add user message to history
  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  // Prepare messages for API
  const apiMessages: Anthropic.MessageParam[] = conversation.messages.map(
    (msg) => ({
      role: msg.role,
      content: msg.content,
    })
  );

  const toolsUsed: Array<{ name: string; result: string }> = [];
  let finalResponse = "";

  try {
    // Call Claude API with tools
    let response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      system: conversation.systemPrompt,
      tools: agentTools.length > 0 ? agentTools : undefined,
      messages: apiMessages,
    });

    // Handle tool use loop (with max tool calls limit for demo safety)
    let toolCallCount = 0;

    while (response.stop_reason === "tool_use") {
      // Check if we've hit the max tool calls limit
      if (toolCallCount >= MAX_TOOL_CALLS_PER_RESPONSE) {
        console.log(`[${agentId}] Max tool calls limit reached (${MAX_TOOL_CALLS_PER_RESPONSE}). Stopping to prevent infinite loop.`);

        // Force a text response by not processing more tools
        const limitMessage = `[DEMO PROTECTION] Limite de ${MAX_TOOL_CALLS_PER_RESPONSE} chamadas de ferramentas atingido. Continua na próxima mensagem se necessário.`;

        conversation.messages.push({
          role: "assistant",
          content: limitMessage,
        });

        return {
          response: limitMessage,
          toolsUsed,
        };
      }

      const assistantContent = response.content;
      const toolUseBlocks = assistantContent.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      // Execute each tool
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`[${agentId}] Executing tool: ${toolUse.name} (${toolCallCount + 1}/${MAX_TOOL_CALLS_PER_RESPONSE})`);

        try {
          const result = await handleToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );
          const resultText = result.content[0]?.text || "";

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: resultText,
          });

          toolsUsed.push({
            name: toolUse.name,
            result: resultText,
          });

          toolCallCount++;
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: String(error) }),
            is_error: true,
          });
        }
      }

      // Continue conversation with tool results
      const nextMessages: Anthropic.MessageParam[] = [
        ...apiMessages,
        { role: "assistant", content: assistantContent },
        { role: "user", content: toolResults },
      ];

      response = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        system: conversation.systemPrompt,
        tools: agentTools.length > 0 ? agentTools : undefined,
        messages: nextMessages,
      });
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    finalResponse = textBlocks.map((block) => block.text).join("\n");

    // Add assistant response to history
    conversation.messages.push({
      role: "assistant",
      content: finalResponse,
    });

    return { response: finalResponse, toolsUsed };
  } catch (error) {
    console.error(`[${agentId}] Error calling Claude:`, error);
    throw error;
  }
}

// Get conversation history
export function getConversationHistory(
  sessionId: string,
  agentId: string
): ConversationMessage[] {
  const conversation = getOrCreateConversation(sessionId, agentId);
  return [...conversation.messages];
}
