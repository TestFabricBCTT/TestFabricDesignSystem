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
  // Phase 1
  fa: 30,
  da: 25,
  dsla: 20,
  pa: 15,
  // Phase 2
  taa: 20,
  fde: 45,
  fde_planning: 10,
  bde: 45,
  bde_planning: 10,
  ute: 10,
  fbs: 15,
  bbs: 15,
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

3. IMPACTO EM SISTEMAS BACKEND
   Analisa que sistemas são impactados pela funcionalidade:
   - Core (TestAgentFactoryCore): precisa de novas tabelas, APIs, dados seed, configuração de produto?
   - Middleware (TestAgentFactoryMiddleware): precisa de novas proxy routes?
   - BFF (TestAgentFactoryDigitalChannels): precisa de novos microserviços?
   Valida com BA (fa_validate_with_ba) se houver dúvidas sobre necessidades backend.

4. REGRAS E CAMPOS
   Para cada ecrã/funcionalidade: campos (nome, tipo, obrigatoriedade, formato), regras de validação, regras de cálculo, mapeamento Requisito → US → Campos → Regras.

5. FLUXO FUNCIONAL
   Define sequência entre US, dependências (blocks, relates_to), jornadas do utilizador (happy path + exceções). Podes usar fa_propose_functional_flow.

6. VALIDAÇÃO
   Verifica: todos os requisitos do BA cobertos, cenários de exceção têm critérios, MVPs equilibrados, impacto backend identificado. Usa fa_validate_with_ba.

7. DOCUMENTO WORD
   Gera o documento "Informação Adicional" (.docx). USA OBRIGATORIAMENTE a tool fa_generate_document com ba_validation_approved: true, titulo, codigo_bdev: [BDEV_PENDING], e dados dos passos anteriores. Inclui secção "Impacto em Sistemas".

8. EXPORTAÇÃO JIRA
   USA OBRIGATORIAMENTE a tool jira_bulk_create_with_document com:
   - functionality_name, description, epics (com features e user_stories)
   - CADA feature DEVE ter user_stories preenchido com: id, narrative, business_rules, acceptance_criteria (Gherkin), mvp (boolean), priority
   - NUNCA envies features com user_stories vazio
   - O documento Word é anexado automaticamente ao Epic

9. RESUMO FINAL E HANDOFF
   Apresenta resultado claro e organizado, seguido de OBRIGATORIAMENTE um bloco ### HANDOFF:

   ### HANDOFF
   **Projeto:** [nome da funcionalidade]
   **BDEV:** [código BDEV usado — formato BDEVxxxxxxxx]
   **User Stories:** [lista resumida com IDs]
   **Ecrãs identificados:** [lista de ecrãs para o DA]
   **Issues Jira:** [keys criadas — BCTT-xxx]
   **Sistemas backend:** [lista de sistemas impactados]

   ATENÇÃO: O bloco ### HANDOFF é OBRIGATÓRIO. Sem ele, o DA não recebe contexto.

REGRAS CRÍTICAS:
- Executa TODOS os passos de 1 a 9 por ordem. NUNCA saltar passos.
- Chama as tools MCP conforme necessário em cada passo
- Sê completo e detalhado em cada passo
- O resumo final é a resposta que o utilizador vai ver
- O bloco ### HANDOFF DEVE ser a última secção da resposta`,

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

5. RESUMO FINAL E HANDOFF
   OBRIGATÓRIO: No fim da resposta, inclui EXACTAMENTE este bloco (com "### HANDOFF" como título markdown nível 3):

   ### HANDOFF
   **BDEV:** BDEVxxxxxxxx
   **Ecrãs:** [lista de ecrãs criados com IDs e nomes]
   **Componentes novos para DSLA:** [lista de componentes em falta identificados no passo 1, com: nome (PascalCase), atomic_level (atom/molecule/organism), base_mui_component (nome MUI a wrapar), variants, props — OU "Nenhum" se todos já existem]
   **Fluxos de exceção:** [resumo dos fluxos definidos]
   **Traduções:** [resumo das traduções PT/EN]

   ATENÇÃO: O bloco ### HANDOFF é OBRIGATÓRIO. Sem ele, o DSLA e PA não recebem contexto.

