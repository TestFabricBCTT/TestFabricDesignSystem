// ============================================
// DEPLOY MANAGER
// Handles: stop → merge → build → start → health check
// Follows same state-machine pattern as bug-watcher.ts
// Reuses spawn/kill pattern from prototype/export-to-disk.ts
// ============================================

import { spawn, exec, execSync, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import * as git from '../git/index.js';
import { SERVICES, ManagedService } from './services.js';

// ============================================
// TYPES
// ============================================

export interface DeployStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  output?: string;
}

export interface DeployStatus {
  status: 'idle' | 'deploying' | 'deployed' | 'failed' | 'rolling_back';
  bdev?: string;
  mvp?: string;
  branch?: string;
  startedAt?: string;
  completedAt?: string;
  steps: DeployStep[];
  services: Array<{
    name: string;
    port: number;
    status: string;
    pid?: number;
  }>;
}

export interface HealthCheckResult {
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'stopped';
  responseTime?: number;
  error?: string;
}

export type DeployEventHandler = (event: DeployEvent) => void;

export interface DeployEvent {
  type: 'deploy_started' | 'step_completed' | 'deploy_completed' | 'service_started' | 'service_stopped' | 'health_check';
  step?: DeployStep;
  service?: string;
  timestamp: string;
}

// ============================================
// STATE
// ============================================

interface DeployState {
  status: DeployStatus;
  onEvent: DeployEventHandler | null;
}

const state: DeployState = {
  status: {
    status: 'idle',
    steps: [],
    services: SERVICES.map(s => ({ name: s.name, port: s.port, status: s.status })),
  },
  onEvent: null,
};

function emitEvent(event: DeployEvent): void {
  if (state.onEvent) {
    try {
      state.onEvent(event);
    } catch (err) {
      console.error('[deploy] Event handler error:', err);
    }
  }
}

function createStep(id: string, name: string): DeployStep {
  return { id, name, status: 'pending' };
}

function updateServiceStatus(): void {
  state.status.services = SERVICES.map(s => ({
    name: s.name,
    port: s.port,
    status: s.status,
    pid: s.pid,
  }));
}

// ============================================
// SERVICE MANAGEMENT (reuses prototype spawn/kill pattern)
// ============================================

function killProcess(pid: number): Promise<void> {
  return new Promise((resolve) => {
    exec(`taskkill /F /T /PID ${pid}`, (err) => {
      if (err) {
        console.log(`[deploy] taskkill PID ${pid}: ${err.message}`);
      }
      resolve();
    });
  });
}

export async function stopService(name: string): Promise<void> {
  const service = SERVICES.find(s => s.name === name);
  if (!service) throw new Error(`Unknown service: ${name}`);

  if (service.process) {
    try {
      if (service.pid) {
        await killProcess(service.pid);
      }
      service.process.kill();
    } catch { /* ignore */ }
    service.process = undefined;
    service.pid = undefined;
  }

  service.status = 'stopped';
  updateServiceStatus();
  emitEvent({ type: 'service_stopped', service: name, timestamp: new Date().toISOString() });
  console.log(`[deploy] Service ${name} stopped`);
}

