import type { Phase, Agent } from '@/types';

// ============================================
// FASE 01 - CONCEÇÃO
// ============================================

const brainstormAgent: Agent = {
  id: 'ba',
  nome: 'Brainstorm Agent',
  sigla: 'BA',
  missao: 'Dialogar com o utilizador para captar requisitos de negócio, desafiar cenários de excepção, e produzir um prompt estruturado que alimente o Functional Agent. Oferece modo Demo (5 perguntas) ou Completo (exaustivo).',
  cor: '#3B82F6',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Melhor memória de contexto longo (200K tokens)',
      'Excelente em conversação estruturada e iterativa',
      'Superior em raciocínio analítico e síntese',
      'Foco em segurança e compliance (ideal para banca)',
      'Suporte nativo a MCP para comunicação entre agentes',
      'Mantém coerência em sessões longas de discovery',
    ],
    desvantagens: [
      'Não tem acesso web em tempo real (necessita integração)',
      'Custo por token mais elevado que alternativas',
      'Sem integração nativa com Google Workspace',
      'Knowledge cutoff pode afetar análise regulamentar recente',
    ],
    alternativas: [
      { nome: 'GPT-4', razao: 'Mais criativo em brainstorming livre' },
      { nome: 'Gemini', razao: 'Melhor se usar Google Workspace' },
    ],
  },
  responsabilidades: [
    'Dialogar iterativamente com o utilizador de negócio',
    'Captar requisitos funcionais e não-funcionais',
    'Desafiar com cenários de excepção e edge cases',
    'Identificar dependências e impactos em sistemas existentes',
    'Produzir prompt estruturado para o FA com requisitos validados',
    'Fazer HANDOFF automático para o FA após aprovação',
  ],
  inputs: [
    'Ideia de negócio ou pedido de funcionalidade',
    'Contexto do utilizador (área, sistemas, restrições)',
  ],
  outputs: [
    'Prompt estruturado para o Functional Agent',
    'Mapa de dependências e impactos',
    'HANDOFF automático para o FA',
  ],
  memoria: {
    titulo: 'Arquitetura de Memória',
    niveis: [
      {
        nome: 'Conhecimento Base',
        desc: 'Figma Library, Word KB, Miro Boards, Diagramas de Arquitetura',
        tipo: 'Estático/Indexado',
      },
      {
        nome: 'Conhecimento Evolutivo',
        desc: 'Sessões passadas de todas as equipas, decisões tomadas, dependências identificadas',
        tipo: 'Persistente/Partilhado',
      },
      {
        nome: 'Contexto de Sessão',
        desc: 'Conversa atual, intake, discovery, drafts',
        tipo: 'Tempo real',
      },
    ],
  },
  fluxo: [
    { fase: 'INTAKE', desc: 'Formulário estruturado inicial', icon: '📋' },
    { fase: 'DISCOVERY', desc: 'Exploração conversacional', icon: '💬' },
    { fase: 'DRAFT', desc: 'Validação e aprovação', icon: '✅' },
  ],
  versionamento: 'Regra "última aprovação ganha" - pedidos mais recentes substituem regras anteriores, mantendo histórico para auditoria.',
};

