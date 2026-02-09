import type { PhaseId } from '@/types';

// ============================================
// GOVERNANCE DIAGRAM DATA
// ============================================

export interface GovernanceNode {
  id: string;
  sigla: string;
  nome: string;
  cor: string;
  x: number;  // percentage position (0-100)
  y: number;
  description: string;
  isExternal?: boolean; // e.g. Jira, Figma, Utilizador
}

export interface GovernanceEdge {
  from: string;
  to: string;
  label: string;
  description: string;
  isAutomatic?: boolean; // auto-advance (pipeline SSE)
}

export interface GovernancePhase {
  phaseId: PhaseId;
  title: string;
  description: string;
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
  governanceRules: string[];
}

// ============================================
// FASE 01 — CONCEÇÃO
// ============================================

const concepcaoGovernance: GovernancePhase = {
  phaseId: 'concepcao',
  title: 'Fase 01 — Conceção Automatizada',
  description: 'Pipeline end-to-end: da ideia de negócio ao protótipo funcional. O utilizador interage com o BA, e os restantes agentes avançam automaticamente via pipeline SSE.',
  nodes: [
    {
      id: 'user',
      sigla: 'Negócio',
      nome: 'Utilizador de Negócio',
      cor: '#64748B',
      x: 5,
      y: 50,
      description: 'Utilizador de negócio que submete a ideia ou pedido de funcionalidade.',
      isExternal: true,
    },
    {
      id: 'ba',
      sigla: 'BA',
      nome: 'Brainstorm Agent',
      cor: '#3B82F6',
      x: 20,
      y: 50,
      description: 'Dialoga com o utilizador para captar requisitos. Modo Demo (5 perguntas) ou Completo (exaustivo).',
    },
    {
      id: 'fa',
      sigla: 'FA',
      nome: 'Functional Agent',
      cor: '#10B981',
      x: 38,
      y: 50,
      description: 'Decompõe em Epic → Feature → Story, gera doc Word, cria issues no Jira, atribui código BDEV.',
    },
    {
      id: 'jira',
      sigla: 'JIRA',
      nome: 'Jira Cloud',
      cor: '#0052CC',
      x: 38,
      y: 15,
      description: 'Projecto "Test BCTT Agent Factory" (BCTT). Hierarquia: Epic → Feature/Story.',
      isExternal: true,
    },
    {
      id: 'da',
      sigla: 'DA',
      nome: 'Design Agent',
      cor: '#F59E0B',
      x: 56,
      y: 50,
      description: 'Cria wireframes mobile (390px), fluxos de excepção, UX writing PT/EN, verifica DS.',
    },
    {
      id: 'figma',
      sigla: 'FIG',
      nome: 'Figma',
      cor: '#A259FF',
      x: 56,
      y: 15,
      description: 'Projecto "AI", file "AI Tests". Páginas de ecrãs + UX Flow criadas automaticamente.',
      isExternal: true,
    },
    {
      id: 'dsla',
      sigla: 'DSLA',
      nome: 'DS Library Agent',
      cor: '#8B5CF6',
      x: 74,
      y: 50,
      description: 'Cria componentes React reais no bctt-design-system. Wrappers MUI com design tokens BCTT.',
    },
    {
      id: 'pa',
      sigla: 'PA',
      nome: 'Prototype Agent',
      cor: '#9333EA',
      x: 92,
      y: 50,
      description: 'Gera protótipo React funcional com Vite. Deploy automático em localhost:5173.',
    },
  ],
  edges: [
    {
      from: 'user',
      to: 'ba',
      label: 'Ideia de negócio',
      description: 'Utilizador submete pedido de funcionalidade ou ideia de negócio ao Brainstorm Agent.',
    },
    {
      from: 'ba',
      to: 'fa',
      label: 'Prompt estruturado',
      description: 'Requisitos validados, cenários de excepção, dependências identificadas. HANDOFF automático.',
      isAutomatic: true,
    },
    {
      from: 'fa',
      to: 'jira',
      label: 'Epic / Feature / Story',
      description: 'Criação automática de issues no Jira via jira_bulk_create_with_document. Documento Word anexado ao Epic.',
      isAutomatic: true,
    },
    {
      from: 'fa',
      to: 'da',
      label: 'User Stories + BDEV',
      description: 'User Stories detalhadas, critérios Gherkin, código BDEV, doc Word. HANDOFF automático.',
      isAutomatic: true,
    },
    {
      from: 'da',
      to: 'figma',
      label: 'Ecrãs + UX Flow',
      description: 'Páginas criadas automaticamente no Figma (projecto AI, file AI Tests) via WebSocket.',
      isAutomatic: true,
    },
    {
      from: 'da',
      to: 'dsla',
      label: 'Componentes novos',
      description: 'Lista de componentes MUI em falta no DS. Wireframes JSON + traduções. HANDOFF automático.',
      isAutomatic: true,
    },
    {
      from: 'dsla',
      to: 'pa',
      label: 'DS compilado',
      description: 'bctt-design-system compilado com novos componentes (.tsx + stories). HANDOFF automático.',
      isAutomatic: true,
    },
    {
      from: 'pa',
      to: 'user',
      label: 'Protótipo (localhost:5173)',
      description: 'Protótipo Vite+React standalone acessível em localhost:5173. Usa @bctt/design-system.',
    },
  ],
  governanceRules: [
    'BA é interactivo — pergunta/resposta com o utilizador (modo Demo: 5 perguntas, Completo: exaustivo)',
    'FA → DA → DSLA → PA avançam automaticamente via pipeline SSE (auto-advance)',
    'Contexto entre agentes é passado via MCP conversation handoff (não ficheiros)',
    'FA cria issues no Jira automaticamente após consolidação (Epic → Feature → Story)',
    'DA verifica catálogo do DS antes de wireframes — lista componentes em falta para o DSLA',
    'DSLA só cria componentes que NÃO existem no DS (verificação obrigatória com dsla_get_component_spec)',
    'PA importa tudo de @bctt/design-system — fonte única de componentes',
    'PA faz deploy automático com Vite (npm install + vite dev em localhost:5173)',
  ],
};

// ============================================
// REGISTRY
// ============================================

const governanceData: Record<string, GovernancePhase> = {
  concepcao: concepcaoGovernance,
};

export function getGovernanceByPhase(phaseId: PhaseId): GovernancePhase | undefined {
  return governanceData[phaseId];
}

export default governanceData;