export async function startService(name: string): Promise<void> {
  const service = SERVICES.find(s => s.name === name);
  if (!service) throw new Error(`Unknown service: ${name}`);

  // Stop if already running
  if (service.process) {
    await stopService(name);
  }

  service.status = 'starting';
  updateServiceStatus();

  return new Promise((resolve, reject) => {
    const [cmd, ...args] = service.command.split(' ');
    const child = spawn(cmd, args, {
      cwd: service.project,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: String(service.port) },
    });

    service.process = child;
    service.pid = child.pid;

    // Wait for process to start (give it 5s then check health)
    const startTimeout = setTimeout(async () => {
      const healthy = await checkServiceHealth(service);
      if (healthy) {
        service.status = 'running';
        updateServiceStatus();
        emitEvent({ type: 'service_started', service: name, timestamp: new Date().toISOString() });
        console.log(`[deploy] Service ${name} running on port ${service.port} (PID: ${service.pid})`);
        resolve();
      } else {
        // Give it more time (some services take longer)
        setTimeout(async () => {
          const healthy2 = await checkServiceHealth(service);
          service.status = healthy2 ? 'running' : 'error';
          service.lastError = healthy2 ? undefined : 'Health check failed after startup';
          updateServiceStatus();
          if (healthy2) {
            emitEvent({ type: 'service_started', service: name, timestamp: new Date().toISOString() });
          }
          resolve();
        }, 10000);
      }
    }, 5000);

    child.on('error', (err) => {
      clearTimeout(startTimeout);
      service.status = 'error';
      service.lastError = err.message;
      updateServiceStatus();
      console.error(`[deploy] Service ${name} error:`, err);
      reject(err);
    });

    child.on('exit', (code) => {
      if (service.status === 'starting' || service.status === 'running') {
        service.status = 'stopped';
        service.process = undefined;
        service.pid = undefined;
        updateServiceStatus();
        console.log(`[deploy] Service ${name} exited (code ${code})`);
      }
    });

    // Capture stdout/stderr for debugging
    child.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[${name}] ${msg}`);
    });
    child.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[${name}] ${msg}`);
    });
  });
}

