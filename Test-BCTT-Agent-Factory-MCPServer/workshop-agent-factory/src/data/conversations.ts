import type { Conversation, AgentId } from '@/types';

// ============================================
// CONVERSAS DO BA (BRAINSTORM AGENT)
// ============================================

export const conversasBA: Conversation[] = [
  {
    id: 'cashback',
    titulo: 'Funcionalidade de Cashback',
    mensagens: [
      {
        role: 'user',
        content: 'Olá, quero implementar uma funcionalidade de cashback para os nossos clientes.',
      },
      {
        role: 'assistant',
        content: `Olá! Vou ajudar-te a estruturar essa funcionalidade. Antes de começarmos a explorar em detalhe, preciso de recolher alguma informação inicial.

**Tipo de pedido:** Nova funcionalidade
**Área:** Fidelização/Campanhas

Podes dizer-me:
1. Esta funcionalidade é para que canal? (App mobile, Web, ambos)
2. Qual o driver principal? (Iniciativa de negócio, pressão competitiva, regulamentar)
3. Há algum prazo definido?`,
      },
      {
        role: 'user',
        content: 'É para a app mobile primeiro, depois web. É uma iniciativa do Marketing para aumentar engagement. Queremos lançar no Q2.',
      },
      {
        role: 'assistant',
        content: `Perfeito. Agora vou fazer algumas perguntas para perceber melhor o que pretendem.

**Sobre o modelo de cashback:**
- O cashback é uma percentagem fixa ou variável por campanha?
- Aplica-se a todas as compras ou apenas em comerciantes parceiros?
- Há um limite máximo de cashback por transação ou por mês?

**Cenário de exceção que quero explorar:**
Imagina que um cliente faz uma compra de 1.000€ numa campanha de 10% cashback. O que acontece se ele devolver o produto 2 dias depois? O cashback é revertido automaticamente?`,
      },
      {
        role: 'user',
        content: 'Boa pergunta! Sim, o cashback deve ser revertido em caso de devolução. A percentagem será variável por campanha, definida pelo Marketing. Limite máximo de 50€ por mês.',
      },
      {
        role: 'assistant',
        content: `📊 **Análise de Dependências e Impactos**

Consultei a knowledge base e identifiquei:

**Sistemas impactados:**
- Core Banking (registo de cashback como movimento)
- Sistema de Notificações (alertas de cashback creditado)
- Backoffice de Campanhas (gestão de regras)

**Funcionalidades relacionadas existentes:**
- Programa de pontos atual (pode haver sobreposição?)
- Sistema de devoluções já tem integração com Core

**Alerta regulamentar:**
- Cashback pode ser considerado benefício financeiro - validar com Compliance se há requisitos de comunicação específicos.

⚠️ **Conflito potencial:** O programa de pontos atual oferece 1 ponto por €10 gastos. Como coexistem? O cliente acumula pontos E cashback na mesma compra?`,
      },
      {
        role: 'user',
        content: 'Sim, pode acumular ambos. São programas independentes.',
      },
      {
        role: 'assistant',
        content: `Entendido. Vou preparar o draft para tua validação.

---

## 📋 DRAFT - Funcionalidade Cashback

**Resumo Executivo:**
Programa de cashback para app mobile (fase 1) e web (fase 2), com percentagem variável por campanha, limite mensal de 50€, reversível em caso de devolução.

**Regras de Negócio:**
1. Cashback % definido por campanha no backoffice
2. Limite máximo: 50€/mês por cliente
3. Reversão automática em devoluções
4. Coexiste com programa de pontos (acumulável)
5. Crédito em conta no dia seguinte à compra

**Dependências identificadas:**
- Core Banking, Notificações, Backoffice Campanhas
- Integração com sistema de devoluções

**Alertas:**
- Validação Compliance necessária

**Próximos passos:**
- Aprovação deste draft
- Envio ao Functional Agent para user stories

---

✅ Aprova este entendimento?
❌ Algo a ajustar?`,
      },
    ],
  },
  {
    id: 'vop',
    titulo: 'Implementação VOP',
    mensagens: [
      {
        role: 'user',
        content: 'Precisamos implementar o VOP (Verification of Payee) nas transferências.',
      },
      {
        role: 'assistant',
        content: `O VOP é uma obrigatoriedade regulamentar importante. Deixa-me consultar a documentação.

📊 **Análise Regulamentar:**

Segundo as guidelines do BCE e Banco de Portugal:
- VOP é obrigatório para transferências SEPA desde [data]
- Deve validar correspondência entre IBAN e nome do beneficiário
- Respostas possíveis: Match, Close Match, No Match, Verification not possible

**Perguntas para clarificar:**
1. Vamos implementar apenas o básico regulamentar ou adicionar funcionalidades de valor acrescentado?
2. Como queremos tratar o "Close Match"? Aviso + permitir continuar, ou bloquear?
3. Há requisitos específicos de UX definidos pelo regulador que temos de seguir?`,
      },
      {
        role: 'user',
        content: 'Vamos fazer o básico regulamentar primeiro. Close Match deve mostrar aviso mas permitir continuar com confirmação explícita do cliente.',
      },
      {
        role: 'assistant',
        content: `**Consultando knowledge base interna...**

✅ Encontrei o fluxo de transferências SEPA atual (v3.0, aprovado Dez 2024).

**Impacto identificado:**
- Inserir passo de verificação ANTES da confirmação final
- Novo ecrã/modal para resultado da verificação
- Integração com serviço VOP (interno ou provider externo?)

**Proposta de fluxo:**
\`\`\`
Inserir dados → VOP Check → [Match: continua]
                          → [Close Match: aviso + confirmar]
                          → [No Match: aviso forte + confirmar]
                          → [Not possible: informar + continuar]
→ Confirmação → Execução
\`\`\`

Queres que detalhe os ecrãs para cada cenário de resposta VOP?`,
      },
    ],
  },
];