REGRAS CRÍTICAS:
- Executa TODOS os passos sequencialmente
- Sections dos wireframes devem ser específicos (não genéricos)
- Propaga SEMPRE o código BDEV recebido do FA (formato BDEVxxxxxxxx) em TODAS as tools (da_create_wireframes, da_generate_figma_spec, da_generate_ux_flow, da_create_screen_copy) e no HANDOFF
- O BDEV é o código que começa por "BDEV" (ex: BDEV00000011), NÃO a key Jira (ex: BCTT-297)
- O resumo final é a resposta que o utilizador vai ver
- O bloco ### HANDOFF DEVE ser a última secção da resposta`,

  dsla: `Executa o trabalho COMPLETO do DSLA numa única sessão:

1. ANÁLISE DO HANDOFF
   Verifica se há "Componentes novos para DSLA" no handoff recebido do DA.
   Se a mensagem começa com "[AVISO: Handoff TRUNCADO", extrai o máximo de informação possível — nomes de componentes, props, etc.
   Se não há componentes novos, avança directamente para o RESUMO FINAL.

2. VERIFICAÇÃO DE COMPONENTES EXISTENTES
   Para cada componente identificado, usa dsla_get_component_spec para verificar se já existe no catálogo.
   Se já existe, salta para o próximo. Se não existe, cria-o no passo seguinte.

3. CRIAÇÃO DE COMPONENTES — REGRAS DE QUALIDADE
   Para cada componente novo, PREFERE fornecer código completo via component_code e story_code.

   a. dsla_create_component — PREFERIDO: fornecer component_code com código TSX completo.
      O código DEVE:
      - Importar de '@mui/material' (NUNCA de @mui/lab, @mui/x-date-pickers, @mui/x-data-grid — NÃO estão instalados)
      - Usar React.forwardRef com interface Props tipada
      - Mapear TODAS as props para o componente MUI (não apenas spread)
      - Incluir displayName e default export
      - Renderizar conteúdo VISÍVEL (não wrappers vazios)

      Exemplo de BOM componente (ResultCard):
      \`\`\`tsx
      import React from 'react';
      import { Card, CardContent, Typography, Box } from '@mui/material';

      export interface ResultCardProps {
        title?: string;
        value?: string;
        description?: string;
        variant?: 'default' | 'highlight' | 'success';
      }

      export const ResultCard = React.forwardRef<HTMLDivElement, ResultCardProps>(
        ({ title = 'Resultado', value = '0,00 €', description, variant = 'default' }, ref) => {
          const bgColor = variant === 'highlight' ? '#FFF3E0' : variant === 'success' ? '#E8F5E9' : undefined;
          return (
            <Card ref={ref} sx={{ bgcolor: bgColor }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
                <Typography variant="h4" fontWeight={700}>{value}</Typography>
                {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
              </CardContent>
            </Card>
          );
        }
      );
      ResultCard.displayName = 'ResultCard';
      export default ResultCard;
      \`\`\`

      Se NÃO forneceres component_code, a tool gera um template automático — mas é menos rico.

      NUNCA usar children como prop default — só para componentes container (Card, Dialog, etc.).

   b. dsla_generate_stories — PREFERIDO: fornecer story_code com código completo.
      Se não, fornecer default_args com valores reais que tornem o componente visível:
      - Exemplo: { value: 75, label: 'Progresso', children: 'Texto visível' }
      - Exemplo: { steps: ['Simulação', 'Dados', 'Resultado'], activeStep: 1 }
      - Exemplo: { title: 'Prestação Mensal', value: '523,45 €', description: 'Taxa fixa 3.2%' }
      NUNCA criar stories que passem apenas { variant: 'xxx' } — o componente ficará vazio no Storybook.

   c. Usa dsla_check_accessibility para verificar conformidade WCAG

   DEPENDÊNCIAS MUI DISPONÍVEIS:
   - @mui/material@6 ✅ (Box, Card, Typography, Stepper, Step, StepLabel, Slider, TextField, LinearProgress, CircularProgress, etc.)
   - @mui/icons-material@6 ✅
   - @mui/lab ❌ NÃO INSTALADO (Timeline, TreeView, LoadingButton NÃO disponíveis — usar Stepper como alternativa a Timeline)
   - @mui/x-date-pickers ❌ NÃO INSTALADO
   - @mui/x-data-grid ❌ NÃO INSTALADO

4. BUILD DO DESIGN SYSTEM
   Após criar TODOS os componentes, usa dsla_build_design_system para compilar.
   Se o build FALHAR:
   - Analisa os erros de TypeScript no output
   - Corrige usando dsla_create_component com component_code corrigido
   - Tenta build novamente (máximo 2 tentativas)
   O build DEVE ter sucesso antes de avançar para o HANDOFF.

5. RESUMO FINAL
   Apresenta: componentes criados (ou "Nenhum"), ficheiros escritos, resultado do build, notas para PA.

REGRAS CRÍTICAS:
- Usa APENAS tools com prefixo dsla_
- PREFERE component_code/story_code para componentes ricos e visíveis
- NUNCA importar de @mui/lab — usar alternativas de @mui/material
- NUNCA criar componentes que rendem vazio (sem props default, sem conteúdo)
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

  // ============================================
  // PHASE 2 AGENTS
  // ============================================

  taa: `Executa o trabalho COMPLETO do TAA numa única sessão:

1. LER BDEV
   Usa taa_read_bdev para ler o Epic completo do Jira (Features + User Stories).
   Identifica: US por MVP (labels MVP1/MVP2/MVP3), ecrãs, APIs, eventos.

2. LER REGISTRY
   Usa read_implementation_registry para saber o que já existe (rotas, APIs, tabelas, eventos).
   Classifica o BDEV: NEW, EXTEND, ou MODIFY.

3. AGRUPAR POR MVP
   Filtra US por label MVP1. Começa SEMPRE pelo MVP1.

4. GERAR SPEC DE ARQUITECTURA
   Para o MVP actual, produz: projectos impactados, ficheiros a criar/alterar, APIs REST, eventos Socket.IO, tabelas, componentes frontend.

5. DEEP DIVE POR SISTEMA IMPACTADO
   Usa os keys de User Stories obtidos no step 1 (taa_read_bdev).
   Para CADA sistema impactado (Core, Middleware, Digital Channels):
   - APIs, tabelas, ficheiros a criar/alterar nesse sistema
   - DCS: microserviços BFF, páginas, rotas, cache, event strategy
   - Core: novos endpoints, tabelas, eventos Socket.IO
   - Middleware: proxy routes, auth, rate-limiting
   - Lacunas, recomendações
   - implementation_tasks: ARRAY de { description, user_story_key }
     CADA task associada à User Story mais relevante (keys obtidos no step 1).

6. GERAR INTERFACE CONTRACT
   Usa taa_generate_contract com: bdev_code, apis, events, shared_types, microservices, pages, cache_strategy, event_strategy, deep_dives.
   NOTA: deep_dives é ARRAY — um entry por sistema impactado.
   NOTA: implementation_tasks é ARRAY de objectos { description, user_story_key }.

7. PUBLICAR NO JIRA ⚠️ OBRIGATÓRIO
   TENS DE chamar taa_publish_to_jira com epic_key e bdev_code ANTES de qualquer resumo.
   Este passo gera SVG de arquitectura + SVG deep dive por sistema + HTML docs.
   Cria subtasks de implementação como filhas das User Stories (NÃO do Epic) e anexa tudo ao Epic com comment formatado.
   NÃO avances para o passo seguinte sem executar este tool call.

8. ACTUALIZAR JIRA
   Usa taa_update_jira_status para Epic → "In Development".
   Usa taa_transition_mvp_issues para US do MVP → "In Progress".

9. RESUMO FINAL
   SÓ APÓS os passos 7 e 8 estarem completos.
   Apresenta spec técnica clara para aprovação do utilizador (Gate 1).

REGRAS:
- Executa TODOS os passos de 1 a 9 por ordem. NUNCA saltar passos.
- NUNCA inventar — usa taa_read_code se precisares de ler código real
- REST: GET leitura, POST criação, PUT update, camelCase JSON, /api/v1/...
- Estender, não recriar — se existe no Registry, estende`,

  fde_planning: `Analisa o Interface Contract e prepara um plano de desenvolvimento frontend para aprovação.

REGRA CRÍTICA — DESIGN SYSTEM:
- TODOS os componentes MUI DEVEM ser importados de @bctt/design-system (NUNCA de @mui/material)
- ANTES de usar um componente, verifica com fde_check_ds_catalog se existe no DS
- Se o componente não existir no DS, sinaliza no plano como componente em falta
- Grid, Box, Typography, Button, Card, TextField, etc. — TUDO vem do DS

