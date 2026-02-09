import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { jiraTools, jiraToolHandlers } from '../jira/index.js';
import { generateDocumentBase64, DocumentData } from '../document/index.js';
import {
  getFileInfo,
  exportForFigmaPlugin,
  generateUxFlowPage,
  figmaDesignTokens,
  type WireframeSpec,
  type FlowConnection,
  type FlowNode,
} from '../figma/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// ============================================
// BCTT DESIGN SYSTEM PATH HELPER
// ============================================

/**
 * Resolves path to bctt-design-system project (sibling of mcp-server)
 */
function getBcttDesignSystemPath(): string {
  const dsPath = path.resolve(process.cwd(), '..', 'bctt-design-system');
  if (!fs.existsSync(dsPath)) {
    throw new Error(`bctt-design-system not found at ${dsPath}`);
  }
  return dsPath;
}

// ============================================
// DEMO MODE PROTECTIONS
// ============================================

// Maximum output size in characters (~2KB for demo safety)
const MAX_OUTPUT_SIZE = 2000;

// Timeout values in milliseconds
const JIRA_TIMEOUT_MS = 10000;  // 10 seconds
const FIGMA_TIMEOUT_MS = 5000;  // 5 seconds

/**
 * Truncates output to prevent context overflow during demos
 */
function truncateOutput(output: string, maxSize: number = MAX_OUTPUT_SIZE): string {
  if (output.length <= maxSize) {
    return output;
  }

  const truncated = output.substring(0, maxSize);
  const truncationNotice = `\n\n... [TRUNCADO: ${output.length - maxSize} caracteres omitidos para demo] ...`;

  // Try to truncate at a valid JSON boundary if it's JSON
  try {
    JSON.parse(output);
    // It's valid JSON, try to truncate intelligently
    const lastBrace = Math.max(truncated.lastIndexOf('}'), truncated.lastIndexOf(']'));
    if (lastBrace > maxSize * 0.7) {
      return output.substring(0, lastBrace + 1) + truncationNotice;
    }
  } catch {
    // Not JSON or invalid, just truncate
  }

  return truncated + truncationNotice;
}

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timeout após ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Safe fetch with timeout for external API calls
 */
