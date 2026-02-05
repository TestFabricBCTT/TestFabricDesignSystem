/**
 * Prototype Storage Module
 * Handles persistence of prototypes with versioning
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for prototypes
const DATA_DIR = path.join(__dirname, '../../data/prototypes');

// ============================================
// TYPES
// ============================================

export interface ScreenComponent {
  type: string;
  props: Record<string, unknown>;
  children?: ScreenComponent[];
  i18nKey?: string;
}

export interface GeneratedScreen {
  screenId: string;
  screenName: string;
  userStory?: string;
  components: ScreenComponent[];
  code: string;  // Generated TSX code
  translations: {
    pt: Record<string, string>;
    en: Record<string, string>;
  };
}

export interface Journey {
  id: string;
  name: string;
  screens: string[];  // Screen IDs in order
  userStories: string[];
}

export interface ChangelogEntry {
  timestamp: string;
  action: 'created' | 'updated' | 'approved_fa' | 'approved_client' | 'finalized';
  description: string;
  changedBy: 'FA' | 'Client' | 'PA';
  details?: Record<string, unknown>;
}

export interface PrototypeRecord {
  id: string;
  bdevCode: string;
  version: number;
  status: 'draft' | 'fa_approved' | 'client_approved' | 'final';
  createdAt: string;
  updatedAt: string;
  approvedBy: 'FA' | 'Client' | null;
  journeySnapshot: Journey[];
  screens: GeneratedScreen[];
  changelog: ChangelogEntry[];
  appCode?: string;  // Generated App.tsx with routes
  translationsJson?: {
    pt: Record<string, string>;
    en: Record<string, string>;
  };
}

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

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Ensures the data directory exists
 */
function ensureDataDir(bdevCode?: string): string {
  const baseDir = DATA_DIR;
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  if (bdevCode) {
    const bdevDir = path.join(baseDir, bdevCode);
    if (!fs.existsSync(bdevDir)) {
      fs.mkdirSync(bdevDir, { recursive: true });
    }
    return bdevDir;
  }

  return baseDir;
}

/**
 * Generates a unique prototype ID
 */
