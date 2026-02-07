// ============================================
// MULTI-PHASE PIPELINE EXECUTOR
// Breaks long agent operations into sequential phases
// with progress tracking for the frontend.
// ============================================

export interface AgentPhase {
  id: string;
  name: string;
  phasePrompt: string;
  requiredFullPhases?: string[];
  maxTurns?: number;
}

export interface PhaseProgress {
  current: number;
  total: number;
  phaseId: string;
  phaseName: string;
  status: "pending" | "in_progress" | "completed" | "error";
  result?: string;
}

export type ProgressCallback = (progress: PhaseProgress) => void;

// Signature for the Claude Code CLI spawn function (injected to avoid circular deps)
export type SpawnFn = (
  prompt: string,
  systemPrompt: string,
  mcpConfigPath: string,
  maxTurns?: number
) => Promise<{ stdout: string; stderr: string }>;

// ============================================
// FA PHASES (8 phases)
// ============================================

const FA_PHASES: AgentPhase[] = [
  {
    id: "analyze",
    name: "Análise de requisitos",
    phasePrompt: `[FASE 1/8] Analisa os requisitos recebidos do BA.
Identifica e lista de forma estruturada:
- Funcionalidades principais e secundárias
- Personas e perfis de utilizador envolvidos
- Canais (mobile, web, ATM, balcão)
- Integrações necessárias com sistemas externos
- Restrições regulamentares e de segurança
- Cenários de exceção mencionados

NÃO cries user stories — apenas analisa e estrutura os requisitos.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: funcionalidades, personas, canais, integrações, restrições, exceções — max 2000 chars]`,
  },
  {
    id: "user_stories",
    name: "User Stories",
    phasePrompt: `[FASE 2/8] Cria user stories com base na análise anterior.
Cada User Story deve ter:
- ID sequencial (US001, US002, …)
- Título descritivo
- Narrativa: Como [persona], quero [ação], para [benefício]
- MVP: MVP1 (core) | MVP2 (complementar) | MVP3 (nice-to-have)
- Critérios de aceitação em Gherkin (Given/When/Then)
- Cenários de exceção relevantes

Podes usar a tool fa_create_user_stories para auxiliar a estruturação.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta de todas as US: ID, título, narrativa resumida, MVP — max 2000 chars]`,
    maxTurns: 15,
  },
  {
    id: "rules",
    name: "Regras e campos",
    phasePrompt: `[FASE 3/8] Detalha regras de negócio e mapeamento de campos.
Para cada ecrã/funcionalidade:
- Campos necessários (nome, tipo, obrigatoriedade, formato)
- Regras de validação
- Regras de cálculo (se aplicável)
- Mapeamento: Requisito → User Story → Campos → Regras → Formatação

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: campos por ecrã, regras-chave, validações — max 2000 chars]`,
  },
  {
    id: "flow",
    name: "Fluxo funcional",
    phasePrompt: `[FASE 4/8] Define o fluxo funcional entre user stories.
Identifica:
- Sequência de execução das stories
- Dependências (blocks, relates_to)
- Jornadas do utilizador (happy path + exceções)

Podes usar a tool fa_propose_functional_flow.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: sequência de US, dependências entre elas, happy path — max 2000 chars]`,
  },
  {
    id: "validation",
    name: "Validação",
    phasePrompt: `[FASE 5/8] Valida as especificações contra os requisitos originais.
Verifica:
- Todos os requisitos do BA estão cobertos por user stories
- Cenários de exceção têm critérios de aceitação
- Estrutura de MVPs é equilibrada

Podes usar a tool fa_validate_with_ba.
Reporta o resultado da validação.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Resultado da validação: aprovado/gaps, cobertura de requisitos, issues encontradas — max 1000 chars]`,
  },
  {
    id: "word_document",
    name: "Documento Word",
    phasePrompt: `[FASE 6/8] Gera o documento "Informação Adicional" (.docx).
USA OBRIGATORIAMENTE a tool fa_generate_document com:
- ba_validation_approved: true
- titulo: nome da funcionalidade
- codigo_bdev: [BDEV_PENDING]
- ecras, user_stories, campos_regras: dados das fases anteriores

Termina SEMPRE com:
## ENTREGA
[Confirmação: documento gerado, nome do ficheiro, tamanho — max 500 chars]`,
    requiredFullPhases: ["user_stories", "rules"],
    maxTurns: 15,
  },
  {
    id: "jira_export",
    name: "Exportação Jira",
    phasePrompt: `[FASE 7/8] Exporta a estrutura completa para o Jira.
USA OBRIGATORIAMENTE a tool jira_bulk_create_with_document com a estrutura:
- functionality_name: nome da funcionalidade
- description: resumo executivo
- epics: array com Epic(s), cada um com features, e cada feature com user_stories

O documento Word foi gerado na fase anterior e será anexado automaticamente ao Epic.
NÃO é necessário passar document_base64 — é lido automaticamente.

ATENÇÃO - CADA feature DEVE ter user_stories preenchido com:
- id, narrative (Como X quero Y para Z), business_rules, acceptance_criteria (Gherkin), mvp (boolean), priority
- NUNCA envies features com user_stories vazio

Reporta o resultado: issues criadas, keys do Jira, eventuais erros.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Keys criadas no Jira: Epic, Features, User Stories — max 1000 chars]`,
    requiredFullPhases: ["user_stories", "rules"],
    maxTurns: 15,
  },
  {
    id: "summary",
    name: "Consolidação",
    phasePrompt: `[FASE 8/8] Consolida e apresenta o resultado final ao utilizador.

⚠️ ATENÇÃO: NÃO chames NENHUMA tool nesta fase.
A exportação Jira e geração de documentos já foram feitas nas fases anteriores.
O teu ÚNICO trabalho é apresentar um resumo claro e organizado.
NÃO uses nenhuma tool. APENAS texto.

Apresenta de forma clara e concisa:
1. **User Stories** — Lista com títulos e MVPs
2. **Regras principais** — Resumo das regras de negócio
3. **Fluxo** — Sequência e dependências
4. **Validação** — Resultado (aprovado/gaps)
5. **Documento Word** — Ficheiro gerado
6. **Jira** — Issues criadas (keys) e estrutura exportada
7. **Próximos passos** — Avanço para DA

IMPORTANTE: Esta é a resposta que o utilizador vai ver. Sê claro e organizado. NÃO executes tools — apenas texto.`,
    requiredFullPhases: ["user_stories"],
    maxTurns: 5,
  },
];