const functionalAgent: Agent = {
  id: 'fa',
  nome: 'Functional Agent',
  sigla: 'FA',
  missao: 'Transformar requisitos do BA em documentação funcional completa: decompor em Epic → Feature → Story, definir MVPs, detalhar campos/validações/regras, gerar critérios de aceitação em Gherkin, gerar documento Word, e criar issues no Jira automaticamente.',
  cor: '#10B981',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Excelente em documentação técnica estruturada',
      'Contexto longo permite manter coerência em docs extensos',
      'Superior em formato Gherkin e critérios de aceitação',
      'Consistência em formatação e templates',
      'Bom em decomposição hierárquica (Epic → Feature → Story)',
      'Integração MCP com BA para validação bidirecional',
    ],
    desvantagens: [
      'Pode ser verboso em outputs simples',
      'Necessita templates bem definidos para consistência',
      'Custo elevado para documentação em massa',
      'Sem exportação nativa para Azure DevOps',
    ],
    alternativas: [
      { nome: 'GPT-4', razao: 'Melhor integração com Microsoft/Azure' },
      { nome: 'Copilot', razao: 'Se já usar Microsoft 365 extensivamente' },
    ],
  },
  responsabilidades: [
    'Analisar e decompor requisitos (Epic → Feature → Story)',
    'Propor divisão em MVPs com critério de funcionalidade completa',
    'Detalhar cada story com campos, tipos, validações, regras de negócio',
    'Gerar critérios de aceitação em formato Gherkin',
    'Gerar documento "Informação Adicional" (.docx) no template do Banco',
    'Criar automaticamente Epic/Feature/Story no Jira (projeto BCTT)',
    'Atribuir código BDEV único ao pedido',
    'Fazer HANDOFF automático para o DA',
  ],
  inputs: [
    'Prompt estruturado do BA',
  ],
  outputs: [
    'User Stories detalhadas com critérios Gherkin',
    'Documento "Informação Adicional" (.docx)',
    'Código BDEV atribuído ao pedido',
    'Issues no Jira (Epic → Feature → Story)',
    'HANDOFF automático para o DA',
  ],
  templateDoc: {
    titulo: 'Estrutura do Documento de Requisitos',
    seccoes: [
      { nome: 'Capa', desc: 'Título e área/projeto' },
      { nome: 'Controlo de Versões', desc: 'Tabela com versão, data, autor, descrição' },
      { nome: 'Termos e Abreviaturas', desc: 'Glossário do documento' },
      { nome: 'Documentos Relacionados', desc: 'Referências externas' },
      { nome: '1. Informação Adicional', desc: 'Visão geral de ecrãs e tabela sumário' },
      { nome: '2. Anexos', desc: 'Detalhe por ecrã: Campos | Regras | Formatação' },
    ],
  },
  userStoryFormat: {
    titulo: 'Formato de User Story',
    campos: [
      { nome: 'Narrativa', desc: 'As a [user] I want to [action] in order to [benefit]' },
      { nome: 'Ecrã', desc: 'Nome do ecrã associado' },
      { nome: 'Mockup', desc: 'Referência ao frame no Figma' },
      { nome: 'Campos', desc: 'Tabela: Nome | Tipo | Obrigatório | Validação | Formatação' },
      { nome: 'Regras de Negócio', desc: 'Lista detalhada de condições e comportamentos' },
      { nome: 'Critérios de Aceitação', desc: 'Cenários em Gherkin (Given/When/Then)' },
    ],
  },
  mvpRules: {
    titulo: 'Critérios de Divisão MVP',
    regra: 'Funcionalidade completa ou nada',
    valido: [
      'Fluxo end-to-end funcional',
      'Todos os casos de sucesso e erro tratados',
      'Utilizador consegue completar a tarefa',
    ],
    invalido: [
      'Fluxo incompleto (ex: transferência sem confirmação)',
      'Casos de erro não tratados',
      'Dependência de funcionalidade não incluída',
    ],
  },
  fluxo: [
    { fase: 'ANÁLISE', desc: 'Analisa prompt e process flow', icon: '📝' },
    { fase: 'ESTRUTURA', desc: 'Decompõe em Epic/Features/US', icon: '🏗️' },
    { fase: 'MVP', desc: 'Propõe divisão em MVPs', icon: '📦' },
    { fase: 'DETALHE', desc: 'Especifica cada user story', icon: '📋' },
    { fase: 'VALIDAÇÃO', desc: 'Valida com BA', icon: '✅' },
  ],
};