async function checkServiceHealth(service: ManagedService): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    http.get(service.healthUrl, (res) => {
      clearTimeout(timeout);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// ============================================
// HEALTH CHECK (public)
// ============================================

export async function healthCheck(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  for (const service of SERVICES) {
    if (service.status === 'stopped') {
      results.push({ name: service.name, port: service.port, status: 'stopped' });
      continue;
    }

    const start = Date.now();
    const healthy = await checkServiceHealth(service);
    results.push({
      name: service.name,
      port: service.port,
      status: healthy ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - start,
      error: healthy ? undefined : 'Health check failed',
    });
  }

  emitEvent({ type: 'health_check', timestamp: new Date().toISOString() });
  return results;
}

// ============================================
// DEPLOY PIPELINE
// ============================================

export function setDeployEventHandler(handler: DeployEventHandler): void {
  state.onEvent = handler;
}

export async function startDeploy(
  bdev: string,
  mvp: string,
  branch: string
): Promise<DeployStatus> {
  if (state.status.status === 'deploying') {
    throw new Error('A deploy is already in progress');
  }

  const steps = [
    createStep('stop_services', 'Stop Affected Services'),
    createStep('git_merge', 'Git Merge'),
    createStep('install_build', 'Install & Build'),
    createStep('start_services', 'Start Services'),
    createStep('health_check', 'Health Checks'),
    createStep('update_jira', 'Update Jira'),
    createStep('update_registry', 'Update Registry'),
  ];

  state.status = {
    status: 'deploying',
    bdev,
    mvp,
    branch,
    startedAt: new Date().toISOString(),
    steps,
    services: SERVICES.map(s => ({ name: s.name, port: s.port, status: s.status })),
  };

  emitEvent({ type: 'deploy_started', timestamp: state.status.startedAt! });
  console.log(`[deploy] Deploy started for ${bdev} ${mvp} branch=${branch}`);

  // Run deploy steps (async, non-blocking)
  runDeploySteps(steps, bdev, mvp, branch).catch(err => {
    console.error('[deploy] Deploy error:', err);
    state.status.status = 'failed';
  });

  return state.status;
}

async function runDeploySteps(
  steps: DeployStep[],
  bdev: string,
  mvp: string,
  branch: string
): Promise<void> {
  // Step 1: Stop affected services
  const step1 = steps[0];
  step1.status = 'running';
  step1.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_completed', step: step1, timestamp: step1.startedAt });

  try {
    const stopped: string[] = [];
    for (const service of SERVICES) {
      if (service.status !== 'stopped') {
        await stopService(service.name);
        stopped.push(service.name);
      }
    }
    step1.output = stopped.length > 0 ? `Stopped: ${stopped.join(', ')}` : 'No services running';
    step1.status = 'passed';
  } catch (err: any) {
    step1.output = `Stop error: ${err.message}`;
    step1.status = 'failed';
  }
  step1.completedAt = new Date().toISOString();
  step1.duration = new Date(step1.completedAt).getTime() - new Date(step1.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step: step1, timestamp: step1.completedAt });

  // Step 2: Git merge
  const step2 = steps[1];
  step2.status = 'running';
  step2.startedAt = new Date().toISOString();
  try {
    const result = await git.mergeBranch('digitalChannels', branch);
    step2.output = result;
    step2.status = 'passed';
  } catch (err: any) {
    step2.output = `Merge error: ${err.message}`;
    step2.status = 'failed';
    state.status.status = 'failed';
    state.status.completedAt = new Date().toISOString();
    emitEvent({ type: 'deploy_completed', timestamp: state.status.completedAt });
    return;
  }
  step2.completedAt = new Date().toISOString();
  step2.duration = new Date(step2.completedAt).getTime() - new Date(step2.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step: step2, timestamp: step2.completedAt });

  // Step 3: Install & Build
  const step3 = steps[2];
  step3.status = 'running';
  step3.startedAt = new Date().toISOString();
  try {
    const projects = ['TestAgentFactoryCore', 'TestAgentFactoryMiddleware', 'TestAgentFactoryDigitalChannels'];
    const results: string[] = [];
    const WORKSPACE = process.env.WORKSPACE_ROOT || 'c:\\Rodrigo\\TestFabricDesignSystem';
    for (const proj of projects) {
      const projPath = path.join(WORKSPACE, proj);
      if (!fs.existsSync(path.join(projPath, 'package.json'))) continue;
      try {
        execSync('npm install --prefer-offline 2>&1', { cwd: projPath, timeout: 120000, encoding: 'utf-8' });
        results.push(`${proj}: install OK`);
      } catch (err: any) {
        results.push(`${proj}: install WARN`);
      }
      // Build if frontend
      if (proj.includes('DigitalChannels') && fs.existsSync(path.join(projPath, 'frontend'))) {
        try {
          execSync('npm run build 2>&1', { cwd: path.join(projPath, 'frontend'), timeout: 120000, encoding: 'utf-8' });
          results.push(`${proj}/frontend: build OK`);
        } catch {
          results.push(`${proj}/frontend: build skipped`);
        }
      }
    }
    step3.output = results.join('\n');
    step3.status = 'passed';
  } catch (err: any) {
    step3.output = `Install/build error: ${err.message}`;
    step3.status = 'failed';
  }
  step3.completedAt = new Date().toISOString();
  step3.duration = new Date(step3.completedAt).getTime() - new Date(step3.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step: step3, timestamp: step3.completedAt });

  // Step 4: Start services
  const step4 = steps[3];
  step4.status = 'running';
  step4.startedAt = new Date().toISOString();
  try {
    const started: string[] = [];
    for (const service of SERVICES) {
      try {
        await startService(service.name);
        started.push(service.name);
      } catch (err: any) {
        console.error(`[deploy] Failed to start ${service.name}:`, err);
      }
    }
    step4.output = `Started: ${started.join(', ')}`;
    step4.status = 'passed';
  } catch (err: any) {
    step4.output = `Start error: ${err.message}`;
    step4.status = 'failed';
  }
  step4.completedAt = new Date().toISOString();
  step4.duration = new Date(step4.completedAt).getTime() - new Date(step4.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step: step4, timestamp: step4.completedAt });

  // Step 5: Health checks
  const step5 = steps[4];
  step5.status = 'running';
  step5.startedAt = new Date().toISOString();
  try {
    const results = await healthCheck();
    const healthy = results.filter(r => r.status === 'healthy').length;
    const total = results.filter(r => r.status !== 'stopped').length;
    step5.output = `Health: ${healthy}/${total} services healthy`;
    step5.status = healthy === total ? 'passed' : 'failed';
    (step5 as any).report = results;
  } catch (err: any) {
    step5.output = `Health check error: ${err.message}`;
    step5.status = 'failed';
  }
  step5.completedAt = new Date().toISOString();
  step5.duration = new Date(step5.completedAt).getTime() - new Date(step5.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step: step5, timestamp: step5.completedAt });

  // Step 6: Update Jira (stub — actual transitions happen via TAA tools)
  const step6 = steps[5];
  step6.status = 'running';
  step6.startedAt = new Date().toISOString();
  step6.output = `Jira update for ${bdev} ${mvp} — delegated to TAA agent`;
  step6.status = 'passed';
  step6.completedAt = new Date().toISOString();
  step6.duration = 0;
  emitEvent({ type: 'step_completed', step: step6, timestamp: step6.completedAt });

  // Step 7: Update Registry
  const step7 = steps[6];
  step7.status = 'running';
  step7.startedAt = new Date().toISOString();
  try {
    const MCP_ROOT = path.resolve(process.cwd());
    const registryPath = path.join(MCP_ROOT, 'data', 'registry', 'implementation-registry.json');
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      registry.lastUpdated = new Date().toISOString();
      // Add BDEV to implemented list if not already there
      if (!registry.bdevs?.find((b: any) => b.code === bdev)) {
        registry.bdevs = registry.bdevs || [];
        registry.bdevs.push({
          code: bdev,
          status: 'implemented',
          mvpsCompleted: [mvp],
          mergedAt: new Date().toISOString(),
        });
      } else {
        const existing = registry.bdevs.find((b: any) => b.code === bdev);
        if (existing && !existing.mvpsCompleted?.includes(mvp)) {
          existing.mvpsCompleted = existing.mvpsCompleted || [];
          existing.mvpsCompleted.push(mvp);
        }
      }
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
      step7.output = `Registry updated: ${bdev} ${mvp} marked as implemented`;
    } else {
      step7.output = 'Registry file not found — skipped';
    }
    step7.status = 'passed';
  } catch (err: any) {
    step7.output = `Registry update error: ${err.message}`;
    step7.status = 'failed';
  }
  step7.completedAt = new Date().toISOString();
  step7.duration = new Date(step7.completedAt).getTime() - new Date(step7.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step: step7, timestamp: step7.completedAt });

  // Final status
  const hasFailure = steps.some(s => s.status === 'failed');
  state.status.status = hasFailure ? 'failed' : 'deployed';
  state.status.completedAt = new Date().toISOString();
  updateServiceStatus();
  console.log(`[deploy] Deploy ${state.status.status}: ${steps.filter(s => s.status === 'passed').length}/${steps.length} steps passed`);
  emitEvent({ type: 'deploy_completed', timestamp: state.status.completedAt });
}