// ============================================
// CONVERSAS DO FA (FUNCTIONAL AGENT)
// ============================================

export const conversasFA: Conversation[] = [
  {
    id: 'cashback-fa',
    titulo: 'Estruturação Cashback',
    mensagens: [
      {
        role: 'system',
        content: `📥 **Recebido do Brainstorm Agent:**

Funcionalidade de Cashback aprovada pelo negócio.
- Canal: App mobile (MVP1), Web (MVP2)
- Cashback % variável por campanha
- Limite: 50€/mês
- Reversível em devoluções
- Coexiste com programa de pontos

Dependências: Core Banking, Notificações, Backoffice Campanhas`,
      },
      {
        role: 'assistant',
        content: `## 🏗️ Análise e Decomposição

Vou estruturar esta funcionalidade em Epic, Features e User Stories.

---

**EPIC: Programa de Cashback**

**Feature 1: Elegibilidade e Cálculo**
- US01: Verificar elegibilidade do cliente
- US02: Calcular cashback por transação
- US03: Aplicar limite mensal

**Feature 2: Crédito e Reversão**
- US04: Creditar cashback em conta
- US05: Reverter cashback em devolução

**Feature 3: Visualização Cliente**
- US06: Mostrar cashback acumulado
- US07: Mostrar histórico de cashback
- US08: Notificar crédito de cashback

**Feature 4: Backoffice**
- US09: Criar campanha de cashback
- US10: Definir regras de campanha
- US11: Relatórios de cashback

---

A avançar para proposta de MVPs...`,
      },
      {
        role: 'assistant',
        content: `## 📦 Proposta de MVPs

Aplicando o critério "funcionalidade completa ou nada":

---

**MVP1 - Core Cashback (App Mobile)**

✅ Fluxo completo end-to-end:
- US01: Verificar elegibilidade
- US02: Calcular cashback
- US03: Aplicar limite mensal
- US04: Creditar em conta
- US06: Mostrar cashback acumulado
- US08: Notificar crédito
- US09: Criar campanha (backoffice)
- US10: Definir regras (backoffice)

**Justificação:** Cliente consegue receber cashback e ver o saldo. Marketing consegue criar campanhas.

---

**MVP2 - Extensões**
- US05: Reversão em devoluções
- US07: Histórico detalhado
- US11: Relatórios backoffice
- Extensão para canal Web

**Justificação:** Funcionalidades complementares que não impedem o uso básico.

---

⚠️ **Nota:** A reversão (US05) poderia ser MVP1, mas o negócio confirmou que devoluções são raras (<2%). Risco aceitável.`,
      },
      {
        role: 'assistant',
        content: `## 📋 Detalhe User Story US02

---

**US02: Calcular cashback por transação**

**Narrativa:**
"As a cliente do Banco CTT
I want to receber cashback automático nas minhas compras elegíveis
In order to beneficiar das campanhas ativas"

**Ecrã:** N/A (processamento background)
**Mockup:** N/A

---

**Regras de Negócio:**

| # | Regra | Detalhe |
|---|-------|--------|
| RN01 | Elegibilidade | Apenas transações com cartão de débito/crédito Banco CTT |
| RN02 | Cálculo | Cashback = Valor transação × % campanha |
| RN03 | Arredondamento | 2 casas decimais, arredondar para baixo |
| RN04 | Limite | Se (acumulado mês + novo) > 50€, creditar apenas diferença |
| RN05 | Timing | Calcular no momento da transação, creditar D+1 |

---

**Critérios de Aceitação:**

\`\`\`gherkin
Cenário 1: Cálculo standard
  Given uma campanha ativa com 5% cashback
  And um cliente elegível
  When o cliente faz uma compra de 100€
  Then o sistema calcula 5€ de cashback
  And agenda crédito para D+1

Cenário 2: Aplicação de limite mensal
  Given um cliente com 48€ de cashback acumulado no mês
  And limite mensal de 50€
  When o cliente faz compra que geraria 5€ cashback
  Then o sistema credita apenas 2€
  And regista que limite foi atingido

Cenário 3: Cliente não elegível
  Given um cliente sem cartão ativo
  When o cliente faz uma compra
  Then o sistema não calcula cashback
\`\`\``,
      },
      {
        role: 'download',
        content: `## ✅ Outputs Gerados

A documentação foi finalizada com sucesso!

**Ficheiros disponíveis:**

📄 **Documento de Requisitos Word**
Requisitos_Cashback_FA.docx

🔗 **Ficheiro Azure DevOps** (CSV)
Cashback_UserStories_Import.csv

---

*Clica no botão abaixo para descarregar o documento de requisitos.*`,
      },
    ],
  },
];