const designAgent: Agent = {
  id: 'da',
  nome: 'Design Agent',
  sigla: 'DA',
  missao: 'Criar wireframes completos para mobile (390px) com todos os estados (loading, empty, error, success), definir fluxos de excepção com UX writing bilingue (PT/EN), verificar componentes do DS, e criar páginas no Figma automaticamente.',
  cor: '#F59E0B',
  detalhado: true,
  aiRecomendado: {
    nome: 'Gemini',
    provider: 'Google',
    modelo: 'Gemini 2.5 Pro',
    logo: 'gemini',
    cor: '#4285F4',
    vantagens: [
      'Líder em tarefas multimodais (análise de imagens/UI)',
      'Contexto de 1M tokens para projetos Figma grandes',
      'Excelente em análise visual e sugestões de design',
      'Integração nativa com Google Cloud e Workspace',
      'Custo mais baixo que concorrentes (20x menos que Claude)',
      'Bom em gerar variantes de design e edge cases visuais',
    ],
    desvantagens: [
      'Menos consistente em outputs de texto longo',
      'API de Figma requer integração custom',
      'Pode fazer alterações agressivas sem pedir confirmação',
      'Menos previsível que Claude em tarefas estruturadas',
    ],
    alternativas: [
      { nome: 'Claude', razao: 'Se precisar de mais consistência em copy/texto' },
      { nome: 'GPT-4 Vision', razao: 'Boa alternativa para análise de imagens' },
    ],
  },
  integracoes: {
    figma: {
      tipo: 'Plugin Custom',
      nome: 'Banco CTT - Design Agent Plugin',
      capacidades: [
        'Criar página <projeto>-aigenerated automaticamente',
        'Clonar happy path para nova página',
        'Criar frames de exceção com tipos codificados por cor',
        'Inserir copy PT-PT e EN-UK diretamente nos frames',
        'Processar instruções JSON do DA automaticamente',
      ],
      execucao: 'Automática via JSON (Opção B) ou Manual via UI (Opção A)',
      nomePagina: '<nome-projeto>-aigenerated',
    },
    zeroheight: {
      tipo: 'MCP Server',
      url: 'https://zeroheight.com/071c7112f',
      pacote: '@zeroheight/mcp-server',
      capacidades: [
        'Ler tone of voice e guidelines',
        'Consultar do\'s and don\'ts de componentes',
        'Obter regras de UX Writing',
        'Navegar estrutura hierárquica do styleguide',
      ],
      autenticacao: 'Client ID (zhci_) + Access Token (zhat_)',
    },
    figmaMCP: {
      tipo: 'MCP Server (Leitura)',
      nome: 'Figma Dev Mode MCP',
      capacidades: [
        'Ler estrutura de ficheiros e frames',
        'Obter design tokens e variáveis',
        'Consultar estilos e componentes',
        'Analisar happy path existente',
      ],
      nota: 'Apenas leitura - escrita via Plugin',
    },
  },
  inputSource: 'FA (Feature Agent) apenas - prioridade absoluta',
  outputDestination: 'DSLA (handoff automático) → Equipa Design aprova depois',
  responsabilidades: [
    'Receber User Stories do FA e mapear para ecrãs mobile (390px)',
    'Gerar wireframes JSON com todos os componentes e estados',
    'Definir fluxos de excepção com UX Writing (PT-PT & EN-UK)',
    'Consultar catálogo do Design System (35+ componentes)',
    'Identificar componentes MUI em falta e listar para o DSLA',
    'Criar páginas no Figma (projeto AI, file AI Tests)',
    'Fazer HANDOFF para DSLA com lista de componentes novos',
  ],
  inputs: [
    'User Stories + código BDEV do FA',
    'Catálogo de componentes do Design System',
  ],
  outputs: [
    'Wireframes JSON com todos os estados',
    'Traduções PT/EN (UX Writing)',
    'Lista de componentes novos para o DSLA',
    'Páginas no Figma (ecrãs + UX Flow)',
    'HANDOFF automático para o DSLA',
  ],
  fluxo: [
    { fase: 'RECEÇÃO', desc: 'Recebe feature do FA com happy path URL', icon: '📥' },
    { fase: 'LEITURA', desc: 'MCP Figma + MCP ZeroHeight', icon: '📖' },
    { fase: 'ANÁLISE', desc: 'Identifica gaps e cenários de exceção', icon: '🧠' },
    { fase: 'GERAÇÃO', desc: 'Cria fluxos + copy PT-PT/EN-UK', icon: '✨' },
    { fase: 'EXECUÇÃO', desc: 'Plugin Figma cria página -aigenerated', icon: '🎨' },
    { fase: 'HANDOFF', desc: 'Entrega automática ao DSLA', icon: '📦' },
  ],
  uxWritingRules: {
    titulo: 'Regras de UX Writing - Banco CTT',
    fonte: 'ZeroHeight MCP',
    tom: 'Formal bancário (não casual/friendly)',
    principios: [
      {
        regra: 'Clareza',
        desc: 'Usar linguagem simples e direta, evitar jargão bancário',
        exemplo: '✅ "Transferir dinheiro" | ❌ "Efetuar transferência interbancária"',
      },
      {
        regra: 'Brevidade',
        desc: 'Máximo 2 linhas por mensagem, títulos até 5 palavras',
        exemplo: '✅ "Saldo insuficiente" | ❌ "Não foi possível completar porque não tem saldo"',
      },
      {
        regra: 'Tom Formal',
        desc: 'Profissional mas acessível, nunca coloquial',
        exemplo: '✅ "Ocorreu um erro. Tente novamente." | ❌ "Ups! Algo correu mal :("',
      },
      {
        regra: 'Ação Clara',
        desc: 'Botões começam com verbo no infinitivo',
        exemplo: '✅ "Confirmar transferência" | ❌ "OK" ou "Submeter"',
      },
      {
        regra: 'Feedback Útil',
        desc: 'Erros explicam o problema E a solução',
        exemplo: '✅ "PIN incorreto. Tem mais 2 tentativas." | ❌ "PIN inválido"',
      },
    ],
    idiomas: ['PT-PT (Português de Portugal)', 'EN-UK (Inglês da Grã-Bretanha)'],
  },
  exceptionFlows: {
    titulo: 'Tipos de Fluxos de Exceção',
    tipos: [
      { tipo: 'INPUT_ERROR', nome: 'Erro de Input', desc: 'Validação de campos (formato, limites, obrigatórios)', cor: '#EF4444' },
      { tipo: 'SYSTEM_ERROR', nome: 'Erro de Sistema', desc: 'Timeout, indisponibilidade, falha de rede', cor: '#F97316' },
      { tipo: 'BUSINESS_ERROR', nome: 'Erro de Negócio', desc: 'Saldo insuficiente, limite excedido, conta bloqueada', cor: '#EAB308' },
      { tipo: 'EMPTY_STATE', nome: 'Empty State', desc: 'Listas vazias, primeiro uso, sem resultados', cor: '#8B5CF6' },
      { tipo: 'EDGE_CASE', nome: 'Edge Case', desc: 'Sessão expirada, ação simultânea, dados desatualizados', cor: '#EC4899' },
      { tipo: 'LOADING', nome: 'Loading', desc: 'Estados de carregamento e processamento', cor: '#3B82F6' },
      { tipo: 'SUCCESS', nome: 'Sucesso', desc: 'Confirmações e feedbacks positivos', cor: '#10B981' },
    ],
  },
  componentChecklist: {
    titulo: 'Checklist de Estados por Componente',
    estados: [
      'Default - Estado inicial/normal',
      'Hover - Mouse sobre o elemento',
      'Focus - Selecionado com teclado',
      'Active/Pressed - Durante o clique',
      'Loading - A processar ação',
      'Disabled - Ação não disponível',
      'Error - Validação falhada',
      'Success - Ação concluída',
    ],
  },
  pluginJsonFormat: {
    titulo: 'Formato JSON para Plugin Figma',
    exemplo: `{
  "projectName": "Cashback",
  "sourcePageName": "Cashback - Happy Path",
  "happyPathFrames": ["01-Login", "02-Dashboard"],
  "exceptionFlows": [
    {
      "name": "Saldo Insuficiente",
      "type": "BUSINESS_ERROR",
      "copyKey": "cashback.error.insufficient_balance"
    }
  ],
  "translations": {
    "pt-PT": { "cashback.error.insufficient_balance": "Saldo insuficiente." },
    "en-UK": { "cashback.error.insufficient_balance": "Insufficient balance." }
  }
}`,
  },
};

