/**
 * TAA Contract Documentation Generators
 * Generates SVG diagrams, HTML documentation, and Jira ADF comments
 * from Interface Contract data.
 */

export interface ImplementationTask {
  description: string;
  user_story_key: string;
}

export interface DeepDiveEntry {
  system?: string;
  data_flow_summary?: string;
  architecture_notes?: string;
  gaps?: string[];
  recommendations?: string[];
  implementation_tasks?: ImplementationTask[];
}

/** Normalize implementation_tasks — handles old string[] format and new object[] format */
export function normalizeImplTasks(tasks: unknown): ImplementationTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(t => typeof t === 'string' ? { description: t, user_story_key: '' } : t);
}

export interface ContractData {
  version: string;
  bdev_code: string;
  generated_at: string;
  generated_by: string;
  apis: Array<{
    method: string;
    path: string;
    description: string;
    request_body?: Record<string, unknown>;
    response_body?: Record<string, unknown>;
    error_codes?: string[];
  }>;
  events: Array<{
    name: string;
    payload?: Record<string, unknown>;
    source?: string;
    target?: string;
  }>;
  shared_types: Record<string, unknown>;
  microservices?: Array<{
    name: string;
    system: string;
    mount_path: string;
    port?: number;
    routes?: Array<{ method: string; path: string; description?: string; downstream?: string }>;
    dependencies?: string[];
    tech_stack?: string[];
  }>;
  pages?: Array<{
    name: string;
    route: string;
    auth_required?: boolean;
    components?: string[];
    api_calls?: string[];
    cache_reads?: string[];
    cache_writes?: string[];
  }>;
  cache_strategy?: {
    storage_type?: string;
    items?: Array<{ key: string; written_by?: string; read_by?: string[]; cleared_on?: string; ttl?: string }>;
    server_cache?: boolean;
    notes?: string;
  };
  event_strategy?: {
    pattern?: string;
    events_consumed?: string[];
    events_declared_not_consumed?: string[];
    retry_logic?: string;
    notes?: string;
  };
  // v2.1: array of per-system deep dives
  deep_dives?: DeepDiveEntry[];
  // v2.0 backward compat (deprecated)
  deep_dive?: DeepDiveEntry;
}

/** Resolve deep dives from contract (v2.1 array or v2.0 single object) */
export function resolveDeepDives(contract: ContractData): DeepDiveEntry[] {
  if (contract.deep_dives && contract.deep_dives.length > 0) return contract.deep_dives;
  if (contract.deep_dive) return [contract.deep_dive];
  return [];
}

// ============================================================
// SVG COMMON DEFINITIONS
// ============================================================

const SVG_DEFS = `
  <defs>
    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2196F3"/><stop offset="100%" stop-color="#1976D2"/>
    </linearGradient>
    <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF9800"/><stop offset="100%" stop-color="#F57C00"/>
    </linearGradient>
    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4CAF50"/><stop offset="100%" stop-color="#388E3C"/>
    </linearGradient>
    <linearGradient id="gradGrey" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#607D8B"/><stop offset="100%" stop-color="#455A64"/>
    </linearGradient>
    <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9C27B0"/><stop offset="100%" stop-color="#7B1FA2"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FAFBFC"/><stop offset="100%" stop-color="#F0F2F5"/>
    </linearGradient>
    <filter id="shadow" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#00000022"/>
    </filter>
    <filter id="shadowLight" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#00000015"/>
    </filter>
    <marker id="arrowRest" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#37474F"/>
    </marker>
    <marker id="arrowSocket" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#7B1FA2"/>
    </marker>
  </defs>`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// SYSTEM CONFIG — colors, icons, labels
// ============================================================

interface SystemConfig {
  label: string;
  icon: string;
  gradient: string;
  bgFill: string;
  stroke: string;
  textColor: string;
  port?: string;
}

const SYSTEM_CONFIGS: Record<string, SystemConfig> = {
  digitalChannels: { label: 'Digital Channels', icon: '&#128187;', gradient: 'url(#gradBlue)', bgFill: '#E3F2FD', stroke: '#90CAF9', textColor: '#1565C0', port: ':5173 / :4020' },
  middleware: { label: 'Middleware', icon: '&#128274;', gradient: 'url(#gradOrange)', bgFill: '#FFF3E0', stroke: '#FFCC80', textColor: '#E65100', port: ':4010' },
  core: { label: 'Core', icon: '&#9881;', gradient: 'url(#gradGreen)', bgFill: '#E8F5E9', stroke: '#A5D6A7', textColor: '#2E7D32', port: ':4001' },
  docker: { label: 'Docker Services', icon: '&#128230;', gradient: 'url(#gradGrey)', bgFill: '#ECEFF1', stroke: '#B0BEC5', textColor: '#455A64' },
};

function getSystemConfig(system: string): SystemConfig {
  return SYSTEM_CONFIGS[system] || { label: system, icon: '&#9881;', gradient: 'url(#gradGrey)', bgFill: '#ECEFF1', stroke: '#B0BEC5', textColor: '#455A64' };
}

// ============================================================
// ARCHITECTURE SVG GENERATOR — shows what BDEV introduces
// ============================================================