async function safeFetch(url: string, options: RequestInit, timeoutMs: number, operation: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
import {
  generateScreenTranslations,
  exportTranslationsToBase64,
  generateTranslationsJSON,
  validateTranslation,
  standardTranslations,
  type ScreenCopy,
  type TranslationEntry,
} from '../translations/index.js';
import {
  componentSpecs,
  getComponentSpec,
  getComponentsByCategory,
  getCategories,
  searchComponents,
} from '../design-system/index.js';
import {
  listPrototypes,
  loadPrototype,
  loadPrototypeById,
  generatePrototype,
  compareFAvsClient,
  applyClientChanges,
  exportPrototype,
  approvePrototype,
  type PrototypeRecord,
  type PrototypeSummary,
  type Journey,
  type WireframeScreen,
  type WireframeElement,
} from '../prototype/index.js';
import { comparePrototypes, generateComparisonSummary } from '../prototype/compare.js';
import { deployPrototype } from '../prototype/export-to-disk.js';

// Tool definitions (Agent tools + Jira tools)
export const tools: Tool[] = [
  // ============================================
  // BA - BRAINSTORM AGENT TOOLS
  // ============================================
  {
    name: "ba_analyze_requirements",
    description: "BA Agent: Analisa requisitos iniciais. IMPORTANTE: Ler TODA a mensagem do utilizador antes de usar. Extrair objetivos, utilizadores e restrições. NÃO criar documentos - apenas consolidar.",
    inputSchema: {
      type: "object",
      properties: {
        functionality_name: {
          type: "string",
          description: "Nome da funcionalidade a analisar"
        },
        description: {
          type: "string",
          description: "Descrição inicial da funcionalidade"
        },
        context: {
          type: "string",
          description: "Contexto adicional (sistemas existentes, restrições, etc.)"
        }
      },
      required: ["functionality_name", "description"]
    }
  },
  {
    name: "ba_generate_questions",
    description: "BA Agent: Gera perguntas de clarificação contextuais. MODO DEMO: ~5 perguntas essenciais. MODO COMPLETO: perguntas adaptadas ao domínio (cartões→PCI-DSS, transferências→SEPA, etc.), evoluindo com base nas respostas. NÃO repetir perguntas já respondidas.",
    inputSchema: {
      type: "object",
      properties: {
        requirements: {
          type: "string",
          description: "Requisitos atuais para gerar perguntas"
        },
        area: {
          type: "string",
          enum: ["funcional", "tecnica", "negocio", "ux", "seguranca"],
          description: "Área de foco das perguntas"
        }
      },
      required: ["requirements"]
    }
  },

  // ============================================
  // FA - FUNCTIONAL AGENT TOOLS
  // ============================================
  {
    name: "fa_create_user_stories",
    description: "FA Agent: Cria user stories estruturadas a partir de requisitos. OBRIGATÓRIO: Cada US deve ter MVP atribuído (MVP1=core essencial, MVP2=complementar, MVP3=nice-to-have). Formato: Como [persona], quero [ação], para [benefício].",
    inputSchema: {
      type: "object",
      properties: {
        requirements: {
          type: "string",
          description: "Requisitos consolidados pelo BA para converter em user stories"
        },
        persona: {
          type: "string",
          description: "Persona principal (ex: Cliente, Gestor, Admin)"
        },
        functional_context: {
          type: "string",
          description: "Contexto funcional para determinar priorização de MVPs (fluxos principais vs secundários)"
        }
      },
      required: ["requirements", "functional_context"]
    }
  },
  {
    name: "fa_define_acceptance_criteria",
    description: "FA Agent: Define critérios de aceitação em Gherkin (Given/When/Then). OBRIGATÓRIO: Incluir cenários de exceção identificados pelo BA. Cada US deve ter cenário principal + cenários de erro.",
    inputSchema: {
      type: "object",
      properties: {
        user_story: {
          type: "string",
          description: "User story para definir critérios"
        },
        include_edge_cases: {
          type: "boolean",
          description: "Incluir casos de exceção"
        }
      },
      required: ["user_story"]
    }
  },
  {
    name: "fa_export_to_devops",
    description: "FA Agent: Exporta user stories para Azure DevOps. Requer configuração de AZURE_DEVOPS_TOKEN no .env.",
    inputSchema: {
      type: "object",
      properties: {
        user_stories: {
          type: "array",
          items: { type: "string" },
          description: "Lista de user stories para exportar"
        },
        project: {
          type: "string",
          description: "Nome do projeto no Azure DevOps"
        },
        iteration: {
          type: "string",
          description: "Iteração/Sprint de destino"
        }
      },
      required: ["user_stories", "project"]
    }
  },
  {
    name: "fa_generate_document",
    description: "FA Agent: Gera documento 'Informação Adicional' (.docx) seguindo template Banco CTT. OBRIGATÓRIO: Só usar APÓS fa_validate_with_ba aprovar. Inclui ecrãs, campos, regras e user stories com MVPs.",
    inputSchema: {
      type: "object",
      properties: {
        ba_validation_approved: {
          type: "boolean",
          description: "OBRIGATÓRIO: Confirmar que fa_validate_with_ba foi executado e aprovou. Se false, a ferramenta recusa."
        },
        titulo: {
          type: "string",
          description: "Título da funcionalidade"
        },
        codigo_bdev: {
          type: "string",
          description: "Código BDEV (ex: [BDEV00000001])"
        },
        versao: {
          type: "string",
          description: "Versão do documento (ex: 1.0)"
        },
        autor: {
          type: "string",
          description: "Autor do documento"
        },
        termos_abreviaturas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              termo: { type: "string" },
              descricao: { type: "string" }
            },
            required: ["termo", "descricao"]
          },
          description: "Lista de termos e abreviaturas"
        },
        documentos_relacionados: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              tipo: { type: "string" },
              descricao: { type: "string" }
            },
            required: ["nome", "tipo", "descricao"]
          },
          description: "Lista de documentos relacionados"
        },
        ecras: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              nome: { type: "string" },
              descricao: { type: "string" },
              campos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    campo: { type: "string" },
                    regras: { type: "string" },
                    formatacao: { type: "string" }
                  },
                  required: ["id", "campo", "regras", "formatacao"]
                }
              }
            },
            required: ["id", "nome", "descricao", "campos"]
          },
          description: "Lista de ecrãs com campos e regras"
        },
        user_stories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              titulo: { type: "string" },
              mvp: { type: "string" }
            },
            required: ["id", "titulo", "mvp"]
          },
          description: "Lista de user stories com MVPs"
        },
        campos_regras: {
          type: "array",
          items: {
            type: "object",
            properties: {
              requisito: { type: "string" },
              userStory: { type: "string" },
              campos: { type: "string" },
              regras: { type: "string" },
              formatacao: { type: "string" }
            },
            required: ["requisito", "userStory", "campos", "regras", "formatacao"]
          },
          description: "Tabela de campos e regras mapeados a requisitos e user stories"
        }
      },
      required: ["ba_validation_approved", "titulo", "codigo_bdev", "ecras", "user_stories"]
    }
  },
  {
    name: "fa_validate_with_ba",
    description: "FA Agent: OBRIGATÓRIO antes de fa_generate_document. Envia especificações ao BA para validar cobertura de requisitos e cenários de exceção. Só gerar documento após aprovação.",
    inputSchema: {
      type: "object",
      properties: {
        requisitos_originais: {
          type: "string",
          description: "Requisitos originais recebidos do BA"
        },
        cenarios_excecao_ba: {
          type: "array",
          items: { type: "string" },
          description: "Cenários de exceção identificados pelo BA"
        },
        user_stories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              titulo: { type: "string" },
              narrativa: { type: "string" },
              mvp: { type: "string" },
              criterios_aceitacao: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["id", "titulo", "narrativa", "criterios_aceitacao"]
          },
          description: "User stories criadas pelo FA"
        },
        estrutura_mvps: {
          type: "object",
          properties: {
            mvp1: { type: "array", items: { type: "string" } },
            mvp2: { type: "array", items: { type: "string" } },
            mvp3: { type: "array", items: { type: "string" } }
          },
          description: "Estrutura de MVPs proposta"
        }
      },
      required: ["requisitos_originais", "cenarios_excecao_ba", "user_stories"]
    }
  },
  {
    name: "fa_propose_functional_flow",
    description: "FA Agent: Propõe fluxo funcional com links entre User Stories. Define a sequência e dependências entre stories.",
    inputSchema: {
      type: "object",
      properties: {
        user_stories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              titulo: { type: "string" },
              descricao: { type: "string" }
            },
            required: ["id", "titulo"]
          },
          description: "Lista de user stories para analisar"
        },
        contexto: {
          type: "string",
          description: "Contexto funcional para identificar dependências"
        }
      },
      required: ["user_stories"]
    }
  },

  // ============================================
  // DA - DESIGN AGENT TOOLS
  // ============================================
  {
    name: "da_create_wireframes",
    description: "DA Agent: Gera especificações de wireframes seguindo o Design System Banco CTT. Inclui estrutura JSON com header, body, footer, estados e navegação.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV (ex: BDEV00000001)"
        },
        user_stories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              screens: {
                type: "array",
                items: { type: "string" },
                description: "Lista de ecrãs necessários para esta US"
              }
            },
            required: ["id", "title"]
          },
          description: "User stories com ecrãs identificados"
        },
        screen_type: {
          type: "string",
          enum: ["mobile", "desktop", "responsive"],
          description: "Tipo de ecrã (default: responsive)"
        },
        include_states: {
          type: "boolean",
          description: "Incluir todos os estados (default, loading, error, empty, success)"
        }
      },
      required: ["bdev_code", "user_stories"]
    }
  },
  {
    name: "da_define_exception_flows",
    description: "DA Agent: Define fluxos de exceção com mensagens seguindo UX Writing Guidelines Banco CTT. Inclui título (max 60 chars), descrição (max 120 chars), tipo e ação.",
    inputSchema: {
      type: "object",
      properties: {
        happy_path: {
          type: "string",
          description: "Descrição do fluxo principal (happy path)"
        },
        exception_scenarios: {
          type: "array",
          items: {
            type: "object",
            properties: {
              scenario: { type: "string", description: "Nome do cenário de exceção" },
              trigger: { type: "string", description: "O que causa este erro" },
              type: {
                type: "string",
                enum: ["blocking", "non_blocking", "informational"],
                description: "Tipo de erro"
              }
            },
            required: ["scenario", "trigger"]
          },
          description: "Cenários de exceção identificados pelo BA/FA"
        }
      },
      required: ["happy_path", "exception_scenarios"]
    }
  },
  {
    name: "da_generate_figma_spec",
    description: "DA Agent: Gera especificação JSON completa para criar páginas e frames no Figma. Cria duas páginas por BDEV: Ecrãs e UX Flow. IMPORTANTE: Inclui sempre sections com components para cada ecrã.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        wireframes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              screen_id: { type: "string" },
              screen_name: { type: "string" },
              user_story: { type: "string" },
              type: { type: "string", enum: ["mobile", "desktop", "responsive"] },
              states: { type: "array", items: { type: "string" } },
              header: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  back_button: { type: "boolean" },
                  close_button: { type: "boolean" }
                },
                description: "Configuração do header do ecrã"
              },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["info_banner", "form", "card_list", "summary", "action"] },
                    title: { type: "string", description: "Título da secção (opcional)" },
                    components: {
                      type: "array",
                      items: { type: "string" },
                      description: "Lista de componentes UI (ex: 'TextInput: Email', 'Button: Confirmar', 'Card: Saldo disponível')"
                    }
                  },
                  required: ["type", "components"]
                },
                description: "Secções do conteúdo do ecrã com componentes UI"
              },
              footer: {
                type: "object",
                properties: {
                  primary_action: { type: "string", description: "Texto do botão principal" },
                  secondary_action: { type: "string", description: "Texto do botão secundário (opcional)" }
                },
                description: "Ações do footer"
              }
            },
            required: ["screen_id", "screen_name"]
          },
          description: "Lista de wireframes com secções e componentes UI detalhados"
        }
      },
      required: ["bdev_code", "wireframes"]
    }
  },
  {
    name: "da_generate_ux_flow",
    description: "DA Agent: Gera a página UX Flow no Figma com diagrama de navegação entre ecrãs. Agrupa por regras de negócio. Linhas verdes = happy path, linhas vermelhas = exceções. Usa os ecrãs reais quando existem.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "ID único do nó (ex: SCR-001 ou NODE-001)" },
              label: { type: "string", description: "Nome/label do nó" },
              screen_id: { type: "string", description: "ID do ecrã associado (se existir). Referencia screen_id do da_generate_figma_spec" },
              mvp: { type: "string", description: "MVP a que o passo pertence (ex: 'MVP1', 'MVP2', 'MVP3')" }
            },
            required: ["id", "label"]
          },
          description: "Nós do diagrama (ecrãs ou pontos de decisão)"
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string", description: "ID do nó de origem" },
              to: { type: "string", description: "ID do nó de destino" },
              type: { type: "string", enum: ["happy", "exception"], description: "Tipo de fluxo: happy (verde) ou exception (vermelho)" },
              label: { type: "string", description: "Descrição da transição (ex: 'Login sucesso', 'Credenciais inválidas')" },
              rule: { type: "string", description: "Regra de negócio associada (ex: 'RN01 - Autenticação')" }
            },
            required: ["from", "to", "type", "label"]
          },
          description: "Conexões entre nós com tipo (happy/exception) e regra de negócio"
        },
        wireframes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              screen_id: { type: "string" },
              screen_name: { type: "string" },
              type: { type: "string", enum: ["mobile", "desktop", "responsive"] },
              header: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  back_button: { type: "boolean" },
                  close_button: { type: "boolean" }
                }
              },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    components: { type: "array", items: { type: "string" } }
                  },
                  required: ["type", "components"]
                }
              },
              footer: {
                type: "object",
                properties: {
                  primary_action: { type: "string" },
                  secondary_action: { type: "string" }
                }
              }
            },
            required: ["screen_id", "screen_name"]
          },
          description: "Wireframes dos ecrãs referenciados nos nós (para renderizar ecrãs reais no flow)"
        }
      },
      required: ["bdev_code", "nodes", "connections"]
    }
  },
  {
    name: "da_check_design_system",
    description: "DA Agent: Verifica se um componente existe no Design System (bctt-design-system). Se não existir, gera spec para solicitar ao DSLA.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: {
          type: "string",
          description: "Nome do componente a verificar"
        },
        variant: {
          type: "string",
          description: "Variante específica (opcional)"
        }
      },
      required: ["component_name"]
    }
  },
  {
    name: "da_get_design_tokens",
    description: "DA Agent: Retorna os design tokens do Banco CTT (cores, espaçamentos, tipografia, border radius).",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["colors", "spacing", "typography", "borderRadius", "all"],
          description: "Categoria de tokens (default: all)"
        }
      }
    }
  },
  {
    name: "da_validate_accessibility",
    description: "DA Agent: Valida wireframes contra requisitos WCAG 2.1 AA.",
    inputSchema: {
      type: "object",
      properties: {
        wireframe: {
          type: "object",
          description: "Wireframe a validar"
        }
      },
      required: ["wireframe"]
    }
  },
  {
    name: "da_create_screen_copy",
    description: "DA Agent: Cria copy para ecrãs em PT e EN. OBRIGATÓRIO: Todo texto visível deve ter tradução. Gera estrutura para i18n.",
    inputSchema: {
      type: "object",
      properties: {
        screen_id: {
          type: "string",
          description: "ID do ecrã (ex: SCR-001)"
        },
        screen_name: {
          type: "string",
          description: "Nome do ecrã"
        },
        user_story: {
          type: "string",
          description: "User story relacionada"
        },
        elements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["header", "button", "label", "placeholder", "helper", "error", "title", "description"],
                description: "Tipo de elemento"
              },
              name: {
                type: "string",
                description: "Nome/identificador do elemento"
              },
              valuePT: {
                type: "string",
                description: "Valor em Português (PT-PT)"
              },
              valueEN: {
                type: "string",
                description: "Valor em Inglês"
              }
            },
            required: ["type", "name", "valuePT", "valueEN"]
          },
          description: "Lista de elementos com traduções"
        }
      },
      required: ["screen_id", "screen_name", "elements"]
    }
  },
  {
    name: "da_generate_translations_excel",
    description: "DA Agent: Gera ficheiro Excel com todas as traduções. Estrutura: Código React | PT | EN. Inclui sheet de resumo e traduções standard.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        screens: {
          type: "array",
          items: {
            type: "object",
            properties: {
              screen_id: { type: "string" },
              screen_name: { type: "string" },
              user_story: { type: "string" },
              translations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    componentCode: { type: "string" },
                    description: { type: "string" },
                    valuePT: { type: "string" },
                    valueEN: { type: "string" }
                  },
                  required: ["componentCode", "valuePT", "valueEN"]
                }
              }
            },
            required: ["screen_id", "screen_name", "translations"]
          },
          description: "Lista de ecrãs com traduções"
        }
      },
      required: ["bdev_code", "screens"]
    }
  },
  {
    name: "da_get_standard_translations",
    description: "DA Agent: Retorna traduções standard para elementos comuns (botões, formulários, feedback, navegação).",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["button", "form", "validation", "feedback", "error", "nav", "date", "currency", "common", "all"],
          description: "Categoria de traduções (default: all)"
        }
      }
    }
  },
  {
    name: "da_get_component_spec",
    description: "DA Agent: Retorna especificação completa de um componente do Design System (props, variantes, a11y, guidelines).",
    inputSchema: {
      type: "object",
      properties: {
        component_name: {
          type: "string",
          description: "Nome do componente (ex: Button, Input, Card)"
        }
      },
      required: ["component_name"]
    }
  },
  {
    name: "da_list_components",
    description: "DA Agent: Lista todos os componentes disponíveis no Design System, opcionalmente filtrados por categoria.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Categoria (Buttons, Forms, Cards, etc.) - opcional"
        },
        search: {
          type: "string",
          description: "Termo de pesquisa - opcional"
        }
      }
    }
  },

  // ============================================
  // PA - PROTOTYPE AGENT TOOLS
  // ============================================
  {
    name: "pa_list_prototypes",
    description: "PA Agent: Lista protótipos existentes, opcionalmente filtrados por BDEV. Mostra versão, status e data.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV para filtrar (opcional)"
        }
      }
    }
  },
  {
    name: "pa_get_prototype",
    description: "PA Agent: Recupera um protótipo específico pelo ID ou por BDEV+versão. Retorna código gerado e traduções.",
    inputSchema: {
      type: "object",
      properties: {
        prototype_id: {
          type: "string",
          description: "ID do protótipo (opcional se usar bdev_code)"
        },
        bdev_code: {
          type: "string",
          description: "Código BDEV (opcional se usar prototype_id)"
        },
        version: {
          type: "number",
          description: "Versão específica (opcional, usa última se não especificado)"
        }
      }
    }
  },
  {
    name: "pa_create_prototype",
    description: "PA Agent: Cria ou atualiza protótipo React baseado em wireframes do DA e jornadas do FA.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        journeys: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              screens: { type: "array", items: { type: "string" } },
              userStories: { type: "array", items: { type: "string" } }
            },
            required: ["id", "name", "screens"]
          },
          description: "Jornadas aprovadas pelo FA"
        },
        wireframes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              screenId: { type: "string", description: "ID do ecrã (ex: SCR-001)" },
              screenName: { type: "string", description: "Nome do ecrã (ex: Consulta de Saldos)" },
              userStory: { type: "string", description: "User Story associada (ex: US001)" },
              header: {
                type: "object",
                description: "Cabeçalho do ecrã",
                properties: {
                  title: { type: "string", description: "Título do ecrã" },
                  backButton: { type: "boolean" },
                  closeButton: { type: "boolean" }
                }
              },
              body: {
                type: "object",
                description: "Corpo do ecrã com secções e componentes",
                properties: {
                  sections: {
                    type: "array",
                    description: "Secções do ecrã",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", description: "Tipo de secção: info, form, list, content, actions" },
                        components: {
                          type: "array",
                          description: "Componentes da secção",
                          items: {
                            type: "object",
                            properties: {
                              type: { type: "string", description: "Tipo: button, textfield, card, text, alert, select, list, checkbox, divider" },
                              name: { type: "string", description: "Nome identificador" },
                              valuePT: { type: "string", description: "Texto em PT" },
                              valueEN: { type: "string", description: "Texto em EN" }
                            },
                            required: ["type", "name"]
                          }
                        }
                      },
                      required: ["type", "components"]
                    }
                  }
                },
                required: ["sections"]
              },
              footer: {
                type: "object",
                description: "Rodapé com ações",
                properties: {
                  primaryAction: { type: "string", description: "Texto do botão principal" },
                  secondaryAction: { type: "string", description: "Texto do botão secundário" }
                }
              }
            },
            required: ["screenId", "screenName", "body"]
          },
          description: "Wireframes do DA. Cada wireframe tem body.sections[].components[] com componentes do Design System."
        },
        approved_by: {
          type: "string",
          enum: ["FA", "Client"],
          description: "Quem aprovou (opcional)"
        }
      },
      required: ["bdev_code", "journeys", "wireframes"]
    }
  },
  {
    name: "pa_compare_versions",
    description: "PA Agent: Compara versões do protótipo (FA approved vs Client approved). Identifica alterações.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        source_version: {
          type: "number",
          description: "Versão origem (opcional)"
        },
        target_version: {
          type: "number",
          description: "Versão destino (opcional)"
        }
      },
      required: ["bdev_code"]
    }
  },
  {
    name: "pa_apply_changes",
    description: "PA Agent: Aplica alterações do cliente para criar versão final do protótipo.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        }
      },
      required: ["bdev_code"]
    }
  },
  {
    name: "pa_export_prototype",
    description: "PA Agent: Exporta protótipo como pacote (ficheiros TSX, traduções JSON, App.tsx, README).",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        version: {
          type: "number",
          description: "Versão específica (opcional)"
        }
      },
      required: ["bdev_code"]
    }
  },
  {
    name: "pa_approve_prototype",
    description: "PA Agent: Marca um protótipo como aprovado pelo FA ou Cliente.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        version: {
          type: "number",
          description: "Versão a aprovar"
        },
        approved_by: {
          type: "string",
          enum: ["FA", "Client"],
          description: "Quem aprova"
        }
      },
      required: ["bdev_code", "version", "approved_by"]
    }
  },

  {
    name: "pa_deploy_prototype",
    description: "PA Agent: Exporta protótipo para projeto Vite+React, instala dependências e inicia servidor local. Retorna URL (http://localhost:5173) para testar.",
    inputSchema: {
      type: "object",
      properties: {
        bdev_code: {
          type: "string",
          description: "Código BDEV"
        },
        version: {
          type: "number",
          description: "Versão específica (opcional, usa última)"
        }
      },
      required: ["bdev_code"]
    }
  },

  // ============================================
  // DSLA - DESIGN SYSTEM LIBRARY AGENT TOOLS
  // ============================================
  {
    name: "dsla_create_component",
    description: "DSLA Agent: Cria componente React no projecto bctt-design-system. Escreve ficheiros .tsx + index.ts + actualiza barrel export.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: {
          type: "string",
          description: "Nome do componente (PascalCase, ex: Stepper, Skeleton)"
        },
        atomic_level: {
          type: "string",
          enum: ["atom", "molecule", "organism", "template"],
          description: "Nível no Atomic Design"
        },
        base_mui_component: {
          type: "string",
          description: "Componente MUI base a wrapar (ex: Stepper, Skeleton, Accordion). Default: Box"
        },
        variants: {
          type: "array",
          items: { type: "string" },
          description: "Variantes visuais (ex: ['horizontal', 'vertical'])"
        },
        design_tokens: {
          type: "object",
          description: "Design tokens BCTT a aplicar (ex: { activeColor: '#E00024', fontFamily: 'Inter' })"
        },
        figma_link: {
          type: "string",
          description: "Link do design no Figma (opcional)"
        },
        props: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              required: { type: "boolean" },
              description: { type: "string" }
            }
          },
          description: "Props do componente"
        }
      },
      required: ["component_name", "atomic_level"]
    }
  },
  {
    name: "dsla_generate_stories",
    description: "DSLA Agent: Gera e escreve ficheiro .stories.tsx no projecto bctt-design-system para Storybook.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: {
          type: "string",
          description: "Nome do componente"
        },
        variants: {
          type: "array",
          items: { type: "string" },
          description: "Variantes a documentar"
        }
      },
      required: ["component_name"]
    }
  },
  {
    name: "dsla_check_accessibility",
    description: "DSLA Agent: Verifica conformidade WCAG 2.1 AA de um componente.",
    inputSchema: {
      type: "object",
      properties: {
        component_code: {
          type: "string",
          description: "Código do componente para verificar"
        }
      },
      required: ["component_code"]
    }
  },
  {
    name: "dsla_get_component_spec",
    description: "DSLA Agent: Consulta especificação de um componente no catálogo do Design System (35+ specs com props, variantes, a11y, usage).",
    inputSchema: {
      type: "object",
      properties: {
        component_name: {
          type: "string",
          description: "Nome do componente (ex: ButtonPrimary, TextField, Card)"
        }
      },
      required: ["component_name"]
    }
  },
  {
    name: "dsla_build_design_system",
    description: "DSLA Agent: Compila o projecto bctt-design-system (npm run build). Chamar DEPOIS de criar todos os componentes.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // ============================================
  // JIRA TOOLS (imported from jira module)
  // ============================================
  ...jiraTools,
];