const prototypeAgent: Agent = {
  id: 'pa',
  nome: 'Prototype Agent',
  sigla: 'PA',
  missao: 'Gerar protótipos React funcionais a partir dos wireframes do DA, usando exclusivamente componentes do @bctt/design-system. Deploy automático com Vite em localhost:5173 para validação pelo cliente.',
  cor: '#9333EA',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Excelente em geração de código React/TypeScript',
      'Contexto longo permite manter consistência entre ecrãs',
      'Superior em seguir design system e padrões de código',
      'Bom em tradução de wireframes para componentes',
      'Integração MCP para comunicação com FA e DA',
      'Mantém histórico de versões e comparações',
    ],
    desvantagens: [
      'Necessita acesso a Figma via MCP para leitura',
      'Custo por token elevado para projetos grandes',
      'Não executa código - apenas gera para validação visual',
    ],
    alternativas: [
      { nome: 'Copilot', razao: 'Melhor para geração de código inline' },
      { nome: 'Cursor', razao: 'IDE com AI integrado' },
    ],
  },
  responsabilidades: [
    'Receber wireframes JSON e traduções do DA',
    'Verificar se já existe protótipo para o BDEV',
    'Gerar App.tsx + ecrãs React com componentes do @bctt/design-system',
    'Criar traduções i18n (PT/EN) a partir do UX writing do DA',
    'Exportar projecto Vite+React standalone',
    'Deploy automático (npm install + vite dev)',
    'Servir protótipo em localhost:5173',
  ],
  inputs: [
    'Wireframes JSON do DA',
    'Traduções PT/EN do DA',
    'DS compilado pelo DSLA',
  ],
  outputs: [
    'Protótipo React funcional (Vite + @bctt/design-system)',
    'Acessível em localhost:5173',
    'App.tsx + ecrãs TSX + i18n JSON',
  ],
  fluxo: [
    { fase: 'VERIFICAR', desc: 'Verifica protótipos existentes', icon: '🔍' },
    { fase: 'CONSULTAR', desc: 'Obtém jornadas aprovadas do FA/DA', icon: '📋' },
    { fase: 'GERAR', desc: 'Cria componentes React + i18n', icon: '⚛️' },
    { fase: 'COMPARAR', desc: 'Compara versões FA vs Cliente', icon: '🔄' },
    { fase: 'EXPORTAR', desc: 'Exporta ficheiros para validação', icon: '📦' },
  ],
  versionamento: 'Mantém histórico de versões: draft → fa_approved → client_approved → final. Comparação automática entre versões para identificar alterações do cliente.',
};