// ============================================
// DA PHASES (5 phases)
// ============================================

const DA_PHASES: AgentPhase[] = [
  {
    id: "analyze",
    name: "Análise de ecrãs",
    phasePrompt: `[FASE 1/5] Analisa as user stories e identifica ecrãs necessários.
Para cada US, determina:
- Ecrãs necessários (IDs e nomes)
- Estados por ecrã (default, loading, error, empty, success)
- Navegação entre ecrãs

IMPORTANTE — Verificação do Design System:
1. Usa da_list_components para listar componentes disponíveis
2. Para cada ecrã, identifica que componentes são necessários
3. Usa da_check_design_system para verificar se existem
4. Se algum componente NÃO existir, regista-o na ENTREGA como "componente em falta"

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: ecrãs (ID, nome, US associada), componentes existentes, componentes EM FALTA, navegação — max 2000 chars]`,
  },
  {
    id: "wireframes",
    name: "Wireframes",
    phasePrompt: `[FASE 2/5] Cria wireframes DETALHADOS para cada ecrã.

IMPORTANTE: Cada ecrã deve ter conteúdo DIFERENTE baseado na sua User Story.

Para cada ecrã:
1. Chama da_create_wireframes com sections específicos:
   - Campos de formulário reais (não genéricos)
   - Componentes do Design System adequados ao contexto
   - Listas, tabelas, cards conforme a funcionalidade
2. Chama da_generate_figma_spec para enviar ao Figma
3. Chama da_generate_ux_flow para criar o fluxo UX (DEPOIS dos wireframes)

Exemplo de sections diferenciados:
- Ecrã de Login: [{ type: 'form', components: ['Input:Email', 'Input:Password', 'Button:Entrar'] }]
- Ecrã de Dashboard: [{ type: 'list', components: ['Card:Saldo', 'Card:Movimentos', 'Chart:Gastos'] }]
- Ecrã de Detalhes: [{ type: 'detail', components: ['Label:IBAN', 'Label:Saldo', 'Table:Movimentos'] }]

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: ecrãs criados, componentes usados, estados cobertos — max 2000 chars]`,
  },
  {
    id: "exceptions",
    name: "Fluxos de exceção",
    phasePrompt: `[FASE 3/5] Define fluxos de exceção com UX Writing.
Para cada cenário de erro:
- Título (max 60 chars)
- Descrição (max 120 chars)
- Tipo (blocking/non_blocking/informational)
- Ação (retry/redirect/dismiss)

Usa a tool da_define_exception_flows.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: cenários de exceção definidos, tipo e ação de cada — max 1500 chars]`,
  },
  {
    id: "translations",
    name: "Traduções PT/EN",
    phasePrompt: `[FASE 4/5] Cria traduções para todos os textos visíveis.

IMPORTANTE: Consolida TODAS as traduções numa única chamada a da_create_screen_copy.
NÃO faças uma chamada por ecrã — agrupa todos os ecrãs.

Para todos os ecrãs em conjunto:
- Identificar todos os textos visíveis
- Criar copy em PT e EN
- Gerar chaves i18n

Usa da_get_standard_translations para obter traduções padrão e depois da_create_screen_copy com todos os ecrãs.

Termina SEMPRE a tua resposta com um bloco:
## ENTREGA
[Lista compacta: ecrãs traduzidos, total de chaves i18n, idiomas — max 1000 chars]`,
  },
  {
    id: "summary",
    name: "Entrega final",
    phasePrompt: `[FASE 5/5] Consolida todos os outputs e apresenta ao utilizador.
Resume:
1. Wireframes criados (lista de ecrãs)
2. Fluxos de exceção definidos
3. Traduções geradas
4. Componentes em falta no Design System (se houver)
5. Próximos passos (PA — Prototype Agent)

IMPORTANTE: Esta é a resposta que o utilizador vai ver. Sê claro e organizado.`,
  },
];