export function generateArchitectureSvg(contract: ContractData): string {
  const { bdev_code, apis, events } = contract;
  const date = contract.generated_at?.substring(0, 10) || new Date().toISOString().substring(0, 10);
  const deepDives = resolveDeepDives(contract);
  const microservices = contract.microservices || [];
  const pages = contract.pages || [];

  // Determine impacted systems from deep dives, microservices, and APIs
  const impactedSystems = new Set<string>();
  deepDives.forEach(dd => { if (dd.system) impactedSystems.add(dd.system); });
  microservices.forEach(ms => impactedSystems.add(ms.system));
  if (pages.length > 0) impactedSystems.add('digitalChannels');
  // Infer from APIs if no deep dives available
  if (impactedSystems.size === 0) {
    apis.forEach(a => {
      if (a.path.includes('/auth') || a.path.includes('/accounts') || a.path.includes('/movements')) impactedSystems.add('digitalChannels');
      if (a.path.includes('/api/v1')) impactedSystems.add('middleware');
      if (a.path.includes('/clients') || a.path.includes('/api/auth')) impactedSystems.add('core');
    });
    if (events.length > 0) impactedSystems.add('core');
  }

  // Group content per system
  const systemData: Array<{ system: string; config: SystemConfig; apis: typeof apis; msCount: number; pageCount: number; eventCount: number; tasks: ImplementationTask[]; gaps: string[] }> = [];

  for (const sys of impactedSystems) {
    const config = getSystemConfig(sys);
    const dd = deepDives.find(d => d.system === sys);
    const sysMs = microservices.filter(ms => ms.system === sys);
    const sysPages = sys === 'digitalChannels' ? pages : [];

    // Collect APIs for this system from microservice routes
    const sysApiPaths = new Set<string>();
    sysMs.forEach(ms => (ms.routes || []).forEach(r => sysApiPaths.add(r.path)));
    const sysApis = sysApiPaths.size > 0
      ? apis.filter(a => sysApiPaths.has(a.path) || (ms => ms.some(m => a.path.startsWith(m.mount_path)))(sysMs))
      : [];
    // Fallback: if no microservice-based matching, use all APIs for single-system
    const displayApis = sysApis.length > 0 ? sysApis : (impactedSystems.size === 1 ? apis : []);

    const sysEvents = sys === 'core' ? events : [];

    systemData.push({
      system: sys,
      config,
      apis: displayApis,
      msCount: sysMs.length,
      pageCount: sysPages.length,
      eventCount: sysEvents.length,
      tasks: normalizeImplTasks(dd?.implementation_tasks),
      gaps: dd?.gaps || [],
    });
  }

  // Layout: systems side by side, equal columns
  const colCount = Math.max(systemData.length, 1);
  const svgW = Math.max(1200, colCount * 400 + 80);
  const colW = Math.floor((svgW - 80) / colCount);
  const colPad = 40;

  // Calculate max box height
  let maxBoxH = 300;
  for (const sd of systemData) {
    const apiH = Math.min(sd.apis.length, 8) * 20;
    const taskH = Math.min(sd.tasks.length, 6) * 16;
    const h = 200 + apiH + taskH + (sd.gaps.length > 0 ? 40 : 0);
    if (h > maxBoxH) maxBoxH = h;
  }

  // Events row below system boxes
  const eventsY = 100 + maxBoxH + 40;
  const eventRowH = events.length > 0 ? 50 + events.length * 18 : 0;

  // Summary row
  const summaryY = eventsY + eventRowH + (eventRowH > 0 ? 30 : 0);
  const totalTasks = deepDives.reduce((sum, dd) => sum + normalizeImplTasks(dd.implementation_tasks).length, 0);
  const totalGaps = deepDives.reduce((sum, dd) => sum + (dd.gaps || []).length, 0);
  const summaryH = 80;

  // Legend
  const legendY = summaryY + summaryH + 30;
  const legendH = 100;
  const totalH = legendY + legendH + 20;

  // Build system columns
  const systemBoxes = systemData.map((sd, i) => {
    const x = colPad + i * colW;
    const w = colW - 20;

    // API rows (max 8)
    const apiRows = sd.apis.slice(0, 8).map((api, j) => {
      const methodColor = api.method === 'GET' ? '#1565C0' : api.method === 'POST' ? '#E65100' : api.method === 'PUT' ? '#FF6F00' : api.method === 'DELETE' ? '#C62828' : '#37474F';
      const y = 230 + j * 20;
      return `
      <rect x="${x + 14}" y="${y - 12}" width="${w - 28}" height="17" rx="4" fill="${sd.config.bgFill}"/>
      <text x="${x + 20}" y="${y}" fill="${methodColor}" font-size="9" font-weight="700">${api.method}</text>
      <text x="${x + 60}" y="${y}" fill="#37474F" font-size="9">${esc(api.path.substring(0, 35))}</text>
      <rect x="${x + w - 60}" y="${y - 11}" width="42" height="14" rx="7" fill="#E8F5E9" stroke="#66BB6A" stroke-width="0.6"/>
      <text x="${x + w - 39}" y="${y - 1}" text-anchor="middle" fill="#2E7D32" font-size="7" font-weight="700">NOVO</text>`;
    }).join('');

    const apiEndY = 230 + Math.min(sd.apis.length, 8) * 20;

    // Task preview
    const taskRows = sd.tasks.slice(0, 4).map((task, j) => {
      const y = apiEndY + 20 + j * 16;
      return `<text x="${x + 20}" y="${y}" fill="#546E7A" font-size="8">&#9654; ${esc(task.description.substring(0, 50))}</text>`;
    }).join('\n    ');
    const taskEndY = apiEndY + 10 + Math.min(sd.tasks.length, 4) * 16;

    // Gaps badge
    const gapBadge = sd.gaps.length > 0
      ? `<rect x="${x + w - 90}" y="${taskEndY + 4}" width="78" height="18" rx="9" fill="#FFEBEE" stroke="#EF9A9A" stroke-width="0.6"/>
         <text x="${x + w - 51}" y="${taskEndY + 16}" text-anchor="middle" fill="#C62828" font-size="8" font-weight="600">${sd.gaps.length} lacuna${sd.gaps.length > 1 ? 's' : ''}</text>` : '';

    return `
  <!-- ${sd.config.label} -->
  <g filter="url(#shadow)">
    <rect x="${x}" y="100" width="${w}" height="${maxBoxH}" rx="10" fill="#FFF" stroke="${sd.config.stroke}" stroke-width="1"/>
    <rect x="${x}" y="100" width="${w}" height="42" rx="10" fill="${sd.config.gradient}"/>
    <rect x="${x}" y="130" width="${w}" height="12" fill="${sd.config.gradient}"/>
    <text x="${x + 20}" y="128" fill="#FFF" font-size="16">${sd.config.icon}</text>
    <text x="${x + 42}" y="127" fill="#FFF" font-size="14" font-weight="700">${esc(sd.config.label)}</text>
    ${sd.config.port ? `<rect x="${x + w - 90}" y="110" width="78" height="18" rx="9" fill="#FFF" opacity="0.25"/>
    <text x="${x + w - 51}" y="123" text-anchor="middle" fill="#FFF" font-size="9" font-weight="600">${sd.config.port}</text>` : ''}
  </g>
  <g filter="url(#shadowLight)">
    <rect x="${x + 12}" y="155" width="${w - 24}" height="55" rx="6" fill="${sd.config.bgFill}" stroke="${sd.config.stroke}" stroke-width="0.6"/>
    <text x="${x + 24}" y="172" fill="${sd.config.textColor}" font-size="10" font-weight="700">Impacto deste BDEV</text>
    <text x="${x + 24}" y="188" fill="#37474F" font-size="9">${sd.apis.length} APIs | ${sd.msCount} microserviços | ${sd.pageCount} páginas | ${sd.eventCount} eventos</text>
    <text x="${x + 24}" y="202" fill="#546E7A" font-size="8" font-style="italic">${sd.tasks.length} tarefas de implementação</text>
  </g>
  ${apiRows}
  ${sd.tasks.length > 0 ? `<text x="${x + 14}" y="${apiEndY + 6}" fill="#455A64" font-size="9" font-weight="600">Tarefas:</text>` : ''}
  ${taskRows}
  ${gapBadge}`;
  }).join('\n');

  // Arrows between systems (left-to-right flow)
  const arrows = systemData.length >= 2 ? systemData.slice(0, -1).map((_, i) => {
    const x1 = colPad + i * colW + colW - 20;
    const x2 = colPad + (i + 1) * colW;
    const y = 100 + maxBoxH / 2;
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#37474F" stroke-width="2" marker-end="url(#arrowRest)"/>`;
  }).join('\n  ') : '';

  // Events row
  const eventsSection = events.length > 0 ? `
  <g filter="url(#shadow)">
    <rect x="${colPad}" y="${eventsY}" width="${svgW - 80}" height="${eventRowH}" rx="10" fill="#FFF" stroke="#CE93D8" stroke-width="1" stroke-dasharray="6 3"/>
    <text x="${colPad + 20}" y="${eventsY + 24}" fill="#6A1B9A" font-size="12" font-weight="700">&#9889; Novos Eventos Socket.IO</text>
    ${events.map((ev, i) => `
    <rect x="${colPad + 20}" y="${eventsY + 38 + i * 18}" width="${svgW - 120}" height="15" rx="3" fill="#F3E5F5"/>
    <text x="${colPad + 30}" y="${eventsY + 50 + i * 18}" fill="#37474F" font-size="9"><tspan fill="#6A1B9A" font-weight="700">${esc(ev.name)}</tspan>  ${esc(ev.source || '')} &#8594; ${esc(ev.target || '')}</text>
    <rect x="${svgW - 150}" y="${eventsY + 39 + i * 18}" width="42" height="13" rx="6" fill="#E8F5E9" stroke="#66BB6A" stroke-width="0.5"/>
    <text x="${svgW - 129}" y="${eventsY + 49 + i * 18}" text-anchor="middle" fill="#2E7D32" font-size="7" font-weight="700">NOVO</text>`).join('')}
  </g>` : '';

  // Summary bar
  const summarySection = `
  <g filter="url(#shadowLight)">
    <rect x="${colPad}" y="${summaryY}" width="${svgW - 80}" height="${summaryH}" rx="10" fill="#FFF" stroke="#CFD8DC" stroke-width="1"/>
    <text x="${colPad + 20}" y="${summaryY + 28}" fill="#37474F" font-size="12" font-weight="700">Resumo do BDEV</text>
    <text x="${colPad + 20}" y="${summaryY + 50}" fill="#37474F" font-size="10">${impactedSystems.size} sistema${impactedSystems.size > 1 ? 's' : ''} impactado${impactedSystems.size > 1 ? 's' : ''} &#8226; ${apis.length} APIs novas &#8226; ${events.length} eventos novos &#8226; ${totalTasks} tarefas de implementação${totalGaps > 0 ? ` &#8226; ${totalGaps} lacunas identificadas` : ''}</text>
    <text x="${colPad + 20}" y="${summaryY + 68}" fill="#78909C" font-size="9" font-style="italic">Estratégia: ${esc((contract.event_strategy?.pattern || 'api-only').toUpperCase())} | ${(contract.pages || []).length} páginas | ${(contract.microservices || []).length} microserviços</text>
  </g>`;

  // Legend
  const legend = `
  <g filter="url(#shadowLight)">
    <rect x="${colPad}" y="${legendY}" width="${svgW - 80}" height="${legendH}" rx="10" fill="#FFF" stroke="#CFD8DC" stroke-width="1"/>
    <text x="${svgW / 2}" y="${legendY + 20}" text-anchor="middle" fill="#37474F" font-size="10" font-weight="700">LEGENDA</text>
    <rect x="${colPad + 30}" y="${legendY + 32}" width="14" height="14" rx="3" fill="url(#gradBlue)"/>
    <text x="${colPad + 52}" y="${legendY + 43}" fill="#37474F" font-size="9">Digital Channels</text>
    <rect x="${colPad + 200}" y="${legendY + 32}" width="14" height="14" rx="3" fill="url(#gradOrange)"/>
    <text x="${colPad + 222}" y="${legendY + 43}" fill="#37474F" font-size="9">Middleware</text>
    <rect x="${colPad + 340}" y="${legendY + 32}" width="14" height="14" rx="3" fill="url(#gradGreen)"/>
    <text x="${colPad + 362}" y="${legendY + 43}" fill="#37474F" font-size="9">Core</text>
    <rect x="${colPad + 460}" y="${legendY + 32}" width="42" height="14" rx="7" fill="#E8F5E9" stroke="#66BB6A" stroke-width="0.6"/>
    <text x="${colPad + 481}" y="${legendY + 43}" text-anchor="middle" fill="#2E7D32" font-size="7" font-weight="700">NOVO</text>
    <text x="${colPad + 510}" y="${legendY + 43}" fill="#37474F" font-size="9">API / Evento novo</text>
    <line x1="${colPad + 30}" y1="${legendY + 62}" x2="${colPad + 80}" y2="${legendY + 62}" stroke="#37474F" stroke-width="2" marker-end="url(#arrowRest)"/>
    <text x="${colPad + 90}" y="${legendY + 66}" fill="#37474F" font-size="9">Fluxo REST</text>
    <line x1="${colPad + 200}" y1="${legendY + 62}" x2="${colPad + 250}" y2="${legendY + 62}" stroke="#7B1FA2" stroke-width="2" stroke-dasharray="6 3" marker-end="url(#arrowSocket)"/>
    <text x="${colPad + 260}" y="${legendY + 66}" fill="#37474F" font-size="9">Socket.IO</text>
    <text x="${svgW / 2}" y="${legendY + 88}" text-anchor="middle" fill="#90A4AE" font-size="8">BCTT Agent Factory &#8212; TAA &#8212; ${date}</text>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${totalH}" width="${svgW}" height="${totalH}" font-family="Arial, Helvetica, sans-serif">
  ${SVG_DEFS}
  <rect width="${svgW}" height="${totalH}" fill="url(#bgGrad)"/>

  <!-- Title -->
  <rect x="0" y="0" width="${svgW}" height="72" fill="#263238" opacity="0.95"/>
  <text x="${svgW / 2}" y="32" text-anchor="middle" fill="#FFF" font-size="20" font-weight="700">${esc(bdev_code)} &#8212; Alterações de Arquitectura</text>
  <text x="${svgW / 2}" y="54" text-anchor="middle" fill="#B0BEC5" font-size="12">O que este BDEV introduz &#8212; Interface Contract v${contract.version} &#8212; ${date}</text>
  <rect x="${svgW / 2 - 180}" y="62" width="360" height="2" rx="1" fill="#2196F3" opacity="0.7"/>

  ${systemBoxes}
  ${arrows}
  ${eventsSection}
  ${summarySection}
  ${legend}
</svg>`;
}

// ============================================================
// DEEP DIVE SVG GENERATOR — per system
// ============================================================

export function generateDeepDiveSvg(contract: ContractData, systemDeepDive: DeepDiveEntry): string {
  const { bdev_code, events } = contract;
  const date = contract.generated_at?.substring(0, 10) || new Date().toISOString().substring(0, 10);
  const systemName = systemDeepDive.system || 'System';
  const config = getSystemConfig(systemName);

  // Filter contract data for this system
  const microservices = (contract.microservices || []).filter(ms => ms.system === systemName);
  const pages = systemName === 'digitalChannels' ? (contract.pages || []) : [];
  const cacheStrategy = systemName === 'digitalChannels' ? contract.cache_strategy : undefined;
  const eventStrategy = systemName === 'digitalChannels' ? contract.event_strategy : undefined;

  // Build pages section
  const pageBoxes = pages.map((page, i) => {
    const x = 60 + i * 320;
    const w = 300;
    const authBadge = page.auth_required
      ? `<rect x="${x + w - 80}" y="${159}" width="68" height="18" rx="9" fill="#E65100"/><text x="${x + w - 46}" y="${171}" text-anchor="middle" fill="#FFF" font-size="8" font-weight="700">AUTH</text>`
      : `<rect x="${x + w - 80}" y="${159}" width="68" height="18" rx="9" fill="#4CAF50"/><text x="${x + w - 46}" y="${171}" text-anchor="middle" fill="#FFF" font-size="8" font-weight="700">PUBLIC</text>`;
    const apiLines = (page.api_calls || []).map((call, j) =>
      `<text x="${x + 14}" y="${220 + j * 16}" fill="#37474F" font-size="10">&#9654; ${esc(call)}</text>`
    ).join('\n    ');
    const cacheLines = [
      ...(page.cache_reads || []).map(c => `reads ${c}`),
      ...(page.cache_writes || []).map(c => `writes ${c}`),
    ];
    const cacheY = 220 + (page.api_calls || []).length * 16;
    const cacheLinesStr = cacheLines.map((c, j) =>
      `<text x="${x + 14}" y="${cacheY + 16 + j * 14}" fill="#2E7D32" font-size="9">&#128190; ${esc(c)}</text>`
    ).join('\n    ');
    const boxH = Math.max(140, 80 + (page.api_calls || []).length * 16 + cacheLines.length * 14 + 30);

    return `
  <g filter="url(#shadowLight)">
    <rect x="${x}" y="155" width="${w}" height="${boxH}" rx="8" fill="#E3F2FD" stroke="#90CAF9" stroke-width="0.8"/>
    <rect x="${x}" y="155" width="${w}" height="28" rx="8" fill="#1E88E5" opacity="0.12"/>
    <rect x="${x}" y="175" width="${w}" height="8" fill="#1E88E5" opacity="0.12"/>
    <text x="${x + 14}" y="${174}" fill="#1565C0" font-size="11" font-weight="700">${esc(page.name)}</text>
    <rect x="${x + 14}" y="${184}" width="auto" height="16" rx="8" fill="#BBDEFB"/>
    <text x="${x + 20}" y="${196}" fill="#1565C0" font-size="8" font-weight="600">${esc(page.route)}</text>
    ${authBadge}
    ${apiLines}
    ${cacheLinesStr}
  </g>`;
  }).join('');

  const frontendH = pages.length > 0
    ? Math.max(320, 80 + Math.max(...pages.map(p => 80 + (p.api_calls || []).length * 16 + ((p.cache_reads || []).length + (p.cache_writes || []).length) * 14 + 30)))
    : 0;

  // Build microservices section
  const bffY = 100 + (frontendH > 0 ? frontendH + 40 : 0);
  const msBoxes = microservices.map((ms, i) => {
    const x = 60 + i * 420;
    const w = 400;
    const routeLines = (ms.routes || []).map((r, j) => {
      const methodColor = r.method === 'GET' ? '#1565C0' : '#E65100';
      return `
    <text x="${x + 14}" y="${bffY + 90 + j * 18}" fill="${methodColor}" font-size="9" font-weight="700">${r.method}</text>
    <text x="${x + 50}" y="${bffY + 90 + j * 18}" fill="#37474F" font-size="9">${esc(r.path)}${r.downstream ? ' &#8594; ' + esc(r.downstream) : ''}</text>`;
    }).join('');
    const boxH = 60 + (ms.routes || []).length * 18 + 40;

    return `
  <g filter="url(#shadowLight)">
    <rect x="${x}" y="${bffY + 55}" width="${w}" height="${boxH}" rx="8" fill="#FFF3E0" stroke="#FFCC80" stroke-width="0.8"/>
    <rect x="${x}" y="${bffY + 55}" width="${w}" height="28" rx="8" fill="#FF9800" opacity="0.12"/>
    <text x="${x + 14}" y="${bffY + 74}" fill="#E65100" font-size="11" font-weight="700">${esc(ms.name)}</text>
    <rect x="${x + w - 120}" y="${bffY + 59}" width="108" height="18" rx="9" fill="#F57C00"/>
    <text x="${x + w - 66}" y="${bffY + 72}" text-anchor="middle" fill="#FFF" font-size="8" font-weight="700">${esc(ms.mount_path)}</text>
    ${routeLines}
  </g>`;
  }).join('');

  const bffH = microservices.length > 0
    ? 60 + Math.max(...microservices.map(ms => 60 + (ms.routes || []).length * 18 + 40), 100)
    : 0;

  const hasPanels = (events.length > 0 && (eventStrategy || systemName === 'core')) || (cacheStrategy && (cacheStrategy.items || []).length > 0);
  // Events and Cache panels
  const panelY = bffY + (bffH > 0 ? bffH + 40 : (frontendH === 0 ? 100 : 0));
  const eventsConsumed = eventStrategy?.events_consumed || [];
  const sysEvents = systemName === 'core' ? events : events;

  const eventItems = hasPanels ? sysEvents.map((ev, i) => {
    const consumed = eventsConsumed.includes(ev.name);
    const icon = consumed ? '&#10004;' : '&#10008;';
    const color = consumed ? '#2E7D32' : '#C62828';
    const label = consumed ? 'CONSUMIDO' : 'N&#195;O CONSUMIDO';
    return `
    <text x="80" y="${panelY + 60 + i * 20}" fill="#37474F" font-size="10"><tspan fill="${color}" font-weight="700">${icon}</tspan> ${esc(ev.name)} — <tspan fill="#78909C" font-size="9">${label}</tspan></text>`;
  }).join('') : '';

  const cacheItems = hasPanels ? (cacheStrategy?.items || []).map((item, i) => {
    return `
    <text x="740" y="${panelY + 60 + i * 20}" fill="#37474F" font-size="10">&#128190; <tspan font-weight="600">${esc(item.key)}</tspan> — ${esc(item.written_by || '?')} &#8594; ${(item.read_by || []).join(', ')} | TTL: ${item.ttl || 'none'}</text>`;
  }).join('') : '';

  const panelH = hasPanels ? Math.max(sysEvents.length * 20 + 90, (cacheStrategy?.items || []).length * 20 + 90) : 0;

  // Implementation tasks section
  const tasksY = panelY + panelH + (panelH > 0 ? 30 : 0);
  const tasks = normalizeImplTasks(systemDeepDive.implementation_tasks);
  const tasksH = tasks.length > 0 ? 50 + tasks.length * 18 : 0;
  const taskRows = tasks.map((task, i) =>
    `<text x="80" y="${tasksY + 50 + i * 18}" fill="#37474F" font-size="10">&#9654; ${esc(task.description)}${task.user_story_key ? ` <tspan fill="#78909C" font-size="8">(${esc(task.user_story_key)})</tspan>` : ''}</text>`
  ).join('\n  ');

  // Data flow strategy + gaps/recommendations
  const strategyY = tasksY + tasksH + (tasksH > 0 ? 20 : 0);
  const pattern = eventStrategy?.pattern || 'api-only';
  const patternColor = pattern === 'api-only' ? '#FF6F00' : pattern === 'hybrid' ? '#1565C0' : '#2E7D32';

  const gapLines = (systemDeepDive.gaps || []).map((gap, i) =>
    `<text x="80" y="${strategyY + 100 + i * 16}" fill="#C62828" font-size="9">&#9888; ${esc(gap)}</text>`
  ).join('\n  ');

  const recLines = (systemDeepDive.recommendations || []).map((rec, i) =>
    `<text x="80" y="${strategyY + 100 + (systemDeepDive.gaps || []).length * 16 + 20 + i * 16}" fill="#1565C0" font-size="9">&#128161; ${esc(rec)}</text>`
  ).join('\n  ');

  const strategyH = (systemDeepDive.data_flow_summary || systemDeepDive.gaps?.length || systemDeepDive.recommendations?.length)
    ? 140 + (systemDeepDive.gaps || []).length * 16 + (systemDeepDive.recommendations || []).length * 16
    : 0;

  const totalH = strategyY + strategyH + 40;

  // Build SVG sections conditionally
  const frontendSection = pages.length > 0 ? `
  <!-- Frontend Container -->
  <g filter="url(#shadow)">
    <rect x="40" y="100" width="1320" height="${frontendH}" rx="10" fill="#FFF" stroke="#BBDEFB" stroke-width="1"/>
    <rect x="40" y="100" width="1320" height="42" rx="10" fill="url(#gradBlue)"/>
    <rect x="40" y="130" width="1320" height="12" fill="url(#gradBlue)"/>
    <text x="60" y="128" fill="#FFF" font-size="16">&#128187;</text>
    <text x="82" y="127" fill="#FFF" font-size="14" font-weight="700">Frontend &#8212; Páginas</text>
    <rect x="1280" y="110" width="68" height="20" rx="4" fill="#FFF" opacity="0.25"/>
    <text x="1314" y="124" text-anchor="middle" fill="#FFF" font-size="9" font-weight="600">:5173</text>
  </g>
  ${pageBoxes}` : '';

  const bffSection = microservices.length > 0 ? `
  <!-- Microservices Container -->
  <g filter="url(#shadow)">
    <rect x="40" y="${bffY}" width="1320" height="${bffH}" rx="10" fill="#FFF" stroke="#FFE0B2" stroke-width="1"/>
    <rect x="40" y="${bffY}" width="1320" height="42" rx="10" fill="url(#gradOrange)"/>
    <rect x="40" y="${bffY + 30}" width="1320" height="12" fill="url(#gradOrange)"/>
    <text x="60" y="${bffY + 28}" fill="#FFF" font-size="16">&#128274;</text>
    <text x="82" y="${bffY + 27}" fill="#FFF" font-size="14" font-weight="700">Microserviços</text>
  </g>
  ${msBoxes}` : '';

  const eventsPanel = hasPanels && sysEvents.length > 0 ? `
  <!-- Events Panel -->
  <g filter="url(#shadow)">
    <rect x="40" y="${panelY}" width="640" height="${sysEvents.length * 20 + 80}" rx="10" fill="#FFF" stroke="#CE93D8" stroke-width="1" stroke-dasharray="6 3"/>
    <text x="60" y="${panelY + 24}" fill="#6A1B9A" font-size="13" font-weight="700">&#9889; Socket.IO Events</text>
    ${eventItems}
    <text x="80" y="${panelY + 60 + sysEvents.length * 20 + 10}" fill="#C62828" font-size="9" font-weight="600">Padrão: ${esc(pattern.toUpperCase())}</text>
  </g>` : '';

  const cachePanel = hasPanels && cacheStrategy && (cacheStrategy.items || []).length > 0 ? `
  <!-- Cache Panel -->
  <g filter="url(#shadow)">
    <rect x="720" y="${panelY}" width="640" height="${Math.max((cacheStrategy.items || []).length * 20 + 80, 120)}" rx="10" fill="#FFF" stroke="#A5D6A7" stroke-width="1"/>
    <text x="740" y="${panelY + 24}" fill="#2E7D32" font-size="13" font-weight="700">&#128190; Cache Strategy &#8212; ${esc(cacheStrategy.storage_type || 'localStorage')}</text>
    ${cacheItems}
    <text x="740" y="${panelY + 60 + (cacheStrategy.items || []).length * 20 + 10}" fill="#78909C" font-size="9" font-style="italic">${esc(cacheStrategy.notes || '')}</text>
  </g>` : '';

  const tasksSection = tasks.length > 0 ? `
  <!-- Implementation Tasks -->
  <g filter="url(#shadow)">
    <rect x="40" y="${tasksY}" width="1320" height="${tasksH}" rx="10" fill="#FFF" stroke="#B0BEC5" stroke-width="1"/>
    <text x="60" y="${tasksY + 24}" fill="#37474F" font-size="13" font-weight="700">&#9776; Tarefas de Implementação (${tasks.length})</text>
    ${taskRows}
  </g>` : '';

  const strategySection = strategyH > 0 ? `
  <!-- Strategy + Gaps -->
  <g filter="url(#shadow)">
    <rect x="40" y="${strategyY}" width="1320" height="${strategyH}" rx="10" fill="#FFF" stroke="#CFD8DC" stroke-width="1"/>
    <text x="60" y="${strategyY + 24}" fill="#37474F" font-size="13" font-weight="700">&#128260; Análise</text>
    ${eventStrategy ? `<rect x="130" y="${strategyY + 10}" width="120" height="24" rx="12" fill="${patternColor}"/>
    <text x="190" y="${strategyY + 27}" text-anchor="middle" fill="#FFF" font-size="11" font-weight="700">${esc(pattern.toUpperCase())}</text>` : ''}
    <text x="80" y="${strategyY + 60}" fill="#37474F" font-size="10">${esc(systemDeepDive.data_flow_summary || '')}</text>
    ${gapLines}
    ${recLines}
  </g>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 ${totalH}" width="1400" height="${totalH}" font-family="Arial, Helvetica, sans-serif">
  ${SVG_DEFS}
  <rect width="1400" height="${totalH}" fill="url(#bgGrad)"/>

  <!-- Title -->
  <rect x="0" y="0" width="1400" height="72" fill="#263238" opacity="0.95"/>
  <text x="700" y="32" text-anchor="middle" fill="#FFF" font-size="20" font-weight="700">${esc(bdev_code)} &#8212; ${esc(config.label)} Deep Dive</text>
  <text x="700" y="54" text-anchor="middle" fill="#B0BEC5" font-size="12">Análise detalhada &#8212; ${date}</text>
  <rect x="520" y="62" width="360" height="2" rx="1" fill="#2196F3" opacity="0.7"/>

  ${frontendSection}
  ${bffSection}
  ${eventsPanel}
  ${cachePanel}
  ${tasksSection}
  ${strategySection}

  <!-- Footer -->
  <text x="700" y="${totalH - 10}" text-anchor="middle" fill="#90A4AE" font-size="8">BCTT Agent Factory &#8212; TAA Deep Dive &#8212; ${date}</text>
</svg>`;
}

