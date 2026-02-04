// ============================================
// TIPOS PARA A FÁBRICA DE AGENTES - BANCO CTT
// ============================================

// Tipos base
export type AgentId = 'ba' | 'fa' | 'da' | 'dsla' | 'fda' | 'bda' | 'fbs' | 'ute' | 'lte' | 'cqa' | 'monitor';
export type PhaseId = 'concepcao' | 'desenvolvimento' | 'producao';
export type AIProvider = 'Anthropic' | 'Google' | 'Microsoft' | 'Microsoft / OpenAI';
export type AILogo = 'claude' | 'gemini' | 'copilot' | 'mscopilot' | 'claude-copilot';
export type MessageRole = 'user' | 'assistant' | 'system' | 'download' | 'approval';

// ============================================
// AI RECOMMENDATION
// ============================================
export interface AIAlternative {
  nome: string;
  razao: string;
}

export interface AIRecommendation {
  nome: string;
  provider: AIProvider;
  modelo: string;
  logo: AILogo;
  cor: string;
  vantagens: string[];
  desvantagens: string[];
  alternativas: AIAlternative[];
}

// ============================================
// AGENT MEMORY (BA)
// ============================================
export interface MemoryLevel {
  nome: string;
  desc: string;
  tipo: string;
}

export interface AgentMemory {
  titulo: string;
  niveis: MemoryLevel[];
}

// ============================================
// WORKFLOW
// ============================================
export interface WorkflowStep {
  fase: string;
  desc: string;
  icon: string;
}

// ============================================
// DOCUMENT TEMPLATE (FA)
// ============================================
export interface DocumentSection {
  nome: string;
  desc: string;
}

export interface DocumentTemplate {
  titulo: string;
  seccoes: DocumentSection[];
}

// ============================================
// USER STORY FORMAT (FA)
// ============================================
export interface UserStoryField {
  nome: string;
  desc: string;
}

export interface UserStoryFormat {
  titulo: string;
  campos: UserStoryField[];
}

// ============================================
// MVP RULES (FA)
// ============================================
export interface MVPRules {
  titulo: string;
  regra: string;
  valido: string[];
  invalido: string[];
}

// ============================================
// INTEGRATIONS (DA)
// ============================================
export interface FigmaIntegration {
  tipo: string;
  nome: string;
  capacidades: string[];
  execucao: string;
  nomePagina: string;
}

export interface ZeroHeightIntegration {
  tipo: string;
  url: string;
  pacote: string;
  capacidades: string[];
  autenticacao: string;
}

export interface FigmaMCPIntegration {
  tipo: string;
  nome: string;
  capacidades: string[];
  nota: string;
}

export interface AgentIntegrations {
  figma?: FigmaIntegration;
  zeroheight?: ZeroHeightIntegration;
  figmaMCP?: FigmaMCPIntegration;
}

// ============================================
// UX WRITING RULES (DA)
// ============================================
export interface UXWritingPrinciple {
  regra: string;
  desc: string;
  exemplo: string;
}

export interface UXWritingRules {
  titulo: string;
  fonte: string;
  tom: string;
  principios: UXWritingPrinciple[];
  idiomas: string[];
}

// ============================================
// EXCEPTION FLOWS (DA)
// ============================================
export interface ExceptionFlowType {
  tipo: string;
  nome: string;
  desc: string;
  cor: string;
}

export interface ExceptionFlows {
  titulo: string;
  tipos: ExceptionFlowType[];
}

// ============================================
// COMPONENT CHECKLIST (DA)
// ============================================
export interface ComponentChecklist {
  titulo: string;
  estados: string[];
}

// ============================================
// PLUGIN JSON FORMAT (DA)
// ============================================
export interface PluginJSONFormat {
  titulo: string;
  exemplo: string;
}

// ============================================
// ATOMIC DESIGN (DSLA)
// ============================================
export interface AtomicDesignLevel {
  nome: string;
  desc: string;
  exemplos: string;
}

export interface AtomicDesign {
  titulo: string;
  niveis: AtomicDesignLevel[];
}