// ============================================
// PA PHASES (3 phases)
// ============================================

const PA_PHASES: AgentPhase[] = [
  {
    id: "analyze",
    name: "Análise de protótipos",
    phasePrompt: `[FASE 1/3] Analisa os wireframes e especificações recebidos do DA.
Identifica:
- Protótipos existentes (usa pa_list_prototypes)
- Ecrãs a criar/atualizar
- Componentes e interações necessárias

Termina SEMPRE com:
## ENTREGA
[Lista: protótipos existentes, ecrãs a criar, componentes — max 1500 chars]`,
  },
  {
    id: "prototype",
    name: "Criação de protótipos",
    phasePrompt: `[FASE 2/3] Cria ou atualiza protótipos para todos os ecrãs.
Para cada ecrã:
- Usa pa_create_prototype com HTML/CSS real
- Inclui componentes do Design System BCTT
- Gera todos os estados (default, loading, error, success)

Termina SEMPRE com:
## ENTREGA
[Lista: protótipos criados, estados cobertos — max 1500 chars]`,
    requiredFullPhases: ["analyze"],
  },
  {
    id: "summary",
    name: "Entrega final",
    phasePrompt: `[FASE 3/3] Consolida e apresenta os protótipos criados.
Resume:
1. Protótipos criados (lista)
2. Estados cobertos
3. Próximos passos

IMPORTANTE: Esta é a resposta que o utilizador vai ver. Sê claro e organizado.`,
  },
];

// ============================================
// PHASE REGISTRY
// ============================================

const AGENT_PHASES: Record<string, AgentPhase[]> = {
  fa: FA_PHASES,
  da: DA_PHASES,
  pa: PA_PHASES,
};

export function getAgentPhases(agentId: string): AgentPhase[] | null {
  return AGENT_PHASES[agentId] || null;
}

