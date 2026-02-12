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

export function setSessionId(id: string): void {
  currentSessionId = id;
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
  message: string,
  externalSignal?: AbortSignal,
): AsyncGenerator<{ type: string; content?: string; name?: string; message?: string }> {
  const sessionId = getSessionId();

  // AbortController with inactivity timeout (resets on each data received)
  const controller = new AbortController();
  let timeout = setTimeout(() => controller.abort(), 720000); // 12 min initial

  // If external signal aborts (e.g. chat closed), abort our controller too
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
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
      signal: controller.signal,
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

      // Reset inactivity timeout on each data received (connection is alive)
      clearTimeout(timeout);
      timeout = setTimeout(() => controller.abort(), 120000); // 2 min inactivity

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            // Skip heartbeat events (keep-alive from server)
            if (data.type === 'heartbeat') continue;
            yield data;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // If aborted by external signal (user closed chat), silently stop
      if (externalSignal?.aborted) return;
      throw new Error('Conexão perdida (sem dados há 2 minutos). O agente pode ainda estar a processar — tenta refrescar.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
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

// ============================================
// PROTOTYPE API
// ============================================

export interface PrototypeSummary {
  id: string;
  bdevCode: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  screenCount: number;
  approvedBy: string | null;
}

export interface ExportToDiskResult {
  success: boolean;
  outputPath: string;
  files: string[];
  command: string;
}

/**
 * List prototypes, optionally filtered by BDEV code
 */
export async function fetchPrototypes(bdevCode?: string): Promise<PrototypeSummary[]> {
  const url = bdevCode
    ? `${API_BASE_URL}/api/prototypes?bdevCode=${encodeURIComponent(bdevCode)}`
    : `${API_BASE_URL}/api/prototypes`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to list prototypes');
  }

  const data = await response.json();
  return data.prototypes;
}

/**
 * Export prototype to a standalone Vite+React project on disk
 */
export async function exportPrototypeToDisk(
  bdevCode: string,
  version?: number
): Promise<ExportToDiskResult> {
  const response = await fetch(`${API_BASE_URL}/api/prototypes/${encodeURIComponent(bdevCode)}/export-to-disk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to export prototype');
  }

  return response.json();
}

// ============================================
// PHASE 2 — DEVELOPMENT API
// ============================================

export interface BdevAvailable {
  key: string;
  summary: string;
  status: string;
  labels: string[];
}

export interface BugWatcherStatus {
  running: boolean;
  pollIntervalMs: number;
  lastPollAt: string | null;
  pollCount: number;
  detectedBugs: Array<{
    key: string;
    summary: string;
    component: 'frontend' | 'backend';
    severity: string;
    status: string;
  }>;
}

/**
 * Fetch BDEVs available for Phase 2 (status "Ready for Development")
 */
export async function fetchBdevsAvailable(): Promise<BdevAvailable[]> {
  const response = await fetch(`${API_BASE_URL}/jira/bdevs-available`);
  if (!response.ok) {
    throw new Error('Failed to fetch available BDEVs');
  }
  const data = await response.json();
  return data.bdevs || [];
}

/**
 * Approve architecture spec (Gate 1: TAA → FDE+BDE)
 */
export async function approveArchitecture(bdevCode: string): Promise<void> {
  const sessionId = getSessionId();
  const response = await fetch(`${API_BASE_URL}/workflow/approve-architecture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, bdevCode }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to approve architecture');
  }
}

/**
 * Approve or reject a dev plan (BDE/FDE planning gate)
 */
export async function approveDevPlan(
  agentId: string,
  approved: boolean,
  comments?: string
): Promise<{ success: boolean; nextAgent: string | null }> {
  const sessionId = getSessionId();
  const response = await fetch(`${API_BASE_URL}/workflow/approve-dev-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, agentId, approved, comments }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to approve dev plan');
  }
  return response.json();
}

/**
 * Approve development (Gate 2: Review → CI/CD)
 */
export async function approveDevelopment(bdevCode: string): Promise<void> {
  const sessionId = getSessionId();
  const response = await fetch(`${API_BASE_URL}/workflow/approve-development`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, bdevCode }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to approve development');
  }
}

/**
 * Approve merge (Gate 3: Merge → Deploy)
 */
export async function approveMerge(bdevCode: string): Promise<void> {
  const sessionId = getSessionId();
  const response = await fetch(`${API_BASE_URL}/workflow/approve-merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, bdevCode }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to approve merge');
  }
}

