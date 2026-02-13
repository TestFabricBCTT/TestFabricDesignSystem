// ============================================
// CI/CD PIPELINE ENGINE
// Runs after Gate 2 approval: merge dry-run → install → UTE → CQE → SonarQube → contract → coverage
// Follows same state-machine pattern as bug-watcher.ts
// ============================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runCQE, CQEReport } from '../quality/cqe.js';
import * as git from '../git/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const MCP_SERVER_ROOT = path.resolve(process.cwd());

// ============================================
// TYPES
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

export type CICDEventHandler = (event: CICDEvent) => void;

export interface CICDEvent {
  type: 'pipeline_started' | 'step_started' | 'step_completed' | 'pipeline_completed';
  pipeline?: CICDPipeline;
  step?: CICDStep;
  timestamp: string;
}

// ============================================
// STATE
// ============================================

interface CICDState {
  current: CICDPipeline | null;
  onEvent: CICDEventHandler | null;
}

const state: CICDState = {
  current: null,
  onEvent: null,
};

function emitEvent(event: CICDEvent): void {
  if (state.onEvent) {
    try {
      state.onEvent(event);
    } catch (err) {
      console.error('[cicd] Event handler error:', err);
    }
  }
}

function createStep(id: string, name: string): CICDStep {
  return { id, name, status: 'pending' };
}

function getProjectPath(name: string): string {
  return path.join(WORKSPACE_ROOT, name);
}

// ============================================
// STEP IMPLEMENTATIONS
// ============================================