export function hasPhases(agentId: string): boolean {
  return agentId in AGENT_PHASES;
}

// ============================================
// PIPELINE EXECUTOR
// ============================================

/**
 * Execute a multi-phase pipeline for an agent.
 * Each phase is a separate Claude Code CLI call with focused context.
 */
export async function executePipeline(
  agentId: string,
  baseSystemPrompt: string,
  userMessage: string,
  mcpConfigPath: string,
  spawnFn: SpawnFn,
  onProgress: ProgressCallback
): Promise<string> {
  const phases = getAgentPhases(agentId);
  if (!phases) {
    throw new Error(`No phases defined for agent '${agentId}'`);
  }

  const phaseOutputs: Array<{
    id: string;
    name: string;
    output: string;
  }> = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    // Emit: in_progress
    onProgress({
      current: i + 1,
      total: phases.length,
      phaseId: phase.id,
      phaseName: phase.name,
      status: "in_progress",
    });

    // Strip HANDOFF rule from base prompt — pipeline manages transitions automatically
    let cleanBasePrompt = baseSystemPrompt;
    const handoffIdx = cleanBasePrompt.indexOf("## REGRA DE HANDOFF");
    if (handoffIdx !== -1) {
      const nextSection = cleanBasePrompt.indexOf("\n## ", handoffIdx + 5);
      cleanBasePrompt = cleanBasePrompt.substring(0, handoffIdx).trimEnd() +
        (nextSection > 0 ? cleanBasePrompt.substring(nextSection) : "");
    }

    // Build phase-specific system prompt
    const phaseSystemPrompt =
      cleanBasePrompt +
      `\n\n---\n## EXECUÇÃO POR FASES\nEstás a executar a fase ${i + 1} de ${phases.length}.\n` +
      phase.phasePrompt;

    // Build prompt with accumulated context
    const phasePrompt = buildPhasePrompt(
      userMessage,
      phaseOutputs,
      i,
      phases.length,
      phase
    );

    console.log(
      `[${agentId}] Pipeline phase ${i + 1}/${phases.length}: ${phase.name} (prompt: ${phasePrompt.length} chars, sysPrompt: ${phaseSystemPrompt.length} chars, maxTurns: ${phase.maxTurns || 10})`
    );

    try {
      const startTime = Date.now();
      const { stdout, stderr } = await spawnFn(
        phasePrompt,
        phaseSystemPrompt,
        mcpConfigPath,
        phase.maxTurns
      );
      const elapsed = Date.now() - startTime;

      // Log stderr from CLI (MCP server startup, errors, etc.)
      if (stderr) {
        console.log(`[${agentId}] Phase ${i + 1} stderr: ${stderr.substring(0, 500)}`);
      }

      // Parse response
      let responseText = "";
      try {
        const result = JSON.parse(stdout);
        if (result.is_error) {
          throw new Error(result.result || "Phase returned error");
        }
        responseText = result.result || "";
        console.log(
          `[${agentId}] Phase ${i + 1} completed in ${elapsed}ms (${responseText.length} chars, ${result.num_turns || 1} turns, $${result.cost_usd?.toFixed(4) || "0"})`
        );
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) {
          responseText = stdout.trim();
          console.log(
            `[${agentId}] Phase ${i + 1} completed in ${elapsed}ms (non-JSON, ${responseText.length} chars)`
          );
        } else {
          throw parseErr;
        }
      }

      // Log output preview for debugging
      if (responseText.length > 0) {
        console.log(`[${agentId}] Phase ${i + 1} preview: ${responseText.substring(0, 300).replace(/\n/g, "\\n")}`);
      }

      // Retry if output is suspiciously short (not for summary phases)
      if (responseText.length < 100 && phase.id !== "summary") {
        console.warn(
          `[${agentId}] ⚠️ Phase ${i + 1} (${phase.name}) output too short (${responseText.length} chars). Retrying...`
        );
        const retryPrompt =
          `A tua resposta anterior foi demasiado curta (${responseText.length} chars). ` +
          `Precisas de produzir uma resposta COMPLETA e DETALHADA para esta fase.\n\n` +
          phasePrompt;
        const retryStart = Date.now();
        const { stdout: retryStdout, stderr: retryStderr } = await spawnFn(
          retryPrompt, phaseSystemPrompt, mcpConfigPath, phase.maxTurns
        );
        const retryElapsed = Date.now() - retryStart;

        if (retryStderr) {
          console.log(`[${agentId}] Phase ${i + 1} retry stderr: ${retryStderr.substring(0, 500)}`);
        }

        try {
          const retryResult = JSON.parse(retryStdout);
          const retryText = retryResult.result || "";
          console.log(
            `[${agentId}] Phase ${i + 1} retry completed in ${retryElapsed}ms (${retryText.length} chars, ${retryResult.num_turns || 1} turns)`
          );
          if (retryText.length > responseText.length) {
            responseText = retryText;
            console.log(`[${agentId}] Phase ${i + 1} using retry result (${responseText.length} chars)`);
          }
        } catch {
          const retryText = retryStdout.trim();
          if (retryText.length > responseText.length) {
            responseText = retryText;
          }
        }
      }

      phaseOutputs.push({
        id: phase.id,
        name: phase.name,
        output: responseText,
      });

      // Emit: completed
      onProgress({
        current: i + 1,
        total: phases.length,
        phaseId: phase.id,
        phaseName: phase.name,
        status: "completed",
      });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error(`[${agentId}] Phase ${i + 1} error:`, errMsg);

      onProgress({
        current: i + 1,
        total: phases.length,
        phaseId: phase.id,
        phaseName: phase.name,
        status: "error",
      });

      throw error;
    }
  }

  // Return the last phase's output (the user-facing summary)
  return phaseOutputs[phaseOutputs.length - 1]?.output || "";
}

