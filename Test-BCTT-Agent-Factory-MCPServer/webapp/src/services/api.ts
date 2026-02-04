/**
 * API Service for Agent Factory
 * Handles communication with the backend API server
 */

// API base URL - configurable via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Session ID management
let currentSessionId: string | null = null;

export function getSessionId(): string {
  if (!currentSessionId) {
    // Generate a unique session ID
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return currentSessionId;
}

export function resetSession(): void {
  currentSessionId = null;
}

// Types
export interface ChatResponse {
  success: boolean;
  agentId: string;
  response: string;
  toolsUsed?: string[];
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  hasAnthropicKey: boolean;
  hasJiraConfig: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// API Functions

/**
 * Check API health status
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('API server not available');
  }

  return response.json();
}

/**
 * Send a message to an agent
 */
export async function sendMessage(
  agentId: string,
  message: string
): Promise<ChatResponse> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      agentId,
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).message || (data as ApiError).error || 'Failed to send message');
  }

  return data as ChatResponse;
}

/**
 * Send a message with streaming response
 * Returns an async generator that yields response chunks
 */
export async function* sendMessageStream(
  agentId: string,
  message: string
): AsyncGenerator<{ type: string; content?: string; name?: string; message?: string }> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      agentId,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to send message');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

/**
 * Clear conversation history for an agent
 */
export async function clearConversation(agentId: string): Promise<void> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/${agentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to clear conversation');
  }
}

/**
 * Get conversation history for an agent
 */
export async function getConversationHistory(
  agentId: string
): Promise<ConversationMessage[]> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/${agentId}/history`);

  if (!response.ok) {
    throw new Error('Failed to get conversation history');
  }

  const data = await response.json();
  return data.messages;
}

/**
 * Advance workflow from BA to FA
 */
export async function advanceToFA(requirements: Record<string, unknown>): Promise<void> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/workflow/advance-to-fa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      requirements,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to advance to FA');
  }
}

/**
 * Approve Jira creation
 */
export async function approveJiraCreation(): Promise<void> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/workflow/create-jira`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to approve Jira creation');
  }
}

/**
 * Check if API is configured and ready
 */
export async function isApiReady(): Promise<boolean> {
  try {
    const health = await checkHealth();
    return health.status === 'ok' && health.hasAnthropicKey;
  } catch {
    return false;
  }
}

// Export API base URL for debugging
export { API_BASE_URL };