function generateId(): string {
  return `proto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gets the file path for a prototype version
 */
function getPrototypePath(bdevCode: string, version: number): string {
  const dir = ensureDataDir(bdevCode);
  return path.join(dir, `v${version}.json`);
}

/**
 * Gets the latest version number for a BDEV
 */
export function getLatestVersion(bdevCode: string): number {
  const dir = ensureDataDir(bdevCode);
  const files = fs.readdirSync(dir).filter(f => f.match(/^v\d+\.json$/));

  if (files.length === 0) return 0;

  const versions = files.map(f => parseInt(f.replace('v', '').replace('.json', '')));
  return Math.max(...versions);
}

/**
 * Saves a prototype record
 */
export function savePrototype(prototype: PrototypeRecord): void {
  const filePath = getPrototypePath(prototype.bdevCode, prototype.version);
  fs.writeFileSync(filePath, JSON.stringify(prototype, null, 2), 'utf-8');

  // Update latest symlink/reference
  const latestPath = path.join(ensureDataDir(prototype.bdevCode), 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify({ version: prototype.version, id: prototype.id }), 'utf-8');
}

/**
 * Loads a prototype by BDEV code and version
 */
export function loadPrototype(bdevCode: string, version?: number): PrototypeRecord | null {
  const targetVersion = version ?? getLatestVersion(bdevCode);
  if (targetVersion === 0) return null;

  const filePath = getPrototypePath(bdevCode, targetVersion);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as PrototypeRecord;
}

/**
 * Loads a prototype by ID
 */
export function loadPrototypeById(id: string): PrototypeRecord | null {
  const baseDir = ensureDataDir();
  const bdevDirs = fs.readdirSync(baseDir).filter(f => {
    const stat = fs.statSync(path.join(baseDir, f));
    return stat.isDirectory();
  });

  for (const bdevCode of bdevDirs) {
    const bdevDir = path.join(baseDir, bdevCode);
    const files = fs.readdirSync(bdevDir).filter(f => f.match(/^v\d+\.json$/));

    for (const file of files) {
      const filePath = path.join(bdevDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const prototype = JSON.parse(content) as PrototypeRecord;
      if (prototype.id === id) return prototype;
    }
  }

  return null;
}

/**
 * Lists all prototypes, optionally filtered by BDEV
 */
export function listPrototypes(bdevCode?: string): PrototypeSummary[] {
  const baseDir = ensureDataDir();
  const summaries: PrototypeSummary[] = [];

  const bdevDirs = bdevCode
    ? [bdevCode]
    : fs.readdirSync(baseDir).filter(f => {
        const stat = fs.statSync(path.join(baseDir, f));
        return stat.isDirectory();
      });

  for (const bdev of bdevDirs) {
    const bdevDir = path.join(baseDir, bdev);
    if (!fs.existsSync(bdevDir)) continue;

    const files = fs.readdirSync(bdevDir).filter(f => f.match(/^v\d+\.json$/));

    for (const file of files) {
      const filePath = path.join(bdevDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const prototype = JSON.parse(content) as PrototypeRecord;

      summaries.push({
        id: prototype.id,
        bdevCode: prototype.bdevCode,
        version: prototype.version,
        status: prototype.status,
        createdAt: prototype.createdAt,
        updatedAt: prototype.updatedAt,
        screenCount: prototype.screens.length,
        approvedBy: prototype.approvedBy,
      });
    }
  }

  // Sort by updatedAt descending
  summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return summaries;
}

/**
 * Creates a new prototype
 */
export function createPrototype(
  bdevCode: string,
  journeys: Journey[],
  screens: GeneratedScreen[],
  approvedBy: 'FA' | 'Client' | null = null
): PrototypeRecord {
  const version = getLatestVersion(bdevCode) + 1;
  const now = new Date().toISOString();

  const prototype: PrototypeRecord = {
    id: generateId(),
    bdevCode,
    version,
    status: approvedBy === 'Client' ? 'client_approved' : approvedBy === 'FA' ? 'fa_approved' : 'draft',
    createdAt: now,
    updatedAt: now,
    approvedBy,
    journeySnapshot: journeys,
    screens,
    changelog: [{
      timestamp: now,
      action: 'created',
      description: `Prototype v${version} created`,
      changedBy: 'PA',
    }],
  };

  savePrototype(prototype);
  return prototype;
}

/**
 * Updates an existing prototype (creates new version)
 */
export function updatePrototype(
  bdevCode: string,
  screens: GeneratedScreen[],
  journeys: Journey[],
  changedBy: 'FA' | 'Client' | 'PA',
  description: string
): PrototypeRecord {
  const currentPrototype = loadPrototype(bdevCode);
  const version = getLatestVersion(bdevCode) + 1;
  const now = new Date().toISOString();

  const newPrototype: PrototypeRecord = {
    id: generateId(),
    bdevCode,
    version,
    status: changedBy === 'Client' ? 'client_approved' : changedBy === 'FA' ? 'fa_approved' : 'draft',
    createdAt: now,
    updatedAt: now,
    approvedBy: changedBy === 'PA' ? null : changedBy,
    journeySnapshot: journeys,
    screens,
    changelog: [
      ...(currentPrototype?.changelog || []),
      {
        timestamp: now,
        action: 'updated',
        description,
        changedBy,
      },
    ],
  };

  savePrototype(newPrototype);
  return newPrototype;
}

/**
 * Marks a prototype as approved
 */
export function approvePrototype(
  bdevCode: string,
  version: number,
  approvedBy: 'FA' | 'Client'
): PrototypeRecord | null {
  const prototype = loadPrototype(bdevCode, version);
  if (!prototype) return null;

  const now = new Date().toISOString();
  prototype.status = approvedBy === 'Client' ? 'client_approved' : 'fa_approved';
  prototype.approvedBy = approvedBy;
  prototype.updatedAt = now;
  prototype.changelog.push({
    timestamp: now,
    action: approvedBy === 'Client' ? 'approved_client' : 'approved_fa',
    description: `Prototype approved by ${approvedBy}`,
    changedBy: approvedBy,
  });

  savePrototype(prototype);
  return prototype;
}

/**
 * Marks a prototype as final
 */
export function finalizePrototype(bdevCode: string, version: number): PrototypeRecord | null {
  const prototype = loadPrototype(bdevCode, version);
  if (!prototype) return null;

  const now = new Date().toISOString();
  prototype.status = 'final';
  prototype.updatedAt = now;
  prototype.changelog.push({
    timestamp: now,
    action: 'finalized',
    description: 'Prototype finalized',
    changedBy: 'PA',
  });

  savePrototype(prototype);
  return prototype;
}

/**
 * Gets prototype history for a BDEV
 */
export function getPrototypeHistory(bdevCode: string): PrototypeSummary[] {
  return listPrototypes(bdevCode);
}

/**
 * Checks if a prototype exists for a BDEV
 */
export function prototypeExists(bdevCode: string): boolean {
  return getLatestVersion(bdevCode) > 0;
}
