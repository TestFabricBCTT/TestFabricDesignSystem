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
  dsla: 10,
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
   - **BDEV:** [código BDEV recebido do FA — OBRIGATÓRIO, formato BDEVxxxxxxxx]
   - Wireframes criados (lista de ecrãs)
   - Fluxos de exceção definidos
   - Traduções geradas
   - Componentes em falta no Design System
   - Próximos passos (PA — Prototype Agent)

REGRAS CRÍTICAS:
- Executa TODOS os passos sequencialmente
- Sections dos wireframes devem ser específicos (não genéricos)
- Propaga SEMPRE o código BDEV recebido do FA (formato BDEVxxxxxxxx) em TODAS as tools (da_create_wireframes, da_generate_figma_spec, da_generate_ux_flow, da_create_screen_copy) e no HANDOFF
- O BDEV é o código que começa por "BDEV" (ex: BDEV00000011), NÃO a key Jira (ex: BCTT-297)
- O resumo final é a resposta que o utilizador vai ver`,

  dsla: `Executa o trabalho COMPLETO do DSLA numa única sessão:

1. ANÁLISE DO HANDOFF
   Verifica se há "Componentes novos para DSLA" no handoff recebido do DA.
   Se não há componentes novos, avança directamente para o RESUMO FINAL.

2. VERIFICAÇÃO DE COMPONENTES EXISTENTES
   Para cada componente identificado, usa dsla_get_component_spec para verificar se já existe no catálogo.
   Se já existe, salta para o próximo. Se não existe, cria-o no passo seguinte.

3. CRIAÇÃO DE COMPONENTES
   Para cada componente novo:
   a. Usa dsla_create_component com: component_name (PascalCase), atomic_level, base_mui_component (componente MUI a wrapar), variants, props
   b. Usa dsla_generate_stories com: component_name, variants
   c. Usa dsla_check_accessibility para verificar conformidade WCAG

4. BUILD DO DESIGN SYSTEM
   Após criar TODOS os componentes, usa dsla_build_design_system para compilar.
   Se o build FALHAR:
   - Analisa os erros de TypeScript no output
   - Corrige os ficheiros usando dsla_create_component (re-cria o componente com código corrigido)
   - Tenta build novamente (máximo 2 tentativas)
   O build DEVE ter sucesso antes de avançar para o HANDOFF.

5. RESUMO FINAL
   Apresenta: componentes criados (ou "Nenhum"), ficheiros escritos, resultado do build, notas para PA.

REGRAS:
- Usa APENAS tools com prefixo dsla_
- Segue o padrão forwardRef + MUI wrapper (como Button.tsx): import { X as MuiX } from '@mui/material'
- Se não há componentes novos, produz HANDOFF imediatamente
- Build com SUCESSO é OBRIGATÓRIO antes do HANDOFF
- O resumo final é a resposta que o utilizador vai ver`,

  pa: `Executa o trabalho COMPLETO do PA numa única sessão:

1. ANÁLISE
   PRIMEIRO: Extrai o código BDEV do contexto recebido do DA (campo **BDEV:** no handoff). O BDEV tem formato BDEVxxxxxxxx (ex: BDEV00000011).
   Usa esse BDEV para TODAS as operações. NUNCA uses um BDEV de protótipos existentes.
   Verifica protótipos existentes com pa_list_prototypes apenas para determinar a versão (v1, v2, etc.).

2. CRIAÇÃO DE PROTÓTIPOS
   Chama pa_create_prototype UMA VEZ com TODOS os ecrãs. O input wireframes deve seguir este formato EXATO:
   {
     "bdev_code": "<BDEV do handoff — ex: BDEV00000011>",
     "journeys": [{"id": "J1", "name": "Consulta Saldo", "screens": ["SCR-001", "SCR-002"], "userStories": ["US001", "US002"]}],
     "wireframes": [
       {
         "screenId": "SCR-001",
         "screenName": "Consulta de Saldos",
         "userStory": "US001",
         "header": {"title": "Minha Conta"},
         "body": {
           "sections": [
             {"type": "info", "components": [
               {"type": "card", "name": "saldo_disponivel", "valuePT": "Saldo Disponível", "valueEN": "Available Balance"},
               {"type": "card", "name": "saldo_contabilistico", "valuePT": "Saldo Contabilístico", "valueEN": "Book Balance"}
             ]},
             {"type": "actions", "components": [
               {"type": "button", "name": "ver_movimentos", "valuePT": "Ver Movimentos", "valueEN": "View Transactions"}
             ]}
           ]
         },
         "footer": {"primaryAction": "Ver Movimentos"}
       }
     ]
   }
   IMPORTANTE: body.sections é um ARRAY de objetos {type, components[]}. Cada component tem {type, name, valuePT?, valueEN?}.
   Tipos de componentes válidos: button, textfield, card, text, alert, select, list, checkbox, divider, title.

3. DEPLOY DO PROTÓTIPO
   Após criar o protótipo com pa_create_prototype, usa pa_deploy_prototype com o bdev_code.
   Esta tool exporta o projeto Vite+React, instala dependências, e inicia o servidor de desenvolvimento.
   Retorna URL (ex: http://localhost:5173) — apresenta-o no resumo final para o utilizador testar.

4. RESUMO FINAL
   Apresenta protótipos criados, número de ecrãs, URL do protótipo em execução, e próximos passos.

REGRAS:
- O bdev_code vem SEMPRE do handoff do DA (campo **BDEV:**). NUNCA inventes ou reutilizes um BDEV de protótipos existentes
- Usa APENAS tools com prefixo pa_
- Gera os ecrãs como wireframes estruturados (body.sections.components)
- Cards do mesmo tipo DEVEM estar todos na MESMA section para ficarem em Grid consistente (nunca deixar cards órfãos fora do grupo)
- Extrai informação dos wireframes do DA para construir o JSON
- Após criar o protótipo, faz sempre deploy para o utilizador poder testar
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