const dslaAgent: Agent = {
  id: 'dsla',
  nome: 'Design System Library Agent',
  sigla: 'DSLA',
  missao: 'Criar componentes React reais no bctt-design-system, baseados em MUI com design tokens BCTT (cores, tipografia Inter, borderRadius 8px). Fonte única de componentes — o protótipo importa tudo de @bctt/design-system.',
  cor: '#8B5CF6',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude + GitHub Copilot',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4 + Copilot Enterprise',
    logo: 'claude-copilot',
    cor: '#8B5CF6',
    vantagens: [
      'Claude: Excelente para specs e documentação técnica',
      'Copilot: Melhor autocomplete de código React/TypeScript',
      'Copilot: Integração nativa com VS Code e Storybook',
      'Claude: Superior em guidelines e Do\'s/Don\'ts',
      'Copilot: Gera testes unitários automaticamente',
      'Ambos suportam MCP para comunicação',
    ],
    desvantagens: [
      'Requer dois sistemas (mais complexidade)',
      'Custo combinado mais elevado',
      'Necessita orquestração entre os dois AIs',
      'Copilot pode gerar código que não segue convenções custom',
    ],
    alternativas: [
      { nome: 'Claude Code', razao: 'Solução única da Anthropic para código' },
      { nome: 'Cursor', razao: 'IDE com AI integrado, usa Claude/GPT' },
    ],
  },
  responsabilidades: [
    'Receber lista de componentes novos do DA',
    'Verificar se já existem no catálogo (35+ specs)',
    'Criar wrappers MUI com identidade BCTT (dsla_create_component)',
    'Gerar Storybook stories para cada componente (dsla_generate_stories)',
    'Verificar acessibilidade WCAG 2.1 AA',
    'Compilar o design system (dsla_build_design_system)',
    'Fazer HANDOFF para o PA',
  ],
  inputs: [
    'Lista de componentes novos do DA',
    'Catálogo de specs existentes (35+ componentes)',
  ],
  outputs: [
    'Componentes .tsx no bctt-design-system',
    'Stories para Storybook',
    'DS compilado e pronto para o PA',
    'HANDOFF automático para o PA',
  ],
  atomicDesign: {
    titulo: 'Estrutura Atomic Design',
    niveis: [
      {
        nome: 'Átomos',
        desc: 'Elementos básicos indivisíveis',
        exemplos: 'Button, Input, Icon, Label, Badge',
      },
      {
        nome: 'Moléculas',
        desc: 'Combinação de átomos com função específica',
        exemplos: 'InputGroup, SearchBar, FormField, MenuItem',
      },
      {
        nome: 'Organismos',
        desc: 'Componentes complexos e autónomos',
        exemplos: 'Header, Card, Navigation, CashbackWidget',
      },
      {
        nome: 'Templates',
        desc: 'Layouts de página reutilizáveis',
        exemplos: 'PageLayout, FormLayout, DashboardLayout',
      },
    ],
  },
  conventions: {
    titulo: 'Convenções de Código',
    regras: [
      { item: 'Componentes', conv: 'PascalCase', exemplo: 'CashbackWidget' },
      { item: 'Props Interface', conv: 'Nome + Props', exemplo: 'CashbackWidgetProps' },
      { item: 'Hooks', conv: 'camelCase com use', exemplo: 'useCashback' },
      { item: 'Tokens CSS', conv: '--bctt-*', exemplo: '--bctt-color-brand-primary' },
      { item: 'Ficheiros', conv: 'PascalCase', exemplo: 'CashbackWidget.tsx' },
    ],
  },
  fluxo: [
    { fase: 'ANÁLISE', desc: 'Verifica biblioteca e classifica nível', icon: '🔍' },
    { fase: 'SPECS', desc: 'Cria proposta para aprovação UX/UI', icon: '📋' },
    { fase: 'BUILD', desc: 'Gera código React + Storybook', icon: '⚛️' },
    { fase: 'REVIEW', desc: 'Submete para Design Review', icon: '✅' },
  ],
};

// ============================================
// FASE 02 - DESENVOLVIMENTO
// ============================================

const frontendDevAgent: Agent = {
  id: 'fda',
  nome: 'Frontend Dev Agent',
  sigla: 'FDA',
  missao: 'Construir código de frontend React de alta qualidade, utilizando os componentes do Design System e seguindo as especificações do DA.',
  cor: '#EC4899',
  detalhado: true,
  aiRecomendado: {
    nome: 'GitHub Copilot',
    provider: 'Microsoft / OpenAI',
    modelo: 'Copilot Enterprise',
    logo: 'copilot',
    cor: '#000000',
    vantagens: [
      'Melhor autocomplete de código React/TypeScript do mercado',
      'Integração nativa com VS Code e repositórios Git',
      'Conhece padrões de código do repositório existente',
      'Gera código consistente com a codebase',
      'Suporte a JSX, hooks, styled-components',
      'Integração com Azure DevOps',
    ],
    desvantagens: [
      'Custo por developer ($19-39/mês)',
      'Pode sugerir código que não segue convenções custom',
      'Necessita revisão humana para lógica complexa',
      'Menos contexto de negócio que Claude',
    ],
    alternativas: [
      { nome: 'Cursor', razao: 'IDE completo com AI integrado' },
      { nome: 'Claude Code', razao: 'Melhor para refactoring complexo' },
    ],
  },
  responsabilidades: [
    'Receber especificações e fluxo funcional do DA',
    'Utilizar componentes do Design System (biblioteca React)',
    'Construir código seguindo melhores práticas React',
    'Seguir estrutura da codebase existente nos repositórios',
    'Receber pedidos de correção do FBS',
    'Receber feedback do CQA e LTE para otimizações',
    'Criar tasks no PBI do trabalho efetuado',
  ],
  inputs: [
    'Especificações dadas pelo DA',
    'PBIs no Azure DevOps com regras de negócio',
    'Pedidos de correção do FBS',
    'Reports do CQA (code smells, vulnerabilidades)',
    'Reports do LTE (funções com problemas de performance)',
  ],
  outputs: [
    'Plano de implementação (para aprovação da equipa dev)',
    'Código React do fluxo especificado',
    'Pull request num feature branch',
    'Tasks criadas no PBI do trabalho efetuado',
  ],
  fluxo: [
    { fase: 'ANÁLISE', desc: 'Recebe specs do DA e PBIs', icon: '📥' },
    { fase: 'PLANO', desc: 'Cria plano de implementação', icon: '📋' },
    { fase: 'BUILD', desc: 'Desenvolve código React', icon: '⚛️' },
    { fase: 'PR', desc: 'Submete pull request', icon: '🔀' },
  ],
};