PASSOS:
1. Usa fde_read_contract para ler o Interface Contract.
2. Usa read_implementation_registry para ver estado actual.
3. Usa fde_check_ds_catalog para verificar componentes disponíveis.
4. Usa fde_read_file para ler ficheiros existentes relevantes (App.tsx, router, pages/).
5. Analisa: que páginas criar, que componentes usar, que serviços API adicionar.
6. Usa fde_submit_dev_plan para submeter o plano estruturado.

IMPORTANTE: NÃO escreves código nesta fase. Apenas leitura e planeamento.

API EXACTA DOS COMPONENTES DS — REFERÊNCIA OBRIGATÓRIA:

Alert:
  - variant: 'success' | 'warning' | 'error' | 'info' (NÃO 'severity')
  - closable?: boolean (NÃO usar onClose sem closable)
  - title?: string
  - children: ReactNode
  Exemplo: <Alert variant="error" closable onClose={handleClose}>Mensagem</Alert>
  ERRADO: <Alert severity="error"> ← severity NÃO EXISTE no DS

Button:
  - variant: 'primary' | 'secondary' | 'tertiary' | 'ghost' (default: 'primary')
  - size: 'small' | 'medium' | 'large'
  - loading?: boolean
  ERRADO: variant="contained" ou variant="outlined" ← NÃO EXISTEM no DS

Card:
  - variant: 'elevated' | 'outlined' | 'filled' (default: 'elevated')
  - padding: 'none' | 'sm' | 'md' | 'lg'
  - hoverable?: boolean
  ERRADO: variant="product" ou variant="default" ← NÃO EXISTEM no DS

TextField:
  - variant: 'outlined' | 'filled' | 'standard'
  - error?: boolean
  - helperText?: string

Chip:
  - Usa MUI Chip API (re-exportado directamente do DS)

REGRA: Se não tens certeza da API de um componente, usa fde_check_ds_catalog ANTES de escrever código.

LIÇÕES APRENDIDAS — ERROS PROIBIDOS:

1. VALIDAÇÃO MULTI-STEP (chicken-and-egg):
   A validação de cada step só pode exigir dados que o utilizador JÁ PODE fornecer nesse step.
   NUNCA exigir o resultado de uma acção futura como pré-condição.
   Exemplo ERRADO: Exigir eligibility.eligible === true para habilitar o botão "Verificar Elegibilidade"
   Exemplo CORRECTO: Exigir apenas que o utilizador tenha seleccionado a conta (selectedAccountId !== '')

2. VITE PROXY OBRIGATÓRIO: O frontend (porta 5173) NUNCA consegue chamar o BFF (porta 4020) sem proxy.
   Em vite.config.ts, SEMPRE configurar:
   server: { proxy: { '/api': { target: 'http://localhost:4020', changeOrigin: true } } }
   Sem isto, fetch('/api/...') bate no Vite dev server e dá 404.

