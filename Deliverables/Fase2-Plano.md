# Fase 2: Agent Factory — Ambiente Produtivo Simulado

## Contexto

A Fase 1 criou o pipeline de concepção (BA→FA→DA→DSLA→PA) que gera user stories, wireframes, componentes DS e protótipos. A Fase 2 estende para **implementação real**: agentes que escrevem código em projectos de produção simulados, testam, detectam bugs e corrigem — como uma fábrica de software completa.

**Objectivo final da demo:** Começar no BA com uma ideia de negócio → acabar a ver a funcionalidade a correr no ambiente simulado de produção. Tudo end-to-end, sem passos manuais de código.

---

## 1. VISÃO GERAL DA ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FASE 1 (existente)                              │
│   BA → FA → DA → DSLA → PA                                         │
│   (Requisitos → US → Wireframes → Componentes → Protótipo)         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ BDEV (Jira Epic + US + Wireframes)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASE 2 (novo)                                   │
│                                                                     │
│   TAA ──→ FDE (frontend) ──┐                                       │
│       └──→ BDE (backend)  ──┼──→ UTE ──→ FBS/BBS ──→ UTE (re-run) │
│                             │                                       │
│   Projectos:                │                                       │
│   DigitalChannels ←── Middleware ←── Core                           │
│   (React+Node)     (API Gateway)   (SQLite+Events)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 FLUXO COMPLETO (BA → Produção Simulada)

```
Humano descreve ideia ao BA
        │
        ▼
   BA → FA → DA → DSLA → PA        ← Fase 1 (concepção)
   BDEV criado no Jira (status "Ready for Development")
        │
        ▼
   TAA → FDE+BDE → UTE → Merge     ← Fase 2 (implementação)
   Código em produção simulada
        │
        ▼
   Funcionalidade a correr no DigitalChannels (main)
```

---

## 2. CONTINUIDADE — REGISTO DE IMPLEMENTAÇÃO

### Problema
Quando se implementa o 2º BDEV, os agentes precisam saber o que já existe:
- O **BA** precisa saber que rotas/páginas já existem para a nova feature se integrar
- O **DA** precisa saber que ecrãs existem para desenhar navegação coerente
- O **TAA** precisa saber que APIs e serviços já existem
- O **FDE** precisa saber que componentes, rotas, e páginas já estão no projecto
- O **BDE** precisa saber que endpoints, tabelas, e eventos já existem

### Solução: Implementation Registry

Um ficheiro JSON actualizado automaticamente após cada merge (Gate 3), que serve de "memória" do sistema:

**Ficheiro:** `mcp-server/data/registry/implementation-registry.json`

```json
{
  "lastUpdated": "2026-02-09T14:30:00Z",
  "projects": {
    "digitalChannels": {
      "routes": [
        { "path": "/login", "component": "LoginPage", "bdev": "BDEV00000011" },
        { "path": "/accounts", "component": "AccountsPage", "bdev": "BDEV00000011" },
        { "path": "/accounts/:id/movements", "component": "MovementsPage", "bdev": "BDEV00000011" }
      ],
      "components": ["AccountCard", "MovementList", "BalanceDisplay", "FilterChip"],
      "services": ["auth-service", "account-service", "movement-service"]
    },
    "middleware": {
      "apis": [
        { "method": "POST", "path": "/api/v1/auth/login", "bdev": "BDEV00000011" },
        { "method": "GET", "path": "/api/v1/accounts", "bdev": "BDEV00000011" },
        { "method": "GET", "path": "/api/v1/accounts/:id/movements", "bdev": "BDEV00000011" }
      ]
    },
    "core": {
      "tables": ["clients", "accounts", "movements", "balances"],
      "events": ["movement.created", "balance.updated", "account.status.changed"]
    }
  },
  "bdevs": [
    {
      "code": "BDEV00000011",
      "name": "Consulta de Saldos e Movimentos",
      "status": "implemented",
      "mvpsCompleted": ["MVP1", "MVP2"],
      "mergedAt": "2026-02-09T14:30:00Z"
    }
  ]
}
```

**Nota:** O Registry pode ser enriquecido com um campo `features` (sub-features, capacidades, SCA) — ver §21 para o formato avançado que suporta BDEVs do tipo EXTEND e MODIFY.

### Como cada agente usa o Registry

| Agente | O que lê do Registry | Para quê |
|--------|---------------------|----------|
| **BA** | Rotas, páginas, funcionalidades existentes | Saber o que já existe para a nova feature se "colar" à navegação existente. Ex: "Já existe uma página de contas → a nova feature de transferências pode partir daí" |
| **FA** | BDEVs implementados + routes | Criar US que referenciam ecrãs existentes (ex: "A partir da página de movimentos, o utilizador pode...") |
| **DA** | Routes + components existentes | Desenhar wireframes que incluem navegação de/para ecrãs existentes, reutilizar componentes DS já criados |
| **TAA** | APIs + tables + events + services | Mapear a arquitectura sobre o que já existe. Não duplicar APIs, reutilizar serviços, estender tabelas |
| **FDE** | Routes + components + pages | Adicionar novas rotas ao router existente, importar componentes existentes, não recriar o que já existe |
| **BDE** | APIs + tables + events | Adicionar endpoints ao serviço existente, estender schema BD, reutilizar handlers de eventos |

### Actualização do Registry

O Registry é actualizado em **dois momentos**:
1. **Após merge (Gate 3):** O sistema lê o diff do merge e actualiza rotas, APIs, componentes, tabelas
2. **Tool manual:** `registry_update()` para resync se necessário

### Tool nova

| Tool | Agente | Descrição |
|------|--------|-----------|
| `read_implementation_registry` | Todos | Lê o registry para saber estado actual do ecossistema |
| `update_implementation_registry` | Sistema | Actualiza após merge com novos routes/APIs/components |

### Impacto nos prompts dos agentes (Fase 1 — retroactivo)

Os system prompts do **BA**, **FA**, e **DA** precisam de ser enriquecidos:

**BA prompt (novo trecho):**
> "Antes de iniciar a análise, consulta o Implementation Registry para saber que funcionalidades já estão implementadas. A nova feature deve integrar-se com o que já existe — referencia ecrãs, rotas, e fluxos existentes quando aplicável."

**FA prompt (novo trecho):**
> "Ao criar user stories, verifica o Registry para saber que páginas e componentes já existem. As US devem referenciar elementos existentes (ex: 'Na página de Contas (existente), adicionar botão de Transferência')."

**DA prompt (novo trecho):**
> "Ao desenhar wireframes, consulta o Registry para incluir navegação de/para ecrãs existentes. Não redesenhar ecrãs que já existem — referenciá-los como contexto."

---

## 3. PROJECTOS A CRIAR (5 repos separados)

Todos em `c:\Rodrigo\TestFabricDesignSystem\` com git init próprio.

### 3.1 TestAgentFactoryCore
| Item | Detalhe |
|------|---------|
| **Objectivo** | Core bancário: clientes, contas, movimentos, eventos |
| **Stack** | Node.js + Express + SQLite (better-sqlite3) + Socket.IO server |
| **Backoffice** | **React SPA completo** (MUI dashboard): Clientes, Contas, Movimentos, Eventos em tempo real |
| **BD Schema** | clients, accounts (status: no_access/readonly/fullaccess), movements (debit/credit/cativo), balances, digital_access (§18.3) |
| **APIs REST** | GET/POST clients, GET/POST accounts, GET/POST movements, POST transfers |
| **Eventos** | Socket.IO hub: `movement.created`, `balance.updated`, `account.status.changed` |
| **Branches** | `main` (desenvolvimento), `base` (intocável, reset point) |
| **Porta** | 4001 (API + Socket.IO) + 4002 (Backoffice React) |

**Backoffice — ecrãs:**
- **Clientes:** Lista + criar/editar (nome, NIF, email)
- **Contas:** Lista por cliente + criar (IBAN, tipo) + mudar status (no_access/readonly/fullaccess)
- **Movimentos:** Seleccionar cliente → conta → introduzir movimento (tipo: débito/crédito/cativo, valor, data, descrição) → ao gravar, evento Socket.IO emitido em tempo real
- **Monitor Eventos:** Feed ao vivo de eventos Socket.IO emitidos (para debug/demo)

**Nota sobre SignalR:** O pacote `@microsoft/signalr` é o client JavaScript — o server exige ASP.NET Core. Para manter a stack 100% Node.js, vamos usar **Socket.IO** no server (padrão Hub/Events idêntico). Se no futuro quiseres um server SignalR real, podemos adicionar um micro-serviço ASP.NET Core só para o hub.

### 3.2 TestAgentFactoryMiddleware
| Item | Detalhe |
|------|---------|
| **Objectivo** | API Gateway + camada de integração (simula MuleSoft/APIM) |
| **Stack** | Node.js + Express + http-proxy-middleware (⚠️ NÃO usar express-gateway — deprecated desde 2021) |
| **Funcionalidades** | API routing, rate limiting, auth (JWT), request/response transform, API composition |
| **APIs expostas** | `/api/v1/auth/login`, `/api/v1/accounts`, `/api/v1/accounts/:id/movements`, `/api/v1/transfers` |
| **Integração** | Faz proxy/transform para APIs do Core (porta 4001) |
| **API Docs** | OpenAPI/Swagger UI |
| **Branches** | `main` + `base` |
| **Porta** | 4010 |

### 3.3 TestAgentFactoryDigitalChannels
| Item | Detalhe |
|------|---------|
| **Objectivo** | App cliente (frontend + backend BFF) |
| **Stack Frontend** | React + @bctt/design-system + React Router + i18n |
| **Stack Backend** | Node.js + Express (BFF pattern, microservices) |
| **Microserviços** | auth-service, account-service, movement-service, notification-service |
| **Real-time** | Socket.IO client conecta ao Core para receber eventos |
| **CJ Base** | Login + Landing page (consulta saldos, movimentos) |
| **Design System** | Importa `@bctt/design-system` via file: dependency |
| **Branches** | `main` + `base` |
| **Portas** | 5173 (frontend Vite), 4020 (BFF) |

### 3.4 TestAgentFactoryDigitalChannelsWithErrors
| Item | Detalhe |
|------|---------|
| **Objectivo** | Cópia do DigitalChannels com erros intencionais |
| **Erros Frontend (3)** | 1) Rendering crash num componente, 2) State management bug (saldo não atualiza), 3) Routing erro (página 404 inesperada) |
| **Erros Backend (2)** | 1) API retorna dados errados (movimentos duplicados), 2) Auth token não expira (segurança) |
| **Erro Socket.IO (1)** | Evento `movement.created` não processa correctamente (saldo real-time não atualiza) |
| **Branches** | `main` + `base` |

### 3.5 TestAgentFactoryUnitTest
| Item | Detalhe |
|------|---------|
| **Objectivo** | Testes unitários para todos os projectos |
| **Stack** | Vitest + @testing-library/react + supertest |
| **Cobertura mínima** | 80% |
| **Organização** | `tests/frontend/`, `tests/backend/`, `tests/integration/` |
| **Jira** | Lê BDEV → extrai critérios de aceitação → gera testes |
| **Branches** | `main` + `base` |

---

## 4. AGENTES — ALTERAÇÕES E NOVOS

### 4.1 Agentes Existentes a Enriquecer

#### FDE (Frontend Dev Agent) — melhorias
- **Novo:** Acesso Jira (lê epics, features, user stories do BDEV)
- **Novo:** Acesso ao protótipo do PA (como **inspiração visual**, não como fonte de código)
- **Novo:** Acesso às specs do DA (wireframes enviados para Figma) — **fonte de verdade para layout/estrutura**
- **Novo:** Acesso ao fluxo funcional do FA — **cola entre ecrãs e lógica de negócio**
- **Novo:** Sabe a estrutura do DigitalChannels (paths, componentes, rotas)
- **Novo:** Lê o Implementation Registry para saber o que já existe
- **Novo:** Responde a perguntas do TAA sobre detalhes de implementação frontend
- **Tools novas:** `fde_read_jira_spec`, `fde_read_prototype`, `fde_read_da_specs`, `fde_read_registry`, `fde_read_contract`, `fde_check_ds_catalog`, `fde_create_branch`, `fde_write_code`, `fde_commit_push`, `fde_explain_code`

**Regra crítica — QUEM MANDA NO FDE:**
O **TAA** é a autoridade do FDE. O TAA define a arquitectura, os ficheiros a alterar, e o Interface Contract. O FDE executa segundo a spec do TAA.

**Fontes de informação do FDE (por ordem de prioridade):**
1. **TAA spec + Interface Contract** — autoridade máxima. Define endpoints, tipos, estrutura
2. **DA specs (wireframes/Figma)** — estrutura visual, layout, componentes por ecrã
3. **FA fluxo funcional** — lógica de negócio, navegação entre ecrãs, regras
4. **PA protótipo** — **apenas inspiração visual**. O código do PA é para demonstração, NÃO para produção

**Regra crítica — CÓDIGO DE PRODUÇÃO:**
O FDE escreve código **para produção**, não para demonstração. Diferença fundamental face ao PA:
- **PA** → código rápido para mostrar wireframes no browser. Pode ter atalhos, hardcoded values, sem error handling
- **FDE** → código robusto, seguindo **melhores práticas**: error handling, loading states, types completos, separação de responsabilidades, imports correctos, sem code smells

O código do FDE **deve passar no SonarQube** (quality gates: 0 bugs, 0 vulnerabilities, coverage ≥ 80%, duplications ≤ 3%). Deve seguir as regras do CQE (§8) em cada commit.

**Regra crítica — DESIGN SYSTEM OBRIGATÓRIO:**
O FDE **deve sempre importar componentes de `@bctt/design-system`**, nunca directamente de `@mui/material`.

Estratégia em 3 níveis:
1. **Componente existe no DS** → importar de `@bctt/design-system` (ex: `Button`, `Card`, `TextField`, `Badge`)
2. **Componente não existe no DS mas é MUI re-exportado** → importar de `@bctt/design-system` (ex: `Box`, `Typography`, `Stack`, `AppBar`)
3. **Componente não existe de todo** → FDE usa MUI re-exports do DS (`Box`, `Typography`, etc.) como fallback. O `rewriteImports` serve de safety net

**Fallback:** O `rewriteImports` já existente (Fix 32) serve como safety net no build — mas o objectivo é que o FDE **nunca precise** do fallback porque importa sempre correctamente.

**Tool nova:** `fde_check_ds_catalog` — verifica se um componente existe no `@bctt/design-system` antes de o usar. Se não existe, retorna lista de alternativas.

**Componentes DS — DA-driven (sem bridge FDE↔DSLA):**
O FDE **não comunica com o DSLA**. Todos os componentes necessários são criados pelo DSLA na Fase 1 (baseados nas specs do DA). Na Fase 2, o FDE apenas consome do DS. Se faltar algo, usa MUI re-exports do DS. Detalhes em **§17.3**.

**No system prompt do FDE:**
> "O TAA é a tua autoridade — segue a spec e o Interface Contract. Usa as specs do DA (wireframes) como fonte de verdade para layout. O protótipo do PA serve APENAS como inspiração visual — nunca copies código do PA. O teu código vai para PRODUÇÃO: deve ser robusto, com error handling, loading states, types completos, e seguir melhores práticas. Deve passar no SonarQube (0 bugs, 0 vulnerabilities). NUNCA uses `import { X } from '@mui/material'` — SEMPRE usa `import { X } from '@bctt/design-system'`."

#### BDE (Backend Dev Agent) — melhorias
- **Novo:** Acesso Jira (lê epics, features, user stories do BDEV)
- **Novo:** Sabe a arquitectura dos microserviços do DigitalChannels/Core/Middleware
- **Novo:** Lê o Implementation Registry para saber APIs/tabelas/eventos existentes
- **Novo:** Responde a perguntas do TAA sobre detalhes de implementação backend
- **Tools novas:** `bde_read_jira_spec`, `bde_read_registry`, `bde_read_contract`, `bde_create_branch`, `bde_write_code`, `bde_create_api`, `bde_commit_push`, `bde_explain_code`

**Regra crítica — QUEM MANDA NO BDE:**
O **TAA** é a autoridade do BDE. O TAA define a arquitectura, os endpoints a criar, as tabelas a estender, e o Interface Contract. O BDE executa segundo a spec do TAA.

**Alinhamento FDE ↔ BDE:**
O BDE e o FDE **não falam directamente**, mas devem estar **sempre alinhados** através do **Interface Contract** (§6). O contrato define exactamente:
- Quais endpoints o BDE expõe e o FDE consome
- Quais eventos Socket.IO o BDE emite e o FDE subscreve
- Quais tipos partilhados ambos usam (`shared_types`)

O BDE deve perceber:
- **Quando criar microserviços** — cada domínio de negócio (auth, accounts, movements) é um serviço separado
- **Quando processar eventos** — alterações de estado que afectam outros serviços devem emitir eventos Socket.IO
- **Quando chamar outros serviços** — BFF → Middleware → Core para REST APIs, nunca BFF → Core directamente. **Excepção:** Socket.IO events conectam directamente do BFF ao Core (porta 4001) — http-proxy-middleware não proxia WebSockets de forma fiável
- **Quando estender vs criar** — se uma tabela/API já existe no Registry, estender (não recriar)

**Código de produção:** Tal como o FDE, o BDE escreve código robusto para produção. Deve seguir REST best practices, error handling padronizado, validação de inputs, e passar no SonarQube.

**No system prompt do BDE:**
> "O TAA é a tua autoridade — segue a spec e o Interface Contract. O contrato define exactamente que endpoints deves expor, que eventos emitir, e que tipos usar. O FDE vai consumir exactamente o que definiste — qualquer desvio causa integração falhada. Segue REST best practices, error handling padronizado (códigos de erro do contrato), e validação de inputs. O teu código vai para PRODUÇÃO e deve passar no SonarQube."

### 4.2 Agentes Novos

#### UTE (Unit Test Executor)
| Responsabilidade | Detalhe |
|-----------------|---------|
| Correr testes | Executa vitest no projecto UnitTest contra um branch específico |
| Gerar report | Produz JSON com resultados (pass/fail/coverage) |
| Despachar erros | Envia falhas ao FBS (frontend) ou BBS (backend) conforme o tipo |
| Re-testar | Recebe branch corrigido, executa testes novamente |
| On-demand | Execução manual via Workshop UI ou API (para demos e debugging) |
| **Tools:** | `ute_run_tests`, `ute_generate_report`, `ute_dispatch_to_fbs`, `ute_dispatch_to_bbs`, `ute_retest_branch`, `ute_run_on_demand` |

**Execução On-Demand (para demos):**
O UTE pode ser executado a qualquer momento, sem depender do pipeline:

```
Workshop UI → botão "Correr Testes" (no painel de cada BDEV ou no dashboard)
    │
    ├── Seleccionar projecto (Core / Middleware / DigitalChannels / Todos)
    ├── Seleccionar branch (main, feature/xxx, ou custom)
    ├── Seleccionar scope (all / frontend / backend / integration / specific test file)
    │
    └── POST /tests/run-on-demand
        {
          "project": "TestAgentFactoryDigitalChannels",
          "branch": "main",
          "scope": "all",       // ou "frontend", "backend", "integration"
          "testFile": null       // ou "tests/frontend/AccountCard.test.tsx"
        }
        │
        ▼
    UTE arranca → executa vitest → streaming de resultados via SSE
    Resultados visíveis no Workshop UI em tempo real