// ============================================
// CODE CONVENTIONS (DSLA)
// ============================================
export interface CodeConventionRule {
  item: string;
  conv: string;
  exemplo: string;
}

export interface CodeConventions {
  titulo: string;
  regras: CodeConventionRule[];
}

// ============================================
// QUALITY GATES (CQA)
// ============================================
export interface QualityGateRule {
  nome: string;
  threshold: string;
  severity: string;
}

export interface QualityGates {
  titulo: string;
  regras: QualityGateRule[];
}

// ============================================
// METRICS (UTE, LTE)
// ============================================
export interface MetricThreshold {
  nome: string;
  valor: string;
  tipo: string;
}

export interface Metrics {
  titulo: string;
  thresholds: MetricThreshold[];
}

export interface LoadTestTool {
  titulo: string;
  nome: string;
  metricas: string[];
}

// ============================================
// AGENT
// ============================================
export interface Agent {
  id: AgentId;
  nome: string;
  sigla: string;
  missao: string;
  cor: string;
  detalhado: boolean;
  aiRecomendado?: AIRecommendation;
  responsabilidades: string[];
  inputs: string[];
  outputs: string[];
  fluxo?: WorkflowStep[];
  memoria?: AgentMemory;
  versionamento?: string;
  templateDoc?: DocumentTemplate;
  userStoryFormat?: UserStoryFormat;
  mvpRules?: MVPRules;
  integracoes?: AgentIntegrations;
  inputSource?: string;
  outputDestination?: string;
  uxWritingRules?: UXWritingRules;
  exceptionFlows?: ExceptionFlows;
  componentChecklist?: ComponentChecklist;
  pluginJsonFormat?: PluginJSONFormat;
  atomicDesign?: AtomicDesign;
  conventions?: CodeConventions;
  qualityGates?: QualityGates;
  metricas?: Metrics;
  ferramenta?: LoadTestTool;
}

// ============================================
// PHASE
// ============================================
export interface Phase {
  id: PhaseId;
  nome: string;
  numero: string;
  descricao: string;
  cor: string;
  agentes: Agent[];
}

// ============================================
// CONVERSATION
// ============================================
export interface ChatMessage {
  role: MessageRole;
  content: string;
  agente?: string;
}

export interface Conversation {
  id: string;
  titulo: string;
  mensagens: ChatMessage[];
}

// ============================================
// LIVE MODE
// ============================================
export interface LiveModeState {
  isActive: boolean;
  currentAgent: AgentId;
  messages: ChatMessage[];
  outputs: Record<AgentId, string>;
  isLoading: boolean;
  awaitingApproval: boolean;
  streamingText: string;
}

// ============================================
// USER STORY (FA - Live mode)
// ============================================
export interface UserStory {
  id: string;
  titulo: string;
  completa: boolean;
  conteudo: string | null;
}

// ============================================
// BA PROGRESS PATTERN
// ============================================
export interface BAProgressPattern {
  pattern: RegExp;
  label: string;
}

export interface BAEtapaCompleta {
  index: number;
  label: string;
}

// ============================================
// DSLA COMPONENT
// ============================================
export interface DSLAComponent {
  tipo: string;
  nome: string;
}

// ============================================
// COMPONENT PREVIEW (DSLA)
// ============================================
export interface ComponentPreviewState {
  balance: number;
  limit: number;
  variant: 'default' | 'compact';
  loading: boolean;
}

// ============================================
// FINAL OUTPUT
// ============================================
export interface FinalOutputState {
  showModal: boolean;
  showFluxoModal: boolean;
  showComponentesModal: boolean;
  selectedComponente: string | null;
  funcionalidadeNome: string;
}

// ============================================
// APP STATE
// ============================================
export interface AppState {
  activePhase: PhaseId;
  activeAgent: AgentId;
  chatOpen: boolean;
  activeConversation: Conversation | null;
  messageIndex: number;
  visibleMessages: ChatMessage[];
  isTyping: boolean;
  aiModalOpen: boolean;
  liveMode: LiveModeState;
  componentPreview: ComponentPreviewState;
  finalOutput: FinalOutputState;
}