// ============================================
// CONVERSAS DO DA (DESIGN AGENT)
// ============================================

export const conversasDA: Conversation[] = [
  {
    id: 'cashback-da',
    titulo: 'Fluxos de Exceção Cashback',
    mensagens: [
      {
        role: 'system',
        content: `📥 **Recebido do Functional Agent:**

Feature: Widget de Cashback no Dashboard
**Figma Happy Path:** Dashboard > Cashback Widget
**User Stories:** US06, US07, US08

**Cenários a cobrir:**
- Exibição normal do cashback
- Limite mensal atingido
- Primeiro uso (sem histórico)
- Erro de carregamento
- Atualização após transação`,
      },
      {
        role: 'assistant',
        content: `## 📖 Fase 1: LEITURA

**Consultando MCP Figma...**

✅ Happy path analisado:
- Frame "Dashboard-Cashback-Widget"
- Componentes: Card, ProgressBar, Icon (coins), Link
- Tokens: surface-secondary, text-primary, brand-primary

**Consultando MCP ZeroHeight...**

✅ Guidelines carregadas:
- Tone of Voice: Formal bancário
- UX Writing: Clareza, Brevidade, Ação Clara
- Cores de estado: Success (#10B981), Warning (#F59E0B), Error (#EF4444)

---

**Gaps identificados no happy path:**
1. ❌ Estado de loading não definido
2. ❌ Empty state (sem cashback) não existe
3. ❌ Estado de erro não contemplado
4. ❌ Estado "limite atingido" não diferenciado
5. ❌ Copy em inglês não existe

A avançar para análise de exceções...`,
      },
      {
        role: 'assistant',
        content: `## 🧠 Fase 2: ANÁLISE

**Mapeamento de Fluxos de Exceção:**

---

| Tipo | Cenário | Trigger | Prioridade |
|------|---------|---------|------------|
| EMPTY_STATE | Primeiro uso | balance = 0 AND !hasCampaign | Alta |
| LOADING | A carregar dados | isLoading = true | Alta |
| SUCCESS | Limite atingido | balance >= limit | Média |
| SYSTEM_ERROR | Falha de rede | fetchError | Alta |
| BUSINESS_ERROR | Campanha expirada | campaign.expired | Baixa |

---

**Decisões de UX:**

1. **Empty State:** Mostrar card motivacional com CTA para ativar cashback
2. **Loading:** Skeleton com mesmas dimensões do widget
3. **Limite atingido:** Celebrar! Usar cor success + copy positivo
4. **Erro:** Mensagem simples + retry button
5. **Campanha expirada:** Não mostrar widget

---

A avançar para geração de copy...`,
      },
      {
        role: 'assistant',
        content: `## ✍️ Fase 3: GERAÇÃO DE COPY

**Aplicando regras ZeroHeight (Formal bancário):**

---

### Widget States Copy

| Estado | PT-PT | EN-UK |
|--------|-------|-------|
| Título | Cashback {mês} | Cashback {month} |
| Subtítulo normal | Ainda podes acumular {valor} € | You can still earn {value} € |
| Limite atingido | Parabéns! Atingiste o limite mensal | Congratulations! Monthly limit reached |
| Empty state título | Ativa o teu cashback | Activate your cashback |
| Empty state desc | Começa a acumular nas tuas compras | Start earning on your purchases |
| Empty state CTA | Saber mais | Learn more |
| Loading | A carregar... | Loading... |
| Erro título | Não foi possível carregar | Unable to load |
| Erro desc | Verifica a tua ligação | Check your connection |
| Erro CTA | Tentar novamente | Try again |
| Link histórico | Ver histórico | View history |

---

**Validação UX Writing:**
- ✅ Clareza: Linguagem simples
- ✅ Brevidade: Máximo 2 linhas
- ✅ Tom formal: Sem coloquialismos
- ✅ Ação clara: CTAs com verbo infinitivo
- ✅ Feedback útil: Erro explica + solução`,
      },
      {
        role: 'download',
        content: `## ✅ Outputs do Design Agent

**Ficheiros criados:**

🎨 **Fluxos Figma**
Cashback_ExceptionFlows.fig
- 5 frames (1 happy path + 4 exceções)
- Anotações de comportamento
- Cores por tipo de estado

📁 **Ficheiro de Copy**
Cashback_i18n.json
- Todas as strings em PT-PT e EN-UK
- Estrutura pronta para i18n

📋 **Documento de Handoff**
Cashback_Handoff_DSLA.md
- Lista de estados
- Comportamentos esperados
- Tokens a usar

---

**Próximos passos:**
1. DSLA recebe handoff automático
2. DSLA cria CashbackWidget React
3. Equipa Design aprova implementação

---

*Clica abaixo para descarregar os ficheiros.*`,
      },
    ],
  },
];