```

**API endpoint:** `POST /tests/run-on-demand` — arranca UTE com parâmetros custom
**Workshop UI:** Botão "Run Tests" acessível em:
1. Dashboard principal (corre todos os testes de todos os projectos)
2. Dentro de cada BDEV (corre testes do branch desse BDEV)
3. No CI/CD dashboard (re-run de steps individuais)

**Utilidade para demo:** O apresentador pode demonstrar que os testes correm realmente — click no botão, ver os resultados a aparecer em tempo real. Especialmente útil para mostrar que o projecto WithErrors falha nos testes e que após o fix do FBS/BBS os mesmos testes passam.

#### FBS (Frontend Bug Solver) — melhorias
| Responsabilidade | Detalhe |
|-----------------|---------|
| Jira bugs | Lê bugs de frontend do Jira, analisa o problema |
| Propor solução | Analisa código, propõe fix |
| Branch | Cria feature branch com a correcção |
| Actualizar Jira | Transiciona bug para **"Development Completed"** quando o feature branch está pronto |
| Responder UTE | Devolve branch name + resumo do fix |
| **Tools:** | `fbs_read_jira_bug`, `fbs_analyze_code`, `fbs_create_branch`, `fbs_apply_fix`, `fbs_update_jira_status`, `fbs_respond_to_ute` |

#### BBS (Backend Bug Solver) — **novo**
| Responsabilidade | Detalhe |
|-----------------|---------|
| Jira bugs | Lê bugs de backend do Jira, analisa o problema |
| Propor solução | Analisa código backend, propõe fix |
| Informar FBS | Notifica FBS se a correcção backend impacta o frontend |
| Branch | Cria feature branch com a correcção |
| Actualizar Jira | Transiciona bug para **"Development Completed"** quando o feature branch está pronto |
| Responder UTE | Devolve branch name + resumo do fix |
| **Tools:** | `bbs_read_jira_bug`, `bbs_analyze_code`, `bbs_create_branch`, `bbs_apply_fix`, `bbs_update_jira_status`, `bbs_notify_fbs`, `bbs_respond_to_ute` |

**Estado Jira para bugs (FBS e BBS):**
```
Bug criado → "To Do"
    │
    ▼
Bug watcher detecta → "In Progress" (automático)
    │
    ▼
FBS/BBS cria feature branch com fix → "Development Completed"
    │
    ▼
UTE re-testa feature branch:
    ├── Testes passam → "Done" (bug resolvido)
    └── Testes falham → volta a "In Progress" (FBS/BBS corrige de novo)
```

**Teste visual de correcções — Dual Browser (antes/depois):**
Para demonstrar visualmente que um bug foi corrigido, o sistema deploya **duas instâncias em paralelo**:

```
┌────────────────────────────┐    ┌────────────────────────────┐
│   Tab 1: PRODUÇÃO (main)   │    │   Tab 2: FIX (feature)     │
│   www.DCsCreatedbyAI.pt    │    │   fix.DCsCreatedbyAI.pt    │
│   Porta 5173               │    │   Porta 5174               │
│                            │    │                            │
│   ❌ Bug visível:           │    │   ✅ Bug corrigido:         │
│   Saldo não actualiza      │    │   Saldo actualiza OK       │
│   após novo movimento      │    │   em tempo real             │
└────────────────────────────┘    └────────────────────────────┘
```

**Implementação:**
- **Porta 5173** → branch `main` (versão com erro — simula produção)
- **Porta 5174** → feature branch do FBS/BBS (versão corrigida — simula ambiente de teste)
- Reutiliza o mecanismo de deploy preview (§5.7) — mesmo Vite dev server em porta diferente
- **Hosts file:** adicionar `127.0.0.1 fix.DCsCreatedbyAI.pt`
- **Nginx:** nova entry para `fix.DCsCreatedbyAI.pt` → porta 5174

**Workshop UI — Painel de Bug Fix:**
- Ao clicar num bug com status "Development Completed":
  - Botão **"Comparar"** → abre 2 tabs lado a lado (main vs feature branch)
  - Botão **"Aprovar Fix"** → merge feature branch → main → UTE re-testa → "Done"
  - Diff viewer: ver alterações no código (antes/depois)

#### TAA (Technical Architecture Agent) — **novo**
| Responsabilidade | Detalhe |
|-----------------|---------|
| Ler BDEV | Lê epic + features + US do Jira |
| Agrupar por MVP | Classifica US por MVP (High→MVP1, Medium→MVP2, Low→MVP3), executa um MVP de cada vez |
| Mapear arquitectura | Identifica quais projectos são impactados (Frontend, Backend, Middleware, Core) |
| Interface Contract | Gera contrato de interfaces (APIs, eventos, tipos) para acordo FDE↔BDE |
| Regras arquitecturais | Microserviços, APIs REST best practices, event-driven quando aplicável, separação de camadas |
| Diagrama de implementação | Gera diagrama técnico e **anexa ao Epic no Jira** como comment/attachment |
| Gestão Jira | Actualiza estado do Epic, Features e US no Jira ao longo do pipeline |
| Transição MVP | Ao iniciar um MVP, transiciona Features e US desse MVP para **"In Progress"** |
| Explicar código | Responde a perguntas sobre como o código funciona. Consulta código real — **nunca inventa** |
| Delegar detalhes | Se não souber detalhes de implementação, pergunta ao FDE (frontend) ou BDE (backend) |
| Validação | Verifica se a proposta segue os padrões definidos |
| **Tools:** | `taa_read_bdev`, `taa_list_mvps`, `taa_analyze_architecture`, `taa_map_implementation`, `taa_generate_spec`, `taa_generate_contract`, `taa_update_jira_status`, `taa_attach_to_epic`, `taa_transition_mvp_issues`, `taa_validate_patterns`, `taa_read_code`, `taa_ask_fde`, `taa_ask_bde` |

**Diagrama de Implementação no Jira:**
Quando o TAA termina a análise de um MVP, anexa o resultado ao Epic no Jira:

```
Epic: BDEV00000011 - Consulta de Saldos e Movimentos
    │
    ├── Comment: "MVP1 Technical Analysis — BDEV00000011"
    │   ├── Diagrama de implementação (quais ficheiros alterar, APIs criar, eventos emitir)
    │   ├── Interface Contract (resumo dos endpoints/tipos)
    │   ├── Projectos impactados (Core, Middleware, DigitalChannels)
    │   └── Estimativa de complexidade
    │
    └── Attachment: `MVP1-technical-analysis-BDEV00000011.json` (spec completa)
```

**Tool `taa_attach_to_epic`:** Adiciona comment formatado + attachment JSON ao Epic
**Naming convention:** `{MVP} Technical Analysis — {BDEV_CODE}` (ex: "MVP1 Technical Analysis — BDEV00000011")

**Transição de Issues por MVP:**
Quando o TAA inicia a implementação de um MVP específico, transiciona automaticamente todas as Features e User Stories marcadas com a label desse MVP:

```
TAA inicia MVP1 → JQL: labels = "MVP1" AND parent = BCTT-XX
    │
    ├── Cada Feature com US do MVP1 → status "In Progress"
    └── Cada User Story com label MVP1 → status "In Progress"
```

**Tool `taa_transition_mvp_issues(epicKey, mvpLabel)`:** Transiciona todas as issues de um MVP para "In Progress"

**Regra crítica — NUNCA INVENTAR:**
O TAA tem acesso ao código real dos projectos via `taa_read_code`. Quando alguém pergunta "como funciona X?":
1. **Lê o código** — usa `taa_read_code` para ler os ficheiros relevantes
2. **Se percebe** — explica baseado no código real que leu
3. **Se não percebe** — delega ao FDE (`taa_ask_fde`) ou BDE (`taa_ask_bde`) para explicação detalhada
4. **NUNCA responde baseado em suposições** — se não encontra no código, diz "não encontrei esta implementação"

---

## 5. PIPELINE FASE 2 (com Approval Gates + MVPs)

**Transição Fase 1→2:** A Fase 2 começa quando o utilizador selecciona um BDEV com status "Ready for Development" no Jira (conceção concluída pela Fase 1). No Workshop UI, o tab "Desenvolvimento" mostra os BDEVs disponíveis. O TAA herda todo o contexto da Fase 1 (Jira Epic, wireframes, componentes DS, protótipo, Registry). Detalhes em **§17.1**.

### 5.1 MVPs no Jira (Labels)

Os MVPs são guardados **directamente no Jira** como **Labels** em cada User Story:

| Label | Significado | Critério |
|-------|-------------|----------|
| `MVP1` | Must Have — core essencial | Autenticação, fluxo principal, validações obrigatórias |
| `MVP2` | Should Have — complementar | Notificações, filtros, exportações, fluxos secundários |
| `MVP3` | Could Have — avançado | Personalização, analytics, otimizações, nice-to-have |

**Como são criados:**
- O **FA** (Functional Agent) já classifica US por MVP (mvp1/mvp2/mvp3 via keywords)
- Na criação no Jira (`jira_bulk_create_from_fa`), **adicionar label MVP** à US:
  ```typescript
  labels: ['user-story', 'fa-generated', mvpPhase]  // mvpPhase = 'MVP1' | 'MVP2' | 'MVP3'
  ```
- Mapeamento: `priority "High" → MVP1`, `"Medium" → MVP2`, `"Low" → MVP3`

**Como o TAA consulta:**
```jql
project = BCTT AND parent = BCTT-XXX AND labels = "MVP1" ORDER BY created
```

**Ficheiros a alterar (Fase 1 — retroactivo):**
- `mcp-server/src/jira/tools.ts` → na criação de US, adicionar label `MVP1`/`MVP2`/`MVP3`
- `mcp-server/src/jira/client.ts` → método `createUserStory()` aceita `mvpPhase` param

### 5.2 Execução por MVPs (iterativa)

O TAA **não implementa tudo de uma vez**. Em vez disso:

1. **Lê o BDEV** (Epic) e todas as User Stories filhas
2. **Filtra por label MVP** no Jira: `labels = "MVP1"`, `labels = "MVP2"`, etc.
3. **Começa pelo MVP1** — gera spec de arquitectura só para as US com label `MVP1`
4. **Quando MVP1 termina** (merge aprovado no Gate 3) → pergunta ao utilizador:
   > "MVP1 concluído com sucesso (N user stories). Deseja avançar para o MVP2 (M user stories)?"
5. **Se sim** → repete o ciclo completo (TAA → FDE+BDE → UTE → Merge) para MVP2
6. **Se não** → para e regista estado no Jira

### 5.3 Gestão de Estado Jira pelo TAA

O TAA actualiza o Jira ao longo do pipeline:

| Momento | Acção no Jira (Epic) | Acção no Jira (US) |
|---------|---------------------|-------------------|
| Fase 1 concluída (PA) | Epic → **"Ready for Development"** | — |
| TAA inicia análise | Epic → **"In Development"** | — |
| MVP1 spec gerada | Anexa "MVP1 Technical Analysis" ao Epic | — |
| TAA inicia MVP | — | Features e US do MVP → **"In Progress"** |
| FDE/BDE terminam código | — | Cada US → **"Ready for Testing"** |
| CI/CD pipeline arranca | — | Cada US → **"In Testing"** |
| CI/CD verde + Gate 3 aprovado + merge + deploy | Epic comment: "MVP1 deployed" | Cada US → **"In Production"** |
| Todos MVPs concluídos | Epic → **"In Production"** | — |

**Status Jira custom a criar:**

| Status | Categoria Jira | Quando |
|--------|---------------|--------|
| **Ready for Development** | Done (Fase 1) | Conceção completa, pronto para Fase 2 |
| **In Development** | In Progress | TAA + FDE/BDE a trabalhar |
| **Ready for Testing** | In Progress | Código completo, aguarda CI/CD |
| **In Testing** | In Progress | CI/CD a correr (UTE + CQE + SonarQube) |
| **In Production** | Done | Merged + deployed + live |

**Pré-requisito Jira (manual, Batch 0):** Criar estes 5 statuses no Jira Cloud requer acesso de **Jira Admin**. Ir a Project Settings → Board → Columns → adicionar statuses ao workflow. Sem estes statuses, as tools de transição vão falhar com "Invalid transition".

### 5.4 Fluxo do Pipeline (por MVP)

```
Utilizador selecciona BDEV (Jira: status "Ready for Development")
        │
        ▼
   TAA (lê BDEV + agrupa US por MVP)
   Epic → status "In Development"
        │
        ▼
   ┌── TAA (spec arquitectura MVP1) ──┐
   │   Apresenta spec ao utilizador   │
   │   Interface Contract gerado      │
   │   ⏸ GATE 1: Aprovar/Rejeitar    │
   └────────────┬─────────────────────┘
                │ (aprovado)
                ▼
   FDE (frontend) + BDE (backend) em paralelo
   Cada US MVP1 → status "In Progress"
   Feature branches: feature/BDEV00000011-mvp1-frontend
                │ (FDE+BDE terminam)
                ▼
   Cada US MVP1 → status "Ready for Testing"
                │
                ▼
   ⏸ GATE 2: Review & Deploy Preview
   - Diff de ficheiros alterados
   - Deploy preview (porto 5174)
   - Utilizador testa + aprova/rejeita
                │ (aprovado)
                ▼
   Cada US MVP1 → status "In Testing"
                │
                ▼
          UTE (testes no feature branch)
           │          │
      ┌────┘          └────┐
      ▼                    ▼
