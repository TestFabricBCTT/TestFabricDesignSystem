import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { jiraTools, jiraToolHandlers } from '../jira/index.js';

// Tool definitions (Agent tools + Jira tools)
export const tools: Tool[] = [
  // ============================================
  // BA - BRAINSTORM AGENT TOOLS
  // ============================================
  {
    name: "ba_analyze_requirements",
    description: "BA Agent: Analisa requisitos iniciais de uma funcionalidade. Extrai objetivos, impacto no negócio, utilizadores afetados e restrições técnicas.",
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
    description: "BA Agent: Gera perguntas de clarificação para detalhar requisitos. Usa metodologia SMART para garantir completude.",
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
  {
    name: "ba_create_brd",
    description: "BA Agent: Cria documento BRD (Business Requirements Document) estruturado.",
    inputSchema: {
      type: "object",
      properties: {
        functionality_name: {
          type: "string",
          description: "Nome da funcionalidade"
        },
        requirements: {
          type: "string",
          description: "Requisitos consolidados"
        },
        stakeholders: {
          type: "array",
          items: { type: "string" },
          description: "Lista de stakeholders"
        }
      },
      required: ["functionality_name", "requirements"]
    }
  },

  // ============================================
  // FA - FUNCTIONAL AGENT TOOLS
  // ============================================
  {
    name: "fa_create_user_stories",
    description: "FA Agent: Cria user stories estruturadas a partir de requisitos. Formato: Como [persona], quero [ação], para [benefício].",
    inputSchema: {
      type: "object",
      properties: {
        requirements: {
          type: "string",
          description: "Requisitos ou BRD para converter em user stories"
        },
        persona: {
          type: "string",
          description: "Persona principal (ex: Cliente, Gestor, Admin)"
        },
        mvp_scope: {
          type: "boolean",
          description: "Filtrar apenas user stories MVP"
        }
      },
      required: ["requirements"]
    }
  },
  {
    name: "fa_define_acceptance_criteria",
    description: "FA Agent: Define critérios de aceitação para user stories usando formato Gherkin (Given/When/Then).",
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

  // ============================================
  // DA - DESIGN AGENT TOOLS
  // ============================================
  {
    name: "da_create_wireframes",
    description: "DA Agent: Gera especificações de wireframes seguindo o Design System Banco CTT.",
    inputSchema: {
      type: "object",
      properties: {
        user_stories: {
          type: "array",
          items: { type: "string" },
          description: "User stories para desenhar wireframes"
        },
        screen_type: {
          type: "string",
          enum: ["mobile", "desktop", "responsive"],
          description: "Tipo de ecrã"
        },
        include_states: {
          type: "boolean",
          description: "Incluir estados (loading, error, empty)"
        }
      },
      required: ["user_stories"]
    }
  },
  {
    name: "da_define_exception_flows",
    description: "DA Agent: Define fluxos de exceção e mensagens de erro seguindo UX Writing Guidelines.",
    inputSchema: {
      type: "object",
      properties: {
        happy_path: {
          type: "string",
          description: "Descrição do fluxo principal"
        },
        error_types: {
          type: "array",
          items: { type: "string" },
          description: "Tipos de erros a considerar"
        }
      },
      required: ["happy_path"]
    }
  },
  {
    name: "da_generate_figma_spec",
    description: "DA Agent: Gera especificação JSON para importar no Figma via plugin.",
    inputSchema: {
      type: "object",
      properties: {
        wireframes: {
          type: "string",
          description: "Especificações de wireframes"
        },
        page_name: {
          type: "string",
          description: "Nome da página no Figma"
        }
      },
      required: ["wireframes"]
    }
  },

  // ============================================
  // DSLA - DESIGN SYSTEM LIBRARY AGENT TOOLS
  // ============================================
  {
    name: "dsla_create_component",
    description: "DSLA Agent: Cria componente React seguindo Atomic Design e convenções do Design System.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: {
          type: "string",
          description: "Nome do componente (PascalCase)"
        },
        atomic_level: {
          type: "string",
          enum: ["atom", "molecule", "organism", "template"],
          description: "Nível no Atomic Design"
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
    description: "DSLA Agent: Gera stories do Storybook para um componente.",
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

  // ============================================
  // JIRA TOOLS (imported from jira module)
  // ============================================
  ...jiraTools,
];

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

  ba_create_brd: async (args) => {
    const { functionality_name, requirements, stakeholders } = args as {
      functionality_name: string;
      requirements: string;
      stakeholders?: string[];
    };

    return JSON.stringify({
      agent: "BA",
      action: "create_brd",
      document: {
        title: `BRD - ${functionality_name}`,
        version: "1.0",
        date: new Date().toISOString().split("T")[0],
        sections: {
          executive_summary: `Documento de requisitos para ${functionality_name}`,
          business_context: requirements,
          stakeholders: stakeholders || ["Product Owner", "Tech Lead", "UX Designer"],
          functional_requirements: ["FR1: Requisito funcional 1", "FR2: Requisito funcional 2"],
          non_functional_requirements: ["NFR1: Performance", "NFR2: Segurança"],
          success_criteria: ["KPI1: Taxa de conversão", "KPI2: Satisfação do utilizador"]
        }
      }
    }, null, 2);
  },

  // FA Tools
  fa_create_user_stories: async (args) => {
    const { requirements, persona, mvp_scope } = args as {
      requirements: string;
      persona?: string;
      mvp_scope?: boolean;
    };

    const userPersona = persona || "Cliente";

    return JSON.stringify({
      agent: "FA",
      action: "create_user_stories",
      user_stories: [
        {
          id: "US001",
          mvp: true,
          story: `Como ${userPersona}, quero visualizar a funcionalidade, para poder utilizá-la facilmente.`,
          priority: "Must Have"
        },
        {
          id: "US002",
          mvp: true,
          story: `Como ${userPersona}, quero receber feedback das minhas ações, para saber que foram processadas.`,
          priority: "Must Have"
        },
        {
          id: "US003",
          mvp: mvp_scope ? false : true,
          story: `Como ${userPersona}, quero poder reverter ações, para corrigir erros.`,
          priority: "Should Have"
        }
      ].filter(us => !mvp_scope || us.mvp)
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

  // DA Tools
  da_create_wireframes: async (args) => {
    const { user_stories, screen_type, include_states } = args as {
      user_stories: string[];
      screen_type?: string;
      include_states?: boolean;
    };

    const type = screen_type || "responsive";

    return JSON.stringify({
      agent: "DA",
      action: "create_wireframes",
      wireframes: user_stories.map((us, i) => ({
        id: `WF00${i + 1}`,
        user_story: us,
        screen_type: type,
        components: [
          { type: "Header", variant: "default" },
          { type: "ContentArea", variant: "primary" },
          { type: "ActionBar", variant: "sticky" }
        ],
        states: include_states ? ["default", "loading", "error", "empty", "success"] : ["default"]
      })),
      design_system: "Banco CTT DS v2.0",
      figma_ready: true
    }, null, 2);
  },

  da_define_exception_flows: async (args) => {
    const { happy_path, error_types } = args as {
      happy_path: string;
      error_types?: string[];
    };

    const errors = error_types || ["validation", "network", "server", "timeout"];

    return JSON.stringify({
      agent: "DA",
      action: "define_exception_flows",
      happy_path: happy_path.substring(0, 100),
      exception_flows: errors.map(type => ({
        type,
        trigger: `Erro de ${type}`,
        user_message: {
          pt: `Ocorreu um erro. Por favor, tente novamente.`,
          en: `An error occurred. Please try again.`
        },
        recovery_action: "Botão de retry",
        ux_guidelines: "Usar toast para erros temporários, modal para erros críticos"
      }))
    }, null, 2);
  },

  da_generate_figma_spec: async (args) => {
    const { wireframes, page_name } = args as {
      wireframes: string;
      page_name?: string;
    };

    return JSON.stringify({
      agent: "DA",
      action: "generate_figma_spec",
      figma_json: {
        page: page_name || "New Page",
        frames: [
          {
            name: "Mobile - 375x812",
            width: 375,
            height: 812,
            children: []
          },
          {
            name: "Desktop - 1440x900",
            width: 1440,
            height: 900,
            children: []
          }
        ],
        styles: {
          colors: "Use Design System palette",
          typography: "Use Design System fonts"
        }
      },
      instructions: "Use o plugin Figma JSON Importer para importar esta especificação"
    }, null, 2);
  },

  // DSLA Tools
  dsla_create_component: async (args) => {
    const { component_name, atomic_level, figma_link, props } = args as {
      component_name: string;
      atomic_level: string;
      figma_link?: string;
      props?: Array<{ name: string; type: string; required: boolean; description: string }>;
    };

    const componentProps = props || [
      { name: "variant", type: "'default' | 'primary' | 'secondary'", required: false, description: "Variante visual" },
      { name: "children", type: "React.ReactNode", required: true, description: "Conteúdo do componente" }
    ];

    const propsInterface = componentProps
      .map(p => `  ${p.name}${p.required ? "" : "?"}: ${p.type};`)
      .join("\n");

    const code = `import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, BoxProps } from '@mui/material';

export interface ${component_name}Props extends Omit<BoxProps, 'children'> {
${propsInterface}
}

const Styled${component_name} = styled(Box)<${component_name}Props>(({ theme }) => ({
  // Add component styles here
}));

export const ${component_name}: React.FC<${component_name}Props> = ({
  variant = 'default',
  children,
  ...props
}) => {
  return (
    <Styled${component_name} data-variant={variant} {...props}>
      {children}
    </Styled${component_name}>
  );
};

export default ${component_name};`;

    return JSON.stringify({
      agent: "DSLA",
      action: "create_component",
      component: {
        name: component_name,
        atomic_level,
        figma_link: figma_link || null,
        path: `src/components/${atomic_level}s/${component_name}/${component_name}.tsx`,
        code
      }
    }, null, 2);
  },

  dsla_generate_stories: async (args) => {
    const { component_name, variants } = args as {
      component_name: string;
      variants?: string[];
    };

    const storyVariants = variants || ["Default", "Primary", "Secondary"];

    const storiesCode = `import type { Meta, StoryObj } from '@storybook/react';
import { ${component_name} } from './${component_name}';

const meta: Meta<typeof ${component_name}> = {
  title: 'Components/${component_name}',
  component: ${component_name},
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ${component_name}>;

${storyVariants.map(v => `export const ${v}: Story = {
  args: {
    variant: '${v.toLowerCase()}',
    children: '${component_name} - ${v}',
  },
};`).join("\n\n")}`;

    return JSON.stringify({
      agent: "DSLA",
      action: "generate_stories",
      stories: {
        component: component_name,
        path: `src/components/**/${component_name}/${component_name}.stories.tsx`,
        code: storiesCode,
        variants: storyVariants
      }
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
  }
};

// Merge all handlers (agent tools + jira tools)
const allToolHandlers = {
  ...toolHandlers,
  ...jiraToolHandlers,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined
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
    return {
      content: [{
        type: "text",
        text: result
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