const backendDevAgent: Agent = {
  id: 'bda',
  nome: 'Backend Dev Agent',
  sigla: 'BDA',
  missao: 'Construir código backend .NET robusto, seguindo arquitetura de microserviços e event-driven, alinhado com o frontend.',
  cor: '#8B5CF6',
  detalhado: true,
  aiRecomendado: {
    nome: 'GitHub Copilot + Claude',
    provider: 'Anthropic',
    modelo: 'Copilot Enterprise + Claude Sonnet 4',
    logo: 'claude-copilot',
    cor: '#8B5CF6',
    vantagens: [
      'Copilot: Excelente para código .NET Core / C#',
      'Copilot: Conhece padrões de microserviços',
      'Copilot: Gera boilerplate rapidamente',
      'Claude: Superior em arquitetura e design patterns',
      'Claude: Melhor para decisões de estrutura event-driven',
      'Claude: Excelente para documentação de APIs',
    ],
    desvantagens: [
      'Dois sistemas aumenta complexidade',
      'Custo combinado mais elevado',
      'Necessita orquestração entre os dois AIs',
    ],
    alternativas: [
      { nome: 'Amazon CodeWhisperer', razao: 'Se usar AWS extensivamente' },
      { nome: 'JetBrains AI', razao: 'Se usar Rider IDE' },
    ],
  },
  responsabilidades: [
    'Receber especificações e fluxo funcional do DA',
    'Alinhar com FDA para garantir compatibilidade frontend-backend',
    'Construir código seguindo melhores práticas .NET',
    'Seguir arquitetura de microserviços e event-driven',
    'Esclarecer dúvidas com FA e DA quando necessário',
    'Receber feedback do CQA e LTE para otimizações',
    'Criar tasks no PBI do trabalho efetuado',
  ],
  inputs: [
    'Fluxo funcional dado pelo DA',
    'PBIs no Azure DevOps com regras de negócio',
    'Alinhamento com FDA (contratos de API)',
    'Reports do CQA (code smells, vulnerabilidades)',
    'Reports do LTE (funções com problemas de performance)',
  ],
  outputs: [
    'Plano de implementação (para aprovação da equipa dev)',
    'Código backend (.NET, scripts BD, etc.)',
    'Pull request num feature branch',
    'Tasks criadas no PBI do trabalho efetuado',
  ],
  fluxo: [
    { fase: 'ANÁLISE', desc: 'Recebe specs e alinha com FDA', icon: '📥' },
    { fase: 'PLANO', desc: 'Cria plano de implementação', icon: '📋' },
    { fase: 'BUILD', desc: 'Desenvolve código .NET', icon: '⚙️' },
    { fase: 'PR', desc: 'Submete pull request', icon: '🔀' },
  ],
};

const frontendBugSolver: Agent = {
  id: 'fbs',
  nome: 'Frontend Bug Solver',
  sigla: 'FBS',
  missao: 'Analisar bugs de frontend, criar planos de correção e coordenar com FDA ou DSLA para resolução.',
  cor: '#EF4444',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Excelente análise de logs e stack traces',
      'Superior em raciocínio sobre causa-raiz',
      'Consegue correlacionar bug com código existente',
      'Boa memória de contexto para bugs complexos',
      'Comunica bem com outros agentes (MCP)',
    ],
    desvantagens: [
      'Não gera código tão bem como Copilot',
      'Necessita integração com repositório para ver código',
      'Custo por token elevado',
    ],
    alternativas: [
      { nome: 'GPT-4', razao: 'Boa alternativa para análise' },
      { nome: 'Copilot', razao: 'Combinação para gerar fix' },
    ],
  },
  responsabilidades: [
    'Buscar bugs criados para um BDEV específico no Azure DevOps',
    'Analisar e preparar plano de correção do bug',
    'Enviar plano aprovado para FDA executar correção',
    'Se bug for no Design System, coordenar com DSLA',
    'Criar tasks no PBI do bug',
  ],
  inputs: [
    'Bugs no Azure DevOps (filtrados por BDEV)',
    'Código atual do repositório',
    'Logs e stack traces',
    'Tag do bug (design ou funcional)',
  ],
  outputs: [
    'Plano de correção (para aprovação da equipa dev)',
    'Pedido para FDA gerar código de correção',
    'Pedido para DSLA (se bug no Design System)',
    'Tasks criadas no PBI do bug',
  ],
  fluxo: [
    { fase: 'FETCH', desc: 'Busca bugs do BDEV no DevOps', icon: '🔍' },
    { fase: 'ANÁLISE', desc: 'Analisa causa-raiz', icon: '🔬' },
    { fase: 'PLANO', desc: 'Cria plano de correção', icon: '📋' },
    { fase: 'DISPATCH', desc: 'Envia para FDA ou DSLA', icon: '📤' },
  ],
};