// ============================================
// CONVERSAS DO DSLA (DESIGN SYSTEM LIBRARY AGENT)
// ============================================

export const conversasDSLA: Conversation[] = [
  {
    id: 'cashback-widget',
    titulo: 'CashbackWidget Component',
    mensagens: [
      {
        role: 'system',
        content: `📥 **Recebido do Design Agent:**

Necessário criar novo componente para o dashboard.

**Componente:** Widget de Cashback
**Figma:** Dashboard > Cashback Widget
**Contexto:** Mostrar saldo acumulado e limite restante

**Specs visuais:**
- Card com fundo surface-secondary
- Ícone de cashback (moeda com seta)
- Valor em destaque (display-lg)
- Barra de progresso do limite
- Link "Ver histórico"`,
      },
      {
        role: 'assistant',
        content: `## 🔍 Análise Inicial

**Verificando biblioteca existente...**

✅ Componentes relacionados encontrados:
- \`Card\` (átomo) - pode ser base
- \`ProgressBar\` (átomo) - reutilizável
- \`Icon\` (átomo) - tem ícone "coins"
- \`Link\` (átomo) - para "Ver histórico"

❌ Não existe componente similar ao CashbackWidget

---

**Classificação Atomic Design:**
→ **Organismo** (componente complexo e autónomo)

**Justificação:**
- Combina múltiplos átomos e moléculas
- Tem lógica de negócio própria
- É auto-suficiente no contexto

---

**Design Tokens identificados (Tokens Studio):**
- \`--bctt-color-surface-secondary\`
- \`--bctt-color-text-primary\`
- \`--bctt-color-brand-primary\`
- \`--bctt-spacing-md\` (16px)
- \`--bctt-font-display-lg\`
- \`--bctt-radius-md\`

A avançar para proposta de specs...`,
      },
      {
        role: 'assistant',
        content: `## 📋 Proposta de Specs

---

### COMPONENT SPEC: CashbackWidget

**Metadata**
| Campo | Valor |
|-------|-------|
| Nome | CashbackWidget |
| Nível | Organismo |
| Categoria | Fidelização |
| Versão | 1.0.0 |
| Status | Draft |

---

**Props / API**

\`\`\`typescript
interface CashbackWidgetProps {
  /** Saldo atual de cashback em euros */
  balance: number;

  /** Limite mensal em euros (default: 50) */
  limit?: number;

  /** Mês de referência (default: mês atual) */
  month?: string;

  /** Variante visual */
  variant?: 'default' | 'compact';

  /** Estado de carregamento */
  loading?: boolean;

  /** Callback ao clicar em "Ver histórico" */
  onHistoryPress?: () => void;

  /** Callback ao clicar no widget */
  onPress?: () => void;
}
\`\`\`

---

**Variantes**
- **Sizes:** \`default\`, \`compact\`
- **States:** \`default\`, \`loading\`, \`empty\`
- **Themes:** \`light\`, \`dark\` (via tokens)`,
      },
      {
        role: 'assistant',
        content: `## 📋 Guidelines de Uso

---

### ✅ DO'S

- Usar no dashboard como widget destacado na secção de fidelização
- Mostrar sempre o limite restante para criar urgência positiva
- Usar a variante \`compact\` quando em listas ou espaços reduzidos
- Atualizar o valor em tempo real após transações
- Usar animação suave na barra de progresso

---

### ❌ DON'TS

- **Não usar** se o cliente não tem campanhas de cashback ativas
- **Não mostrar** valores negativos (usar 0 como mínimo)
- **Não combinar** com outros widgets de fidelização no mesmo card
- **Não usar** a variante \`default\` em modais ou popovers
- **Não esconder** o limite - é informação crítica para o utilizador

---

### 📍 Contextos de Uso

| Contexto | Variante | Notas |
|----------|----------|-------|
| Dashboard Home | \`default\` | Posição destacada |
| Lista de benefícios | \`compact\` | Entre outros items |
| Detalhe de conta | \`default\` | Secção dedicada |
| Push notification | N/A | Usar apenas texto |

---

📤 **Enviar para aprovação da equipa UX/UI?**`,
      },
      {
        role: 'user',
        content: 'Sim, a equipa UX/UI aprovou. Podes avançar com o código.',
      },
      {
        role: 'download',
        content: `## ✅ Componente Submetido para Review

**Pull Request criado:**
\`feat(organisms): add CashbackWidget component\`

**Checklist de Review:**
- [x] Código React + TypeScript
- [x] Todas as variantes implementadas
- [x] Stories no Storybook
- [x] Testes unitários
- [x] Design tokens aplicados
- [x] Acessibilidade (WCAG)
- [x] Guidelines documentadas

**Próximo passo:**
Aguardar aprovação da equipa UX/UI no Design Review.

---

*Clica nos botões abaixo para descarregar os ficheiros.*`,
      },
    ],
  },
];

// ============================================
// MAPA DE CONVERSAS POR AGENTE
// ============================================

const conversationMap: Record<AgentId, Conversation[]> = {
  ba: conversasBA,
  fa: conversasFA,
  da: conversasDA,
  pa: [], // TODO: Add PA conversations
  dsla: conversasDSLA,
  taa: [], // Phase 2: Technical Architecture Agent
  fde: [], // Phase 2: Frontend Dev Engineer
  bde: [], // Phase 2: Backend Dev Engineer
  bbs: [], // Phase 2: Backend Bug Solver
  fda: [], // Legacy: FDA conversations
  bda: [], // Legacy: BDA conversations
  fbs: [], // TODO: Add FBS conversations
  ute: [], // TODO: Add UTE conversations
  lte: [], // TODO: Add LTE conversations
  cqa: [], // TODO: Add CQA conversations
  monitor: [], // No detailed conversations
};

// ============================================
// HELPERS
// ============================================

export const getConversationsByAgent = (agentId: AgentId): Conversation[] => {
  return conversationMap[agentId] || [];
};

export const hasConversations = (agentId: AgentId): boolean => {
  const conversations = getConversationsByAgent(agentId);
  return conversations.length > 0;
};

export default conversationMap;