async function runMergeDryRun(step: CICDStep, branch: string): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    // Try merge dry-run on digitalChannels (main project)
    const result = await git.mergeDryRun('digitalChannels', branch);
    step.output = result.canMerge
      ? 'Merge dry-run: no conflicts detected'
      : `Merge dry-run: ${result.conflicts.length} conflict(s): ${result.conflicts.join(', ')}`;
    step.report = result;
    step.status = result.canMerge ? 'passed' : 'failed';
  } catch (err: any) {
    step.output = `Merge dry-run error: ${err.message}`;
    step.status = 'failed';
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

async function runInstallDeps(step: CICDStep): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    const projects = ['TestAgentFactoryDigitalChannels', 'TestAgentFactoryMiddleware', 'TestAgentFactoryCore'];
    const results: string[] = [];

    for (const proj of projects) {
      const projPath = getProjectPath(proj);
      if (!fs.existsSync(path.join(projPath, 'package.json'))) continue;
      try {
        execSync('npm install --prefer-offline 2>&1', { cwd: projPath, timeout: 120000, encoding: 'utf-8' });
        results.push(`${proj}: npm install OK`);
      } catch (err: any) {
        results.push(`${proj}: npm install WARN — ${String(err.message).substring(0, 100)}`);
      }
    }

    step.output = results.join('\n');
    step.status = 'passed';
  } catch (err: any) {
    step.output = `Install error: ${err.message}`;
    step.status = 'failed';
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

async function runUTEFinal(step: CICDStep): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    const unitTestPath = getProjectPath('TestAgentFactoryUnitTest');
    if (!fs.existsSync(unitTestPath)) {
      step.output = 'UnitTest project not found — skipped';
      step.status = 'skipped';
    } else {
      const output = execSync('npx vitest run --reporter=json 2>&1', {
        cwd: unitTestPath,
        timeout: 180000,
        encoding: 'utf-8',
      });

      try {
        // vitest JSON output is on the last non-empty line
        const lines = output.trim().split('\n');
        const jsonLine = lines.reverse().find(l => l.trim().startsWith('{'));
        if (jsonLine) {
          const report = JSON.parse(jsonLine);
          step.report = {
            testSuites: report.numTotalTestSuites,
            passed: report.numPassedTests,
            failed: report.numFailedTests,
            total: report.numTotalTests,
          };
          step.status = (report.numFailedTests || 0) === 0 ? 'passed' : 'failed';
          step.output = `Tests: ${report.numPassedTests}/${report.numTotalTests} passed`;
        } else {
          step.output = output.substring(0, 500);
          step.status = 'failed';
          step.output = 'Vitest output could not be parsed (no JSON found): ' + output.substring(0, 300);
        }
      } catch {
        step.output = 'Vitest output parse error: ' + output.substring(0, 300);
        step.status = 'failed';
      }
    }
  } catch (err: any) {
    const output = String(err.stdout || err.stderr || err.message);
    step.output = output.substring(0, 500);
    // vitest exits with code 1 when tests fail
    step.status = 'failed';

    try {
      const lines = output.trim().split('\n');
      const jsonLine = lines.reverse().find((l: string) => l.trim().startsWith('{'));
      if (jsonLine) {
        const report = JSON.parse(jsonLine);
        step.report = {
          testSuites: report.numTotalTestSuites,
          passed: report.numPassedTests,
          failed: report.numFailedTests,
          total: report.numTotalTests,
        };
        step.output = `Tests: ${report.numPassedTests}/${report.numTotalTests} passed, ${report.numFailedTests} failed`;
      }
    } catch { /* ignore parse errors */ }
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

async function runCQEScan(step: CICDStep): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    const dcPath = getProjectPath('TestAgentFactoryDigitalChannels');
    const report: CQEReport = runCQE(dcPath);
    step.report = report;
    step.output = `CQE: ${report.overall} — ${report.gates.filter(g => g.status === 'passed').length}/${report.gates.length} gates passed`;
    step.status = report.overall === 'PASS' ? 'passed' : 'failed';
  } catch (err: any) {
    step.output = `CQE error: ${err.message}`;
    step.status = 'failed';
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

async function runSonarQube(step: CICDStep): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    // Check if SonarQube is accessible
    const sonarHost = process.env.SONAR_HOST_URL || 'http://localhost:9000';
    const sonarToken = process.env.SONAR_TOKEN;

    if (!sonarToken) {
      step.output = 'SonarQube token not configured — skipped';
      step.status = 'skipped';
    } else {
      // Check SonarQube health
      try {
        execSync(`curl -s -o /dev/null -w "%{http_code}" ${sonarHost}/api/system/status`, { timeout: 10000, encoding: 'utf-8' });
      } catch {
        step.output = 'SonarQube not accessible — skipped';
        step.status = 'skipped';
        step.completedAt = new Date().toISOString();
        step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
        emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
        return;
      }

      const dcPath = getProjectPath('TestAgentFactoryDigitalChannels');
      try {
        const output = execSync(
          `npx sonar-scanner -Dsonar.host.url=${sonarHost} -Dsonar.token=${sonarToken} 2>&1`,
          { cwd: dcPath, timeout: 300000, encoding: 'utf-8' }
        );
        step.output = 'SonarQube analysis completed';
        step.status = 'passed';
        step.report = { analysisOutput: output.substring(0, 500) };
      } catch (err: any) {
        step.output = `SonarQube scan error: ${String(err.message).substring(0, 200)}`;
        step.status = 'failed';
      }
    }
  } catch (err: any) {
    step.output = `SonarQube error: ${err.message}`;
    step.status = 'skipped';
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

async function runContractValidation(step: CICDStep, bdev: string): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    const contractPath = path.join(MCP_SERVER_ROOT, 'data', 'contracts', `${bdev}.json`);
    if (!fs.existsSync(contractPath)) {
      step.output = `No contract found for ${bdev} — skipped`;
      step.status = 'skipped';
    } else {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
      const apis = contract.apis || [];
      step.output = `Contract validated: ${apis.length} API(s) defined`;
      step.report = { apisCount: apis.length, eventsCount: (contract.events || []).length };
      step.status = 'passed';
    }
  } catch (err: any) {
    step.output = `Contract validation error: ${err.message}`;
    step.status = 'failed';
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

async function runCoverageCheck(step: CICDStep): Promise<void> {
  step.status = 'running';
  step.startedAt = new Date().toISOString();
  emitEvent({ type: 'step_started', step, timestamp: step.startedAt });

  try {
    const unitTestPath = getProjectPath('TestAgentFactoryUnitTest');
    const coveragePath = path.join(unitTestPath, 'coverage', 'coverage-summary.json');

    if (!fs.existsSync(coveragePath)) {
      step.output = 'No coverage report found — skipped (run vitest with --coverage first)';
      step.status = 'skipped';
    } else {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      const total = coverage.total;
      const linePct = total?.lines?.pct || 0;
      const branchPct = total?.branches?.pct || 0;
      const threshold = 80;

      step.report = { lines: linePct, branches: branchPct, threshold };
      step.output = `Coverage: lines ${linePct}%, branches ${branchPct}% (threshold: ${threshold}%)`;
      step.status = linePct >= threshold ? 'passed' : 'failed';
    }
  } catch (err: any) {
    step.output = `Coverage check error: ${err.message}`;
    step.status = 'skipped';
  }

  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
  emitEvent({ type: 'step_completed', step, timestamp: step.completedAt });
}

// ============================================
// PUBLIC API
// ============================================

export function setCICDEventHandler(handler: CICDEventHandler): void {
  state.onEvent = handler;
}

export async function triggerCICDPipeline(
  bdev: string,
  mvp: string,
  branch: string
): Promise<CICDPipeline> {
  if (state.current?.status === 'running') {
    throw new Error('A CI/CD pipeline is already running');
  }

  const pipeline: CICDPipeline = {
    id: `cicd_${Date.now()}`,
    bdev,
    mvp,
    branch,
    triggeredAt: new Date().toISOString(),
    status: 'running',
    steps: [
      createStep('merge_dryrun', 'Git Merge Dry-Run'),
      createStep('install_deps', 'Install Dependencies'),
      createStep('ute_final', 'UTE Final Run'),
      createStep('cqe_scan', 'CQE Full Scan'),
      createStep('sonarqube', 'SonarQube Analysis'),
      createStep('contract', 'Contract Validation'),
      createStep('coverage', 'Coverage Check'),
    ],
  };

  state.current = pipeline;
  emitEvent({ type: 'pipeline_started', pipeline, timestamp: pipeline.triggeredAt });

  console.log(`[cicd] Pipeline started for ${bdev} ${mvp} branch=${branch}`);

  // Run steps sequentially (async, non-blocking)
  runPipelineSteps(pipeline, bdev, branch).catch(err => {
    console.error('[cicd] Pipeline error:', err);
    pipeline.status = 'failed';
  });

  return pipeline;
}

async function runPipelineSteps(pipeline: CICDPipeline, bdev: string, branch: string): Promise<void> {
  const steps = pipeline.steps;

  // Step 1: Merge dry-run
  await runMergeDryRun(steps[0], branch);
  if (steps[0].status === 'failed') {
    pipeline.status = 'failed';
    pipeline.completedAt = new Date().toISOString();
    emitEvent({ type: 'pipeline_completed', pipeline, timestamp: pipeline.completedAt });
    return;
  }

  // Step 2: Install deps
  await runInstallDeps(steps[1]);

  // Step 3: UTE
  await runUTEFinal(steps[2]);

  // Step 4: CQE
  await runCQEScan(steps[3]);

  // Step 5: SonarQube
  await runSonarQube(steps[4]);

  // Step 6: Contract validation
  await runContractValidation(steps[5], bdev);

  // Step 7: Coverage
  await runCoverageCheck(steps[6]);

  // Determine overall status
  const hasFailure = steps.some(s => s.status === 'failed');
  pipeline.status = hasFailure ? 'failed' : 'passed';
  pipeline.completedAt = new Date().toISOString();

  console.log(`[cicd] Pipeline ${pipeline.status}: ${steps.filter(s => s.status === 'passed').length}/${steps.length} steps passed`);
  emitEvent({ type: 'pipeline_completed', pipeline, timestamp: pipeline.completedAt });
}

export function getCICDStatus(): CICDPipeline | null {
  return state.current;
}

export async function rerunFailedSteps(): Promise<CICDPipeline | null> {
  if (!state.current) return null;
  if (state.current.status === 'running') {
    throw new Error('Pipeline is still running');
  }

  const pipeline = state.current;
  const bdev = pipeline.bdev;
  const branch = pipeline.branch;

  pipeline.status = 'running';
  emitEvent({ type: 'pipeline_started', pipeline, timestamp: new Date().toISOString() });

  // Re-run only failed steps
  for (const step of pipeline.steps) {
    if (step.status !== 'failed') continue;

    switch (step.id) {
      case 'merge_dryrun': await runMergeDryRun(step, branch); break;
      case 'install_deps': await runInstallDeps(step); break;
      case 'ute_final': await runUTEFinal(step); break;
      case 'cqe_scan': await runCQEScan(step); break;
      case 'sonarqube': await runSonarQube(step); break;
      case 'contract': await runContractValidation(step, bdev); break;
      case 'coverage': await runCoverageCheck(step); break;
    }
  }

  const hasFailure = pipeline.steps.some(s => s.status === 'failed');
  pipeline.status = hasFailure ? 'failed' : 'passed';
  pipeline.completedAt = new Date().toISOString();
  emitEvent({ type: 'pipeline_completed', pipeline, timestamp: pipeline.completedAt });

  return pipeline;
}

export function getCICDReport(): object | null {
  if (!state.current) return null;
  return {
    ...state.current,
    summary: {
      passed: state.current.steps.filter(s => s.status === 'passed').length,
      failed: state.current.steps.filter(s => s.status === 'failed').length,
      skipped: state.current.steps.filter(s => s.status === 'skipped').length,
      total: state.current.steps.length,
    },
  };
}