const unitTesterAgent: Agent = {
  id: 'ute',
  nome: 'Unit Tester Executer',
  sigla: 'UTE',
  missao: 'Criar e executar testes unitários abrangentes baseados nas especificações funcionais, garantindo mínimo 80% de cobertura.',
  cor: '#06B6D4',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Excelente em ler specs e traduzir para testes',
      'Superior em formato Gherkin → JUnit',
      'Identifica edge cases que humanos podem perder',
      'Boa cobertura de cenários de erro',
      'Consegue analisar código e sugerir testes relevantes',
    ],
    desvantagens: [
      'Pode gerar testes redundantes',
      'Necessita acesso ao código para contexto',
      'Testes gerados precisam de revisão',
    ],
    alternativas: [
      { nome: 'Copilot', razao: 'Melhor integração com IDE' },
      { nome: 'Diffblue Cover', razao: 'Especializado em testes Java' },
    ],
  },
  responsabilidades: [
    'Analisar specs do FA (regras de negócio, critérios de aceitação)',
    'Analisar código do FDA e BDA',
    'Criar testes unitários JUnit com mín. 80% cobertura',
    'Executar testes após aprovação do código',
    'Gerar report de resultados e submeter no PBI',
  ],
  inputs: [
    'PBIs com regras de negócio e critérios de aceitação',
    'Código gerado pelo FDA',
    'Código gerado pelo BDA',
    'Aprovação da equipa dev para executar',
  ],
  outputs: [
    'Ficheiros de testes unitários (JUnit)',
    'Submissão no mesmo branch do Git',
    'Report de execução dos testes',
    'Report submetido no PBI de testes unitários',
  ],
  fluxo: [
    { fase: 'ANÁLISE', desc: 'Lê specs e código', icon: '📖' },
    { fase: 'GERAÇÃO', desc: 'Cria testes JUnit', icon: '🧪' },
    { fase: 'EXECUÇÃO', desc: 'Executa testes', icon: '▶️' },
    { fase: 'REPORT', desc: 'Gera relatório', icon: '📊' },
  ],
  metricas: {
    titulo: 'Métricas de Cobertura',
    thresholds: [
      { nome: 'Cobertura mínima', valor: '80%', tipo: 'obrigatório' },
      { nome: 'Cobertura ideal', valor: '90%', tipo: 'recomendado' },
      { nome: 'Branches coverage', valor: '75%', tipo: 'obrigatório' },
    ],
  },
};

const loadTesterAgent: Agent = {
  id: 'lte',
  nome: 'Load Tester Executer',
  sigla: 'LTE',
  missao: 'Executar testes de carga com JMeter, validar thresholds definidos pela equipa, e reportar problemas de performance.',
  cor: '#14B8A6',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Excelente análise de resultados de performance',
      'Consegue identificar bottlenecks nos reports',
      'Sugere otimizações baseadas nos dados',
      'Boa comunicação dos problemas para FDA/BDA',
    ],
    desvantagens: [
      'Não executa JMeter diretamente (precisa integração)',
      'Análise depende da qualidade dos logs',
      'Pode precisar de contexto técnico adicional',
    ],
    alternativas: [
      { nome: 'Gemini', razao: 'Bom em análise de dados' },
      { nome: 'GPT-4', razao: 'Alternativa sólida' },
    ],
  },
  responsabilidades: [
    'Receber especificações de carga e thresholds (por BDEV)',
    'Executar testes de carga com JMeter',
    'Analisar resultados vs thresholds definidos',
    'Se thresholds não cumpridos: reportar a FDA e BDA',
    'Identificar funções específicas com problemas de performance',
  ],
  inputs: [
    'Especificações de carga definidas pela equipa dev',
    'Thresholds aceitáveis (por BDEV)',
    'Código deployado em ambiente de teste',
    'Aprovação da equipa dev para executar',
  ],
  outputs: [
    'Report de resultados dos testes de carga',
    'Lista de funções que não cumpriram thresholds',
    'Pedido a FDA/BDA para análise e proposta de alterações',
    'Tasks criadas no PBI',
  ],
  fluxo: [
    { fase: 'CONFIG', desc: 'Recebe thresholds do BDEV', icon: '⚙️' },
    { fase: 'EXECUÇÃO', desc: 'Executa testes JMeter', icon: '🚀' },
    { fase: 'ANÁLISE', desc: 'Compara com thresholds', icon: '📈' },
    { fase: 'REPORT', desc: 'Reporta para FDA/BDA', icon: '📤' },
  ],
  ferramenta: {
    titulo: 'Ferramenta de Load Testing',
    nome: 'Apache JMeter',
    metricas: [
      'Response Time (avg, p95, p99)',
      'Throughput (requests/sec)',
      'Error Rate (%)',
      'Concurrent Users',
    ],
  },
};

