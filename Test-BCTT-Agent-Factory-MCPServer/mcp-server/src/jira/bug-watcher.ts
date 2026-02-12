import { getJiraClient } from './client.js';

// ============================================
// BUG WATCHER — Polls Jira for new bugs
// ============================================

export interface DetectedBug {
  key: string;
  summary: string;
  component: 'frontend' | 'backend';
  severity: string;
  labels: string[];
  detectedAt: string;
  status: 'detected' | 'dispatched' | 'fixing' | 'testing' | 'resolved' | 'failed';
  agentType?: 'fbs' | 'bbs';
}

export type BugEventHandler = (event: BugWatcherEvent) => void;

export interface BugWatcherEvent {
  type: 'bug_detected' | 'bug_dispatched' | 'bug_resolved' | 'bug_failed' | 'watcher_started' | 'watcher_stopped' | 'poll_complete';
  bug?: DetectedBug;
  bugs?: DetectedBug[];
  timestamp: string;
}

interface BugWatcherState {
  running: boolean;
  isPolling: boolean;
  pollIntervalMs: number;
  intervalHandle: ReturnType<typeof setInterval> | null;
  processedBugs: Map<string, DetectedBug>;
  onEvent: BugEventHandler | null;
  lastPollAt: string | null;
  pollCount: number;
}

const state: BugWatcherState = {
  running: false,
  isPolling: false,
  pollIntervalMs: 30_000, // 30 seconds
  intervalHandle: null,
  processedBugs: new Map(),
  onEvent: null,
  lastPollAt: null,
  pollCount: 0,
};

// ============================================
// CORE POLLING LOGIC
// ============================================

/**
 * Cleanup resolved/failed bugs older than 24h to prevent memory leak.
 */
function cleanupOldBugs(): void {
  const maxAge = 24 * 60 * 60 * 1000; // 24h
  const now = Date.now();
  for (const [key, bug] of state.processedBugs) {
    if ((bug.status === 'resolved' || bug.status === 'failed') &&
        now - new Date(bug.detectedAt).getTime() > maxAge) {
      state.processedBugs.delete(key);
    }
  }
}

async function pollForBugs(): Promise<void> {
  // Guard against overlapping polls
  if (state.isPolling) return;
  state.isPolling = true;

  try {
    // Cleanup old resolved/failed bugs
    cleanupOldBugs();

    const jira = getJiraClient();
    const projectKey = process.env.JIRA_PROJECT_KEY || 'BCTT';

    // Search for bugs in To Do status with bug labels
    // Note: JQL uses English status names ("To Do") even on Portuguese Jira instances
    const jql = `project = ${projectKey} AND issuetype = Bug AND status = "To Do" AND (labels = "frontend-bug" OR labels = "backend-bug") ORDER BY created ASC`;
    const result = await jira.searchIssues(jql, 20);

    state.lastPollAt = new Date().toISOString();
    state.pollCount++;

    const newBugs: DetectedBug[] = [];

    for (const issue of result.issues) {
      const key = issue.key;

      // Skip already processed bugs
      if (state.processedBugs.has(key)) continue;

      const labels = issue.fields.labels || [];
      const isFrontend = labels.includes('frontend-bug');
      const component = isFrontend ? 'frontend' : 'backend';
      const agentType = isFrontend ? 'fbs' : 'bbs';

      // Extract severity from labels
      const severityLabel = labels.find((l: string) => l.startsWith('severity-'));
      const severity = severityLabel ? severityLabel.replace('severity-', '') : 'unknown';

      const bug: DetectedBug = {
        key,
        summary: issue.fields.summary,
        component,
        severity,
        labels,
        detectedAt: new Date().toISOString(),
        status: 'detected',
        agentType,
      };

      console.log(`[bug-watcher] New bug detected: ${key} — ${issue.fields.summary} (${component})`);

      // Transition to In Development FIRST — only add to processedBugs if successful
      try {
        await jira.transitionIssue(key, 'In Development');
        bug.status = 'dispatched';
        console.log(`[bug-watcher] ${key} → In Development`);
      } catch (err) {
        console.error(`[bug-watcher] Failed to transition ${key}:`, err);
        // Don't add to processedBugs — will be retried on next poll
        continue;
      }

      // Transition succeeded — now add to processedBugs
      state.processedBugs.set(key, bug);
      newBugs.push(bug);

      // Add comment
      try {
        await jira.addComment(key, `🤖 Bug detectado pelo Bug Watcher. Agente ${agentType.toUpperCase()} será despachado para análise e correcção.`);
      } catch (err) {
        console.error(`[bug-watcher] Failed to add comment to ${key}:`, err);
      }

      // Emit event
      emitEvent({ type: 'bug_detected', bug, timestamp: new Date().toISOString() });
    }

    if (newBugs.length > 0) {
      console.log(`[bug-watcher] Poll #${state.pollCount}: ${newBugs.length} new bug(s) detected`);
    }

    emitEvent({
      type: 'poll_complete',
      bugs: newBugs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[bug-watcher] Poll error:', err);
  } finally {
    state.isPolling = false;
  }
}

function emitEvent(event: BugWatcherEvent): void {
  if (state.onEvent) {
    try {
      state.onEvent(event);
    } catch (err) {
      console.error('[bug-watcher] Event handler error:', err);
    }
  }
}

// ============================================
// PUBLIC API
// ============================================

export function startBugWatcher(options?: {
  intervalMs?: number;
  onEvent?: BugEventHandler;
}): void {
  if (state.running) {
    console.log('[bug-watcher] Already running');
    return;
  }

  if (options?.intervalMs) state.pollIntervalMs = options.intervalMs;
  if (options?.onEvent) state.onEvent = options.onEvent;

  state.running = true;
  state.intervalHandle = setInterval(pollForBugs, state.pollIntervalMs);

  console.log(`[bug-watcher] Started (polling every ${state.pollIntervalMs / 1000}s)`);
  emitEvent({ type: 'watcher_started', timestamp: new Date().toISOString() });

  // Do first poll immediately
  pollForBugs();
}

export function stopBugWatcher(): void {
  if (!state.running) return;

  if (state.intervalHandle) {
    clearInterval(state.intervalHandle);
    state.intervalHandle = null;
  }

  state.running = false;
  console.log('[bug-watcher] Stopped');
  emitEvent({ type: 'watcher_stopped', timestamp: new Date().toISOString() });
}

export function getBugWatcherStatus(): {
  running: boolean;
  pollIntervalMs: number;
  lastPollAt: string | null;
  pollCount: number;
  detectedBugs: DetectedBug[];
} {
  return {
    running: state.running,
    pollIntervalMs: state.pollIntervalMs,
    lastPollAt: state.lastPollAt,
    pollCount: state.pollCount,
    detectedBugs: Array.from(state.processedBugs.values()),
  };
}

export function getDetectedBugs(): DetectedBug[] {
  return Array.from(state.processedBugs.values());
}

export function updateBugStatus(key: string, status: DetectedBug['status']): void {
  const bug = state.processedBugs.get(key);
  if (bug) {
    bug.status = status;
    const eventType = status === 'resolved' ? 'bug_resolved' : status === 'failed' ? 'bug_failed' : 'bug_dispatched';
    emitEvent({ type: eventType, bug, timestamp: new Date().toISOString() });
  }
}

export function resetBugWatcher(): void {
  stopBugWatcher();
  state.processedBugs.clear();
  state.lastPollAt = null;
  state.pollCount = 0;
  state.onEvent = null;
  state.isPolling = false;
}