// ============================================
// INPUT NORMALIZATION (PA tools)
// ============================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function normalizeComponent(c: any): WireframeElement {
  if (typeof c === 'string') return { type: 'text', name: c };
  return {
    type: c.type || 'text',
    name: c.name || c.label || c.type || 'component',
    props: c.props,
    children: Array.isArray(c.children) ? c.children.map(normalizeComponent) : undefined,
    i18nKey: c.i18nKey || c.i18n_key,
    valuePT: c.valuePT || c.value_pt || c.pt,
    valueEN: c.valueEN || c.value_en || c.en,
  };
}

function normalizeBody(body: any): WireframeScreen['body'] {
  if (!body) return { sections: [] };

  // If body.sections exists and is array, normalize each section
  if (Array.isArray(body.sections)) {
    return {
      sections: body.sections.map((s: any) => ({
        type: s.type || 'content',
        components: Array.isArray(s.components) ? s.components.map(normalizeComponent) : [],
      })),
    };
  }

  // If body.components exists (flat list without sections wrapper)
  if (Array.isArray(body.components)) {
    return {
      sections: [{ type: 'content', components: body.components.map(normalizeComponent) }],
    };
  }

  // If body has properties that look like component arrays
  const sections: Array<{ type: string; components: WireframeElement[] }> = [];
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      sections.push({ type: key, components: (value as any[]).map(normalizeComponent) });
    }
  }
  if (sections.length > 0) return { sections };

  // Fallback: empty sections
  return { sections: [] };
}

function normalizeWireframes(wireframes: any[]): WireframeScreen[] {
  return wireframes.map((w: any) => ({
    screenId: w.screenId || w.screen_id || `SCR-${Math.random().toString(36).substr(2, 4)}`,
    screenName: w.screenName || w.screen_name || w.name || 'Screen',
    userStory: w.userStory || w.user_story,
    header: w.header ? {
      title: w.header.title || w.header.name || '',
      titlePT: w.header.titlePT || w.header.title_pt,
      titleEN: w.header.titleEN || w.header.title_en,
      backButton: w.header.backButton ?? w.header.back_button ?? false,
      closeButton: w.header.closeButton ?? w.header.close_button ?? false,
    } : undefined,
    body: normalizeBody(w.body),
    footer: w.footer ? {
      primaryAction: w.footer.primaryAction || w.footer.primary_action || w.footer.primary,
      primaryActionPT: w.footer.primaryActionPT,
      primaryActionEN: w.footer.primaryActionEN,
      secondaryAction: w.footer.secondaryAction || w.footer.secondary_action || w.footer.secondary,
      secondaryActionPT: w.footer.secondaryActionPT,
      secondaryActionEN: w.footer.secondaryActionEN,
    } : undefined,
    navigation: w.navigation ? {
      next: w.navigation.next,
      previous: w.navigation.previous,
    } : undefined,
  }));
}

