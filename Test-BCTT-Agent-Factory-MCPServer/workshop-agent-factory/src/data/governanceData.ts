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
// FASE 02 — DESENVOLVIMENTO
// ============================================

const desenvolvimentoGovernance: GovernancePhase = {
  phaseId: 'desenvolvimento',
  title: 'Fase 02 — Desenvolvimento Automatizado',
  description: 'Pipeline de implementação: o TAA analisa o BDEV, gera a spec e o Interface Contract, e despacha FDE + BDE em paralelo. Após code review, o UTE testa e o CI/CD valida antes do merge. Agentes correm via Claude Code CLI.',
  nodes: [
    {
      id: 'dev-user',
      sigla: 'Dev',
      nome: 'Utilizador / Apresentador',
      cor: '#64748B',
      x: 5,
      y: 50,
      description: 'Selecciona BDEV disponível (status "Ready for Development") e aprova gates ao longo do pipeline.',
      isExternal: true,
    },
    {
      id: 'taa',
      sigla: 'TAA',
      nome: 'Technical Architecture Agent',
      cor: '#7C3AED',
      x: 18,
      y: 50,
      description: 'Lê BDEV do Jira, agrupa US por MVP, gera spec técnica e Interface Contract. Despacha FDE + BDE após Gate 1.',
    },
    {
      id: 'gate1',
      sigla: 'G1',
      nome: 'Gate 1 — Arquitectura',
      cor: '#F59E0B',
      x: 32,
      y: 50,
      description: 'Aprovação manual da spec técnica e Interface Contract pelo utilizador.',
      isExternal: true,
    },
    {
      id: 'fde',
      sigla: 'FDE',
      nome: 'Frontend Dev Engineer',
      cor: '#EC4899',
      x: 46,
      y: 25,
      description: 'Escreve código React de produção no DigitalChannels. Importa de @bctt/design-system. Segue Interface Contract.',
    },
    {
      id: 'bde',
      sigla: 'BDE',
      nome: 'Backend Dev Engineer',
      cor: '#8B5CF6',
      x: 46,
      y: 75,
      description: 'Escreve código Node.js/Express de produção (Core + Middleware + BFF). Segue Interface Contract.',
    },
    {
      id: 'gate2',
      sigla: 'G2',
      nome: 'Gate 2 — Code Review',
      cor: '#F59E0B',
      x: 60,
      y: 50,
      description: 'Review do código, diff viewer, deploy preview (porta 5174). Aprovação manual.',
      isExternal: true,
    },
    {
      id: 'ute',
      sigla: 'UTE',
      nome: 'Unit Tester Executer',
      cor: '#06B6D4',
      x: 74,
      y: 50,
      description: 'Executa Vitest com coverage, gera report, despacha falhas ao FBS/BBS. Usa Haiku (ultra-rápido).',
    },
    {
      id: 'fbs',
      sigla: 'FBS',
      nome: 'Frontend Bug Solver',
      cor: '#EF4444',
      x: 88,
      y: 25,
      description: 'Analisa bugs frontend, cria feature branch com fix, devolve ao UTE. Actualiza Jira.',
    },
    {
      id: 'bbs',
      sigla: 'BBS',
      nome: 'Backend Bug Solver',
      cor: '#DC2626',
      x: 88,
      y: 75,
      description: 'Analisa bugs backend, cria feature branch com fix, notifica FBS se impactar frontend.',
    },
    {
      id: 'jira-dev',
      sigla: 'JIRA',
      nome: 'Jira Cloud',
      cor: '#0052CC',
      x: 18,
      y: 12,
      description: 'BDEVs, Features, User Stories com labels MVP1/MVP2/MVP3. TAA lê e actualiza estados.',
      isExternal: true,
    },
  ],
  edges: [
    {
      from: 'dev-user',
      to: 'taa',
      label: 'BDEV seleccionado',
      description: 'Utilizador selecciona BDEV com status "Ready for Development" no Workshop UI.',
    },
    {
      from: 'taa',
      to: 'jira-dev',
      label: 'Lê User Stories',
      description: 'TAA lê Epic, Features e US do Jira. Agrupa por MVP. Actualiza Epic para "In Development".',
      isAutomatic: true,
    },
    {
      from: 'taa',
      to: 'gate1',
      label: 'Plano técnico',
      description: 'Spec de arquitectura + Interface Contract apresentados ao utilizador para aprovação.',
      isAutomatic: true,
    },
    {
      from: 'gate1',
      to: 'fde',
      label: 'FDE aprovado',
      description: 'Gate 1 aprovado — FDE recebe Interface Contract e wireframes do DA.',
      isAutomatic: true,
    },
    {
      from: 'gate1',
      to: 'bde',
      label: 'BDE aprovado',
      description: 'Gate 1 aprovado — BDE recebe Interface Contract e Registry. FDE+BDE em paralelo.',
      isAutomatic: true,
    },
    {
      from: 'fde',
      to: 'gate2',
      label: 'PR frontend',
      description: 'FDE completa código frontend — feature branch pronto para review.',
    },
    {
      from: 'bde',
      to: 'gate2',
      label: 'PR backend',
      description: 'BDE completa código backend — feature branch pronto para review. Gate 2 abre quando ambos terminam.',
    },
    {
      from: 'gate2',
      to: 'ute',
      label: 'Código aprovado',
      description: 'Gate 2 aprovado — UTE arranca testes no feature branch.',
      isAutomatic: true,
    },
    {
      from: 'ute',
      to: 'fbs',
      label: 'Bugs frontend',
      description: 'UTE detecta falhas frontend — despacha ao FBS para correcção. Condicional (só se falhar).',
    },
    {
      from: 'ute',
      to: 'bbs',
      label: 'Bugs backend',
      description: 'UTE detecta falhas backend — despacha ao BBS para correcção. Condicional (só se falhar).',
    },
    {
      from: 'fbs',
      to: 'ute',
      label: 'Re-teste',
      description: 'FBS aplica fix e devolve feature branch ao UTE para re-teste.',
      isAutomatic: true,
    },
    {
      from: 'bbs',
      to: 'ute',
      label: 'Re-teste',
      description: 'BBS aplica fix e devolve feature branch ao UTE para re-teste.',
      isAutomatic: true,
    },
  ],
  governanceRules: [
    'Gate 1 — Aprovação manual da spec técnica e Interface Contract antes de despachar FDE+BDE',
    'FDE e BDE correm em PARALELO (Promise.all) — Gate 2 só abre quando ambos terminam',
    'Gate 2 — Code review com diff viewer + deploy preview (porta 5174) antes de testes',
    'FBS e BBS só são activados se o UTE detectar falhas — loop condicional de correcção',
    'Bug Watcher — polling Jira cada 30s para bugs com labels frontend-bug/backend-bug',
    'Interface Contract — FDE e BDE seguem exactamente os endpoints/tipos definidos pelo TAA',
    'Todos os agentes Fase 2 correm via Claude Code CLI (não pela webapp) — webapp é dashboard',
  ],
};

// ============================================
// REGISTRY
// ============================================

const governanceData: Record<string, GovernancePhase> = {
  concepcao: concepcaoGovernance,
  desenvolvimento: desenvolvimentoGovernance,
};

export function getGovernanceByPhase(phaseId: PhaseId): GovernancePhase | undefined {
  return governanceData[phaseId];
}

export default governanceData;
