// ============================================
// FAST PIPELINE EXECUTOR (Single-Call-Per-Agent)
// Instead of N separate CLI calls per agent,
// uses ONE call with a consolidated prompt.
// ~50-65% faster than multi-phase pipeline.
// ============================================

import { type SpawnFn, type ProgressCallback } from "./pipeline.js";

// ============================================
// MAX TURNS PER AGENT
// ============================================

const AGENT_MAX_TURNS: Record<string, number> = {
  fa: 30,
  da: 25,
  pa: 15,
};

// ============================================
// CONSOLIDATED PROMPTS
// ============================================

const CONSOLIDATED_PROMPTS: Record<string, string> = {
  fa: `Executa o trabalho COMPLETO do FA numa única sessão, seguindo estes passos na ordem:

1. ANÁLISE DE REQUISITOS
   Analisa os requisitos recebidos do BA. Identifica: funcionalidades principais/secundárias, personas, canais (mobile/web/ATM/balcão), integrações, restrições regulamentares, cenários de exceção.

2. USER STORIES
   Cria user stories completas:
   - ID sequencial (US001, US002, …)
   - Narrativa: Como [persona], quero [ação], para [benefício]
   - MVP: MVP1 (core) | MVP2 (complementar) | MVP3 (nice-to-have)
   - Critérios de aceitação em Gherkin (Given/When/Then)
   - Cenários de exceção
   Podes usar a tool fa_create_user_stories para auxiliar.

3. REGRAS E CAMPOS
   Para cada ecrã/funcionalidade: campos (nome, tipo, obrigatoriedade, formato), regras de validação, regras de cálculo, mapeamento Requisito → US → Campos → Regras.

4. FLUXO FUNCIONAL
   Define sequência entre US, dependências (blocks, relates_to), jornadas do utilizador (happy path + exceções). Podes usar fa_propose_functional_flow.

5. VALIDAÇÃO
   Verifica: todos os requisitos do BA cobertos, cenários de exceção têm critérios, MVPs equilibrados. Usa fa_validate_with_ba.

6. DOCUMENTO WORD
   Gera o documento "Informação Adicional" (.docx). USA OBRIGATORIAMENTE a tool fa_generate_document com ba_validation_approved: true, titulo, codigo_bdev: [BDEV_PENDING], e dados dos passos anteriores.

7. EXPORTAÇÃO JIRA
   USA OBRIGATORIAMENTE a tool jira_bulk_create_with_document com:
   - functionality_name, description, epics (com features e user_stories)
   - CADA feature DEVE ter user_stories preenchido com: id, narrative, business_rules, acceptance_criteria (Gherkin), mvp (boolean), priority
   - NUNCA envies features com user_stories vazio
   - O documento Word é anexado automaticamente ao Epic

8. RESUMO FINAL
   Apresenta resultado claro e organizado:
   - User Stories (lista com títulos e MVPs)
   - Regras principais
   - Fluxo e dependências
   - Validação (aprovado/gaps)
   - Documento Word gerado
   - Issues Jira criadas (keys e estrutura)
   - Próximos passos (avanço para DA)

REGRAS CRÍTICAS:
- Chama as tools MCP conforme necessário em cada passo
- NÃO saltes passos — executa TODOS sequencialmente
- Sê completo e detalhado em cada passo
- O resumo final é a resposta que o utilizador vai ver`,

  da: `Executa o trabalho COMPLETO do DA numa única sessão, seguindo estes passos na ordem:

1. ANÁLISE DE ECRÃS
   Para cada User Story, determina: ecrãs necessários (IDs e nomes), estados por ecrã (default, loading, error, empty, success), navegação entre ecrãs.
   Verificação do Design System:
   - Usa da_list_components para listar componentes disponíveis
   - Para cada ecrã, identifica componentes necessários
   - Usa da_check_design_system para verificar se existem
   - Regista componentes em falta

2. WIREFRAMES
   Para cada ecrã:
   - Chama da_create_wireframes com sections ESPECÍFICOS ao contexto (não genéricos!)
   - Usa componentes do Design System adequados
   - Chama da_generate_figma_spec para enviar ao Figma
   - Chama da_generate_ux_flow para criar o fluxo UX (depois dos wireframes)
   Cada ecrã deve ter conteúdo DIFERENTE baseado na sua User Story.

3. FLUXOS DE EXCEÇÃO
   Para cada cenário de erro: título (max 60 chars), descrição (max 120 chars), tipo (blocking/non_blocking/informational), ação (retry/redirect/dismiss).
   Usa da_define_exception_flows.

4. TRADUÇÕES PT/EN
   IMPORTANTE: Consolida TODAS as traduções numa ÚNICA chamada a da_create_screen_copy (não por ecrã).
   Usa da_get_standard_translations para traduções padrão. Gera chaves i18n.

5. RESUMO FINAL
   Apresenta entrega organizada:
   - Wireframes criados (lista de ecrãs)
   - Fluxos de exceção definidos
   - Traduções geradas
   - Componentes em falta no Design System
   - Próximos passos (PA — Prototype Agent)

REGRAS CRÍTICAS:
- Executa TODOS os passos sequencialmente
- Sections dos wireframes devem ser específicos (não genéricos)
- O resumo final é a resposta que o utilizador vai ver`,

  pa: `Executa o trabalho COMPLETO do PA numa única sessão:

1. ANÁLISE
   Verifica protótipos existentes com pa_list_prototypes. Identifica ecrãs a criar/atualizar, componentes e interações.

2. CRIAÇÃO DE PROTÓTIPOS
   Para cada ecrã: usa pa_create_prototype com HTML/CSS real, componentes do Design System BCTT, todos os estados (default, loading, error, success).

3. RESUMO FINAL
   Apresenta protótipos criados, estados cobertos, e próximos passos.

REGRAS:
- Usa APENAS tools com prefixo pa_
- Gera código React com componentes do Design System BCTT
- O resumo final é a resposta que o utilizador vai ver`,
};