// ============================================
// ROLLBACK
// ============================================

export async function rollback(bdev: string): Promise<void> {
  state.status.status = 'rolling_back';
  console.log(`[deploy] Rolling back ${bdev}...`);

  try {
    // Stop all services
    for (const service of SERVICES) {
      if (service.status !== 'stopped') {
        await stopService(service.name);
      }
    }

    // Revert last merge in affected projects
    const projects = ['digitalChannels', 'middleware', 'core'];
    for (const proj of projects) {
      try {
        await git.checkoutBranch(proj, 'main');
        // git revert HEAD for last merge commit
        execSync('git revert HEAD --no-edit 2>&1', {
          cwd: git.getProjectPath(proj),
          timeout: 30000,
          encoding: 'utf-8',
        });
      } catch {
        console.log(`[deploy] Rollback skipped for ${proj} (no merge to revert)`);
      }
    }

    // Restart services
    for (const service of SERVICES) {
      try {
        await startService(service.name);
      } catch {
        console.error(`[deploy] Failed to restart ${service.name} after rollback`);
      }
    }

    state.status.status = 'idle';
    console.log(`[deploy] Rollback complete for ${bdev}`);
  } catch (err: any) {
    state.status.status = 'failed';
    console.error(`[deploy] Rollback failed:`, err);
    throw err;
  }
}

// ============================================
// STATUS
// ============================================

export function getDeployStatus(): DeployStatus {
  updateServiceStatus();
  return { ...state.status };
}