FBS (se frontend)    BBS (se backend)    ← só se testes falharem
      │                    │
      └────┬───────────────┘
           ▼
     UTE (re-test)
           │
           ▼
   ══════ CI/CD PIPELINE ══════
   (automático, sem intervenção humana)
   ┌─ UTE final run (todos os testes) ──────── ✓/✗
   ├─ CQE full scan (lint+types+security) ──── ✓/✗
   ├─ SonarQube analysis ───────────────────── ✓/✗
   ├─ Interface Contract validation ────────── ✓/✗
   └─ Coverage check (≥80%) ────────────────── ✓/✗
           │
           ├── Tudo verde → Gate 3 abre
           └── Falha → Report detalhado → FBS/BBS corrigem → re-run CI/CD
           │
           ▼
   ⏸ GATE 3: Merge Approval
   - CI/CD report verde
   - Utilizador aprova merge → main
           │
           ▼
   ══════ DEPLOY ══════
   (automático após merge)
   ┌─ Stop affected services ──────────────── ⏳
   ├─ Git merge feature → main ─────────────── ⏳
   ├─ npm install + npm run build ──────────── ⏳
   ├─ Start services (new version) ─────────── ⏳
   ├─ Health checks (HTTP + Socket.IO) ─────── ✓/✗
   ├─ Jira: US → "In Production" ──────────── ✓
   └─ Registry: actualizar routes/APIs ─────── ✓
           │
           ▼
   Funcionalidade live em www.DCsCreatedbyAI.pt
           │
           ▼
   ⏸ GATE MVP: "Avançar para MVP2?"
   - Se sim → volta ao TAA (spec MVP2)
   - Se não → para (estado guardado)
```

### 5.5 Handoff Chain

```
AGENT_DOWNSTREAM_PHASE2 = {
  taa: ["fde", "bde"],    // paralelo (após Gate 1) — ver §17.2 para detalhes
  fde: "ute",             // após Gate 2
  bde: "ute",             // após Gate 2
  ute: ["fbs", "bbs"],    // condicional (só se testes falham)
  fbs: "ute",
  bbs: "ute",
}
```

**Execução paralela FDE+BDE:** Ambos correm como conversas independentes via `Promise.all`. Cada um recebe o Interface Contract do TAA e trabalha no seu domínio. Gate 2 só abre quando ambos terminam. Detalhes técnicos em **§17.2**.

### 5.6 Approval Endpoints

```
POST /workflow/approve-architecture   → Gate 1 (TAA → FDE+BDE)
POST /workflow/approve-development    → Gate 2 (Review → CI/CD)
POST /workflow/approve-merge          → Gate 3 (Merge → Deploy)
POST /workflow/advance-mvp            → Gate MVP (MVP N → MVP N+1)
GET  /workflow/cicd-status            → Estado actual do CI/CD pipeline
GET  /workflow/deploy-status          → Estado actual do deploy
POST /workflow/rollback               → Rollback ao commit anterior
POST /tests/run-on-demand            → UTE on-demand (§4.2)
GET  /jira/bdevs-available           → BDEVs com status "Ready for Development" (§17.1)
```

### 5.7 Deploy Preview

- Feature branch deployado num porto separado (5174)
- Utilizador testa sem afectar main
- Reutiliza mecanismo do `pa_deploy_prototype` (Vite dev server)

### 5.8 Workshop UI — Painel Review & Deploy

- Lista BDEVs com estado de cada gate
- **Indicador de MVP actual** (MVP1/MVP2/MVP3) com progresso
- Diff viewer (ficheiros alterados, +/- linhas)
- Link para deploy preview
- Botões Aprovar/Rejeitar por gate
- Resultados UTE (pass/fail/coverage)
- **Botão "Avançar para próximo MVP"** após Gate 3

---

## 6. CONTRATO DE INTERFACES FDE ↔ BDE (Acordo Tácito)

### Princípio
O TAA, ao gerar a especificação de arquitectura, produz também um **Interface Contract** — um documento JSON que define exactamente as interfaces entre frontend e backend. Ambos os agentes (FDE e BDE) recebem este contrato e são **obrigados** a segui-lo.

### O que o contrato define

```json
{
  "bdev": "BDEV00000011",
  "version": 1,
  "apis": [
    {
      "method": "GET",
      "path": "/api/v1/accounts/:id/movements",
      "request": { "params": { "id": "string" }, "query": { "from": "string?", "to": "string?", "limit": "number?" } },
      "response": { "movements": [{ "id": "string", "type": "debit|credit", "amount": "number", "date": "string", "description": "string" }] },
      "errors": [{ "status": 401, "code": "UNAUTHORIZED" }, { "status": 404, "code": "ACCOUNT_NOT_FOUND" }]
    }
  ],
  "events": [
    {
      "name": "movement.created",
      "payload": { "accountId": "string", "movementId": "string", "type": "debit|credit", "amount": "number" }
    }
  ],
  "shared_types": {
    "Movement": { "id": "string", "type": "debit|credit", "amount": "number", "date": "string", "description": "string" },
    "Account": { "id": "string", "iban": "string", "status": "no_access|readonly|fullaccess", "balance": "number" }
  }
}
```

### Como funciona no pipeline

1. **TAA gera contrato** via tool `taa_generate_spec` → inclui secção `interface_contract`
2. **Contrato guardado** em `mcp-server/data/contracts/{bdev_code}.json`
3. **FDE recebe contrato** no handoff → implementa frontend usando exactamente os endpoints/tipos definidos
4. **BDE recebe contrato** no handoff → implementa backend expondo exactamente os endpoints/tipos definidos
5. **Validação no CI/CD pipeline** (Step 6, após Gate 2) → o sistema verifica automaticamente:
   - FDE chama os endpoints correctos (paths, métodos, parâmetros)
   - BDE expõe os endpoints correctos (paths, métodos, respostas)
   - Tipos partilhados (`shared_types`) são compatíveis
   - Resultados visíveis no CI/CD dashboard antes de Gate 3

### Regras arquitecturais impostas

| Regra | Descrição |
|-------|-----------|
| **REST conventions** | Verbos HTTP correctos (GET leitura, POST criação, PUT update, DELETE remoção) |
| **Naming consistency** | camelCase nos campos JSON, kebab-case nos paths |
| **Error handling** | Códigos de erro padronizados (UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR, etc.) |
| **Versionamento API** | Sempre `/api/v1/...` no path |
| **Event schema** | Eventos Socket.IO seguem padrão `{entity}.{action}` (ex: `movement.created`) |
| **Types alignment** | Frontend e backend usam os mesmos nomes de tipos definidos em `shared_types` |

### Tools envolvidas

| Tool | Agente | Acção |
|------|--------|-------|
| `taa_generate_spec` | TAA | Gera contrato de interfaces como parte da spec |
| `fde_read_contract` | FDE | Lê contrato para saber que endpoints consumir |
| `bde_read_contract` | BDE | Lê contrato para saber que endpoints implementar |
| `validate_interface_compliance` | Sistema | Valida no Gate 2 se FDE e BDE seguiram o contrato |

---

## 7. BUG WATCHER — TRIGGER AUTOMÁTICO VIA MCP SERVER

### Como funciona (polling interno, sem webhook/ngrok)
```
MCP Server (setInterval cada 30s no server.ts)
    │
    ├── JQL: project=BCTT AND issuetype=Bug AND status="To Do"
    │        AND labels in (frontend-bug, backend-bug)
    │
    ├── Encontra bug novo → transiciona para "In Progress" no Jira
    │
    ├── label = frontend-bug → despacha para FBS
    │   label = backend-bug → despacha para BBS
    │
    └── Agent cria branch → fix → Jira → "Development Completed" → UTE re-testa → Jira → "Done"
```

### Implementação
- **Ficheiro:** `mcp-server/src/jira/bug-watcher.ts` (novo)
- Usa o Jira client já existente (`mcp-server/src/jira/client.ts`)
- `setInterval` no `server.ts` ao iniciar
- Mantém Set de issue keys já processadas (evita duplicados)
- Ao encontrar bug: transiciona status no Jira + arranca sessão do agent (FBS/BBS)
- Zero dependências novas — usa tudo o que já temos
- **Tool manual:** `trigger_bug_fix(jira_key)` para demos/debugging

### Bug Stories pré-criadas (do projecto WithErrors)
Ao criar o WithErrors, criamos 6 bugs no Jira com:
- **BUG-FE-001:** Rendering crash no componente AccountCard (TypeError: undefined)
- **BUG-FE-002:** Saldo não actualiza após novo movimento (state management)
- **BUG-FE-003:** Rota /movements/detail retorna 404 (React Router config)
- **BUG-BE-001:** API /movements retorna movimentos duplicados (query SQL)
- **BUG-BE-002:** JWT token nunca expira (segurança)
- **BUG-RT-001:** Evento movement.created não actualiza saldo em tempo real (Socket.IO handler)

Cada bug tem: descrição, steps to reproduce, expected vs actual, stack trace, e label (frontend-bug/backend-bug).

**Labels por bug:**
- BUG-FE-001, BUG-FE-002, BUG-FE-003 → `frontend-bug` (despachados ao FBS)
- BUG-BE-001, BUG-BE-002 → `backend-bug` (despachados ao BBS)
- BUG-RT-001 → `backend-bug` (Socket.IO handler é server-side — despachado ao BBS, que notifica FBS se impactar frontend)

---

## 8. CQE — CODE QUALITY ENGINE (Híbrido: ESLint + SonarQube Real)

### Objectivo
Antes de qualquer commit (por FDE ou BDE), o código passa por **quality gates**. Abordagem híbrida:
- **Pre-commit (rápido):** ESLint + TypeScript + scripts custom — executa em segundos
- **Post-merge (completo):** SonarQube Community Edition real — análise profunda com dashboard

### Pré-requisitos a instalar
- **Docker Desktop** — para correr SonarQube (`docker run sonarqube:community`)
- **Java 17+** — para correr SonarQube sem Docker (alternativa)

### 8.1 Quality Gates — Pre-commit (CQE rápido)

| Gate | Ferramenta | O que valida |
|------|-----------|-------------|
| **Linting** | ESLint (config partilhada) | Erros de sintaxe, regras de estilo, import order |
| **Type checking** | TypeScript `tsc --noEmit` | Erros de tipo, interfaces incompatíveis |
| **Imports DS** | Script custom | Verifica que frontend importa de `@bctt/design-system`, não de `@mui/material` |
| **Security** | ESLint security plugin | XSS, SQL injection, eval(), hardcoded secrets |
| **Complexity** | ESLint complexity rules | Funções com cyclomatic complexity > 15 |
| **Dead code** | TypeScript + ESLint no-unused | Variáveis, imports, funções não usadas |

```
FDE/BDE escreve código
        │
        ▼
   CQE rápido (pre-commit, ~5-10s)
   ┌─ Lint ✓
   ├─ TypeCheck ✓
   ├─ DS Imports ✓
   ├─ Security ✓
   ├─ Complexity ✓
   └─ Dead Code ✓
        │
        ├── Tudo verde → commit permitido
        └── Falha → agente corrige → re-executa (max 3x)