// ============================================
// FAST PIPELINE EXECUTOR
// ============================================

/**
 * Execute a single-call pipeline for an agent.
 * Instead of N separate CLI calls, uses ONE call with a consolidated prompt.
 * ~50-65% faster than the multi-phase pipeline.
 */
export async function executeFastPipeline(
  agentId: string,
  baseSystemPrompt: string,
  userMessage: string,
  mcpConfigPath: string,
  spawnFn: SpawnFn,
  onProgress: ProgressCallback
): Promise<string> {
  const consolidatedPrompt = CONSOLIDATED_PROMPTS[agentId];
  if (!consolidatedPrompt) {
    throw new Error(`No fast pipeline prompt defined for agent '${agentId}'`);
  }

  const maxTurns = AGENT_MAX_TURNS[agentId] || 20;

  // Strip HANDOFF rule from base prompt (pipeline manages transitions)
  let cleanBasePrompt = baseSystemPrompt;
  const handoffIdx = cleanBasePrompt.indexOf("## REGRA DE HANDOFF");
  if (handoffIdx !== -1) {
    const nextSection = cleanBasePrompt.indexOf("\n## ", handoffIdx + 5);
    cleanBasePrompt = cleanBasePrompt.substring(0, handoffIdx).trimEnd() +
      (nextSection > 0 ? cleanBasePrompt.substring(nextSection) : "");
  }

  // Build the system prompt with fast-mode instruction
  const systemPrompt =
    cleanBasePrompt +
    `\n\n---\n## MODO RÁPIDO\nEstás a executar em modo rápido (single-call). Completa TODO o trabalho numa única sessão.\n` +
    consolidatedPrompt;

  // Build the user prompt
  const prompt = userMessage;

  console.log(
    `[${agentId}] Fast pipeline: 1 call (prompt: ${prompt.length} chars, sysPrompt: ${systemPrompt.length} chars, maxTurns: ${maxTurns})`
  );

  // Emit: in_progress
  onProgress({
    current: 1,
    total: 1,
    phaseId: "execute",
    phaseName: "Execução completa",
    status: "in_progress",
  });

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await spawnFn(
      prompt, systemPrompt, mcpConfigPath, maxTurns
    );
    const elapsed = Date.now() - startTime;

    if (stderr) {
      console.log(`[${agentId}] Fast pipeline stderr: ${stderr.substring(0, 500)}`);
    }

    // Parse response
    let responseText = "";
    try {
      const result = JSON.parse(stdout);
      if (result.is_error) {
        throw new Error(result.result || "Fast pipeline returned error");
      }
      responseText = result.result || "";
      console.log(
        `[${agentId}] Fast pipeline completed in ${elapsed}ms (${responseText.length} chars, ${result.num_turns || 1} turns, $${result.cost_usd?.toFixed(4) || "0"})`
      );
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        responseText = stdout.trim();
        console.log(
          `[${agentId}] Fast pipeline completed in ${elapsed}ms (non-JSON, ${responseText.length} chars)`
        );
      } else {
        throw parseErr;
      }
    }

    // Log output preview
    if (responseText.length > 0) {
      console.log(`[${agentId}] Fast pipeline preview: ${responseText.substring(0, 300).replace(/\n/g, "\\n")}`);
    }

    // Emit: completed
    onProgress({
      current: 1,
      total: 1,
      phaseId: "execute",
      phaseName: "Execução completa",
      status: "completed",
      result: responseText,
    });

    return responseText;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agentId}] Fast pipeline error:`, errMsg);

    onProgress({
      current: 1,
      total: 1,
      phaseId: "execute",
      phaseName: "Execução completa",
      status: "error",
    });

    throw error;
  }
}

/**
 * Check if an agent has a fast pipeline prompt available.
 */
export function hasFastPipeline(agentId: string): boolean {
  return agentId in CONSOLIDATED_PROMPTS;
}