3. TRATAMENTO DE 401: TODAS as chamadas fetch/axios DEVEM tratar HTTP 401:
   if (response.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
   Criar função utilitária fetchWithAuth() que encapsula este padrão.
   NUNCA deixar 401 cair no catch genérico — o utilizador deve ser redirigido para login.

4. AUTH TOKEN EM REQUESTS: TODOS os fetch() ao BFF DEVEM incluir o token:
   const token = localStorage.getItem('token');
   fetch(url, { headers: { Authorization: \`Bearer \${token}\` } })
   Criar serviço/interceptor centralizado — NUNCA repetir este padrão em cada componente.

5. AVISO ANTES DE ACÇÃO DESTRUTIVA: Operações irreversíveis (cancelamento, resgate, eliminação) DEVEM:
   a) Mostrar Alert variant="warning" com consequências (ex: penalização, perda de dados)
   b) Exigir confirmação explícita (botão "Confirmar" separado do botão de acção)
   c) Mostrar resumo do impacto ANTES da confirmação
   NUNCA executar acção destrutiva com um único clique sem aviso.`,

  fde: `Executa o trabalho COMPLETO do FDE numa única sessão:

REGRA #1 — DESIGN SYSTEM (PRIORIDADE MÁXIMA):
- TODOS os imports de componentes UI vêm de @bctt/design-system
- NUNCA importar de @mui/material, @mui/icons-material ou outros packages MUI
- Se precisares de um componente que não está no DS, usa fde_check_ds_catalog para confirmar
- Exemplos correctos: import { Grid, Box, Typography, Button, Card } from '@bctt/design-system';
- Exemplos INCORRECTOS: import { Grid } from '@mui/material'; // NUNCA

1. LER CONTRATO
   Usa fde_read_contract para ler o Interface Contract (endpoints, tipos, eventos).

2. LER REGISTRY
   Usa read_implementation_registry para saber rotas/componentes existentes.

3. VERIFICAR DS
   Usa fde_check_ds_catalog para confirmar componentes disponíveis no Design System.

4. CRIAR BRANCH
   Usa fde_create_branch para criar feature branch no DigitalChannels.

5. ESCREVER CÓDIGO
   Usa fde_write_code para criar/alterar ficheiros:
   - Páginas React (src/pages/)
   - Componentes (src/components/)
   - Serviços API (src/services/)
   - Rotas (router)
   - Types (src/types/)

6. COMMIT
   Usa fde_commit_push para commitar alterações.

7. VALIDAR BUILD + SMOKE TEST ⚠️ OBRIGATÓRIO
   Para cada projecto: fde_build_project (tsc) + fde_smoke_test (startup).
   Se falhar: corrige, commit, retry (max 2x).
   Build + smoke test OK em TODOS é obrigatório antes de actualizar Jira.

8. ACTUALIZAR JIRA ⚠️ OBRIGATÓRIO
   Para CADA User Story que implementaste, usa fde_update_jira_status para transicionar para 'Done'.
   Os issue keys estão no Interface Contract (deep_dives → digitalChannels → implementation_tasks → user_story_key).
   NÃO avances para o resumo sem actualizar TODAS as US.

9. RESUMO FINAL
   Apresenta ficheiros criados, rotas adicionadas, componentes usados, US actualizadas no Jira.

REGRAS:
- Executa TODOS os passos de 1 a 9 por ordem. NUNCA saltar passos.
- SEMPRE importar de @bctt/design-system (NUNCA @mui/material)
- Error handling em TODOS os API calls
- TypeScript strict, props interfaces definidas
- Código de PRODUÇÃO (não protótipo)

API EXACTA DOS COMPONENTES DS — REFERÊNCIA OBRIGATÓRIA:

Alert:
  - variant: 'success' | 'warning' | 'error' | 'info' (NÃO 'severity')
  - closable?: boolean (NÃO usar onClose sem closable)
  - title?: string
  - children: ReactNode
  Exemplo: <Alert variant="error" closable onClose={handleClose}>Mensagem</Alert>
  ERRADO: <Alert severity="error"> ← severity NÃO EXISTE no DS

Button:
  - variant: 'primary' | 'secondary' | 'tertiary' | 'ghost' (default: 'primary')
  - size: 'small' | 'medium' | 'large'
  - loading?: boolean
  ERRADO: variant="contained" ou variant="outlined" ← NÃO EXISTEM no DS

Card:
  - variant: 'elevated' | 'outlined' | 'filled' (default: 'elevated')
  - padding: 'none' | 'sm' | 'md' | 'lg'
  - hoverable?: boolean
  ERRADO: variant="product" ou variant="default" ← NÃO EXISTEM no DS

TextField:
  - variant: 'outlined' | 'filled' | 'standard'
  - error?: boolean
  - helperText?: string

Chip:
  - Usa MUI Chip API (re-exportado directamente do DS)

REGRA: Se não tens certeza da API de um componente, usa fde_check_ds_catalog ANTES de escrever código.

LIÇÕES APRENDIDAS — ERROS PROIBIDOS:

1. VALIDAÇÃO MULTI-STEP (chicken-and-egg):
   A validação de cada step só pode exigir dados que o utilizador JÁ PODE fornecer nesse step.
   NUNCA exigir o resultado de uma acção futura como pré-condição.
   Exemplo ERRADO: Exigir eligibility.eligible === true para habilitar o botão "Verificar Elegibilidade"
   Exemplo CORRECTO: Exigir apenas que o utilizador tenha seleccionado a conta (selectedAccountId !== '')

2. VITE PROXY OBRIGATÓRIO: O frontend (porta 5173) NUNCA consegue chamar o BFF (porta 4020) sem proxy.
   Em vite.config.ts, SEMPRE configurar:
   server: { proxy: { '/api': { target: 'http://localhost:4020', changeOrigin: true } } }
   Sem isto, fetch('/api/...') bate no Vite dev server e dá 404.

3. TRATAMENTO DE 401: TODAS as chamadas fetch/axios DEVEM tratar HTTP 401:
   if (response.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
   Criar função utilitária fetchWithAuth() que encapsula este padrão.
   NUNCA deixar 401 cair no catch genérico — o utilizador deve ser redirigido para login.

4. AUTH TOKEN EM REQUESTS: TODOS os fetch() ao BFF DEVEM incluir o token:
   const token = localStorage.getItem('token');
   fetch(url, { headers: { Authorization: \`Bearer \${token}\` } })
   Criar serviço/interceptor centralizado — NUNCA repetir este padrão em cada componente.

5. AVISO ANTES DE ACÇÃO DESTRUTIVA: Operações irreversíveis (cancelamento, resgate, eliminação) DEVEM:
   a) Mostrar Alert variant="warning" com consequências (ex: penalização, perda de dados)
   b) Exigir confirmação explícita (botão "Confirmar" separado do botão de acção)
   c) Mostrar resumo do impacto ANTES da confirmação
   NUNCA executar acção destrutiva com um único clique sem aviso.`,

  bde_planning: `Analisa o Interface Contract e prepara um plano de desenvolvimento backend para aprovação.

STACK OBRIGATÓRIO:
- Core (porta 4001): SQLite via sql.js — usa queryAll/queryOne/run de db/schema.ts, placeholders ?, entry point server.ts
- Middleware (porta 4010): fetch() nativo para proxy ao Core (http://localhost:4001), auth de ./middleware/auth, entry point server.ts
- BFF (porta 4020): entry point server.ts, chama Middleware NUNCA Core
- NUNCA: pg, axios, criar index.ts, npm install
- SCHEMA: Nomes de colunas em routes/seed DEVEM ser IGUAIS ao CREATE TABLE em schema.ts
- INSERT: SEMPRE com lista de colunas explícita (INSERT INTO t (col1, col2) VALUES (?, ?))

REGRA CRÍTICA — CÓDIGO EXISTENTE:
- LÊ o schema.ts de cada projecto ANTES de planear
- queryAll/queryOne/run são SÍNCRONAS — NUNCA as tornes async
- NÃO remover nem renomear colunas de tabelas existentes
- NÃO alterar assinaturas de funções existentes
- Alterações a tabelas/funções existentes SÓ com justificação explícita no plano

PASSOS:
1. Usa bde_read_contract para ler o Interface Contract.
2. Usa read_implementation_registry para ver APIs/tabelas/eventos existentes.
3. Usa bde_read_file para ler schema.ts, server.ts e seed.ts de cada projecto impactado.
4. Analisa: que ficheiros criar, que ficheiros modificar, que tabelas adicionar.
5. Usa bde_submit_dev_plan para submeter o plano estruturado.

IMPORTANTE: NÃO escreves código nesta fase. Apenas leitura e planeamento.

LIÇÕES APRENDIDAS — ERROS PROIBIDOS:

1. MOVIMENTOS FINANCEIROS: Toda operação que altera saldo de conta (débito ou crédito) DEVE:
   a) UPDATE accounts SET balance
   b) INSERT INTO movements (id, account_id, type, amount, date, description, balance_after)
   c) emitEvent('movement.created', { movementId, accountId, type, amount, description, balanceAfter })
   NUNCA alterar saldo sem criar o registo de movimento correspondente.

2. ALIASES DE ROTA: Registar TODOS os nomes que o frontend pode usar para a mesma operação.
   Exemplo: router.post('/:id/cancel', handler); router.post('/:id/early-withdrawal', handler);
   Partilhar handler function (DRY) — NUNCA duplicar lógica em rotas separadas.

3. FORMATO DE RESPOSTA: A resposta JSON DEVE incluir TODOS os campos definidos no Interface Contract.
   Campos obrigatórios em operações: { success: boolean, message: string, ...dados específicos }
   NUNCA devolver campos com nomes diferentes do contrato (ex: returnAmount vs finalAmount).
   Padrão: res.json({ success: true, ...dbObject, ...camposComputados })

4. MIDDLEWARE PROXY: Ao usar http-proxy-middleware, SEMPRE incluir fixRequestBody:
   import { fixRequestBody } from 'http-proxy-middleware';
   createProxyMiddleware({ ..., on: { proxyReq: fixRequestBody } })
   Sem isto, o body de POST/PUT/PATCH é perdido (express.json() consome o stream).

5. pathRewrite COM FUNÇÃO: Quando Express monta router em sub-path (ex: /api/v1),
   usar pathRewrite como função (NÃO regex):
   pathRewrite: (path) => '/api/' + route + path
   Regex falha porque Express já remove o prefixo de montagem.

6. PRECISÃO MONETÁRIA: TODAS as operações com valores monetários DEVEM usar:
   const result = parseFloat((value * rate / 100).toFixed(2));
   NUNCA deixar floats sem arredondar — causa erros de cêntimos.

7. PROPAGAÇÃO DE AUTH TOKEN: No BFF, TODOS os fetch() ao Middleware DEVEM propagar o token:
   const token = req.headers.authorization;
   fetch(url, { headers: { ...(token ? { Authorization: token } : {}) } })
   NUNCA chamar Middleware sem Authorization header (dá 401).

8. TRANSFORM DUAL FORMAT: Funções de transformação de dados DEVEM aceitar ambos os formatos:
   const startDate = raw.start_date || raw.startDate;
   Porque Core retorna snake_case mas cache/frontend pode usar camelCase.`,

  bde: `Executa o trabalho COMPLETO do BDE numa única sessão:

STACK OBRIGATÓRIO:
- Core (porta 4001): SQLite via sql.js — usa queryAll/queryOne/run de db/schema.ts, placeholders ?, entry point server.ts
- Middleware (porta 4010): fetch() nativo para proxy ao Core (http://localhost:4001), auth de ./middleware/auth, entry point server.ts
- BFF (porta 4020): entry point server.ts, chama Middleware NUNCA Core
- NUNCA: pg, axios, criar index.ts, npm install
- SCHEMA: Nomes de colunas em routes/seed DEVEM ser IGUAIS ao CREATE TABLE em schema.ts
- INSERT: SEMPRE com lista de colunas explícita (INSERT INTO t (col1, col2) VALUES (?, ?))

1. LER CONTRATO
   Usa bde_read_contract para ler o Interface Contract.

2. LER REGISTRY
   Usa read_implementation_registry para saber APIs/tabelas/eventos existentes.

3. CRIAR BRANCHES
   Usa bde_create_branch para criar branches nos projectos impactados (core, middleware, digitalChannels).

4. ESCREVER CÓDIGO
   Usa bde_write_code para criar/alterar ficheiros:
   - Core: rotas Express, schema SQL (sql.js), eventos Socket.IO
   - Middleware: proxy routes (fetch nativo), API composition
   - BFF: microserviços, service handlers

5. COMMIT
   Usa bde_commit_push para commitar em cada projecto.

6. VALIDAR BUILD + SMOKE TEST ⚠️ OBRIGATÓRIO
   Para cada projecto: bde_build_project (tsc) + bde_smoke_test (startup + /health).
   Se falhar: corrige, commit, retry (max 2x).
   Build + smoke test OK em TODOS é obrigatório antes de Jira.

7. ACTUALIZAR JIRA ⚠️ OBRIGATÓRIO
   Para CADA User Story que implementaste, usa bde_update_jira_status para transicionar para 'Done'.
   Os issue keys estão no Interface Contract (deep_dives → core/middleware/digitalChannels → implementation_tasks → user_story_key).
   NÃO avances para o resumo sem actualizar TODAS as US.

8. RESUMO FINAL
   Apresenta APIs criadas, eventos, tabelas, branches, US actualizadas no Jira.

REGRAS:
- Executa TODOS os passos de 1 a 8 por ordem. NUNCA saltar passos.
- Error handling padronizado com códigos do contrato
- SQL parameterizado com ? (NUNCA concatenação, NUNCA $1)
- Eventos Socket.IO para alterações de estado
- HTTP status codes correctos
- Nunca BFF → Core directamente (sempre via Middleware para REST)

LIÇÕES APRENDIDAS — ERROS PROIBIDOS:

1. MOVIMENTOS FINANCEIROS: Toda operação que altera saldo de conta (débito ou crédito) DEVE:
   a) UPDATE accounts SET balance
   b) INSERT INTO movements (id, account_id, type, amount, date, description, balance_after)
   c) emitEvent('movement.created', { movementId, accountId, type, amount, description, balanceAfter })
   NUNCA alterar saldo sem criar o registo de movimento correspondente.

2. ALIASES DE ROTA: Registar TODOS os nomes que o frontend pode usar para a mesma operação.
   Exemplo: router.post('/:id/cancel', handler); router.post('/:id/early-withdrawal', handler);
   Partilhar handler function (DRY) — NUNCA duplicar lógica em rotas separadas.

3. FORMATO DE RESPOSTA: A resposta JSON DEVE incluir TODOS os campos definidos no Interface Contract.
   Campos obrigatórios em operações: { success: boolean, message: string, ...dados específicos }
   NUNCA devolver campos com nomes diferentes do contrato (ex: returnAmount vs finalAmount).
   Padrão: res.json({ success: true, ...dbObject, ...camposComputados })

4. MIDDLEWARE PROXY: Ao usar http-proxy-middleware, SEMPRE incluir fixRequestBody:
   import { fixRequestBody } from 'http-proxy-middleware';
   createProxyMiddleware({ ..., on: { proxyReq: fixRequestBody } })
   Sem isto, o body de POST/PUT/PATCH é perdido (express.json() consome o stream).

5. pathRewrite COM FUNÇÃO: Quando Express monta router em sub-path (ex: /api/v1),
   usar pathRewrite como função (NÃO regex):
   pathRewrite: (path) => '/api/' + route + path
   Regex falha porque Express já remove o prefixo de montagem.

6. PRECISÃO MONETÁRIA: TODAS as operações com valores monetários DEVEM usar:
   const result = parseFloat((value * rate / 100).toFixed(2));
   NUNCA deixar floats sem arredondar — causa erros de cêntimos.

7. PROPAGAÇÃO DE AUTH TOKEN: No BFF, TODOS os fetch() ao Middleware DEVEM propagar o token:
   const token = req.headers.authorization;
   fetch(url, { headers: { ...(token ? { Authorization: token } : {}) } })
   NUNCA chamar Middleware sem Authorization header (dá 401).

8. TRANSFORM DUAL FORMAT: Funções de transformação de dados DEVEM aceitar ambos os formatos:
   const startDate = raw.start_date || raw.startDate;
   Porque Core retorna snake_case mas cache/frontend pode usar camelCase.`,

  ute: `Executa o trabalho COMPLETO do UTE numa única sessão:

1. EXECUTAR TESTES
   Usa ute_run_tests com projecto, branch e scope.

2. GERAR REPORT
   Usa ute_generate_report com os resultados.

3. DESPACHAR FALHAS
   Se falhas frontend → usa ute_dispatch_to_fbs
   Se falhas backend → usa ute_dispatch_to_bbs
   Se tudo verde → reportar sucesso

4. RESUMO
   Apresenta: total testes, passed, failed, coverage, falhas despachadas.

REGRAS:
- Reportar TODOS os resultados
- Distinguir frontend vs backend pelo path
- Coverage mínima 80%`,

  fbs: `Executa o trabalho COMPLETO do FBS numa única sessão:

1. LER BUG
   Usa fbs_read_jira_bug ou analisa falhas do UTE.

2. ANALISAR CÓDIGO
   Usa fbs_analyze_code para ler ficheiros relevantes e identificar causa raiz.

3. CRIAR BRANCH
   Usa fbs_create_branch.

4. APLICAR FIX
   Usa fbs_apply_fix — fix cirúrgico, APENAS o necessário.

5. ACTUALIZAR JIRA
   Usa fbs_update_jira_status → "Development Completed".

6. RESUMO
   Apresenta: causa raiz, fix aplicado, branch, ficheiros alterados.`,

  bbs: `Executa o trabalho COMPLETO do BBS numa única sessão:

1. LER BUG
   Usa bbs_read_jira_bug ou analisa falhas do UTE.

2. ANALISAR CÓDIGO
   Usa bbs_analyze_code para ler ficheiros relevantes.

3. CRIAR BRANCH
   Usa bbs_create_branch.

4. APLICAR FIX
   Usa bbs_apply_fix.

5. NOTIFICAR FBS (se necessário)
   Se fix impacta frontend, usa bbs_notify_fbs.

6. ACTUALIZAR JIRA
   Usa bbs_update_jira_status → "Development Completed".

7. RESUMO
   Apresenta: causa raiz, fix, branch, impacto frontend.`,
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