```

**Tool:** `cqe_validate_code(projectPath, changedFiles[])` — corre todos os gates rápidos

### 8.2 SonarQube Real — Post-merge (análise completa)

```
Gate 3 (merge aprovado) → código no main
        │
        ▼
   SonarQube Scanner executa
   (sonar-scanner -Dsonar.projectKey=...)
        │
        ▼
   Dashboard SonarQube (http://localhost:9000)
   - Code smells, bugs, vulnerabilities
   - Coverage, duplications, complexity
   - Quality Gate status (pass/fail)
```

**Setup SonarQube:**
```bash
# Opção 1: Docker (recomendado)
docker run -d --name sonarqube -p 9000:9000 sonarqube:community

# Opção 2: Java 17 (standalone)
# Download zip → unzip → bin/windows-x86-64/StartSonar.bat
```

**Configuração por projecto:** `sonar-project.properties`
```properties
sonar.projectKey=TestAgentFactoryDigitalChannels
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/node_modules/**,**/dist/**
```

**Scanner npm:** `sonarqube-scanner` no `package.json` de cada projecto

**Tool:** `cqe_sonarqube_scan(projectPath)` — executa scanner e retorna resultado
**Tool:** `cqe_sonarqube_status(projectKey)` — lê quality gate status via API SonarQube

### 8.3 Report CQE (exemplo pre-commit)

```json
{
  "timestamp": "2026-02-09T15:00:00Z",
  "project": "TestAgentFactoryDigitalChannels",
  "branch": "feature/BDEV00000011-mvp1-frontend",
  "gates": {
    "lint": { "status": "pass", "errors": 0, "warnings": 2 },
    "typeCheck": { "status": "pass", "errors": 0 },
    "dsImports": { "status": "fail", "violations": [
      { "file": "src/pages/TransferPage.tsx", "line": 3, "issue": "import { Button } from '@mui/material' → deve ser '@bctt/design-system'" }
    ]},
    "security": { "status": "pass", "issues": 0 },
    "complexity": { "status": "pass", "maxComplexity": 8 },
    "deadCode": { "status": "pass", "unused": 0 }
  },
  "overall": "FAIL",
  "blockers": 1
}
```

### 8.4 No Workshop UI

- **Gate 2 (Review):** Report CQE rápido (cada gate verde/vermelho) junto com diff
- **Após merge:** Link para dashboard SonarQube real com análise completa
- Detalhes de violações expandíveis
- Histórico de quality por BDEV

---

## 9. CI/CD PIPELINE — CONTINUOUS DELIVERY ENGINE (CDE)

### Objectivo
Pipeline CI/CD **real** (não simulado) integrado no MCP server. Corre automaticamente após Gate 2 (code review aprovado) e antes de Gate 3 (merge). Executa testes, quality gates, SonarQube, e validação de contratos — tudo com dashboard visual no Workshop UI.

### Porquê custom e não Jenkins/Gitea?
- Já temos 90% da infra (pipeline phases, SSE streaming, process spawning)
- Integração perfeita com Jira, SonarQube, git, e agentes
- Dashboard custom no Workshop UI (mais impacto visual para demo)
- Zero dependências externas adicionais
- As acções são **100% reais** — correm Vitest, SonarQube scanner, git merge

### 9.1 Pipeline Steps

```
Gate 2 aprovado → CI/CD Pipeline arranca automaticamente
    │
    ├── Step 1: GIT MERGE DRY-RUN
    │   Merge feature branch → main (dry-run, detecta conflitos)
    │
    ├── Step 2: INSTALL DEPENDENCIES
    │   npm ci nos projectos afectados
    │
    ├── Step 3: UTE FINAL RUN
    │   Vitest com coverage: vitest run --coverage
    │   Report JSON: tests passed/failed, coverage %
    │
    ├── Step 4: CQE FULL SCAN
    │   ESLint + TypeScript + DS Imports + Security
    │   Report JSON (reutiliza cqe_validate_code)
    │
    ├── Step 5: SONARQUBE ANALYSIS
    │   sonar-scanner → resultados via API SonarQube
    │   Quality Gate: pass/fail
    │
    ├── Step 6: CONTRACT VALIDATION
    │   Verifica se FDE e BDE seguiram o Interface Contract
    │   Endpoints, tipos, eventos conforme spec do TAA
    │
    ├── Step 7: COVERAGE CHECK
    │   Coverage ≥ 80% (configurável)
    │
    └── RESULTADO FINAL
        ├── ALL GREEN → Gate 3 abre (merge approval)
        └── FALHA → Report → agentes corrigem → re-run CI/CD
```

### 9.2 Implementação

**Ficheiro:** `mcp-server/src/cicd/pipeline.ts` (novo)

```typescript
interface CICDStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;  // ms
  output?: string;    // logs/output
  report?: object;    // structured report
}

interface CICDPipeline {
  id: string;
  bdev: string;
  mvp: string;
  branch: string;
  triggeredAt: string;
  status: 'running' | 'passed' | 'failed';
  steps: CICDStep[];
  overall: { passed: number; failed: number; skipped: number };
}
```

- Cada step executa um comando real (vitest, eslint, sonar-scanner, etc.)
- Progress via SSE streaming (mesmo padrão do pipeline dos agentes)
- Retry automático: se um step falha e o agente corrige, re-executa só os steps falhados

### 9.3 Tools

| Tool | Descrição |
|------|-----------|
| `cicd_trigger_pipeline` | Arranca CI/CD para um branch/BDEV |
| `cicd_get_status` | Retorna estado actual do pipeline |
| `cicd_rerun_failed` | Re-executa apenas os steps que falharam |
| `cicd_get_report` | Retorna report completo (JSON) |

### 9.4 Workshop UI — CI/CD Dashboard

- **Pipeline visual**: steps em sequência com ícone verde/vermelho/spinner
- **Tempo por step**: "UTE: 12s", "SonarQube: 45s", "Total: 1m 23s"
- **Logs expandíveis**: click num step → ver output do comando
- **SonarQube link**: botão directo para dashboard SonarQube
- **Re-run**: botão para re-executar pipeline ou steps individuais
- **Histórico**: pipelines anteriores por BDEV/MVP

---

## 10. DEPLOY MANAGER + CUSTOM URLs

### 10.1 Deploy Manager

**Ficheiro:** `mcp-server/src/deploy/manager.ts` (novo)

Após Gate 3 (merge aprovado), o Deploy Manager:

```
Merge aprovado → Deploy Manager arranca
    │
    ├── Step 1: STOP SERVICES
    │   taskkill /F /T /PID para cada processo afectado
    │   (reutiliza padrão do pa_deploy_prototype)
    │
    ├── Step 2: GIT MERGE
    │   git merge feature-branch → main (nos repos afectados)
    │
    ├── Step 3: INSTALL + BUILD
    │   npm ci && npm run build (frontend)
    │   npm ci (backend)
    │
    ├── Step 4: START SERVICES
    │   Core API (4001) + Backoffice (4002)
    │   Middleware (4010)
    │   DigitalChannels BFF (4020) + Frontend (5173)
    │
    ├── Step 5: HEALTH CHECKS
    │   HTTP GET /health em cada serviço
    │   Socket.IO connection test (Core)
    │   Timeout: 30s por serviço
    │
    ├── Step 6: UPDATE JIRA
    │   US → status "In Production"
    │   Epic → comment "MVP1 deployed successfully"
    │
    └── Step 7: UPDATE REGISTRY
        Implementation Registry actualizado com novos routes/APIs/components
```

**Gestão de processos:**
```typescript
interface ManagedService {
  name: string;           // 'core-api', 'core-backoffice', 'middleware', 'dc-frontend', 'dc-bff'
  project: string;        // path do projecto
  command: string;        // 'npm start', 'npm run dev', etc.
  port: number;           // porta esperada
  healthUrl: string;      // 'http://localhost:4001/health'
  pid?: number;           // PID do processo
  status: 'stopped' | 'starting' | 'running' | 'error';
}
```

**Rollback:**
- Se health checks falharem → rollback automático
- `git revert` do merge + redeploy da versão anterior
- Tool manual: `deploy_rollback(bdev)` para demos/emergências

### 10.2 Custom URLs — www.DCsCreatedbyAI.pt

Em vez de `localhost:5173`, o utilizador vê `www.DCsCreatedbyAI.pt` no browser.

**Abordagem: Windows hosts file + Nginx reverse proxy (Docker)**

**Step 1: Hosts file** (`C:\Windows\System32\drivers\etc\hosts`)
```
127.0.0.1   www.DCsCreatedbyAI.pt
127.0.0.1   fix.DCsCreatedbyAI.pt
127.0.0.1   backoffice.DCsCreatedbyAI.pt
127.0.0.1   api.DCsCreatedbyAI.pt
127.0.0.1   sonarqube.DCsCreatedbyAI.pt
127.0.0.1   auth.DCsCreatedbyAI.pt
127.0.0.1   workshop.DCsCreatedbyAI.pt
```

**Step 2: Nginx reverse proxy** (Docker, porta 80)
```nginx
server {
    listen 80;
    server_name www.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:5173;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name backoffice.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:4002;
    }
}

server {
    listen 80;
    server_name api.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:4010;
    }
}

server {
    listen 80;
    server_name sonarqube.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:9000;
    }
}

server {
    listen 80;
    server_name workshop.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:3000;
    }
}

server {
    listen 80;
    server_name fix.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:5174;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name auth.DCsCreatedbyAI.pt;
    location / {
        proxy_pass http://host.docker.internal:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Step 3: Docker compose** (nginx + sonarqube juntos)
```yaml
# mcp-server/docker-compose.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    extra_hosts:
      - "host.docker.internal:host-gateway"

  sonarqube:
    image: sonarqube:community
    ports:
      - "9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    ports:
      - "8080:8080"
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin1234
      - KC_HEALTH_ENABLED=true
    command: start-dev --import-realm
    volumes:
      - keycloak_data:/opt/keycloak/data
      - ./keycloak/bctt-realm.json:/opt/keycloak/data/import/bctt-realm.json

volumes:
  sonarqube_data:
  keycloak_data:
```

**URLs finais para a demo:**

| URL | Serviço | Porta real |
|-----|---------|-----------|
| `www.DCsCreatedbyAI.pt` | DigitalChannels (app cliente) | 5173 |
| `fix.DCsCreatedbyAI.pt` | Bug Fix Preview (feature branch) | 5174 |
| `backoffice.DCsCreatedbyAI.pt` | Core Backoffice (admin) | 4002 |
| `api.DCsCreatedbyAI.pt` | Middleware API Gateway | 4010 |
| `sonarqube.DCsCreatedbyAI.pt` | SonarQube Dashboard | 9000 |
| `auth.DCsCreatedbyAI.pt` | Keycloak Identity Provider | 8080 |
| `workshop.DCsCreatedbyAI.pt` | Workshop Agent Factory | 3000 |

### 10.3 Tools

| Tool | Descrição |
|------|-----------|
| `deploy_start` | Inicia deploy (stop → build → start → health check) |
| `deploy_status` | Estado actual de cada serviço (running/stopped/error) |
| `deploy_rollback` | Rollback ao commit anterior + redeploy |
| `deploy_health_check` | Health check manual de todos os serviços |
| `deploy_restart_service` | Restart de um serviço específico |

### 10.4 Workshop UI — Deploy Dashboard

- **Status de cada serviço**: verde (running) / vermelho (stopped) / amarelo (starting)
- **URLs clicáveis**: click → abre `www.DCsCreatedbyAI.pt` no browser
- **Logs de deploy**: step-by-step com timing
- **Health check**: indicador em tempo real (polling 10s)
- **Botão rollback**: reverter última versão
- **Processo completo**: "Gate 3 → Merge → Deploy → Live em www.DCsCreatedbyAI.pt"

---

## 11. ALTERAÇÕES NO MCP SERVER

| Ficheiro | Alteração |
|----------|-----------|
| `mcp-server/src/prompts/index.ts` | +6 system prompts (TAA, UTE, FBS enhanced, BBS, FDE enhanced, BDE enhanced) |
| `mcp-server/src/tools/index.ts` | +~65 tools novas (taa_*, ute_*, fbs_*, bbs_*, fde_*, bde_*, cicd_*, deploy_*, cqe_*, registry_*, validate_*) |
| `mcp-server/src/api/server.ts` | Rotas fase 2, pipeline config, parallel agent support, bug watcher init, CI/CD + deploy endpoints |
| `mcp-server/src/api/pipeline-fast.ts` | Consolidated prompts para novos agentes |
| `mcp-server/src/api/claude.ts` | Suporte para agentes paralelos (FDE+BDE simultâneo) |
| `mcp-server/src/jira/tools.ts` | Novas operações: read bugs, search by BDEV, update status, list MVPs, transition "In Production", bdevs-available |
| `mcp-server/src/jira/bug-watcher.ts` | **Novo:** Polling Jira para bugs novos → dispatch FBS/BBS + `trigger_bug_fix(jira_key)` manual |
| `mcp-server/src/git/` | **Novo módulo:** operações git (branch, checkout, commit, push, diff, merge) via simple-git |
| `mcp-server/src/cicd/pipeline.ts` | **Novo:** CI/CD pipeline engine (UTE + CQE + SonarQube + Contract validation) |
| `mcp-server/src/deploy/manager.ts` | **Novo:** Deploy manager (stop → build → start → health check → Jira update) |
| `mcp-server/src/deploy/services.ts` | **Novo:** Service registry — define `ManagedService` interface (§10.1) e array de serviços com PIDs, portas, health URLs, status |
| `mcp-server/nginx/nginx.conf` | **Novo:** Nginx reverse proxy config (custom URLs) |
| `mcp-server/docker-compose.yml` | **Novo:** Nginx + SonarQube + Keycloak containers |
| `mcp-server/keycloak/bctt-realm.json` | **Novo:** Keycloak realm config (users, clients, roles) |
| `mcp-server/data/contracts/` | **Novo:** Interface contracts gerados pelo TAA (JSON por BDEV) |
| `mcp-server/data/registry/` | **Novo:** Implementation Registry (o que já foi implementado) |
| `mcp-server/src/quality/` | **Novo módulo:** CQE — quality gates (lint, typecheck, DS imports, security) |
| `workshop-agent-factory/` | UI para agentes Fase 2, CI/CD dashboard, deploy status, MVP tracker, CQE reports |

---

## 12. WORKSHOP UI — ALTERAÇÕES FASE 2

### 12.1 Diagrama de Arquitectura Fase 2

Tal como a Fase 1 tem um diagrama SVG interactivo (FlowDiagram.tsx + GovernanceDiagram.tsx), a Fase 2 precisa do seu próprio diagrama. Acede-se pelo mesmo botão **"Ver Governação"** no cabeçalho da Fase 2.

**Ficheiro:** `workshop-agent-factory/src/data/governanceData.ts` — adicionar `phase2GovernanceData`

**Nodes do diagrama Fase 2:**
```
┌──────┐    ┌─────┐    ┌─────┐    ┌─────┐
│ User │───→│ TAA │───→│ FDE │───→│ UTE │──→┌────────┐
└──────┘    └──┬──┘    └─────┘    └──┬──┘   │ CI/CD  │
               │       ┌─────┐       │      └───┬────┘
               └──────→│ BDE │───────┘          │
                       └─────┘       ▲      ┌───┴────┐
                                     │      │ Deploy │
                      ┌────────┐     │      └────────┘
                      │FBS/BBS │─────┘
                      └────────┘ (re-test loop via UTE)
Externos: [Jira] [SonarQube] [Git]
```

**Nodes:**
| Node | Tipo | Cor |
|------|------|-----|
| User | external | cinzento |
| TAA | agent | azul |
| FDE | agent | verde |
| BDE | agent | verde escuro |
| UTE | agent | laranja |
| FBS | agent | vermelho |
| BBS | agent | vermelho escuro |
| CI/CD | system | roxo |
| Deploy | system | verde lima |
| Jira | external | azul Jira |
| SonarQube | external | azul claro |
| Git | external | laranja Git |

**Edges (com labels):**
- User → TAA: "Selecciona BDEV" (manual)
- TAA → FDE: "Spec + Contract" (auto, Gate 1)
- TAA → BDE: "Spec + Contract" (auto, Gate 1)
- FDE → UTE: "Feature branch" (auto, Gate 2)
- BDE → UTE: "Feature branch" (auto, Gate 2)
- UTE → FBS: "Frontend bugs" (condicional)
- UTE → BBS: "Backend bugs" (condicional)
- FBS → UTE: "Branch corrigido" (auto)
- BBS → UTE: "Branch corrigido" (auto)
- UTE → CI/CD: "Testes verdes" (auto)
- CI/CD → Deploy: "Pipeline verde" (auto, Gate 3)
- Deploy → User: "Live em www.DCsCreatedbyAI.pt" (auto)
- TAA ↔ Jira: "Lê BDEV, actualiza status"
- CI/CD ↔ SonarQube: "Quality scan"
- FDE/BDE ↔ Git: "Branches, commits"

**Governance rules Fase 2:**
- Gate 1: Aprovação da arquitectura (manual)
- Gate 2: Review do código + deploy preview (manual)
- Gate 3: Merge approval após CI/CD verde (manual)
- Gate MVP: Avançar para próximo MVP (manual)

**Ficheiros a alterar:**
- `workshop-agent-factory/src/data/governanceData.ts` — adicionar dados Fase 2
- `workshop-agent-factory/src/components/governance/FlowDiagram.tsx` — reutilizar (já é genérico)
- `workshop-agent-factory/src/components/governance/GovernanceDiagram.tsx` — reutilizar

### 12.2 Histórico de Projectos — Separação Fase 1 / Fase 2

O `ProjectHistoryPanel.tsx` actual mostra apenas projectos Fase 1 (BA→FA→DA→DSLA→PA). Precisa de ser extendido para suportar Fase 2.

**Alteração no ProjectHistoryPanel.tsx:**

```
┌─────────────────────────────┐
│  ┌──────────┐ ┌───────────┐ │
│  │ Fase 1   │ │ Fase 2    │ │   ← Tabs no topo do painel
│  │ Conceção │ │ Desenv.   │ │
│  └──────────┘ └───────────┘ │
│                             │
│  [+ Novo Pedido]            │   ← Fase 1: lança BA / Fase 2: lança TAA
│                             │
│  📋 BDEV00000011 - Saldos   │
│     ⏱ há 2h  ●●●●○         │   ← 5 dots (BA,FA,DA,DSLA,PA) Fase 1
│                             │      7 dots (TAA,FDE,BDE,UTE,CI/CD,Deploy,✓) Fase 2
│  📋 BDEV00000012 - Transf.  │
│     ⏱ há 1h  ●●○○○○○       │
│                             │
└─────────────────────────────┘
```

**Detalhes:**

1. **Tabs de fase** no topo do drawer:
   - Tab "Conceção" → mostra projectos Fase 1 (pipeline BA→PA)
   - Tab "Desenvolvimento" → mostra projectos Fase 2 (pipeline TAA→Deploy)

2. **"Novo Pedido" por fase:**
   - Fase 1: cria projecto e abre chat com **BA** (comportamento actual)
   - Fase 2: cria projecto e abre chat com **TAA** (novo)
   - Fase 2 pode listar BDEVs disponíveis (status "Ready for Development" no Jira)

3. **Pipeline View diferente por fase:**
   - Fase 1: BA → FA → DA → DSLA → PA (5 agents, vertical)
   - Fase 2: TAA → FDE+BDE → UTE → CI/CD → Deploy (com gates visuais)
   - Fase 2 inclui indicadores de Gate (ícone cadeado verde/vermelho)
   - Fase 2 mostra MVP actual (MVP1/MVP2/MVP3)

4. **Progress dots:**
   - Fase 1: 5 dots (BA, FA, DA, DSLA, PA) — como actual
   - Fase 2: 7 dots (TAA, FDE, BDE, UTE, CI/CD, Deploy, ✓)

5. **Acções adicionais Fase 2:**
   - "Ver CI/CD Report" — abre dashboard CI/CD
   - "Ver Deploy" — abre painel de deploy
   - "Abrir www.DCsCreatedbyAI.pt" — link para app live

**Ficheiros a alterar:**
- `workshop-agent-factory/src/components/interactions/ProjectHistoryPanel.tsx`
- `workshop-agent-factory/src/hooks/useProjectHistory.ts` — suportar projectos Fase 2
- `workshop-agent-factory/src/data/agents.ts` — actualizar agentes Fase 2

### 12.3 Agentes Fase 2 no agents.ts

Os agentes actuais da Fase 2 (`agents.ts`) são: FDA, BDA, FBS, UTE, LTE, CQA. Precisam de ser actualizados para:

| Sigla actual | Nova sigla | Nome |
|-------------|-----------|------|
| — (novo) | TAA | Technical Architecture Agent |
| FDA | FDE | Frontend Dev Agent |
| BDA | BDE | Backend Dev Agent |
| UTE | UTE | Unit Test Executor |
| FBS | FBS | Frontend Bug Solver |
| — (novo) | BBS | Backend Bug Solver |
| CQA (remover) | — | Substituído por CI/CD pipeline |
| LTE (remover) | — | Absorvido pelo UTE |

### 12.4 Novos Painéis no Workshop UI

Além do diagrama e histórico, adicionar painéis visuais:

1. **CI/CD Dashboard** — steps com status, timing, logs (via SSE)
2. **Deploy Dashboard** — status dos serviços, health, URLs clicáveis
3. **MVP Tracker** — progresso por MVP (MVP1: 5/5 US done, MVP2: 2/8 in progress)
4. **Gate Status** — estado de cada gate por BDEV (Gate 1 ✓, Gate 2 ✓, Gate 3 ⏳)

---

## 13. ORDEM DE EXECUÇÃO (Batches)

### Batch 0: Pré-requisitos (Ambiente)
**Objectivo:** Instalar ferramentas e configurar URLs custom.

1. Instalar **Docker Desktop** para Windows
2. Instalar **Java 17+** (JDK, ex: Eclipse Temurin / Adoptium) — necessário para `sonarqube-scanner` CLI
3. Configurar **hosts file** (`C:\Windows\System32\drivers\etc\hosts`) com URLs custom (7 entradas)
4. Criar `docker-compose.yml` com **Nginx + SonarQube + Keycloak**: `docker compose up -d`
5. Configurar projecto no SonarQube (token, project keys)
6. Instalar `sonarqube-scanner` globalmente: `npm install -g sonarqube-scanner`
7. Verificar URLs: `www.DCsCreatedbyAI.pt`, `sonarqube.DCsCreatedbyAI.pt`, etc.
8. **Jira workflow:** Criar 5 custom statuses no projecto BCTT (requer Jira Admin): Ready for Development, In Development, Ready for Testing, In Testing, In Production

### Batch 1: Scaffolding dos Projectos Base
**Objectivo:** Criar os 5 projectos com estrutura, BD, APIs, e a CJ de login.

1. Criar `TestAgentFactoryCore` — SQLite schema + APIs REST + backoffice + eventos Socket.IO
2. Criar `TestAgentFactoryMiddleware` — Express + http-proxy-middleware + routing para Core APIs
3. Criar `TestAgentFactoryDigitalChannels` — React frontend (login + landing) + BFF microservices
4. Verificar fluxo completo: Login → Landing → Saldos → Movimentos (via Middleware → Core)
5. Git init em cada projecto: criar branches `main` e `base`
6. **CJ Base via BA:** Descrever funcionalidade de login + landing page → pipeline Fase 1 gera spec

### Batch 2: Infra-estrutura de Agentes Fase 2
**Objectivo:** Adicionar os 6 agentes ao MCP server.

1. Módulo git (`mcp-server/src/git/`) — branch, checkout, commit, push, diff
2. System prompts para TAA, UTE, FBS, BBS, FDE, BDE
3. MCP tools para cada agente
4. Pipeline config (downstream, upstream, parallel support)
5. Fast pipeline prompts
6. Testar cada agente individualmente

### Batch 3: WithErrors + UnitTest + Bug Watcher
**Objectivo:** Criar os projectos de teste e erros, e activar bug watcher.

1. Copiar DigitalChannels → WithErrors com 6 erros intencionais
2. Criar 6 bug stories no Jira (labels: frontend-bug / backend-bug) com descrição detalhada
3. Criar UnitTest com testes base (login, saldos, movimentos)
4. Integrar UTE com vitest execution
5. Implementar `bug-watcher.ts` no MCP server (polling Jira cada 30s)
6. Testar fluxo: criar bug no Jira → bug watcher detecta → FBS/BBS arranca → cria branch → fix → UTE re-testa

### Batch 4: Workshop UI Fase 2
**Objectivo:** Interface do Workshop para Fase 2 com diagrama, histórico, e dashboards.

1. Actualizar `agents.ts` — novos agentes Fase 2 (TAA, FDE, BDE, UTE, FBS, BBS)
2. Adicionar `phase2GovernanceData` em `governanceData.ts` — diagrama SVG Fase 2
3. Actualizar `ProjectHistoryPanel.tsx` — tabs Fase 1 / Fase 2, "Novo Pedido" lança TAA
4. Workshop UI: CI/CD dashboard + Deploy status panel + MVP tracker + Gate status
5. Configurar Nginx reverse proxy (nginx.conf + docker-compose)

### Batch 5: CI/CD + Deploy + Integração End-to-End
**Objectivo:** Pipeline completo Fase 1 + Fase 2 com CI/CD e deploy.

1. Implementar `mcp-server/src/cicd/pipeline.ts` — CI/CD engine (UTE + CQE + SonarQube + Contract)
2. Implementar `mcp-server/src/deploy/manager.ts` — Deploy manager (stop → build → start → health)
3. Pipeline completo: BA → FA → DA → DSLA → PA → TAA → FDE+BDE → CI/CD → Merge → Deploy
4. Verificar: funcionalidade live em `www.DCsCreatedbyAI.pt`
5. Testar rollback
6. Testar MVP progression (MVP1 → pergunta → MVP2 → repeat)

---

## 14. DECISÕES TÉCNICAS

| Decisão | Escolha | Justificação |
|---------|---------|-------------|
| BD | SQLite (better-sqlite3) | Zero-config, SQL completo, ficheiro local |
| Middleware | Express + http-proxy-middleware | Leve, Node.js nativo, API routing+auth. express-gateway está deprecated desde 2021 |
| Real-time | Socket.IO server + client | Equivalente Node.js ao SignalR (Hub/Events pattern idêntico). O `@microsoft/signalr` exige ASP.NET server — usamos Socket.IO com a mesma arquitectura |
| Git ops | simple-git (npm) | API Node.js para git, usado pelas tools dos agentes |
| Testes | Vitest + @testing-library/react + supertest | Standard React/Node testing stack |
| Projectos | Repos git separados | Cada projecto independente, como em produção |
| Bug trigger | MCP Server polling (bug-watcher) | Usa Jira client existente. setInterval 30s. Zero config externa, sem ngrok |
| Quality gates | ESLint (pre-commit) + SonarQube CE (post-merge) | Híbrido: rápido no dev loop + análise completa no dashboard |
| SonarQube | Community Edition via Docker (porta 9000) | Gratuito, dashboard real, JS/TS nativo. Requer Docker + Java 17 |
| CI/CD | Custom no MCP server (não Jenkins/Gitea) | Já temos 90% da infra (pipelines, SSE, process spawn). Integração perfeita. Mais impacto visual para demo |
| Deploy | Deploy Manager custom no MCP server | Gestão de processos, health checks, rollback. Reutiliza padrão do pa_deploy_prototype |
| Reverse proxy | Nginx (Docker) | Leve, config simples, suporta subdomínios. Permite URLs custom (www.DCsCreatedbyAI.pt) |
| Custom URLs | Hosts file + Nginx | `www.DCsCreatedbyAI.pt` → localhost via hosts file. Nginx redireciona para portas correctas |
| Identity Provider | Keycloak (Docker) | Standard bancário (Red Hat/CNCF). Admin console, OIDC, OAuth2. Free, self-hosted |
| Modelos AI | Mix Opus+Sonnet+Haiku | Opus para agentes críticos (BA,TAA,FDE,BDE,DSLA), Sonnet para estruturados (FA,DA,PA,FBS,BBS), Haiku para mecânicos (UTE). -24% tempo total |

---

## 15. VERIFICAÇÃO POR BATCH

### Batch 0
- [ ] Docker Desktop instalado e a correr
- [ ] `docker compose up -d` → Nginx (80) + SonarQube (9000) + Keycloak (8080) a correr
- [ ] Hosts file configurado (7 entradas: www/fix/backoffice/api/sonarqube/auth/workshop)
- [ ] Jira: 5 custom statuses criados no workflow (Ready for Development, In Development, Ready for Testing, In Testing, In Production)
- [ ] SonarQube acessível em `sonarqube.DCsCreatedbyAI.pt`, token gerado
- [ ] Keycloak acessível em `auth.DCsCreatedbyAI.pt`, realm "bctt" importado, users seed criados
- [ ] `start-demo.bat` e `stop-demo.bat` criados
- [ ] Implementation Registry inicializado (estado BASE)
- [ ] Plano guardado em `c:\Rodrigo\TestFabricDesignSystem\Deliverables\Fase2-Plano.md`

### Batch 1
- [ ] Core: `npm start` → backoffice React acessível, CRUD funcional
- [ ] Core: Seed data populada (3 clientes, 4 contas, 5 movimentos)
- [ ] Core: Login com `admin@bctt.pt` / `admin1234` no backoffice
- [ ] Core: Introduzir movimento via backoffice → evento Socket.IO emitido → visível no Monitor
- [ ] Core: Mudar status conta (no_access/readonly/fullaccess) → evento emitido
- [ ] Middleware: proxy funcional Core→DigitalChannels (Express + http-proxy-middleware)
- [ ] DigitalChannels: login com `joao@exemplo.pt` / `demo1234` → landing → ver saldos e movimentos
- [ ] Branches `main` e `base` em cada repo
- [ ] `start-demo.bat` arranca todos os serviços sem erros

### Batch 2
- [ ] Cada agente responde via `/chat/stream`
- [ ] TAA lê BDEV do Jira, agrupa US por MVP, produz spec técnica para MVP1
- [ ] TAA gera Interface Contract (JSON) e guarda em `data/contracts/`
- [ ] TAA actualiza estado do Epic no Jira ("In Development")
- [ ] FDE e BDE executam em paralelo (Promise.all) após Gate 1
- [ ] FDE usa `fde_check_ds_catalog` para verificar componentes DS (sem bridge DSLA)
- [ ] FDE/BDE lêem contrato e criam branches
- [ ] UTE corre testes e gera report
- [ ] Gate MVP funciona: pergunta se quer avançar para MVP2
- [ ] Transição Fase 1→2: lista BDEVs "Ready for Development" no Workshop UI

### Batch 3
- [ ] WithErrors: 6 erros verificáveis nos testes
- [ ] 6 bugs criados no Jira com labels correctas
- [ ] UnitTest: vitest executa com report JSON
- [ ] Bug watcher activo (polling 30s) e a detectar bugs novos
- [ ] Criar bug no Jira → bug watcher detecta → FBS/BBS arranca automaticamente
- [ ] FBS corrige frontend, BBS corrige backend, devolvem branch ao UTE
- [ ] FBS/BBS actualizam Jira para "Development Completed" ao criar feature branch
- [ ] Dual browser: main (5173) vs feature branch (5174) para comparação visual
- [ ] UTE on-demand: `POST /tests/run-on-demand` funcional via Workshop UI

### Batch 4
- [ ] Agentes Fase 2 actualizados em `agents.ts` (TAA, FDE, BDE, UTE, FBS, BBS)
- [ ] Diagrama Fase 2 visível no Workshop UI (botão "Ver Governação")
- [ ] Histórico separado Fase 1 / Fase 2 (tabs no ProjectHistoryPanel)
- [ ] "Novo pedido" na Fase 1 lança BA, na Fase 2 lança TAA
- [ ] Pipeline View Fase 2: TAA → FDE+BDE → UTE → CI/CD → Deploy (com gates)
- [ ] CI/CD dashboard, Deploy dashboard, MVP tracker visíveis
- [ ] Nginx reverse proxy + hosts file → URLs custom acessíveis

### Batch 5
- [ ] CI/CD pipeline executa: UTE → CQE → SonarQube → Contract validation → Coverage
- [ ] Deploy manager: stop → merge → build → start → health check
- [ ] URLs custom funcionais: `www.DCsCreatedbyAI.pt` → DigitalChannels
- [ ] Rollback funcional (deploy_rollback)
- [ ] Pipeline completo Fase 1→2 com gates + CI/CD + deploy
- [ ] TAA executa MVP1 → Gate 1 → FDE+BDE (paralelo) → Gate 2 → CI/CD → Gate 3 → Deploy
- [ ] TAA anexa "MVP1 Technical Analysis" ao Epic no Jira
- [ ] TAA transiciona Features e US do MVP para "In Progress" no Jira
- [ ] Após MVP1 → pergunta "Avançar para MVP2?" → repete ciclo
- [ ] Interface Contract respeitado por FDE e BDE
- [ ] Erros detectados e corrigidos automaticamente (FBS/BBS)
- [ ] Estado Jira actualizado em cada etapa (incluindo "In Production")
- [ ] Funcionalidade live em `www.DCsCreatedbyAI.pt` após deploy
- [ ] `start-demo.bat` arranca tudo e demo corre sem problemas
- [ ] SonarQube dashboard mostra análise real do código
- [ ] Demo completa (opção rápida ~15 min) funcional

---

## 16. PREPARAÇÃO PARA DEMO

### 16.1 Tabela de Portas (Centralizada)

| Porta | Serviço | Projecto |
|-------|---------|----------|
| 80 | Nginx reverse proxy (Docker) | docker-compose |
| 3000 | Workshop Agent Factory (webapp) | workshop-agent-factory |
| 3001 | MCP API Server (Express + SSE) | mcp-server |
| 4001 | Core API + Socket.IO | TestAgentFactoryCore |
| 4002 | Core Backoffice (React SPA) | TestAgentFactoryCore |
| 4010 | Middleware API Gateway | TestAgentFactoryMiddleware |
| 4020 | DigitalChannels BFF (Express) | TestAgentFactoryDigitalChannels |
| 5173 | DigitalChannels Frontend (Vite) | TestAgentFactoryDigitalChannels |
| 5174 | Deploy Preview (feature branch) | Temporário (Gate 2) |
| 8080 | Keycloak Identity Provider (Docker) | docker-compose |
| 9000 | SonarQube Dashboard (Docker) | docker-compose |

### 16.2 Script de Arranque (`start-demo.bat`)

Um script único que arranca **todos os serviços** na ordem correcta:

**Ficheiro:** `start-demo.bat` (raiz do workspace)

```bat
@echo off
echo === AGENT FACTORY DEMO — Starting all services ===
echo.

REM 1. Docker (Nginx + SonarQube + Keycloak)
echo [1/7] Starting Docker containers (Nginx + SonarQube + Keycloak)...
cd /d c:\Rodrigo\TestFabricDesignSystem\Test-BCTT-Agent-Factory-MCPServer\mcp-server
docker compose up -d
timeout /t 5 >nul

REM 2. Core API + Socket.IO
echo [2/8] Starting Core API + Socket.IO (4001)...
start "Core API" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\TestAgentFactoryCore && npm start"
timeout /t 3 >nul

REM 3. Core Backoffice (React SPA)
echo [3/8] Starting Core Backoffice (4002)...
start "Core Backoffice" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\TestAgentFactoryCore && npm run dev:backoffice"
timeout /t 2 >nul

REM 4. Middleware
echo [4/8] Starting Middleware (API Gateway:4010)...
start "Middleware" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\TestAgentFactoryMiddleware && npm start"
timeout /t 2 >nul

REM 5. DigitalChannels BFF
echo [5/8] Starting DigitalChannels BFF (4020)...
start "DC BFF" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\TestAgentFactoryDigitalChannels && npm run start:bff"
timeout /t 2 >nul

REM 6. DigitalChannels Frontend
echo [6/8] Starting DigitalChannels Frontend (5173)...
start "DC Frontend" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\TestAgentFactoryDigitalChannels && npm run dev"
timeout /t 2 >nul

REM 7. MCP Server
echo [7/8] Starting MCP API Server (3001)...
start "MCP Server" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\Test-BCTT-Agent-Factory-MCPServer\mcp-server && npm start"
timeout /t 2 >nul

REM 8. Workshop UI
echo [8/8] Starting Workshop Agent Factory (3000)...
start "Workshop" cmd /c "cd /d c:\Rodrigo\TestFabricDesignSystem\Test-BCTT-Agent-Factory-MCPServer\workshop-agent-factory && npm run dev"
timeout /t 3 >nul

echo.
echo === All services started! ===
echo.
echo   Workshop:         http://workshop.DCsCreatedbyAI.pt
echo   DigitalChannels:  http://www.DCsCreatedbyAI.pt
echo   Backoffice:       http://backoffice.DCsCreatedbyAI.pt
echo   API Gateway:      http://api.DCsCreatedbyAI.pt
echo   SonarQube:        http://sonarqube.DCsCreatedbyAI.pt
echo   Keycloak:         http://auth.DCsCreatedbyAI.pt
echo.
pause
```

**Stop script:** `stop-demo.bat`
```bat
@echo off
echo === Stopping all services ===
taskkill /FI "WINDOWTITLE eq Core API" /F 2>nul
taskkill /FI "WINDOWTITLE eq Core Backoffice" /F 2>nul
taskkill /FI "WINDOWTITLE eq Middleware" /F 2>nul
taskkill /FI "WINDOWTITLE eq DC BFF" /F 2>nul
taskkill /FI "WINDOWTITLE eq DC Frontend" /F 2>nul
taskkill /FI "WINDOWTITLE eq MCP Server" /F 2>nul
taskkill /FI "WINDOWTITLE eq Workshop" /F 2>nul
cd /d c:\Rodrigo\TestFabricDesignSystem\Test-BCTT-Agent-Factory-MCPServer\mcp-server
docker compose down
echo === All services stopped ===
pause
```

### 16.3 Seed Data (Core BD)

O Core arranca com dados pré-populados para a demo não começar numa base vazia:

**Ficheiro:** `TestAgentFactoryCore/src/db/seed.ts`

```typescript
// Executado automaticamente no primeiro arranque (se BD vazia)
const SEED_DATA = {
  clients: [
    { id: 'CLI001', name: 'João Silva', nif: '123456789', email: 'joao@exemplo.pt' },
    { id: 'CLI002', name: 'Maria Santos', nif: '987654321', email: 'maria@exemplo.pt' },
    { id: 'CLI003', name: 'Pedro Costa', nif: '456789123', email: 'pedro@exemplo.pt' },
  ],
  accounts: [
    { id: 'ACC001', clientId: 'CLI001', iban: 'PT50003500001234567890123', type: 'checking', status: 'fullaccess', balance: 2500.00 },
    { id: 'ACC002', clientId: 'CLI001', iban: 'PT50003500009876543210987', type: 'savings', status: 'readonly', balance: 15000.00 },
    { id: 'ACC003', clientId: 'CLI002', iban: 'PT50003500005555666677778', type: 'checking', status: 'fullaccess', balance: 4200.50 },
    { id: 'ACC004', clientId: 'CLI003', iban: 'PT50003500001111222233334', type: 'checking', status: 'no_access', balance: 800.00 },
  ],
  movements: [
    { accountId: 'ACC001', type: 'credit', amount: 2500.00, date: '2026-02-01', description: 'Vencimento Janeiro' },
    { accountId: 'ACC001', type: 'debit', amount: 85.50, date: '2026-02-03', description: 'Pagamento EDP' },
    { accountId: 'ACC001', type: 'debit', amount: 127.30, date: '2026-02-05', description: 'Supermercado Continente' },
    { accountId: 'ACC003', type: 'credit', amount: 1250.00, date: '2026-02-01', description: 'Transferência recebida' },
    { accountId: 'ACC003', type: 'debit', amount: 45.00, date: '2026-02-04', description: 'Spotify Premium' },
  ],
};
```

### 16.4 Credenciais de Login

| Utilizador | Password | Perfil | Notas |
|-----------|----------|--------|-------|
| `joao@exemplo.pt` | `demo1234` | Cliente completo (2 contas, fullaccess+readonly) | Default para demo |
| `maria@exemplo.pt` | `demo1234` | Cliente simples (1 conta, fullaccess) | |
| `pedro@exemplo.pt` | `demo1234` | Cliente sem acesso (conta no_access) | Para testar permissões |
| `admin@bctt.pt` | `admin1234` | Administrador backoffice | Para backoffice.DCsCreatedbyAI.pt |

### 16.5 Configuração Inicial SonarQube

Após `docker compose up -d` e primeiro acesso a `sonarqube.DCsCreatedbyAI.pt`:

1. **Login inicial:** admin / admin → forçado a mudar password → `sonar1234`
2. **Criar token:** My Account → Security → Generate Token → nome: `agent-factory` → copiar token
3. **Criar projectos:**
   - TestAgentFactoryCore (key: `agent-factory-core`)
   - TestAgentFactoryMiddleware (key: `agent-factory-middleware`)
   - TestAgentFactoryDigitalChannels (key: `agent-factory-dc`)
4. **Guardar token** em `mcp-server/.env`:
   ```
   SONAR_TOKEN=squ_xxxxxxxxxxxxxxxxxxxxxxxxxx
   SONAR_HOST_URL=http://localhost:9000
   ```
5. **Quality Gate custom:** Settings → Quality Gates → criar "Agent Factory" com:
   - Coverage ≥ 80%
   - Duplications ≤ 3%
   - Bugs = 0 (blocker/critical)
   - Vulnerabilities = 0

### 16.6 Inicialização do Implementation Registry

No **primeiro arranque** (antes de qualquer BDEV implementado), o Registry começa vazio mas com a estrutura dos projectos:

**Ficheiro:** `mcp-server/data/registry/implementation-registry.json` (initial state)

```json
{
  "lastUpdated": null,
  "projects": {
    "digitalChannels": {
      "routes": [
        { "path": "/login", "component": "LoginPage", "bdev": "BASE" },
        { "path": "/", "component": "LandingPage", "bdev": "BASE" }
      ],
      "components": [],
      "services": ["auth-service"]
    },
    "middleware": {
      "apis": [
        { "method": "POST", "path": "/api/v1/auth/login", "bdev": "BASE" }
      ]
    },
    "core": {
      "tables": ["clients", "accounts", "movements", "balances", "digital_access"],
      "events": ["movement.created", "balance.updated", "account.status.changed", "digital_access.created"]
    }
  },
  "bdevs": []
}
```

O `bdev: "BASE"` indica funcionalidades que foram criadas no scaffolding (Batch 1), não por agentes. Quando o primeiro BDEV é implementado, as novas rotas/APIs são adicionadas com o código BDEV real.

---

## 17. MECANISMOS DE LIGAÇÃO (Detalhes Técnicos)

### 17.1 Transição Fase 1 → Fase 2

Quando a Fase 1 termina (PA completo), o BDEV no Jira fica com status **"Ready for Development"**. A transição para a Fase 2 é **manual** (o utilizador escolhe):

```
Fase 1 concluída → BDEV status "Ready for Development" no Jira
        │
        ▼
Workshop UI (Fase 2 tab) → botão "Novo Pedido"
        │
        ▼
Lista BDEVs disponíveis (JQL: status="Ready for Development")
        │
        ▼
Utilizador selecciona BDEV → abre chat com TAA
        │
        ▼
TAA lê BDEV do Jira → agrupa por MVP → spec arquitectura
```

**Implementação:**
- **API endpoint:** `GET /jira/bdevs-available` — retorna BDEVs com status "Ready for Development"
- **Workshop UI:** No "Novo Pedido" da Fase 2, antes de abrir o chat, mostra dropdown/lista dos BDEVs disponíveis
- **Handoff data:** Ao iniciar Fase 2, o TAA recebe: `{ bdevKey: "BCTT-XX", phase: "phase2" }` — sabe que deve ler o BDEV do Jira e começar pelo MVP1

**O que o TAA herda da Fase 1:**
1. Epic completo no Jira (com Features + User Stories com labels MVP1/MVP2/MVP3)
2. Wireframes do DA (guardados no projecto ou como Jira attachments)
3. Componentes DS criados pelo DSLA (já no `bctt-design-system`)
4. Protótipo do PA (para referência visual)
5. Implementation Registry (para saber o que já existe)

### 17.2 Execução Paralela FDE + BDE

Após Gate 1 (arquitectura aprovada), o TAA despacha FDE e BDE **em paralelo**. Isto requer alterações no `claude.ts`:

**Mecanismo no `pipeline.ts` / `server.ts`:**

```typescript
// Após Gate 1 aprovado:
async function dispatchParallelAgents(bdev: string, mvp: string, contract: InterfaceContract) {
  // Criar 2 conversas independentes
  const fdeConversation = await startAgentSession('fde', {
    bdev,
    mvp,
    contract,
    project: 'TestAgentFactoryDigitalChannels',
    focus: 'frontend',
  });

  const bdeConversation = await startAgentSession('bde', {
    bdev,
    mvp,
    contract,
    project: ['TestAgentFactoryDigitalChannels', 'TestAgentFactoryMiddleware', 'TestAgentFactoryCore'],
    focus: 'backend',
  });

  // Esperar ambos terminarem (Promise.all)
  const [fdeResult, bdeResult] = await Promise.all([
    waitForAgentCompletion(fdeConversation.id),
    waitForAgentCompletion(bdeConversation.id),
  ]);

  // SSE streaming: progresso de ambos intercalado no Workshop UI
  // Cada agente tem a sua própria secção no pipeline view

  return { fdeResult, bdeResult };
}
```

**No Workshop UI:**
- Pipeline view mostra FDE e BDE lado a lado (não sequencial)
- Cada um com o seu progress indicator
- Gate 2 só abre quando **ambos** terminarem

**Nota:** Os agentes não interagem directamente entre si. Ambos seguem o Interface Contract — que é o "acordo tácito". Se um terminar antes do outro, espera.

### 17.3 Componentes DS — Abordagem DA-Driven (sem bridge FDE↔DSLA)

O FDE e o DSLA **não comunicam directamente**. O fluxo é:

```
Fase 1 (já feita antes da Fase 2):
  DA gera wireframes → lista componentes necessários por ecrã
        │
        ▼
  DSLA recebe lista do DA → cria cada componente no bctt-design-system
  (AccountCard, MovementList, FilterChip, etc.)
        │
        ▼
  DSLA faz build do design-system
        │
        ▼
  PA monta protótipo usando componentes do DS

Fase 2 (FDE apenas consome):
  FDE lê wireframes do DA → sabe quais componentes usar
        │
        ▼
  FDE chama `fde_check_ds_catalog("AccountCard")` → "existe ✓"
        │
        ▼
  FDE importa: import { AccountCard } from '@bctt/design-system'
```

**Princípio:** Quando a Fase 2 começa, **todos os componentes necessários já existem no DS** (criados pelo DSLA na Fase 1). O FDE é um consumidor, não um criador.

**Se faltar um componente (edge case):**
1. O FDE usa os componentes MUI re-exportados do `bctt-design-system/src/index.ts` (Box, Typography, Stack, etc.)
2. O `rewriteImports` (Fix 32) serve como safety net no build
3. Após o pipeline, o DSLA pode ser corrido manualmente se necessário

**Tool `fde_request_ds_component` REMOVIDA** — não é necessária. A tool `fde_check_ds_catalog` mantém-se para verificação.

### 17.4 Estimativa de Tempo da Demo

| Fase | Modo Normal | Modo Fast | Notas |
|------|-------------|-----------|-------|
| Fase 1 completa (BA→PA) | ~25 min | ~10 min | Já testado |
| Gate 1 (TAA spec) | ~5 min | ~3 min | Inclui interacção humana |
| Gate 2 (FDE+BDE paralelo) | ~15 min | ~8 min | Depende da complexidade |
| CI/CD Pipeline | ~2-3 min | ~2-3 min | Automatizado |
| Gate 3 + Deploy | ~1-2 min | ~1-2 min | Automatizado |
| **Total Fase 2 (1 MVP)** | **~25 min** | **~15 min** | |
| **Total End-to-End (F1+F2)** | **~50 min** | **~25 min** | |

**Estratégias para demo mais rápida:**
1. **Pré-baked Fase 1:** Ter um BDEV já concluído no Jira (Fase 1 feita previamente). Demo começa na Fase 2 directamente → ~15 min
2. **Fast mode:** Usar `fast=true` no pipeline (single-call por agente, ~50% mais rápido)
3. **MVP1 minimal:** Primeira demo com apenas 2-3 US no MVP1 (menos código para gerar)
4. **Skip gates na demo:** Aprovar gates imediatamente (utilizador já sabe o que vai ver)

### 17.5 Guia de Demo (Passo a Passo)

**Preparação (antes da demo):**
1. Correr `start-demo.bat` — verificar todos os serviços a correr
2. Abrir `workshop.DCsCreatedbyAI.pt` — verificar Workshop UI funcional
3. Verificar `sonarqube.DCsCreatedbyAI.pt` — SonarQube acessível
4. Verificar `www.DCsCreatedbyAI.pt` — app DigitalChannels com login funcional
5. Login com `joao@exemplo.pt` / `demo1234` — verificar saldos e movimentos visíveis
6. No backoffice (`backoffice.DCsCreatedbyAI.pt`) — verificar CRUD funcional
7. Ter um BDEV pré-concluído (Fase 1) no Jira para começar Fase 2 directamente

**Demo Flow (opção rápida — ~15 min):**

| Passo | Acção | O que mostrar | Tempo |
|-------|-------|--------------|-------|
| 1 | Workshop UI → Fase 2 → "Novo Pedido" | Lista de BDEVs disponíveis | 30s |
| 2 | Seleccionar BDEV | TAA lê do Jira, mostra US agrupadas por MVP | 2 min |
| 3 | TAA gera spec + Interface Contract | Spec técnica + contrato JSON | 3 min |
| 4 | Aprovar Gate 1 | Click "Aprovar Arquitectura" | 10s |
| 5 | FDE + BDE em paralelo | Progress bars lado a lado, código a ser escrito | 5 min |
| 6 | Aprovar Gate 2 | Ver diff, deploy preview em porta 5174 | 1 min |
| 7 | CI/CD automático | Pipeline visual: UTE ✓ CQE ✓ SonarQube ✓ | 2 min |
| 8 | Aprovar Gate 3 | Click "Merge" | 10s |
| 9 | Deploy automático | Serviços reiniciam, health checks verdes | 1 min |
| 10 | Abrir `www.DCsCreatedbyAI.pt` | Nova funcionalidade live! | 30s |

**Demo Flow (opção completa — ~50 min):**
- Começa no BA: descrever ideia de negócio
- Mostra Fase 1 completa (BA → FA → DA → DSLA → PA)
- Mostra protótipo no browser
- Transição para Fase 2 (seleccionar BDEV)
- Pipeline completo com gates
- Funcionalidade live no final

**Localização do guia:** Ficheiro `DEMO-GUIDE.md` na raiz do workspace (`c:\Rodrigo\TestFabricDesignSystem\DEMO-GUIDE.md`). Também acessível no Workshop UI via botão "Guia de Demo" no header.

---

## 18. IDENTITY PROVIDER — KEYCLOAK (Docker)

### 18.1 Porquê Keycloak

| Critério | Keycloak | Alternativas descartadas |
|----------|----------|--------------------------|
| **Credibilidade** | Standard da indústria bancária (Red Hat/CNCF) | Supertokens, Logto, Casdoor — menos conhecidos em banca |
| **Custo** | 100% free, open-source (Apache 2.0) | Todos free, mas Keycloak é o mais completo |
| **Admin Console** | UI completa para gestão de utilizadores/roles/sessões | Fundamental para demo no backoffice |
| **Protocolos** | OIDC, OAuth2, SAML 2.0 | Enterprise-ready |
| **Docker** | `quay.io/keycloak/keycloak:latest` — ~512MB RAM | Single container |
| **Node.js** | `keycloak-connect` (Express middleware) + Admin REST API | Integração directa com BFF |

### 18.2 Arquitectura de Autenticação

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│ DC Frontend │────→│ DC BFF (4020)│────→│ Keycloak │
│   (5173)    │     │  keycloak-   │     │  (8080)  │
│  Login form │←────│  connect     │←────│  OIDC    │
└─────────────┘     └──────┬───────┘     └──────────┘
                           │ JWT
                    ┌──────┴───────┐
                    │ Middleware   │  ← JWT validation (jose/jwks)
                    │   (4010)    │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  Core API   │
                    │   (4001)    │
                    └─────────────┘
```

**Fluxo de Login:**
1. Utilizador acede a `www.DCsCreatedbyAI.pt/login`
2. Frontend envia username+password ao BFF (`POST /api/auth/login`)
3. BFF autentica via Keycloak OIDC (`POST /realms/bctt/protocol/openid-connect/token`)
4. Keycloak valida credenciais → retorna `access_token` + `refresh_token` (JWT)
5. BFF cria sessão (httpOnly cookie) e retorna dados do utilizador ao frontend
6. Requests subsequentes: BFF envia JWT no header → Middleware valida via JWKS → Core processa

### 18.3 Customer Journey — Login + Definição de Acesso Digital

**No Backoffice (Core — `backoffice.DCsCreatedbyAI.pt`):**

```
Admin acede ao Backoffice → secção "Clientes"
    │
    ├── Seleccionar cliente → tab "Acesso Digital"
    │
    ├── Formulário "Definir Acesso aos Canais Digitais":
    │   ├── Username (email do cliente, pré-preenchido)
    │   ├── Password temporária (gerar automática ou definir manual)
    │   ├── Nível de acesso: [Consulta | Operações | Administração]
    │   ├── Canais activos: [☑ Web] [☑ Mobile] [☐ API]
    │   ├── Autenticação forte (SCA): [Password] [Password + OTP] [Biometria]
    │   └── Limites: transferências (€), pagamentos (€), por dia
    │
    └── Ao gravar:
        ├── Core cria registo na tabela `digital_access`
        ├── Core chama Keycloak Admin REST API → cria user no realm "bctt"
        │   (com roles baseados no nível de acesso)
        ├── Evento Socket.IO: `digital_access.created`
        └── (Opcional) Keycloak envia email de activação
```

**Tabela nova no Core:** `digital_access`
```sql
CREATE TABLE digital_access (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  username TEXT UNIQUE NOT NULL,
  access_level TEXT CHECK(access_level IN ('consultation','operations','administration')),
  channels TEXT DEFAULT '["web"]',
  auth_type TEXT DEFAULT 'password',
  sca_enabled INTEGER DEFAULT 0,
  transfer_limit REAL DEFAULT 5000.00,
  payment_limit REAL DEFAULT 2000.00,
  daily_limit REAL DEFAULT 10000.00,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','blocked','pending')),
  keycloak_user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 18.4 Configuração Keycloak (Docker)

**Adicionar ao `docker-compose.yml`:**
(Já incluído no docker-compose em §10.2 — ver bloco principal com `start-dev --import-realm`)

**Hosts file + Nginx:** Já incluídos em §10.2 — `auth.DCsCreatedbyAI.pt` → porta 8080 (com proxy headers para X-Forwarded-For/Proto).

**Realm "bctt" pré-configurado** (`mcp-server/keycloak/bctt-realm.json`):
- Realm: `bctt`
- Clients: `digital-channels` (OIDC, confidential), `backoffice` (OIDC)
- Roles: `consultation`, `operations`, `administration`
- Seed users: joao/maria/pedro (mesmos do §16.4)
- Password policy: mínimo 8 chars (para demo ser simples)

### 18.5 Esta CJ como Primeira Experiência BA

A Customer Journey de **Login + Definição de Acesso Digital** será a **primeira funcionalidade** do pipeline. Motivo:
- É a base — sem login, nada funciona
- Toca todos os projectos (Core BD, Keycloak, Middleware JWT, DC login page)
- Demonstra o fluxo completo end-to-end
- Inclui backoffice (definir acesso) + frontend (login) + integração IdP

**Sequência proposta:**
1. **Batch 0+1:** Scaffolding + Keycloak Docker + seed data
2. **BA lançado com:** "Quero criar a CJ de Login e Definição de Acesso Digital para canais web"
3. **Fase 1:** BA → FA → DA → DSLA → PA
4. **Fase 2:** TAA → FDE+BDE → UTE → CI/CD → Deploy
5. **Resultado:** Login funcional em `www.DCsCreatedbyAI.pt` com Keycloak

---

## 19. MODELOS AI POR AGENTE

### 19.1 Análise de Modelos Disponíveis

Todos os agentes correm via **Claude Code CLI** (Max plan). Modelos disponíveis:

| Modelo | ID | Velocidade | Raciocínio | Código | Custo (Max) |
|--------|-----|-----------|------------|--------|-------------|
| **Claude Opus 4.6** | `claude-opus-4-6` | Lento (~30s/resp) | Excelente | Excelente | Incluído |
| **Claude Sonnet 4.5** | `claude-sonnet-4-5-20250929` | Rápido (~8s/resp) | Muito bom | Muito bom | Incluído |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | Muito rápido (~3s/resp) | Bom | Bom | Incluído |

### 19.2 Modelo Recomendado por Agente

| Agente | Modelo | Justificação | Icon |
|--------|--------|-------------|------|
| **BA** | Opus 4.6 | Conversação complexa em português, contexto de negócio bancário, precisa de raciocínio profundo | 🟣 Opus |
| **FA** | Sonnet 4.5 | Gera user stories estruturadas, output JSON. Não precisa de raciocínio máximo | 🟠 Sonnet |
| **DA** | Sonnet 4.5 | Gera wireframes JSON estruturados. Pattern repetitivo, Sonnet suficiente | 🟠 Sonnet |
| **DSLA** | Opus 4.6 | Escreve código React real (componentes DS). Qualidade de código crítica | 🟣 Opus |
| **PA** | Sonnet 4.5 | Assembla protótipo a partir de wireframes. Tarefa mecânica de montagem | 🟠 Sonnet |
| **TAA** | Opus 4.6 | Arquitectura complexa, Interface Contract, decisões técnicas profundas | 🟣 Opus |
| **FDE** | Opus 4.6 | Escreve código frontend real em produção. Qualidade crítica | 🟣 Opus |
| **BDE** | Opus 4.6 | Escreve código backend real (APIs, BD, eventos). Qualidade crítica | 🟣 Opus |
| **UTE** | Haiku 4.5 | Executa comandos (vitest), parsea output, despacha resultados. Tarefa mecânica | 🟢 Haiku |
| **FBS** | Sonnet 4.5 | Analisa bugs e aplica fixes. Sonnet é suficiente para fixes focados | 🟠 Sonnet |
| **BBS** | Sonnet 4.5 | Analisa bugs backend e aplica fixes. Mesma lógica que FBS | 🟠 Sonnet |

### 19.3 Pros e Contras por Escolha

**Opus 4.6 (BA, DSLA, TAA, FDE, BDE):**
- ✅ Melhor raciocínio — decisões arquitecturais complexas
- ✅ Melhor qualidade de código — menos bugs, melhor estrutura
- ✅ Melhor compreensão de contexto PT — negócio bancário português
- ❌ Mais lento (~30s por resposta vs ~8s Sonnet)
- ❌ Consome mais da quota Max
- **Mitigação:** Fast pipeline (single-call) reduz nº de chamadas

**Sonnet 4.5 (FA, DA, PA, FBS, BBS):**
- ✅ 3-4x mais rápido que Opus — pipeline significativamente mais curto
- ✅ Qualidade muito boa para tarefas estruturadas (JSON, fixes focados)
- ✅ Menos consumo de quota
- ❌ Pode perder nuances em contexto complexo
- ❌ Código ligeiramente menos elegante
- **Mitigação:** Estes agentes têm prompts muito estruturados que guiam o output

**Haiku 4.5 (UTE):**
- ✅ Ultra-rápido (~3s) — perfeito para "executa vitest e reporta"
- ✅ Mínimo consumo de quota
- ❌ Menos capaz em tarefas complexas
- **Mitigação:** O UTE faz tarefas mecânicas (correr comando, parsear JSON, despachar)

### 19.4 Impacto na Performance (Estimativa)

| Cenário | Todos Opus | Mix Recomendado | Ganho |
|---------|-----------|-----------------|-------|
| Fase 1 (BA→PA) fast | ~10 min | ~7 min | -30% |
| Fase 2 (TAA→Deploy) fast | ~15 min | ~12 min | -20% |
| **Total E2E** | **~25 min** | **~19 min** | **-24%** |

### 19.5 Implementação

No `claude.ts`, ao spawnar cada agente:
```typescript
const MODEL_PER_AGENT: Record<string, string> = {
  ba: 'claude-opus-4-6',
  fa: 'claude-sonnet-4-5-20250929',
  da: 'claude-sonnet-4-5-20250929',
  dsla: 'claude-opus-4-6',
  pa: 'claude-sonnet-4-5-20250929',
  taa: 'claude-opus-4-6',
  fde: 'claude-opus-4-6',
  bde: 'claude-opus-4-6',
  ute: 'claude-haiku-4-5-20251001',
  fbs: 'claude-sonnet-4-5-20250929',
  bbs: 'claude-sonnet-4-5-20250929',
};
// Na função spawnClaude: --model ${MODEL_PER_AGENT[agentId] || process.env.CLAUDE_MODEL || 'sonnet'}
// CLAUDE_MODEL env var mantém-se como fallback (se agentId não estiver no map)
```

### 19.6 Icons no Workshop UI

No `agents.ts`, cada agente tem um indicador visual do modelo:

| Modelo | Badge/Icon | Cor |
|--------|-----------|-----|
| Opus 4.6 | Círculo roxo + "O" | `#7C3AED` (purple-600) |
| Sonnet 4.5 | Círculo laranja + "S" | `#EA580C` (orange-600) |
| Haiku 4.5 | Círculo verde + "H" | `#16A34A` (green-600) |

Cada card de agente no Workshop UI mostra: nome do agente + badge do modelo no canto superior direito.

### 19.7 Análise Cross-Provider — Comparação Teórica

Para contexto de análise (sem alterar a implementação que usa apenas Claude via Max plan), aqui está a comparação com modelos de outros providers que seriam candidatos para cada tipo de agente:

#### Modelos de raciocínio profundo (BA, TAA, FDE, BDE, DSLA)

| Modelo | Provider | Raciocínio | Código | Contexto | Velocidade | Custo API |
|--------|----------|-----------|--------|----------|------------|-----------|
| **Claude Opus 4.6** ✅ | Anthropic | Excelente | Excelente | 200K tokens | ~30s | $15/$75 |
| GPT-4o | OpenAI | Muito bom | Muito bom | 128K tokens | ~10s | $2.50/$10 |
| o3 | OpenAI | Excepcional (reasoning) | Muito bom | 200K tokens | ~60-120s | $10/$40 |
| Gemini 2.5 Pro | Google | Muito bom | Bom | 1M tokens | ~15s | $1.25/$10 |
| DeepSeek V3 | DeepSeek | Muito bom | Excelente | 128K tokens | ~8s | $0.27/$1.10 |

**Análise por agente crítico:**

| Agente | Melhor modelo teórico | Justificação | Mantemos Claude? |
|--------|----------------------|-------------|-----------------|
| **BA** | Claude Opus 4.6 | Melhor em conversação natural PT, contexto de negócio, nuance cultural. GPT-4o seria 2ª opção | ✅ Sim — melhor para PT conversacional |
| **TAA** | o3 ou Claude Opus | o3 tem raciocínio excepcional para análise arquitectural, mas é 4x mais lento. Opus é melhor balanço velocidade/qualidade | ✅ Sim — Opus 4.6 é o melhor trade-off |
| **FDE** | Claude Opus 4.6 ou DeepSeek V3 | DeepSeek V3 é surpreendentemente forte em código React/TypeScript e 50x mais barato. Mas Opus gera código mais robusto com melhores práticas e melhor compreensão de contexto PT | ✅ Sim — robustez > velocidade para produção |
| **BDE** | Claude Opus 4.6 ou DeepSeek V3 | Mesma análise que FDE. DeepSeek forte em Node.js/Express/SQL | ✅ Sim — mesma razão |
| **DSLA** | Claude Opus 4.6 | Componentes React com estilo/branding requerem compreensão criativa + técnica. Opus é o melhor nisto | ✅ Sim — criatividade + código |

#### Modelos de tarefas estruturadas (FA, DA, PA, FBS, BBS)

| Modelo | Provider | JSON/Structured | Código (fixes) | Velocidade | Custo API |
|--------|----------|----------------|----------------|------------|-----------|
| **Claude Sonnet 4.5** ✅ | Anthropic | Excelente | Muito bom | ~8s | $3/$15 |
| GPT-4o-mini | OpenAI | Muito bom | Bom | ~3s | $0.15/$0.60 |
| Gemini 2.0 Flash | Google | Muito bom | Bom | ~3s | $0.10/$0.40 |
| DeepSeek V3 | DeepSeek | Muito bom | Excelente | ~5s | $0.27/$1.10 |

**Análise:**

| Agente | Melhor modelo teórico | Justificação | Mantemos Claude? |
|--------|----------------------|-------------|-----------------|
| **FA** | Sonnet 4.5 ou GPT-4o-mini | Output JSON estruturado — ambos excelentes. GPT-4o-mini é 10x mais barato e 2x mais rápido | ✅ Sim — consistência do ecossistema |
| **DA** | Sonnet 4.5 | JSON complexo (wireframes) — Sonnet é mais fiável na estrutura exacta esperada | ✅ Sim — melhor aderência ao schema |
| **PA** | Sonnet 4.5 ou Gemini Flash | Montagem de código a partir de templates — Gemini Flash seria 2x mais rápido | ✅ Sim — qualidade + consistência |
| **FBS/BBS** | DeepSeek V3 ou Sonnet 4.5 | DeepSeek é excelente em debug/fix de código e mais barato. Mas Sonnet integra melhor com o ecossistema | ✅ Sim — ecossistema unificado |

#### Modelo mecânico (UTE)

| Modelo | Provider | Parsing output | Velocidade | Custo API |
|--------|----------|---------------|------------|-----------|
| **Claude Haiku 4.5** ✅ | Anthropic | Bom | ~3s | $0.25/$1.25 |
| GPT-4o-mini | OpenAI | Bom | ~2s | $0.15/$0.60 |
| Gemini Flash | Google | Bom | ~2s | $0.10/$0.40 |

**Análise:** Para o UTE, qualquer modelo leve serve. Haiku é ligeiramente mais caro que as alternativas, mas a diferença é negligível e mantém o ecossistema unificado.

#### Conclusão da análise cross-provider

**Se pudéssemos escolher livremente (sem restrição de acesso):**
- **Mudaria para DeepSeek V3** nos agentes de código (FDE, BDE, FBS, BBS) — excelente em código, 50x mais barato
- **Usaria o3** no TAA — raciocínio excepcional para arquitectura (se o tempo extra fosse aceitável)
- **Manteria Opus** no BA e DSLA — ninguém bate o Claude em conversação PT e criatividade

**Na prática (com acesso Max plan):**
- Usar apenas Claude é a **decisão correcta** porque:
  1. **Acesso incluído** — Max plan já paga por tudo, sem custo adicional por API
  2. **Ecossistema unificado** — mesma API, mesmo formato, sem adaptadores por provider
  3. **Consistência** — todos os agentes "pensam" da mesma forma, menos surpresas
  4. **Claude Code CLI** — integração nativa com tool use, system prompts, model switching
  5. **Qualidade geral** — Opus 4.6 é top-3 em praticamente todas as categorias

**Veredicto:** Mantemos o mix Claude (Opus/Sonnet/Haiku) como definido em §19.2. A análise acima serve de referência futura caso queiramos integrar multi-provider.

---

## 20. OPTIMIZAÇÃO DE PERFORMANCE DOS AGENTES

### 20.1 Estratégias Implementadas

| # | Estratégia | Impacto | Complexidade |
|---|-----------|---------|-------------|
| 1 | **Mix de modelos** (§19) | -24% tempo total | Baixa — já existe `--model` flag |
| 2 | **Fast pipeline** (single-call) | -50% por agente | Já existe — `fast=true` |
| 3 | **Execução paralela FDE+BDE** | -40% na Fase 2 | Média — Promise.all |
| 4 | **Context pruning** | -15% por chamada | Média |
| 5 | **Caching de respostas** | -20% em re-runs | Média |
| 6 | **Pre-warming de processos** | -5s por agente | Baixa |
| 7 | **Streaming pipeline** | Percepção -30% | Baixa — já temos SSE |

### 20.2 Detalhes

**1. Mix de modelos:** Já descrito em §19. Usar Haiku/Sonnet para tarefas mecânicas.

**2. Fast pipeline:** Já existe. Em vez de N fases por agente, faz 1 chamada com prompt consolidado. Usar `fast=true` por default na demo.

**3. Paralelo FDE+BDE:** Já descrito em §17.2. Reduz ~40% do tempo na etapa de desenvolvimento.

**4. Context pruning — enviar só o necessário:**
```typescript
// Mau: enviar TUDO ao agente
const prompt = `${fullJiraEpic} ${allWireframes} ${entireRegistry} ${fullContract}`;

// Bom: enviar só o relevante
const prompt = buildAgentContext(agentId, {
  jira: extractRelevantStories(epic, mvp),      // só US do MVP actual
  wireframes: filterByScreens(wireframes, mvp),  // só ecrãs relevantes
  registry: extractProjectSection(registry, agentId), // só o projecto do agente
  contract: contract,  // contrato é sempre completo (é pequeno)
});
```

**5. Caching:**
- Cache do Jira (TTL 5 min) — não refetch se já lido recentemente
- Cache do DS catalog — lido 1x no início, invalidado após DSLA build
- Cache do Registry — lido 1x, invalidado após merge
- Cache de respostas do agente — se a mesma tool é chamada 2x com mesmos args

**6. Pre-warming:**
- Ao iniciar o pipeline, spawnar o processo Claude Code CLI **antes** de precisar
- O spawn demora ~3-5s (Node.js + stdin/stdout setup)
- Pre-warm o próximo agente enquanto o actual ainda está a terminar
```typescript
// Enquanto TAA ainda corre, pre-warm FDE e BDE
if (currentAgent === 'taa' && progress > 80%) {
  preWarmAgent('fde');
  preWarmAgent('bde');
}
```

**7. Streaming pipeline:**
- Não esperar que um agente termine completamente para mostrar progresso
- SSE streaming já existe — aproveitar para mostrar output parcial
- No Workshop UI: texto a aparecer em tempo real (já funciona na Fase 1)

### 20.3 Benchmark Esperado

| Cenário | Sem optimização | Com todas optimizações |
|---------|-----------------|----------------------|
| Fase 1 (normal) | ~25 min | ~12 min |
| Fase 1 (fast) | ~10 min | ~7 min |
| Fase 2 (normal) | ~25 min | ~14 min |
| Fase 2 (fast) | ~15 min | ~10 min |
| **E2E (fast + optimizado)** | **~25 min** | **~17 min** |

---

## 21. REGISTRY — SUPORTE A FUNCIONALIDADES MODIFICÁVEIS

### 21.1 Problema

Os BDEVs não criam apenas funcionalidades novas. Podem também **modificar funcionalidades existentes**:

**Exemplos:**
- "Gestão de Cartões" já existe → adicionar sub-feature "Bloquear Cartão"
- "Visualizar Cartão" já existe sem SCA → adicionar SCA a esta funcionalidade
- "Consulta de Movimentos" existe → adicionar filtros avançados (período, tipo, montante)

### 21.2 Registry Enriquecido

O Implementation Registry passa a incluir **features e sub-features** com detalhes de capacidades:

```json
{
  "lastUpdated": "2026-02-09T14:30:00Z",
  "projects": {
    "digitalChannels": {
      "routes": [...],
      "components": [...],
      "services": [...],
      "features": [
        {
          "name": "Gestão de Cartões",
          "bdev": "BDEV00000012",
          "status": "implemented",
          "subFeatures": [
            {
              "name": "Visualizar dados do cartão",
              "route": "/cards/:id",
              "hasSCA": false,
              "capabilities": ["view_card_number", "view_expiry", "view_cvv_masked"]
            },
            {
              "name": "Cancelar cartão",
              "route": "/cards/:id/cancel",
              "hasSCA": true,
              "capabilities": ["cancel_card", "sca_otp"]
            }
          ]
        },
        {
          "name": "Consulta de Movimentos",
          "bdev": "BDEV00000011",
          "status": "implemented",
          "subFeatures": [
            {
              "name": "Lista de movimentos",
              "route": "/accounts/:id/movements",
              "hasSCA": false,
              "capabilities": ["list_movements", "filter_by_date"]
            }
          ]
        }
      ]
    }
  }
}
```

### 21.3 Tipos de BDEV

O TAA identifica automaticamente o tipo de BDEV:

| Tipo | Descrição | Exemplo | Impacto no pipeline |
|------|-----------|---------|---------------------|
| **NEW** | Funcionalidade totalmente nova | "Transferências bancárias" | FDE cria novas páginas, BDE cria novas APIs |
| **EXTEND** | Adicionar sub-feature a funcionalidade existente | "Bloquear cartão" (Gestão de Cartões existe) | FDE adiciona a ecrã existente, BDE adiciona endpoint |
| **MODIFY** | Alterar comportamento de sub-feature existente | "Adicionar SCA a Visualizar Cartão" | FDE modifica componente, BDE adiciona middleware SCA |

**No prompt do TAA:**
> "Ao analisar o BDEV, consulta o Registry para classificar: é uma funcionalidade NEW, EXTEND, ou MODIFY? Para EXTEND e MODIFY, identifica exactamente o que já existe e o que precisa mudar. NUNCA recriar o que já existe — apenas estender ou modificar."

**No prompt do FDE (para MODIFY):**
> "Para funcionalidades MODIFY, lê o código existente antes de alterar. Não substituir ficheiros inteiros — faz edições cirúrgicas (adicionar SCA wrapper, novo estado, nova rota dentro do router existente)."

### 21.4 Impacto no Interface Contract

Para BDEVs do tipo EXTEND e MODIFY, o contrato inclui:

```json
{
  "bdev": "BDEV00000013",
  "type": "MODIFY",
  "target": {
    "feature": "Gestão de Cartões",
    "subFeature": "Visualizar dados do cartão",
    "existingRoute": "/cards/:id",
    "existingApi": "GET /api/v1/cards/:id"
  },
  "changes": {
    "frontend": [
      { "action": "wrap_with_sca", "component": "CardDetailsPage", "scaType": "otp" }
    ],
    "backend": [
      { "action": "add_middleware", "path": "GET /api/v1/cards/:id", "middleware": "sca-verify" },
      { "action": "add_endpoint", "path": "POST /api/v1/sca/initiate", "purpose": "Initiate SCA challenge" }
    ]
  }
}
```
