// ============================================
// DEPLOY — SERVICE DEFINITIONS
// Defines managed services with ports, health URLs, PIDs
// ============================================

import { ChildProcess } from 'child_process';
import path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'c:\\Rodrigo\\TestFabricDesignSystem';

export interface ManagedService {
  name: string;
  project: string;        // absolute path
  command: string;        // npm script to run
  port: number;
  healthUrl: string;
  process?: ChildProcess;
  pid?: number;
  status: 'stopped' | 'starting' | 'running' | 'error';
  lastError?: string;
}

export const SERVICES: ManagedService[] = [
  {
    name: 'core-api',
    project: path.join(WORKSPACE_ROOT, 'TestAgentFactoryCore'),
    command: 'npm start',
    port: 4001,
    healthUrl: 'http://localhost:4001/health',
    status: 'stopped',
  },
  {
    name: 'core-backoffice',
    project: path.join(WORKSPACE_ROOT, 'TestAgentFactoryCore'),
    command: 'npm run dev:backoffice',
    port: 4002,
    healthUrl: 'http://localhost:4002',
    status: 'stopped',
  },
  {
    name: 'middleware',
    project: path.join(WORKSPACE_ROOT, 'TestAgentFactoryMiddleware'),
    command: 'npm start',
    port: 4010,
    healthUrl: 'http://localhost:4010/health',
    status: 'stopped',
  },
  {
    name: 'dc-bff',
    project: path.join(WORKSPACE_ROOT, 'TestAgentFactoryDigitalChannels'),
    command: 'npm run start:bff',
    port: 4020,
    healthUrl: 'http://localhost:4020/health',
    status: 'stopped',
  },
  {
    name: 'dc-frontend',
    project: path.join(WORKSPACE_ROOT, 'TestAgentFactoryDigitalChannels'),
    command: 'npm run dev',
    port: 5173,
    healthUrl: 'http://localhost:5173',
    status: 'stopped',
  },
];

export function getService(name: string): ManagedService | undefined {
  return SERVICES.find(s => s.name === name);
}

export function getAffectedServices(projects: string[]): ManagedService[] {
  return SERVICES.filter(s => projects.some(p => s.project.includes(p)));
}