// ============================================================
// HTML DOCUMENTATION GENERATOR
// ============================================================

export function generateDocHtml(contract: ContractData): string {
  const { bdev_code, apis, events, shared_types } = contract;
  const date = contract.generated_at?.substring(0, 10) || new Date().toISOString().substring(0, 10);
  const deepDives = resolveDeepDives(contract);

  const methodBadge = (m: string) => {
    const colors: Record<string, string> = { GET: '#4CAF50', POST: '#2196F3', PUT: '#FF9800', PATCH: '#9C27B0', DELETE: '#f44336' };
    return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;background:${colors[m] || '#607D8B'};color:#fff;font-weight:700;font-size:0.8rem;letter-spacing:0.5px;">${m}</span>`;
  };

  const renderObj = (obj: Record<string, unknown> | undefined): string => {
    if (!obj || Object.keys(obj).length === 0) return '<em style="color:#90a4ae;">—</em>';
    return '<table style="width:100%;border-collapse:collapse;margin:4px 0;">' +
      Object.entries(obj).map(([k, v]) => {
        const val = typeof v === 'object' && v !== null ? `<pre style="margin:0;font-size:0.85rem;">${JSON.stringify(v, null, 2)}</pre>` : String(v);
        return `<tr><td style="padding:4px 8px;border:1px solid #e0e0e0;font-weight:600;background:#fafafa;width:30%;font-family:monospace;font-size:0.85rem;">${esc(k)}</td><td style="padding:4px 8px;border:1px solid #e0e0e0;font-size:0.85rem;">${val}</td></tr>`;
      }).join('') +
      '</table>';
  };

  const apiSections = apis.map(api => `
    <div style="background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:20px 24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${methodBadge(api.method)}
        <code style="font-size:1.05rem;font-weight:600;color:#1a237e;">${esc(api.path)}</code>
      </div>
      <p style="color:#546e7a;margin-bottom:16px;">${esc(api.description)}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <h4 style="color:#37474f;font-size:0.9rem;margin-bottom:6px;">Request Body</h4>
          ${renderObj(api.request_body)}
        </div>
        <div>
          <h4 style="color:#37474f;font-size:0.9rem;margin-bottom:6px;">Response Body</h4>
          ${renderObj(api.response_body)}
        </div>
      </div>
      ${api.error_codes && api.error_codes.length > 0 ? `
      <div style="margin-top:12px;">
        <h4 style="color:#c62828;font-size:0.85rem;margin-bottom:4px;">Error Codes</h4>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${api.error_codes.map(e => `<span style="padding:2px 8px;border-radius:4px;background:#ffebee;color:#c62828;font-size:0.8rem;font-weight:600;">${esc(e)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>`).join('');

  const eventSections = events.map(ev => `
    <div style="background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:16px 20px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:1.1rem;">&#9889;</span>
        <code style="font-weight:700;color:#6a1b9a;">${esc(ev.name)}</code>
        <span style="color:#78909c;font-size:0.85rem;">${esc(ev.source || '')} &#8594; ${esc(ev.target || '')}</span>
      </div>
      ${ev.payload ? renderObj(ev.payload) : ''}
    </div>`).join('');

  const typeSections = Object.entries(shared_types || {}).map(([name, fields]) => `
    <div style="background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:16px 20px;margin-bottom:12px;">
      <h4 style="color:#1a237e;margin-bottom:8px;"><code>${esc(name)}</code></h4>
      ${renderObj(fields as Record<string, unknown>)}
    </div>`).join('');

  // Deep dives sections — one per system
  const deepDivesSections = deepDives.map(dd => {
    const sysLabel = dd.system ? getSystemConfig(dd.system).label : 'Sistema';
    return `
    <section style="margin-bottom:36px;">
      <h2 style="font-size:1.45rem;font-weight:700;color:#1a237e;margin-bottom:16px;padding-bottom:8px;border-bottom:3px solid #1565c0;">Deep Dive — ${esc(sysLabel)}</h2>
      ${dd.data_flow_summary ? `<p style="color:#37474f;margin-bottom:12px;">${esc(dd.data_flow_summary)}</p>` : ''}
      ${dd.architecture_notes ? `<p style="color:#546e7a;margin-bottom:12px;font-style:italic;">${esc(dd.architecture_notes)}</p>` : ''}
      ${(dd.gaps || []).length > 0 ? `
      <h4 style="color:#c62828;margin-bottom:6px;">Lacunas Identificadas</h4>
      <ul style="margin-bottom:12px;">${dd.gaps!.map(g => `<li style="color:#c62828;">${esc(g)}</li>`).join('')}</ul>` : ''}
      ${(dd.recommendations || []).length > 0 ? `
      <h4 style="color:#1565c0;margin-bottom:6px;">Recomendações</h4>
      <ul style="margin-bottom:12px;">${dd.recommendations!.map(r => `<li style="color:#1565c0;">${esc(r)}</li>`).join('')}</ul>` : ''}
      ${normalizeImplTasks(dd.implementation_tasks).length > 0 ? `
      <h4 style="color:#37474f;margin-bottom:6px;">Tarefas de Implementação (${normalizeImplTasks(dd.implementation_tasks).length})</h4>
      <ul>${normalizeImplTasks(dd.implementation_tasks).map(t => `<li>${esc(t.description)}${t.user_story_key ? ` <span style="color:#78909c;font-size:0.85em;">(${esc(t.user_story_key)})</span>` : ''}</li>`).join('')}</ul>` : ''}
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interface Contract — ${esc(bdev_code)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; background: #f5f6fa; color: #2c3e50; line-height: 1.65; }
    .container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }
    .header { background: linear-gradient(135deg, #1a237e 0%, #0d47a1 60%, #1565c0 100%); color: #fff; padding: 48px 0 40px; }
    .header h1 { font-size: 2.2rem; font-weight: 700; }
    .header .sub { font-size: 1.1rem; opacity: 0.85; margin-top: 8px; }
    section { margin: 32px 0; }
    section h2 { font-size: 1.45rem; font-weight: 700; color: #1a237e; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #1565c0; }
    .footer { background: #263238; color: #b0bec5; text-align: center; padding: 24px; margin-top: 48px; }
    @media print { body { background: #fff; } .header { background: #1a237e !important; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="header">
  <div class="container">
    <h1>Interface Contract — ${esc(bdev_code)}</h1>
    <p class="sub">Documentação técnica gerada automaticamente pelo TAA</p>
    <div style="margin-top:16px;display:flex;gap:12px;">
      <span style="padding:4px 14px;border-radius:20px;background:rgba(255,255,255,0.2);font-size:0.8rem;font-weight:600;">v${contract.version}</span>
      <span style="padding:4px 14px;border-radius:20px;background:rgba(255,255,255,0.12);font-size:0.82rem;">${date}</span>
      <span style="padding:4px 14px;border-radius:20px;background:rgba(255,255,255,0.12);font-size:0.82rem;">${apis.length} APIs | ${events.length} Events | ${Object.keys(shared_types || {}).length} Types</span>
      ${deepDives.length > 0 ? `<span style="padding:4px 14px;border-radius:20px;background:rgba(255,255,255,0.12);font-size:0.82rem;">${deepDives.length} Deep Dives</span>` : ''}
    </div>
  </div>
</div>

<div class="container" style="margin-top:32px;">

  <section>
    <h2>APIs REST (${apis.length} endpoints)</h2>
    ${apiSections}
  </section>

  <section>
    <h2>Eventos Socket.IO (${events.length})</h2>
    ${eventSections}
  </section>

  <section>
    <h2>Tipos Partilhados (${Object.keys(shared_types || {}).length})</h2>
    ${typeSections}
  </section>

  ${deepDivesSections}

</div>

<footer class="footer">
  <p><strong>Gerado automaticamente pelo TAA (Technical Architecture Agent)</strong></p>
  <p style="margin-top:6px;">${date} — <code style="background:rgba(255,255,255,0.15);color:#fff;padding:2px 8px;border-radius:4px;">${esc(bdev_code)}.json</code> v${contract.version}</p>
</footer>
</body>
</html>`;
}

// ============================================================
// JIRA ADF COMMENT GENERATOR
// ============================================================

function adfText(text: string, marks?: Array<{ type: string }>) {
  return { type: 'text', text, ...(marks ? { marks } : {}) };
}

function adfParagraph(...content: unknown[]) {
  return { type: 'paragraph', content };
}

function adfTableHeader(text: string) {
  return { type: 'tableHeader', content: [adfParagraph(adfText(text, [{ type: 'strong' }]))] };
}

function adfTableCell(text: string, marks?: Array<{ type: string }>) {
  return { type: 'tableCell', content: [adfParagraph(adfText(text, marks))] };
}

export function generateJiraComment(contract: ContractData, attachedFiles?: string[]): Record<string, unknown> {
  const { bdev_code, apis, events, shared_types } = contract;
  const deepDives = resolveDeepDives(contract);

  const apiRows = apis.map(api => ({
    type: 'tableRow',
    content: [
      adfTableCell(api.method, [{ type: 'code' }]),
      adfTableCell(api.path, [{ type: 'code' }]),
      adfTableCell(api.description),
      adfTableCell((api.error_codes || []).join(', ')),
    ]
  }));

  const eventRows = events.map(ev => ({
    type: 'tableRow',
    content: [
      adfTableCell(ev.name, [{ type: 'code' }]),
      adfTableCell(ev.source || ''),
      adfTableCell(ev.target || ''),
    ]
  }));

  const typeNames = Object.keys(shared_types || {});

  const content: unknown[] = [
    { type: 'heading', attrs: { level: 2 }, content: [adfText(`Interface Contract — ${bdev_code}`, [{ type: 'strong' }])] },
    adfParagraph(adfText(`Documentação técnica gerada automaticamente pelo TAA em ${contract.generated_at?.substring(0, 10) || 'N/A'}.`)),
    { type: 'rule' },
    { type: 'heading', attrs: { level: 3 }, content: [adfText(`APIs REST (${apis.length} endpoints)`)] },
    {
      type: 'table',
      attrs: { isNumberColumnEnabled: false, layout: 'default' },
      content: [
        { type: 'tableRow', content: [adfTableHeader('Método'), adfTableHeader('Endpoint'), adfTableHeader('Descrição'), adfTableHeader('Erros')] },
        ...apiRows
      ]
    },
    { type: 'rule' },
    { type: 'heading', attrs: { level: 3 }, content: [adfText(`Eventos Socket.IO (${events.length})`)] },
    {
      type: 'table',
      attrs: { isNumberColumnEnabled: false, layout: 'default' },
      content: [
        { type: 'tableRow', content: [adfTableHeader('Evento'), adfTableHeader('Origem'), adfTableHeader('Destino')] },
        ...eventRows
      ]
    },
    { type: 'rule' },
    { type: 'heading', attrs: { level: 3 }, content: [adfText(`Tipos Partilhados (${typeNames.length})`)] },
    adfParagraph(...typeNames.flatMap((name, i) => i === 0 ? [adfText(name, [{ type: 'code' }])] : [adfText(' | '), adfText(name, [{ type: 'code' }])])),
  ];

  // Per-system deep dive summaries
  for (const dd of deepDives) {
    const sysLabel = dd.system ? getSystemConfig(dd.system).label : 'Sistema';
    content.push({ type: 'rule' });
    content.push({ type: 'heading', attrs: { level: 3 }, content: [adfText(`Deep Dive — ${sysLabel}`)] });

    if (dd.data_flow_summary) {
      content.push(adfParagraph(adfText(dd.data_flow_summary)));
    }

    if (dd.gaps && dd.gaps.length > 0) {
      content.push(adfParagraph(adfText('Lacunas:', [{ type: 'strong' }])));
      content.push({
        type: 'bulletList',
        content: dd.gaps.map(g => ({
          type: 'listItem',
          content: [adfParagraph(adfText(g))]
        }))
      });
    }

    if (dd.recommendations && dd.recommendations.length > 0) {
      content.push(adfParagraph(adfText('Recomendações:', [{ type: 'strong' }])));
      content.push({
        type: 'bulletList',
        content: dd.recommendations.map(r => ({
          type: 'listItem',
          content: [adfParagraph(adfText(r))]
        }))
      });
    }

    const implTasks = normalizeImplTasks(dd.implementation_tasks);
    if (implTasks.length > 0) {
      content.push(adfParagraph(adfText(`Tarefas (${implTasks.length}):`, [{ type: 'strong' }])));
      content.push({
        type: 'bulletList',
        content: implTasks.map(t => ({
          type: 'listItem',
          content: [adfParagraph(adfText(`${t.description}${t.user_story_key ? ` → ${t.user_story_key}` : ''}`))]
        }))
      });
    }
  }

  // Attachments reference — dynamic list
  content.push({ type: 'rule' });
  content.push({ type: 'heading', attrs: { level: 3 }, content: [adfText('Ficheiros Anexados')] });

  const fileList = attachedFiles && attachedFiles.length > 0
    ? attachedFiles.map(f => ({
        type: 'listItem' as const,
        content: [adfParagraph(adfText(f, [{ type: 'strong' }]))]
      }))
    : [
        { type: 'listItem' as const, content: [adfParagraph(adfText(`${bdev_code}.json`, [{ type: 'strong' }]), adfText(' — Interface Contract'))] },
        { type: 'listItem' as const, content: [adfParagraph(adfText(`${bdev_code}-architecture.svg`, [{ type: 'strong' }]), adfText(' — Alterações de arquitectura'))] },
        ...deepDives.map(dd => ({
          type: 'listItem' as const,
          content: [adfParagraph(adfText(`${bdev_code}-${dd.system || 'system'}-deepdive.svg`, [{ type: 'strong' }]), adfText(` — Deep dive ${dd.system ? getSystemConfig(dd.system).label : 'sistema'}`))]
        })),
        { type: 'listItem' as const, content: [adfParagraph(adfText(`${bdev_code}-docs.html`, [{ type: 'strong' }]), adfText(' — Documentação completa'))] },
      ];

  content.push({ type: 'bulletList', content: fileList });

  return {
    body: {
      type: 'doc',
      version: 1,
      content,
    }
  };
}