// ============================================
// PROMPT BUILDER
// ============================================

/**
 * Build the prompt for a specific phase with accumulated context from prior phases.
 * Uses the ## ENTREGA handover block from older phases (like cross-agent HANDOFF).
 * Only the immediately preceding phase is kept in full, plus any requiredFullPhases.
 */
function buildPhasePrompt(
  originalMessage: string,
  previousOutputs: Array<{ id: string; name: string; output: string }>,
  currentIndex: number,
  totalPhases: number,
  currentPhase?: AgentPhase
): string {
  // First phase: just the original message
  if (previousOutputs.length === 0) {
    return originalMessage;
  }

  const requiredFull = new Set(currentPhase?.requiredFullPhases || []);

  let prompt = "CONTEXTO DAS FASES ANTERIORES:\n";
  prompt += "─".repeat(50) + "\n\n";

  for (let j = 0; j < previousOutputs.length; j++) {
    const prev = previousOutputs[j];
    const isLastPhase = j === previousOutputs.length - 1;
    const isRequired = requiredFull.has(prev.id);

    let output: string;
    if (isLastPhase || isRequired) {
      // Keep full output for immediately preceding phase and required phases
      output = prev.output;
    } else {
      // Older phases: extract ## ENTREGA block, fallback to truncation
      output = extractEntrega(prev.output)
        || truncateOutput(prev.output, 1500);
    }

    prompt += `## ${prev.name}\n`;
    prompt += output + "\n\n";
  }

  prompt += "─".repeat(50) + "\n\n";
  prompt += `PEDIDO ORIGINAL DO UTILIZADOR:\n${originalMessage}\n\n`;
  prompt += `───\nFase atual: ${currentIndex + 1} de ${totalPhases}. Executa APENAS o trabalho desta fase.\n`;

  return prompt;
}

/**
 * Extract the ## ENTREGA handover block from a phase output.
 * Returns null if not found.
 */
function extractEntrega(text: string): string | null {
  const idx = text.indexOf("## ENTREGA");
  if (idx === -1) return null;
  let entrega = text.substring(idx);
  // Stop at next ## heading (if any)
  const nextHeading = entrega.indexOf("\n## ", 5);
  if (nextHeading > 0) entrega = entrega.substring(0, nextHeading);
  return entrega.trim();
}

function truncateOutput(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[...resumido para contexto]";
}