const codeQualityAgent: Agent = {
  id: 'cqa',
  nome: 'Code Quality Agent',
  sigla: 'CQA',
  missao: 'Garantir qualidade do código através dos quality gates do SonarQube, bloqueando PRs que não cumpram standards.',
  cor: '#84CC16',
  detalhado: true,
  aiRecomendado: {
    nome: 'Claude + SonarQube',
    provider: 'Anthropic',
    modelo: 'Claude Sonnet 4 + SonarQube',
    logo: 'claude',
    cor: '#D97706',
    vantagens: [
      'Excelente interpretação de reports SonarQube',
      'Consegue explicar code smells em linguagem clara',
      'Sugere fixes específicos para cada problema',
      'Boa priorização de issues (críticos vs minor)',
      'Comunica bem com FDA/BDA sobre correções',
    ],
    desvantagens: [
      'Depende da qualidade da config do SonarQube',
      'Pode ser muito restritivo se thresholds mal definidos',
      'Necessita integração com pipeline CI/CD',
    ],
    alternativas: [
      { nome: 'Copilot', razao: 'Sugestões de fix inline' },
      { nome: 'CodeClimate', razao: 'Alternativa ao SonarQube' },
    ],
  },
  responsabilidades: [
    'Executar quality gates do SonarQube',
    'Analisar resultados e identificar problemas',
    'Enviar report de não-compliance para FDA/BDA',
    'Receber notificação quando correções são submetidas',
    'Re-executar quality gates após correções',
    'Só aprovar PR quando resultados estiverem conformes',
  ],
  inputs: [
    'Código submetido em feature branch',
    'Configuração de quality gates do SonarQube',
    'Notificação de correções do FDA/BDA',
  ],
  outputs: [
    'Report de quality gates (pass/fail)',
    'Lista detalhada de issues (code smells, vulnerabilidades, bugs)',
    'Pedido de correção para FDA/BDA',
    'Aprovação final do PR (quando conforme)',
    'Tasks criadas no PBI',
  ],
  fluxo: [
    { fase: 'SCAN', desc: 'Executa SonarQube', icon: '🔍' },
    { fase: 'ANÁLISE', desc: 'Analisa resultados', icon: '📊' },
    { fase: 'REPORT', desc: 'Envia para FDA/BDA', icon: '📤' },
    { fase: 'APPROVE', desc: 'Aprova PR', icon: '✅' },
  ],
  qualityGates: {
    titulo: 'Quality Gates SonarQube',
    regras: [
      { nome: 'Bugs', threshold: '0 novos', severity: 'Blocker' },
      { nome: 'Vulnerabilities', threshold: '0 novas', severity: 'Blocker' },
      { nome: 'Code Smells', threshold: 'Rating A', severity: 'Major' },
      { nome: 'Coverage', threshold: '≥ 80%', severity: 'Major' },
      { nome: 'Duplications', threshold: '< 3%', severity: 'Minor' },
    ],
  },
};

// ============================================
// FASE 03 - PÓS-PRODUÇÃO
// ============================================

const monitoringAgent: Agent = {
  id: 'monitor',
  nome: 'Monitoring Agent',
  sigla: 'MON',
  missao: 'Acompanhar a utilização em produção e identificar oportunidades de melhoria.',
  cor: '#06B6D4',
  detalhado: false,
  aiRecomendado: {
    nome: 'Microsoft Copilot',
    provider: 'Microsoft / OpenAI',
    modelo: 'Copilot for Microsoft 365',
    logo: 'mscopilot',
    cor: '#0078D4',
    vantagens: [
      'Integração nativa com Microsoft Clarity',
      'Análise de dados em Power BI com linguagem natural',
      'Acesso a todo o ecossistema Microsoft 365',
      'Gera relatórios e dashboards automaticamente',
      'Sumariza reuniões e emails relacionados',
      'Integração com Azure Monitor e Application Insights',
    ],
    desvantagens: [
      'Requer licença Microsoft 365 Copilot ($30/user/mês)',
      'Menos flexível que soluções API-first',
      'Limitado ao ecossistema Microsoft',
      'Menos capacidade de raciocínio que Claude/GPT-4',
    ],
    alternativas: [
      { nome: 'Claude', razao: 'Se precisar de análise mais profunda' },
      { nome: 'Gemini', razao: 'Se usar Google Analytics/Looker' },
    ],
  },
  responsabilidades: [
    'Configurar Microsoft Clarity',
    'Analisar padrões de utilização',
    'Identificar erros e friction points',
    'Gerar novos pedidos de melhoria',
  ],
  inputs: [
    'Dados do Microsoft Clarity',
    'Feedback de utilizadores',
    'Métricas de performance',
  ],
  outputs: [
    'Relatórios de utilização',
    'Pedidos de melhoria para o BA',
  ],
};

// ============================================
// FASES
// ============================================

export const phases: Phase[] = [
  {
    id: 'concepcao',
    nome: 'Conceção',
    numero: '01',
    descricao: 'Fase de discovery, definição de requisitos e design da solução',
    cor: '#0A1628',
    agentes: [brainstormAgent, functionalAgent, designAgent, prototypeAgent, dslaAgent],
  },
  {
    id: 'desenvolvimento',
    nome: 'Desenvolvimento',
    numero: '02',
    descricao: 'Implementação, testes e validação de qualidade - Orquestrado pelo BA',
    cor: '#0F172A',
    agentes: [frontendDevAgent, backendDevAgent, frontendBugSolver, unitTesterAgent, loadTesterAgent, codeQualityAgent],
  },
  {
    id: 'producao',
    nome: 'Pós-Produção',
    numero: '03',
    descricao: 'Monitorização, métricas e melhoria contínua',
    cor: '#1E293B',
    agentes: [monitoringAgent],
  },
];

// ============================================
// HELPERS
// ============================================

export const getPhaseById = (phaseId: string): Phase | undefined => {
  return phases.find((p) => p.id === phaseId);
};

export const getAgentById = (agentId: string): Agent | undefined => {
  for (const phase of phases) {
    const agent = phase.agentes.find((a) => a.id === agentId);
    if (agent) return agent;
  }
  return undefined;
};

export const getAgentsByPhase = (phaseId: string): Agent[] => {
  const phase = getPhaseById(phaseId);
  return phase?.agentes || [];
};

export default phases;