/**
 * Advance to next MVP (Gate MVP)
 */
export async function advanceMvp(bdevCode: string, currentMvp: string): Promise<void> {
  const sessionId = getSessionId();
  const response = await fetch(`${API_BASE_URL}/workflow/advance-mvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, bdevCode, currentMvp }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to advance MVP');
  }
}

/**
 * Get bug watcher status
 */
export async function getBugWatcherStatus(): Promise<BugWatcherStatus> {
  const response = await fetch(`${API_BASE_URL}/bug-watcher/status`);
  if (!response.ok) {
    throw new Error('Failed to get bug watcher status');
  }
  return response.json();
}

/**
 * Start bug watcher
 */
export async function startBugWatcher(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bug-watcher/start`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to start bug watcher');
  }
}

/**
 * Stop bug watcher
 */
export async function stopBugWatcher(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bug-watcher/stop`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to stop bug watcher');
  }
}

/**
 * Reset bug environment (git reset + Jira reset)
 */
export async function resetBugEnvironment(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bug-watcher/reset-environment`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to reset bug environment');
  }
}

// ============================================
// CI/CD PIPELINE API
// ============================================

export interface CICDStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  output?: string;
  report?: object;
}

export interface CICDPipeline {
  id: string;
  bdev: string;
  mvp: string;
  branch: string;
  triggeredAt: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  steps: CICDStep[];
  completedAt?: string;
}

/**
 * Get CI/CD pipeline status
 */
export async function getCICDStatus(): Promise<CICDPipeline | null> {
  const response = await fetch(`${API_BASE_URL}/cicd/status`);
  if (!response.ok) {
    throw new Error('Failed to get CI/CD status');
  }
  const data = await response.json();
  return data.status === 'idle' ? null : data;
}

/**
 * Trigger CI/CD pipeline
 */
export async function triggerCICD(bdev: string, mvp: string, branch: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/cicd/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bdev, mvp, branch }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as ApiError).message || 'Failed to trigger CI/CD');
  }
}

/**
 * Get CI/CD report
 */
export async function getCICDReport(): Promise<object | null> {
  const response = await fetch(`${API_BASE_URL}/cicd/report`);
  if (!response.ok) {
    throw new Error('Failed to get CI/CD report');
  }
  return response.json();
}

// ============================================
// DEPLOY API
// ============================================

export interface DeployServiceStatus {
  name: string;
  port: number;
  status: string;
  pid?: number;
}

export interface DeployStatus {
  status: 'idle' | 'deploying' | 'deployed' | 'failed' | 'rolling_back';
  bdev?: string;
  mvp?: string;
  branch?: string;
  startedAt?: string;
  completedAt?: string;
  steps: Array<{
    id: string;
    name: string;
    status: string;
    output?: string;
    duration?: number;
  }>;
  services: DeployServiceStatus[];
}

export interface HealthCheckResult {
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'stopped';
  responseTime?: number;
  error?: string;
}

/**
 * Get deploy status
 */
export async function getDeployStatusAPI(): Promise<DeployStatus> {
  const response = await fetch(`${API_BASE_URL}/deploy/status`);
  if (!response.ok) {
    throw new Error('Failed to get deploy status');
  }
  return response.json();
}

/**
 * Get deploy health check
 */
export async function getDeployHealth(): Promise<HealthCheckResult[]> {
  const response = await fetch(`${API_BASE_URL}/deploy/health`);
  if (!response.ok) {
    throw new Error('Failed to get deploy health');
  }
  const data = await response.json();
  return data.services;
}

// Export API base URL for debugging
export { API_BASE_URL };