function normalizeJourneys(journeys: any[]): Journey[] {
  return journeys.map((j: any) => ({
    id: j.id || `J${Math.random().toString(36).substr(2, 4)}`,
    name: j.name || 'Journey',
    screens: Array.isArray(j.screens) ? j.screens : [],
    userStories: Array.isArray(j.userStories || j.user_stories) ? (j.userStories || j.user_stories) : [],
  }));
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// Tool handlers
const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  // BA Tools
  ba_analyze_requirements: async (args) => {
    const { functionality_name, description, context } = args as {
      functionality_name: string;
      description: string;
      context?: string;
    };

    return JSON.stringify({
      agent: "BA",
      action: "analyze_requirements",
      output: {
        functionality: functionality_name,
        analysis: {
          objectives: [
            `Objetivo principal: ${description}`,
            "Objetivo secundário: Melhorar experiência do utilizador"
          ],
          business_impact: "Alto - Funcionalidade core do produto",
          affected_users: ["Clientes", "Gestores de conta"],
          technical_constraints: context ? [context] : [],
          next_steps: [
            "Agendar sessão de levantamento com stakeholders",
            "Mapear sistemas impactados",
            "Definir métricas de sucesso"
          ]
        }
      }
    }, null, 2);
  },

  ba_generate_questions: async (args) => {
    const { requirements, area } = args as {
      requirements: string;
      area?: string;
    };

    const questions: Record<string, string[]> = {
      funcional: [
        "Quais são os principais casos de uso?",
        "Existem fluxos alternativos a considerar?",
        "Qual o comportamento esperado em caso de erro?"
      ],
      tecnica: [
        "Quais sistemas precisam ser integrados?",
        "Existem requisitos de performance específicos?",
        "Qual o volume de dados esperado?"
      ],
      negocio: [
        "Qual o ROI esperado desta funcionalidade?",
        "Quem são os stakeholders principais?",
        "Existem requisitos regulamentares?"
      ],
      ux: [
        "Qual o perfil do utilizador alvo?",
        "Existem funcionalidades similares no mercado?",
        "Quais são as principais dores a resolver?"
      ],
      seguranca: [
        "Quais dados sensíveis estão envolvidos?",
        "Existem requisitos de autenticação específicos?",
        "Como deve ser feita a auditoria?"
      ]
    };

    return JSON.stringify({
      agent: "BA",
      action: "generate_questions",
      context: requirements.substring(0, 100) + "...",
      questions: area ? questions[area] : Object.values(questions).flat()
    }, null, 2);
  },


  // FA Tools
  fa_create_user_stories: async (args) => {
    const { requirements, persona, functional_context } = args as {
      requirements: string;
      persona?: string;
      functional_context?: string;
    };

    const userPersona = persona || "Cliente";
    const context = functional_context || "";

    // MVP categorization rules:
    // MVP1: Core functionality - authentication, main flow, mandatory validations
    // MVP2: Complementary - notifications, filters, exports, secondary flows
    // MVP3: Nice-to-have - customizations, advanced analytics, optimizations

    const mvpRules = {
      mvp1Keywords: ["autenticar", "login", "principal", "obrigatório", "validar", "criar", "submeter", "core", "essencial"],
      mvp2Keywords: ["notificar", "email", "filtrar", "exportar", "secundário", "complementar", "histórico"],
      mvp3Keywords: ["personalizar", "analytics", "otimizar", "preferências", "avançado", "nice-to-have"]
    };

    const categorizeMVP = (storyText: string): string => {
      const text = storyText.toLowerCase();
      if (mvpRules.mvp1Keywords.some(kw => text.includes(kw))) return "MVP1";
      if (mvpRules.mvp2Keywords.some(kw => text.includes(kw))) return "MVP2";
      if (mvpRules.mvp3Keywords.some(kw => text.includes(kw))) return "MVP3";
      return "MVP1"; // Default to MVP1 if unclear
    };

    // This is a template response - the actual stories should be generated based on requirements
    // The Claude model will use this structure but generate real content
    return JSON.stringify({
      agent: "FA",
      action: "create_user_stories",
      instructions: "IMPORTANTE: Gerar user stories reais baseadas nos requisitos. Cada US DEVE ter mvp_phase atribuído.",
      mvp_categorization_rules: {
        MVP1: "Funcionalidades core essenciais - fluxo principal, autenticação, validações obrigatórias",
        MVP2: "Funcionalidades complementares - notificações, filtros, exportações, fluxos secundários",
        MVP3: "Nice-to-have - personalizações, analytics avançado, otimizações"
      },
      template: {
        id: "USXXX",
        mvp_phase: "MVP1 | MVP2 | MVP3",
        title: "Título descritivo",
        narrative: `Como ${userPersona}, quero [ação], para [benefício].`,
        acceptance_criteria: [
          "Given [contexto] When [ação] Then [resultado]"
        ]
      },
      context_received: context,
      requirements_received: requirements.substring(0, 500) + "..."
    }, null, 2);
  },

  fa_define_acceptance_criteria: async (args) => {
    const { user_story, include_edge_cases } = args as {
      user_story: string;
      include_edge_cases?: boolean;
    };

    const criteria = [
      {
        scenario: "Cenário principal",
        given: "Dado que o utilizador está autenticado",
        when: "Quando acede à funcionalidade",
        then: "Então deve visualizar o conteúdo esperado"
      }
    ];

    if (include_edge_cases) {
      criteria.push({
        scenario: "Cenário de erro",
        given: "Dado que ocorre um erro de sistema",
        when: "Quando o utilizador tenta executar a ação",
        then: "Então deve ver mensagem de erro apropriada"
      });
    }

    return JSON.stringify({
      agent: "FA",
      action: "define_acceptance_criteria",
      user_story: user_story.substring(0, 100),
      acceptance_criteria: criteria
    }, null, 2);
  },

  fa_export_to_devops: async (args) => {
    const { user_stories, project, iteration } = args as {
      user_stories: string[];
      project: string;
      iteration?: string;
    };

    // Check for Azure DevOps token
    const hasToken = process.env.AZURE_DEVOPS_TOKEN !== undefined;

    return JSON.stringify({
      agent: "FA",
      action: "export_to_devops",
      status: hasToken ? "ready" : "config_required",
      message: hasToken
        ? `${user_stories.length} user stories prontas para exportar para ${project}`
        : "Configure AZURE_DEVOPS_TOKEN no ficheiro .env para exportar",
      project,
      iteration: iteration || "Backlog",
      items_count: user_stories.length
    }, null, 2);
  },

  fa_generate_document: async (args) => {
    const {
      ba_validation_approved,
      titulo,
      codigo_bdev,
      versao,
      autor,
      termos_abreviaturas,
      documentos_relacionados,
      ecras,
      user_stories,
      campos_regras,
    } = args as {
      ba_validation_approved: boolean;
      titulo: string;
      codigo_bdev: string;
      versao?: string;
      autor?: string;
      termos_abreviaturas?: Array<{ termo: string; descricao: string }>;
      documentos_relacionados?: Array<{ nome: string; tipo: string; descricao: string }>;
      ecras: Array<{
        id: string;
        nome: string;
        descricao: string;
        campos: Array<{ id: string; campo: string; regras: string; formatacao: string }>;
      }>;
      user_stories: Array<{ id: string; titulo: string; mvp: string }>;
      campos_regras?: Array<{
        requisito: string;
        userStory: string;
        campos: string;
        regras: string;
        formatacao: string;
      }>;
    };

    // Check if BA validation was approved
    if (!ba_validation_approved) {
      return JSON.stringify({
        agent: "FA",
        action: "generate_document",
        success: false,
        error: "VALIDAÇÃO BA OBRIGATÓRIA",
        message: "Não é possível gerar o documento sem validação do BA. Execute primeiro 'fa_validate_with_ba' e obtenha aprovação antes de gerar o documento.",
        next_step: "Chamar fa_validate_with_ba com os requisitos e user stories para validação"
      }, null, 2);
    }

    try {
      const data: DocumentData = {
        titulo,
        codigoBDEV: codigo_bdev,
        versao: versao || "1.0",
        autor: autor || "FA (Functional Agent)",
        data: new Date().toISOString().split("T")[0],
        termosAbreviaturas: termos_abreviaturas || [],
        documentosRelacionados: documentos_relacionados || [],
        ecras: ecras.map(e => ({
          id: e.id,
          nome: e.nome,
          descricao: e.descricao,
          campos: e.campos,
        })),
        userStories: user_stories,
        camposRegras: campos_regras || [],
      };

      const base64 = await generateDocumentBase64(data);
      const fileName = `${codigo_bdev.replace(/[\[\]]/g, '')}_${titulo.replace(/\s+/g, '_')}.docx`;

      // Persist document to temp file for cross-process access (MCP spawns separate processes per phase)
      const tmpDir = os.tmpdir();
      const checksum = crypto.createHash('sha256').update(base64).digest('hex');
      const docPath = path.join(tmpDir, `fa-doc-${Date.now()}-${codigo_bdev.replace(/[\[\]]/g, '')}.json`);
      const docPayload = JSON.stringify({ fileName, base64, checksum, timestamp: Date.now() });
      fs.writeFileSync(docPath, docPayload);

      // Verify write integrity
      const written = fs.readFileSync(docPath, 'utf-8');
      const parsed = JSON.parse(written);
      if (parsed.checksum !== checksum) {
        throw new Error(`Document write integrity check failed (expected ${checksum}, got ${parsed.checksum})`);
      }
      console.error(`[FA] Document saved: ${docPath} (${Math.round(base64.length * 0.75 / 1024)}KB, checksum: ${checksum.substring(0, 12)}...)`);

      return JSON.stringify({
        agent: "FA",
        action: "generate_document",
        success: true,
        document: {
          fileName,
          checksum,
          sizeKB: Math.round(base64.length * 0.75 / 1024),
          stored: true,
          // base64 NOT included — truncateOutput (2000 chars) would corrupt it.
          // jira_bulk_create_with_document reads the full document from temp file.
        },
        message: `Documento '${fileName}' gerado (${Math.round(base64.length * 0.75 / 1024)}KB, checksum: ${checksum.substring(0, 12)}). Guardado em memória para anexar ao Jira.`,
        next_step: "Use 'jira_bulk_create_with_document' para criar no Jira com documento anexado automaticamente.",
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        agent: "FA",
        action: "generate_document",
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  fa_validate_with_ba: async (args) => {
    const {
      requisitos_originais,
      cenarios_excecao_ba,
      user_stories,
      estrutura_mvps,
    } = args as {
      requisitos_originais: string;
      cenarios_excecao_ba: string[];
      user_stories: Array<{
        id: string;
        titulo: string;
        narrativa: string;
        mvp?: string;
        criterios_aceitacao: string[];
      }>;
      estrutura_mvps?: {
        mvp1?: string[];
        mvp2?: string[];
        mvp3?: string[];
      };
    };

    // Simulate BA validation logic
    const validation = {
      requisitos_cobertos: true,
      cenarios_excecao_cobertos: true,
      gaps_identificados: [] as string[],
      sugestoes: [] as string[],
    };

    // Check if exception scenarios are covered in acceptance criteria
    const allCriteria = user_stories.flatMap(us => us.criterios_aceitacao);
    const criteriaText = allCriteria.join(" ").toLowerCase();

    cenarios_excecao_ba.forEach((cenario, index) => {
      const keywords = cenario.toLowerCase().split(" ");
      const isCovered = keywords.some(kw => kw.length > 4 && criteriaText.includes(kw));

      if (!isCovered) {
        validation.cenarios_excecao_cobertos = false;
        validation.gaps_identificados.push(
          `Cenário de exceção E${index + 1} pode não estar totalmente coberto: "${cenario}"`
        );
      }
    });

    // Check MVP structure
    if (estrutura_mvps) {
      const totalStories = user_stories.length;
      const mvp1Count = estrutura_mvps.mvp1?.length || 0;

      if (mvp1Count === 0) {
        validation.sugestoes.push("MVP1 deve ter pelo menos uma user story para entrega inicial");
      }

      if (mvp1Count > totalStories * 0.6) {
        validation.sugestoes.push("Considerar mover algumas stories do MVP1 para MVP2 para reduzir scope inicial");
      }
    }

    const aprovado = validation.requisitos_cobertos &&
                     validation.cenarios_excecao_cobertos &&
                     validation.gaps_identificados.length === 0;

    return JSON.stringify({
      agent: "BA",
      action: "validate_fa_specs",
      validation_result: {
        aprovado,
        requisitos_cobertos: validation.requisitos_cobertos,
        cenarios_excecao_cobertos: validation.cenarios_excecao_cobertos,
        gaps_identificados: validation.gaps_identificados,
        sugestoes: validation.sugestoes,
        total_user_stories: user_stories.length,
        total_cenarios_excecao: cenarios_excecao_ba.length,
      },
      message: aprovado
        ? "Validação aprovada pelo BA. Pode apresentar ao humano para aprovação final."
        : "Validação com observações. Corrigir gaps antes de apresentar ao humano.",
      next_step: aprovado
        ? "Mostrar lista de títulos ao humano e aguardar aprovação para criar no Jira"
        : "Corrigir os gaps identificados e resubmeter para validação",
    }, null, 2);
  },

  fa_propose_functional_flow: async (args) => {
    const { user_stories, contexto } = args as {
      user_stories: Array<{
        id: string;
        titulo: string;
        descricao?: string;
      }>;
      contexto?: string;
    };

    // Analyze stories and propose flow based on common patterns
    const proposedLinks: Array<{
      from: string;
      to: string;
      linkType: "blocks" | "is_blocked_by" | "relates_to";
      reason: string;
    }> = [];

    // Simple heuristic: look for keywords to determine dependencies
    const dependencyKeywords = {
      authentication: ["login", "autenticar", "autenticação", "sessão"],
      listing: ["lista", "consulta", "ver", "visualizar"],
      detail: ["detalhe", "detalhes", "ver mais"],
      action: ["criar", "editar", "eliminar", "exportar", "enviar"],
      filter: ["filtrar", "filtro", "pesquisar", "ordenar"],
    };

    // Group stories by type
    const authStories = user_stories.filter(us =>
      dependencyKeywords.authentication.some(kw =>
        us.titulo.toLowerCase().includes(kw) || us.descricao?.toLowerCase().includes(kw)
      )
    );

    const listStories = user_stories.filter(us =>
      dependencyKeywords.listing.some(kw =>
        us.titulo.toLowerCase().includes(kw) || us.descricao?.toLowerCase().includes(kw)
      )
    );

    const detailStories = user_stories.filter(us =>
      dependencyKeywords.detail.some(kw =>
        us.titulo.toLowerCase().includes(kw) || us.descricao?.toLowerCase().includes(kw)
      )
    );

    const actionStories = user_stories.filter(us =>
      dependencyKeywords.action.some(kw =>
        us.titulo.toLowerCase().includes(kw) || us.descricao?.toLowerCase().includes(kw)
      )
    );

    // Create links based on patterns
    // Auth -> List (auth blocks list)
    authStories.forEach(auth => {
      listStories.forEach(list => {
        proposedLinks.push({
          from: auth.id,
          to: list.id,
          linkType: "blocks",
          reason: "Autenticação é pré-requisito para consultar listagens",
        });
      });
    });

    // List -> Detail (list blocks detail)
    listStories.forEach(list => {
      detailStories.forEach(detail => {
        proposedLinks.push({
          from: list.id,
          to: detail.id,
          linkType: "blocks",
          reason: "Listagem é necessária para aceder ao detalhe",
        });
      });
    });

    // Detail <-> Actions (relates_to)
    detailStories.forEach(detail => {
      actionStories.forEach(action => {
        proposedLinks.push({
          from: detail.id,
          to: action.id,
          linkType: "relates_to",
          reason: "Ações relacionadas ao detalhe do item",
        });
      });
    });

    // Generate visual flow
    const flowDiagram = proposedLinks.length > 0
      ? proposedLinks.map(link =>
          `${link.from} → (${link.linkType.replace('_', ' ')}) → ${link.to}`
        ).join("\n")
      : "Nenhuma dependência automática identificada. Adicione manualmente se necessário.";

    return JSON.stringify({
      agent: "FA",
      action: "propose_functional_flow",
      flow: {
        total_stories: user_stories.length,
        total_links: proposedLinks.length,
        links: proposedLinks,
        diagram: flowDiagram,
      },
      jira_link_types: [
        { name: "Blocks", description: "Story A blocks Story B" },
        { name: "Relates", description: "Story A relates to Story B" },
      ],
      message: proposedLinks.length > 0
        ? `Proposto fluxo funcional com ${proposedLinks.length} ligações entre stories.`
        : "Analise manual recomendada para identificar dependências.",
      next_step: "Validar fluxo proposto e criar links no Jira após aprovação",
    }, null, 2);
  },

  // DA Tools
  da_create_wireframes: async (args) => {
    const { bdev_code, user_stories, screen_type, include_states } = args as {
      bdev_code: string;
      user_stories: Array<{ id: string; title: string; screens?: string[] }>;
      screen_type?: string;
      include_states?: boolean;
    };

    const type = (screen_type || "responsive") as 'mobile' | 'desktop' | 'responsive';
    const states = include_states !== false
      ? ['default', 'loading', 'error', 'empty', 'success'] as const
      : ['default'] as const;

    // Generate wireframes for each screen identified
    const wireframes: WireframeSpec[] = [];
    let screenIndex = 1;

    user_stories.forEach(us => {
      const screens = us.screens || [`Ecrã principal - ${us.title}`];
      screens.forEach(screenName => {
        wireframes.push({
          screenId: `SCR-${String(screenIndex).padStart(3, '0')}`,
          screenName,
          userStory: us.id,
          type,
          width: type === 'desktop' ? 1440 : 375,
          height: type === 'desktop' ? 900 : 812,
          header: {
            title: screenName,
            backButton: screenIndex > 1,
            closeButton: false,
          },
          sections: [
            { type: 'form', components: ['Input', 'Button'] }
          ],
          footer: {
            primaryAction: 'Continuar',
            secondaryAction: null,
          },
          states: [...states],
        });
        screenIndex++;
      });
    });

    return JSON.stringify({
      agent: "DA",
      action: "create_wireframes",
      bdev_code,
      total_screens: wireframes.length,
      wireframes: wireframes.map(w => ({
        screen_id: w.screenId,
        screen_name: w.screenName,
        user_story: w.userStory,
        type: w.type,
        dimensions: `${w.width}x${w.height}`,
        header: w.header,
        footer: w.footer,
        states: w.states,
        navigation: {
          previous: wireframes.findIndex(x => x.screenId === w.screenId) > 0
            ? wireframes[wireframes.findIndex(x => x.screenId === w.screenId) - 1].screenId
            : null,
          next: wireframes.findIndex(x => x.screenId === w.screenId) < wireframes.length - 1
            ? wireframes[wireframes.findIndex(x => x.screenId === w.screenId) + 1].screenId
            : null,
        }
      })),
      design_system: {
        name: "Banco CTT Design System",
        source: "bctt-design-system",
        zeroheight: "https://zeroheight.com/071c7112f"
      },
      next_step: "Use da_define_exception_flows para definir fluxos de erro, depois da_generate_figma_spec para exportar"
    }, null, 2);
  },

  da_define_exception_flows: async (args) => {
    const { happy_path, exception_scenarios } = args as {
      happy_path: string;
      exception_scenarios: Array<{ scenario: string; trigger: string; type?: string }>;
    };

    // UX Writing Guidelines - Standard messages
    const uxMessages: Record<string, { title: string; description: string; action: string }> = {
      timeout: {
        title: "Algo demorou mais do que o esperado",
        description: "Estamos a tentar novamente. Por favor aguarde.",
        action: "retry"
      },
      service_unavailable: {
        title: "Serviço temporariamente indisponível",
        description: "Por favor tente novamente mais tarde.",
        action: "retry"
      },
      session_expired: {
        title: "A sua sessão expirou",
        description: "Por razões de segurança, precisa de iniciar sessão novamente.",
        action: "redirect"
      },
      validation: {
        title: "Verifique os dados",
        description: "Existem campos que precisam de ser corrigidos.",
        action: "dismiss"
      },
      insufficient_funds: {
        title: "Saldo insuficiente",
        description: "A conta selecionada não tem saldo disponível para esta operação.",
        action: "redirect"
      },
      not_eligible: {
        title: "Não é possível continuar",
        description: "De momento não é possível subscrever este serviço. Contacte-nos para mais informações.",
        action: "contact_support"
      }
    };

    const flows = exception_scenarios.map((scenario, index) => {
      const errorCode = `FE${String(index + 1).padStart(3, '0')}`;
      const errorType = scenario.type || 'non_blocking';

      // Try to match with standard messages
      const key = scenario.scenario.toLowerCase().includes('timeout') ? 'timeout'
        : scenario.scenario.toLowerCase().includes('sessão') ? 'session_expired'
        : scenario.scenario.toLowerCase().includes('validação') ? 'validation'
        : scenario.scenario.toLowerCase().includes('saldo') ? 'insufficient_funds'
        : scenario.scenario.toLowerCase().includes('elegib') ? 'not_eligible'
        : 'service_unavailable';

      const message = uxMessages[key];

      return {
        error_code: errorCode,
        scenario: scenario.scenario,
        trigger: scenario.trigger,
        type: errorType,
        ux_message: {
          title: message.title,
          description: message.description,
          title_length: message.title.length,
          description_length: message.description.length,
          validation: {
            title_ok: message.title.length <= 60,
            description_ok: message.description.length <= 120
          }
        },
        action_type: message.action,
        display: errorType === 'blocking' ? 'modal' : errorType === 'informational' ? 'inline' : 'toast',
        recovery: errorType !== 'blocking' ? 'Auto-dismiss após 5s ou botão fechar' : 'Ação obrigatória'
      };
    });

    return JSON.stringify({
      agent: "DA",
      action: "define_exception_flows",
      happy_path,
      exception_flows: flows,
      ux_writing_guidelines: {
        principles: [
          "Nunca culpar o utilizador",
          "Ser específico sobre o problema",
          "Sempre indicar próximos passos",
          "Tom profissional, empático, direto"
        ],
        limits: {
          title_max_chars: 60,
          description_max_chars: 120
        }
      },
      next_step: "Integrar estes fluxos nos wireframes usando da_create_wireframes"
    }, null, 2);
  },

  da_generate_figma_spec: async (args) => {
    const { bdev_code, wireframes } = args as {
      bdev_code: string;
      wireframes: Array<{
        screen_id: string;
        screen_name: string;
        user_story?: string;
        type?: string;
        states?: string[];
        header?: { title?: string; back_button?: boolean; close_button?: boolean };
        sections?: Array<{ type: string; title?: string; components: string[] }>;
        footer?: { primary_action?: string; secondary_action?: string };
      }>;
    };

    // Convert to WireframeSpec format (now with real sections/components)
    const specs: WireframeSpec[] = wireframes.map(w => ({
      screenId: w.screen_id,
      screenName: w.screen_name,
      userStory: w.user_story || '',
      type: (w.type as 'mobile' | 'desktop' | 'responsive') || 'responsive',
      width: w.type === 'desktop' ? 1440 : 375,
      height: w.type === 'desktop' ? 900 : 812,
      header: {
        title: w.header?.title || w.screen_name,
        backButton: w.header?.back_button !== false,
        closeButton: w.header?.close_button || false,
      },
      sections: w.sections && w.sections.length > 0
        ? w.sections.map(s => ({
            type: s.type as WireframeSpec['sections'][0]['type'],
            components: s.components || [],
          }))
        : [{ type: 'form' as const, components: ['Placeholder: Conteúdo pendente'] }],
      footer: {
        primaryAction: w.footer?.primary_action || 'Continuar',
        secondaryAction: w.footer?.secondary_action || null,
      },
      states: (w.states as WireframeSpec['states']) || ['default', 'loading', 'error', 'empty'],
    }));

    // Generate Figma export JSON
    const figmaJson = exportForFigmaPlugin(bdev_code, specs);
    const figmaSpec = JSON.parse(figmaJson);

    // Automatically send to Figma plugin via API (with timeout protection)
    // Now includes full section/component data for the plugin to render
    let figmaSent = false;
    let figmaError: string | null = null;

    try {
      const apiPort = process.env.API_PORT || 3001;
      const response = await safeFetch(
        `http://localhost:${apiPort}/figma/command`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'create-bdev-structure',
            bdevCode: bdev_code,
            screens: specs.map(s => ({
              id: s.screenId,
              name: s.screenName,
              type: s.type,
              states: s.states,
              header: s.header,
              sections: s.sections,
              footer: s.footer,
            })),
          }),
        },
        FIGMA_TIMEOUT_MS,
        'Figma API'
      );

      if (response.ok) {
        figmaSent = true;
      } else {
        const errorData = await response.json() as Record<string, string>;
        figmaError = errorData.message || 'Failed to send to Figma';
      }
    } catch (err) {
      figmaError = `Figma plugin não conectado ou timeout: ${String(err)}`;
    }

    return JSON.stringify({
      agent: "DA",
      action: "generate_figma_spec",
      bdev_code,
      figma_project: {
        file_key: process.env.FIGMA_FILE_KEY || "iYTDVqOqX2DpMkZCHZq8px",
        project_name: "AI Tests"
      },
      pages_to_create: [
        `${bdev_code} - Ecrãs`,
        `${bdev_code} - UX Flow`
      ],
      total_frames: specs.length * 4, // 4 states per screen
      figma_auto_send: {
        success: figmaSent,
        message: figmaSent
          ? `Enviado automaticamente para Figma plugin! ${specs.length} ecrãs criados com componentes.`
          : `Não foi possível enviar ao Figma: ${figmaError}. Verifique se o plugin BCTT Bridge está conectado.`,
      },
      figma_spec_summary: {
        screens: specs.length,
        states_per_screen: 4,
        components_per_screen: specs.map(s => ({
          screen: s.screenName,
          sections: s.sections.length,
          total_components: s.sections.reduce((sum, sec) => sum + sec.components.length, 0),
        })),
      },
    }, null, 2);
  },

  da_generate_ux_flow: async (args) => {
    const { bdev_code, nodes, connections, wireframes } = args as {
      bdev_code: string;
      nodes: Array<{ id: string; label: string; screen_id?: string; mvp?: string }>;
      connections: Array<{ from: string; to: string; type: 'happy' | 'exception'; label: string; rule?: string }>;
      wireframes?: Array<{
        screen_id: string;
        screen_name: string;
        type?: string;
        header?: { title?: string; back_button?: boolean; close_button?: boolean };
        sections?: Array<{ type: string; components: string[] }>;
        footer?: { primary_action?: string; secondary_action?: string };
      }>;
    };

    // Convert wireframes to WireframeSpec format
    const wireframeSpecs: WireframeSpec[] = (wireframes || []).map(w => ({
      screenId: w.screen_id,
      screenName: w.screen_name,
      userStory: '',
      type: (w.type as 'mobile' | 'desktop' | 'responsive') || 'responsive',
      width: w.type === 'desktop' ? 1440 : 375,
      height: w.type === 'desktop' ? 900 : 812,
      header: {
        title: w.header?.title || w.screen_name,
        backButton: w.header?.back_button !== false,
        closeButton: w.header?.close_button || false,
      },
      sections: w.sections && w.sections.length > 0
        ? w.sections.map(s => ({
            type: s.type as WireframeSpec['sections'][0]['type'],
            components: s.components || [],
          }))
        : [{ type: 'form' as const, components: ['Placeholder'] }],
      footer: {
        primaryAction: w.footer?.primary_action || null,
        secondaryAction: w.footer?.secondary_action || null,
      },
      states: ['default'],
    }));

    // Convert nodes
    const flowNodes: FlowNode[] = nodes.map(n => ({
      id: n.id,
      label: n.label,
      screenId: n.screen_id,
      mvp: n.mvp,
    }));

    // Convert connections
    const flowConnections: FlowConnection[] = connections.map(c => ({
      from: c.from,
      to: c.to,
      type: c.type,
      label: c.label,
      rule: c.rule,
    }));

    // Generate UX Flow page spec
    const flowPageSpec = generateUxFlowPage({
      bdevCode: bdev_code,
      nodes: flowNodes,
      connections: flowConnections,
      wireframes: wireframeSpecs,
    });

    // Send to Figma plugin via API
    let figmaSent = false;
    let figmaError: string | null = null;

    try {
      const apiPort = process.env.API_PORT || 3001;
      const response = await safeFetch(
        `http://localhost:${apiPort}/figma/command`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'create-ux-flow',
            bdevCode: bdev_code,
            flowPage: flowPageSpec,
          }),
        },
        FIGMA_TIMEOUT_MS,
        'Figma UX Flow'
      );

      if (response.ok) {
        figmaSent = true;
      } else {
        const errorData = await response.json() as Record<string, string>;
        figmaError = errorData.message || 'Failed to send UX Flow to Figma';
      }
    } catch (err) {
      figmaError = `Figma plugin não conectado ou timeout: ${String(err)}`;
    }

    // Count unique rules
    const rules = new Set(connections.map(c => c.rule || 'Fluxo Geral'));
    const happyCount = connections.filter(c => c.type === 'happy').length;
    const exceptionCount = connections.filter(c => c.type === 'exception').length;

    return JSON.stringify({
      agent: "DA",
      action: "generate_ux_flow",
      bdev_code,
      flow_page: `${bdev_code} - UX Flow`,
      figma_auto_send: {
        success: figmaSent,
        message: figmaSent
          ? `UX Flow enviado para Figma! ${nodes.length} nós, ${connections.length} conexões, ${rules.size} regras de negócio.`
          : `Não foi possível enviar ao Figma: ${figmaError}. Verifique se o plugin BCTT Bridge está conectado.`,
      },
      summary: {
        total_nodes: nodes.length,
        screens_with_frames: wireframeSpecs.length,
        text_only_nodes: nodes.length - wireframeSpecs.length,
        total_connections: connections.length,
        happy_paths: happyCount,
        exception_flows: exceptionCount,
        business_rules: Array.from(rules),
      },
    }, null, 2);
  },

  da_check_design_system: async (args) => {
    const { component_name, variant } = args as {
      component_name: string;
      variant?: string;
    };

    // Available components in bctt-design-system
    const availableComponents: Record<string, string[]> = {
      'Button': ['primary', 'secondary', 'ghost', 'icon-only', 'round'],
      'Input': ['text', 'number', 'currency', 'password', 'search'],
      'Select': ['default', 'multi'],
      'Card': ['account', 'info', 'summary', 'profile'],
      'Badge': ['default', 'primary', 'success', 'warning', 'error', 'info'],
      'Alert': ['success', 'warning', 'error', 'info'],
      'Avatar': ['small', 'medium', 'large'],
      'Checkbox': ['default'],
      'Radio': ['default'],
      'Toggle': ['default'],
      'Switch': ['default'],
      'Slider': ['default', 'range'],
      'Toast': ['success', 'warning', 'error', 'info'],
      'Banner': ['info', 'warning', 'error'],
      'Modal': ['default', 'confirmation', 'alert'],
      'Drawer': ['left', 'right', 'bottom'],
      'Tabs': ['default', 'pills'],
      'Stepper': ['horizontal', 'vertical'],
      'List': ['item', 'transaction', 'profile', 'collapsible'],
      'Accordion': ['default'],
      'Tooltip': ['default'],
      'Popover': ['default'],
    };

    const componentLower = component_name.charAt(0).toUpperCase() + component_name.slice(1).toLowerCase();
    const found = Object.keys(availableComponents).find(
      c => c.toLowerCase() === component_name.toLowerCase()
    );

    if (found) {
      const variants = availableComponents[found];
      const variantExists = !variant || variants.includes(variant.toLowerCase());

      return JSON.stringify({
        agent: "DA",
        action: "check_design_system",
        component: found,
        exists: true,
        variants_available: variants,
        requested_variant: variant || null,
        variant_exists: variantExists,
        usage: variantExists
          ? `Usar <${found} variant="${variant || variants[0]}" /> do bctt-design-system`
          : `Variante '${variant}' não existe. Variantes disponíveis: ${variants.join(', ')}`,
        import_path: `import { ${found} } from '@bctt/design-system';`
      }, null, 2);
    } else {
      return JSON.stringify({
        agent: "DA",
        action: "check_design_system",
        component: component_name,
        exists: false,
        message: `Componente '${component_name}' não existe no Design System.`,
        action_required: "Solicitar ao DSLA para criar o componente",
        dsla_request_spec: {
          component_name: componentLower,
          atomic_level: "molecule",
          suggested_props: [
            { name: "variant", type: "string", required: false },
            { name: "children", type: "React.ReactNode", required: true }
          ],
          design_reference: "Consultar Zeroheight para especificações visuais"
        },
        similar_components: Object.keys(availableComponents).filter(
          c => c.toLowerCase().includes(component_name.toLowerCase().slice(0, 3))
        )
      }, null, 2);
    }
  },

  da_get_design_tokens: async (args) => {
    const { category } = args as { category?: string };

    const tokens = {
      colors: figmaDesignTokens.colors,
      spacing: figmaDesignTokens.spacing,
      typography: figmaDesignTokens.typography,
      borderRadius: figmaDesignTokens.borderRadius,
    };

    const cat = category || 'all';

    return JSON.stringify({
      agent: "DA",
      action: "get_design_tokens",
      design_system: "Banco CTT Design System",
      source: "bctt-design-system + Zeroheight",
      tokens: cat === 'all' ? tokens : { [cat]: tokens[cat as keyof typeof tokens] },
      usage: {
        colors: "import { colors } from '@bctt/design-system/theme'",
        spacing: "import { spacingTokens } from '@bctt/design-system/theme'",
        all: "import { bcttTheme } from '@bctt/design-system/theme'"
      }
    }, null, 2);
  },

  da_validate_accessibility: async (args) => {
    const { wireframe } = args as { wireframe: Record<string, unknown> };

    const checks = [
      {
        rule: "WCAG 2.1 - 1.4.3 Contrast (Minimum)",
        level: "AA",
        status: "pass",
        note: "Usar cores do Design System garante contraste 4.5:1"
      },
      {
        rule: "WCAG 2.1 - 2.5.5 Target Size",
        level: "AAA",
        status: "check",
        note: "Touch targets devem ter mínimo 44x44px",
        recommendation: "Verificar que todos os botões têm altura >= 44px"
      },
      {
        rule: "WCAG 2.1 - 2.4.6 Headings and Labels",
        level: "AA",
        status: "check",
        note: "Labels devem ser descritivos",
        recommendation: "Garantir que todos os campos têm labels visíveis"
      },
      {
        rule: "WCAG 2.1 - 1.3.1 Info and Relationships",
        level: "A",
        status: "check",
        note: "Estrutura semântica",
        recommendation: "Usar heading hierarchy correto (H1 > H2 > H3)"
      },
      {
        rule: "WCAG 2.1 - 2.1.1 Keyboard",
        level: "A",
        status: "check",
        note: "Navegação por teclado",
        recommendation: "Garantir focus visible em todos os interativos"
      }
    ];

    return JSON.stringify({
      agent: "DA",
      action: "validate_accessibility",
      wcag_level: "AA",
      wireframe_id: (wireframe as { screen_id?: string }).screen_id || "unknown",
      total_checks: checks.length,
      passed: checks.filter(c => c.status === "pass").length,
      to_verify: checks.filter(c => c.status === "check").length,
      checks,
      recommendations: [
        "Usar componentes do Design System (já acessíveis)",
        "Incluir aria-labels em elementos interativos",
        "Testar com screen reader após implementação",
        "Garantir navegação lógica por Tab"
      ]
    }, null, 2);
  },

  da_create_screen_copy: async (args) => {
    const { screen_id, screen_name, user_story, elements } = args as {
      screen_id: string;
      screen_name: string;
      user_story?: string;
      elements: Array<{
        type: 'header' | 'button' | 'label' | 'placeholder' | 'helper' | 'error' | 'title' | 'description';
        name: string;
        valuePT: string;
        valueEN: string;
      }>;
    };

    const screenCopy = generateScreenTranslations(
      screen_id,
      screen_name,
      user_story || '',
      elements
    );

    // Validate all translations
    const validationResults = screenCopy.translations.map(t => ({
      key: t.componentCode,
      ...validateTranslation(t)
    }));

    const allValid = validationResults.every(r => r.valid);
    const warnings = validationResults.flatMap(r => r.warnings);

    return JSON.stringify({
      agent: "DA",
      action: "create_screen_copy",
      screen: {
        id: screen_id,
        name: screen_name,
        userStory: user_story || '',
      },
      translations: screenCopy.translations.map(t => ({
        componentCode: t.componentCode,
        valuePT: t.valuePT,
        valueEN: t.valueEN,
        description: t.description,
      })),
      validation: {
        allValid,
        totalEntries: screenCopy.translations.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      i18n_usage: {
        react: `import { useTranslation } from 'react-i18next';\nconst { t } = useTranslation();\n// Use: t('${screenCopy.translations[0]?.componentCode || 'key'}')`,
        json_structure: "{ \"pt\": { \"key\": \"valor\" }, \"en\": { \"key\": \"value\" } }"
      },
      next_step: "Use da_generate_translations_excel para exportar todas as traduções para Excel"
    }, null, 2);
  },

  da_generate_translations_excel: async (args) => {
    const { bdev_code, screens } = args as {
      bdev_code: string;
      screens: Array<{
        screen_id: string;
        screen_name: string;
        user_story?: string;
        translations: TranslationEntry[];
      }>;
    };

    try {
      // Convert to ScreenCopy format
      const screenCopies: ScreenCopy[] = screens.map(s => ({
        screenId: s.screen_id,
        screenName: s.screen_name,
        userStory: s.user_story || '',
        translations: s.translations.map(t => ({
          componentCode: t.componentCode,
          description: t.description || '',
          valuePT: t.valuePT,
          valueEN: t.valueEN,
          screen: s.screen_id,
          userStory: s.user_story,
        })),
      }));

      const base64 = await exportTranslationsToBase64(bdev_code, screenCopies);
      const fileName = `${bdev_code}_translations.xlsx`;

      // Also generate JSON for i18n
      const jsonTranslations = generateTranslationsJSON(screenCopies);

      return JSON.stringify({
        agent: "DA",
        action: "generate_translations_excel",
        success: true,
        bdev_code,
        summary: {
          totalScreens: screens.length,
          totalTranslations: screens.reduce((sum, s) => sum + s.translations.length, 0),
          standardTranslationsIncluded: Object.keys(standardTranslations).length,
        },
        excel: {
          fileName,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          base64,
          sheets: ["Translations", "Summary", "Standard Translations"],
        },
        json: {
          pt: `${Object.keys(jsonTranslations.pt).length} keys`,
          en: `${Object.keys(jsonTranslations.en).length} keys`,
          sample: {
            pt: Object.entries(jsonTranslations.pt).slice(0, 3).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
            en: Object.entries(jsonTranslations.en).slice(0, 3).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
          }
        },
        message: `Ficheiro Excel '${fileName}' gerado com sucesso. Use o base64 para download.`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        agent: "DA",
        action: "generate_translations_excel",
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  da_get_standard_translations: async (args) => {
    const { category } = args as { category?: string };
    const cat = category || 'all';

    let filteredTranslations: Record<string, { pt: string; en: string }>;

    if (cat === 'all') {
      filteredTranslations = standardTranslations;
    } else {
      filteredTranslations = Object.entries(standardTranslations)
        .filter(([key]) => key.startsWith(cat + '.'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    }

    const categories = [...new Set(
      Object.keys(standardTranslations).map(k => k.split('.')[0])
    )];

    return JSON.stringify({
      agent: "DA",
      action: "get_standard_translations",
      category: cat,
      available_categories: categories,
      translations: filteredTranslations,
      total: Object.keys(filteredTranslations).length,
      usage: {
        react_i18n: "t('button.confirm') // Returns 'Confirmar' or 'Confirm'",
        import: "import { standardTranslations } from '@bctt/translations';",
      },
      ux_writing_guidelines: {
        titleMaxChars: 60,
        descriptionMaxChars: 120,
        tone: "Profissional, empático, direto",
        principles: [
          "Nunca culpar o utilizador",
          "Ser específico sobre o problema",
          "Sempre indicar próximos passos"
        ]
      }
    }, null, 2);
  },

  da_get_component_spec: async (args) => {
    const { component_name } = args as { component_name: string };

    const spec = getComponentSpec(component_name);

    if (spec) {
      return JSON.stringify({
        agent: "DA",
        action: "get_component_spec",
        found: true,
        component: {
          name: spec.name,
          category: spec.category,
          atomicLevel: spec.atomicLevel,
          variants: spec.variants,
          sizes: spec.sizes,
          states: spec.states,
          props: spec.props,
          accessibility: spec.a11y,
          usage: spec.usage,
          zeroheightUrl: spec.zeroheightUrl,
        },
        import_path: `import { ${spec.name.replace(/[^a-zA-Z]/g, '')} } from '@bctt/design-system';`,
      }, null, 2);
    } else {
      const similar = searchComponents(component_name);
      return JSON.stringify({
        agent: "DA",
        action: "get_component_spec",
        found: false,
        message: `Componente '${component_name}' não encontrado no Design System.`,
        similar_components: similar.slice(0, 5).map(s => s.name),
        available_categories: getCategories(),
        action_required: "Verificar nome do componente ou solicitar ao DSLA",
      }, null, 2);
    }
  },

  da_list_components: async (args) => {
    const { category, search } = args as { category?: string; search?: string };

    let components = Object.values(componentSpecs);

    if (category) {
      components = getComponentsByCategory(category);
    }

    if (search) {
      components = searchComponents(search);
    }

    const categories = getCategories();

    return JSON.stringify({
      agent: "DA",
      action: "list_components",
      filters: {
        category: category || null,
        search: search || null,
      },
      available_categories: categories,
      components: components.map(c => ({
        name: c.name,
        category: c.category,
        atomicLevel: c.atomicLevel,
        variants: c.variants,
        zeroheightUrl: c.zeroheightUrl,
      })),
      total: components.length,
      message: `Encontrados ${components.length} componentes${category ? ` na categoria '${category}'` : ''}${search ? ` com termo '${search}'` : ''}.`,
    }, null, 2);
  },

  // PA Tools
  pa_list_prototypes: async (args) => {
    const { bdev_code } = args as { bdev_code?: string };

    const prototypes = listPrototypes(bdev_code);

    return JSON.stringify({
      agent: "PA",
      action: "list_prototypes",
      filter: bdev_code || "all",
      prototypes: prototypes.map(p => ({
        id: p.id,
        bdevCode: p.bdevCode,
        version: p.version,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        screenCount: p.screenCount,
        approvedBy: p.approvedBy,
      })),
      total: prototypes.length,
      message: prototypes.length > 0
        ? `Encontrados ${prototypes.length} protótipo(s)${bdev_code ? ` para ${bdev_code}` : ''}.`
        : `Nenhum protótipo encontrado${bdev_code ? ` para ${bdev_code}` : ''}.`,
    }, null, 2);
  },

  pa_get_prototype: async (args) => {
    const { prototype_id, bdev_code, version } = args as {
      prototype_id?: string;
      bdev_code?: string;
      version?: number;
    };

    let prototype: PrototypeRecord | null = null;

    if (prototype_id) {
      prototype = loadPrototypeById(prototype_id);
    } else if (bdev_code) {
      prototype = loadPrototype(bdev_code, version);
    }

    if (!prototype) {
      return JSON.stringify({
        agent: "PA",
        action: "get_prototype",
        found: false,
        message: "Protótipo não encontrado. Use pa_list_prototypes para ver protótipos disponíveis.",
      }, null, 2);
    }

    return JSON.stringify({
      agent: "PA",
      action: "get_prototype",
      found: true,
      prototype: {
        id: prototype.id,
        bdevCode: prototype.bdevCode,
        version: prototype.version,
        status: prototype.status,
        createdAt: prototype.createdAt,
        updatedAt: prototype.updatedAt,
        approvedBy: prototype.approvedBy,
        screenCount: prototype.screens.length,
        screens: prototype.screens.map(s => ({
          screenId: s.screenId,
          screenName: s.screenName,
          userStory: s.userStory,
          hasCode: !!s.code,
          translationKeys: Object.keys(s.translations.pt).length,
        })),
        journeys: prototype.journeySnapshot,
        changelog: prototype.changelog.slice(-5), // Last 5 entries
      },
      message: `Protótipo ${prototype.bdevCode} v${prototype.version} (${prototype.status})`,
    }, null, 2);
  },

  pa_create_prototype: async (args) => {
    const raw = args as Record<string, unknown>;
    const bdev_code = raw.bdev_code as string;
    const wireframes = normalizeWireframes((raw.wireframes as unknown[]) || []);
    const journeys = normalizeJourneys((raw.journeys as unknown[]) || []);
    const approved_by = raw.approved_by as 'FA' | 'Client' | undefined;

    try {
      const prototype = generatePrototype({
        bdevCode: bdev_code,
        journeys,
        wireframes,
        approvedBy: approved_by,
      });

      return JSON.stringify({
        agent: "PA",
        action: "create_prototype",
        success: true,
        prototype: {
          id: prototype.id,
          bdevCode: prototype.bdevCode,
          version: prototype.version,
          status: prototype.status,
          screenCount: prototype.screens.length,
          screens: prototype.screens.map(s => ({
            screenId: s.screenId,
            screenName: s.screenName,
            codeLines: s.code.split('\n').length,
          })),
        },
        message: `Protótipo ${bdev_code} v${prototype.version} criado com sucesso. ${prototype.screens.length} ecrã(s) gerados.`,
        next_steps: [
          "Use pa_get_prototype para ver detalhes",
          "Use pa_export_prototype para exportar ficheiros",
          "Use pa_approve_prototype quando pronto para aprovar",
        ],
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        agent: "PA",
        action: "create_prototype",
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  pa_compare_versions: async (args) => {
    const { bdev_code, source_version, target_version } = args as {
      bdev_code: string;
      source_version?: number;
      target_version?: number;
    };

    // If specific versions provided, compare those
    if (source_version && target_version) {
      const sourceProto = loadPrototype(bdev_code, source_version);
      const targetProto = loadPrototype(bdev_code, target_version);

      if (!sourceProto || !targetProto) {
        return JSON.stringify({
          agent: "PA",
          action: "compare_versions",
          success: false,
          message: "Uma ou ambas as versões não foram encontradas.",
        }, null, 2);
      }

      const comparison = comparePrototypes(sourceProto, targetProto);
      const summary = generateComparisonSummary(comparison);

      return JSON.stringify({
        agent: "PA",
        action: "compare_versions",
        success: true,
        comparison: {
          sourceVersion: comparison.sourceVersion,
          targetVersion: comparison.targetVersion,
          hasChanges: comparison.hasChanges,
          summary: comparison.summary,
          screenDiffs: comparison.screenDiffs.filter(d => d.changeType !== 'unchanged'),
          recommendations: comparison.recommendations,
        },
        summaryText: summary,
      }, null, 2);
    }

    // Otherwise, compare FA approved vs Client approved
    const comparison = compareFAvsClient(bdev_code);

    if (!comparison) {
      return JSON.stringify({
        agent: "PA",
        action: "compare_versions",
        success: false,
        message: "Não foi possível comparar. Verifique se existem versões aprovadas pelo FA e pelo Cliente.",
      }, null, 2);
    }

    const summary = generateComparisonSummary(comparison);

    return JSON.stringify({
      agent: "PA",
      action: "compare_versions",
      success: true,
      comparison: {
        sourceVersion: comparison.sourceVersion,
        targetVersion: comparison.targetVersion,
        sourceStatus: comparison.sourceStatus,
        targetStatus: comparison.targetStatus,
        hasChanges: comparison.hasChanges,
        summary: comparison.summary,
        screenDiffs: comparison.screenDiffs.filter(d => d.changeType !== 'unchanged'),
        recommendations: comparison.recommendations,
      },
      summaryText: summary,
    }, null, 2);
  },

  pa_apply_changes: async (args) => {
    const { bdev_code } = args as { bdev_code: string };

    const finalPrototype = applyClientChanges(bdev_code);

    if (!finalPrototype) {
      return JSON.stringify({
        agent: "PA",
        action: "apply_changes",
        success: false,
        message: "Não foi possível aplicar alterações. Verifique se existe uma versão aprovada pelo cliente.",
      }, null, 2);
    }

    return JSON.stringify({
      agent: "PA",
      action: "apply_changes",
      success: true,
      prototype: {
        id: finalPrototype.id,
        bdevCode: finalPrototype.bdevCode,
        version: finalPrototype.version,
        status: finalPrototype.status,
        screenCount: finalPrototype.screens.length,
      },
      message: `Versão final ${finalPrototype.bdevCode} v${finalPrototype.version} criada com alterações do cliente.`,
      next_step: "Use pa_export_prototype para exportar os ficheiros finais.",
    }, null, 2);
  },

  pa_export_prototype: async (args) => {
    const { bdev_code, version } = args as { bdev_code: string; version?: number };

    const exported = exportPrototype(bdev_code, version);

    if (!exported) {
      return JSON.stringify({
        agent: "PA",
        action: "export_prototype",
        success: false,
        message: "Protótipo não encontrado.",
      }, null, 2);
    }

    return JSON.stringify({
      agent: "PA",
      action: "export_prototype",
      success: true,
      files: {
        screens: exported.screens.map(s => ({
          filename: s.filename,
          lines: s.code.split('\n').length,
        })),
        app: {
          filename: exported.app.filename,
          lines: exported.app.code.split('\n').length,
        },
        translations: {
          pt: exported.translations.pt.filename,
          en: exported.translations.en.filename,
        },
      },
      code: {
        app: exported.app.code,
        screens: exported.screens,
        translations: {
          pt: exported.translations.pt.content,
          en: exported.translations.en.content,
        },
      },
      readme: exported.readme,
      message: `Exportados ${exported.screens.length} ficheiros de ecrãs + App.tsx + traduções PT/EN.`,
    }, null, 2);
  },

  pa_approve_prototype: async (args) => {
    const { bdev_code, version, approved_by } = args as {
      bdev_code: string;
      version: number;
      approved_by: 'FA' | 'Client';
    };

    const prototype = approvePrototype(bdev_code, version, approved_by);

    if (!prototype) {
      return JSON.stringify({
        agent: "PA",
        action: "approve_prototype",
        success: false,
        message: `Protótipo ${bdev_code} v${version} não encontrado.`,
      }, null, 2);
    }

    return JSON.stringify({
      agent: "PA",
      action: "approve_prototype",
      success: true,
      prototype: {
        id: prototype.id,
        bdevCode: prototype.bdevCode,
        version: prototype.version,
        status: prototype.status,
        approvedBy: prototype.approvedBy,
      },
      message: `Protótipo ${bdev_code} v${version} aprovado por ${approved_by}.`,
      next_steps: approved_by === 'FA'
        ? ["Aguardar aprovação do cliente", "Use pa_compare_versions após aprovação do cliente"]
        : ["Use pa_apply_changes para criar versão final", "Use pa_export_prototype para exportar"],
    }, null, 2);
  },

  pa_deploy_prototype: async (args) => {
    const { bdev_code, version } = args as { bdev_code: string; version?: number };
    try {
      const result = await deployPrototype(bdev_code, version);
      return JSON.stringify({
        agent: "PA",
        action: "deploy_prototype",
        success: true,
        url: result.url,
        outputPath: result.outputPath,
        fileCount: result.files.length,
        message: `Protótipo ${bdev_code} a correr em ${result.url}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        agent: "PA",
        action: "deploy_prototype",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Falha ao fazer deploy do protótipo ${bdev_code}`,
      }, null, 2);
    }
  },

  // DSLA Tools — write real files to bctt-design-system project
  dsla_create_component: async (args) => {
    const { component_name, atomic_level, props, base_mui_component, variants, design_tokens } = args as {
      component_name: string;
      atomic_level: string;
      props?: Array<{ name: string; type: string; required: boolean; description: string }>;
      base_mui_component?: string;
      variants?: string[];
      design_tokens?: Record<string, string>;
    };

    const dsRoot = getBcttDesignSystemPath();
    const componentDir = path.join(dsRoot, 'src', 'components', component_name);
    fs.mkdirSync(componentDir, { recursive: true });

    // Generate props interface
    const componentProps = props || [
      { name: 'variant', type: `'${(variants || ['default']).join("' | '")}'`, required: false, description: 'Variante visual' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Conteudo' },
    ];
    const propsInterface = componentProps
      .map(p => `  /** ${p.description} */\n  ${p.name}${p.required ? '' : '?'}: ${p.type};`)
      .join('\n');

    // Generate component code (following Button.tsx pattern: forwardRef + MUI wrapper)
    // Always alias MUI imports to avoid naming conflicts (e.g. Chip vs MuiChip)
    const muiBase = base_mui_component || 'Box';
    const muiAlias = `Mui${muiBase}`;
    const muiPropsAlias = `Mui${muiBase}Props`;
    const muiImport = `import { ${muiBase} as ${muiAlias}, type ${muiBase}Props as ${muiPropsAlias} } from '@mui/material';`;

    const code = `import React from 'react';
${muiImport}

export interface ${component_name}Props extends Omit<${muiPropsAlias}, 'variant'> {
${propsInterface}
}

export const ${component_name} = React.forwardRef<HTMLDivElement, ${component_name}Props>(
  ({ variant = '${(variants || ['default'])[0]}', children, ...props }, ref) => {
    return (
      <${muiAlias} ref={ref} {...props}>
        {children}
      </${muiAlias}>
    );
  }
);

${component_name}.displayName = '${component_name}';
export default ${component_name};
`;

    // Write component file
    fs.writeFileSync(path.join(componentDir, `${component_name}.tsx`), code);

    // Write barrel export
    const indexCode = `export { ${component_name}, type ${component_name}Props } from './${component_name}';\nexport { default } from './${component_name}';\n`;
    fs.writeFileSync(path.join(componentDir, 'index.ts'), indexCode);

    // Update main components barrel (append if not already exported)
    const mainBarrel = path.join(dsRoot, 'src', 'components', 'index.ts');
    if (fs.existsSync(mainBarrel)) {
      const barrelContent = fs.readFileSync(mainBarrel, 'utf-8');
      const exportLine = `\n// ${component_name}\nexport { ${component_name}, type ${component_name}Props } from './${component_name}';\n`;
      if (!barrelContent.includes(`from './${component_name}'`)) {
        fs.appendFileSync(mainBarrel, exportLine);
      }
    }

    return JSON.stringify({
      agent: "DSLA",
      action: "create_component",
      success: true,
      component: {
        name: component_name,
        atomic_level,
        base_mui_component: muiBase,
        files_written: [
          `src/components/${component_name}/${component_name}.tsx`,
          `src/components/${component_name}/index.ts`,
          `src/components/index.ts (updated)`,
        ],
      },
      message: `Componente ${component_name} criado em bctt-design-system/src/components/${component_name}/`
    }, null, 2);
  },

  dsla_generate_stories: async (args) => {
    const { component_name, variants } = args as {
      component_name: string;
      variants?: string[];
    };

    const dsRoot = getBcttDesignSystemPath();
    const storyVariants = variants || ['Default', 'Primary', 'Secondary'];

    const storiesCode = `import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { ${component_name} } from './${component_name}';

const meta: Meta<typeof ${component_name}> = {
  title: 'Components/${component_name}',
  component: ${component_name},
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

${storyVariants.map(v => `export const ${v}: Story = {
  args: { variant: '${v.toLowerCase()}', children: '${component_name} - ${v}' },
};`).join('\n\n')}

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
${storyVariants.map(v => `      <${component_name} variant="${v.toLowerCase()}">${v}</${component_name}>`).join('\n')}
    </Stack>
  ),
};
`;

    // Ensure directory exists and write story file
    const componentDir = path.join(dsRoot, 'src', 'components', component_name);
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
    fs.writeFileSync(path.join(componentDir, `${component_name}.stories.tsx`), storiesCode);

    return JSON.stringify({
      agent: "DSLA",
      action: "generate_stories",
      success: true,
      stories: {
        component: component_name,
        file_written: `src/components/${component_name}/${component_name}.stories.tsx`,
        variants: storyVariants,
      },
      message: `Stories criadas para ${component_name} em bctt-design-system`
    }, null, 2);
  },

  dsla_check_accessibility: async (args) => {
    const { component_code } = args as { component_code: string };

    const checks = [
      { rule: "WCAG 2.1 - 1.1.1 Non-text Content", status: "check_required", note: "Verificar alt text em imagens" },
      { rule: "WCAG 2.1 - 1.4.3 Contrast", status: "check_required", note: "Verificar contraste de cores" },
      { rule: "WCAG 2.1 - 2.1.1 Keyboard", status: "check_required", note: "Verificar navegação por teclado" },
      { rule: "WCAG 2.1 - 4.1.2 Name, Role, Value", status: "check_required", note: "Verificar atributos ARIA" }
    ];

    return JSON.stringify({
      agent: "DSLA",
      action: "check_accessibility",
      wcag_level: "AA",
      checks,
      recommendations: [
        "Adicionar aria-label em elementos interativos",
        "Garantir focus visível em todos os elementos focáveis",
        "Testar com screen reader (NVDA/VoiceOver)"
      ]
    }, null, 2);
  },

  dsla_get_component_spec: async (args) => {
    const { component_name } = args as { component_name: string };

    const spec = getComponentSpec(component_name);
    if (spec) {
      return JSON.stringify({ found: true, spec }, null, 2);
    }

    // Try fuzzy match
    const allNames = Object.keys(componentSpecs);
    const match = allNames.find(
      k => k.toLowerCase().includes(component_name.toLowerCase())
    );

    return JSON.stringify({
      found: false,
      closest_match: match ? { name: match, spec: componentSpecs[match] } : null,
      available: allNames,
    }, null, 2);
  },

  dsla_build_design_system: async () => {
    const dsRoot = getBcttDesignSystemPath();
    const { execSync } = await import('child_process');
    try {
      execSync('npm run build', { cwd: dsRoot, timeout: 60000, stdio: 'pipe' });
      return JSON.stringify({
        agent: "DSLA",
        action: "build_design_system",
        success: true,
        message: 'bctt-design-system compilado com sucesso (dist/ criado)'
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        agent: "DSLA",
        action: "build_design_system",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Falha ao compilar bctt-design-system'
      }, null, 2);
    }
  }
};

// Merge all handlers (agent tools + jira tools)
const allToolHandlers = {
  ...toolHandlers,
  ...jiraToolHandlers,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
  options?: { demoMode?: boolean }
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const handler = allToolHandlers[name];

  if (!handler) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: `Tool '${name}' not found` })
      }]
    };
  }

  try {
    const result = await handler(args || {});

    // Apply truncation for demo mode safety (always on by default)
    const truncatedResult = truncateOutput(result, MAX_OUTPUT_SIZE);

    return {
      content: [{
        type: "text",
        text: truncatedResult
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: String(error) })
      }]
    };
  }
}
