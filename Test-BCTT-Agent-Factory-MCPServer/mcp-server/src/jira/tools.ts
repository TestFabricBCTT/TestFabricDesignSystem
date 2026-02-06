import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getJiraClient } from './client.js';
import { FAStructure, AcceptanceCriterion } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================
// JIRA TOOL DEFINITIONS
// ============================================

export const jiraTools: Tool[] = [
  {
    name: "jira_test_connection",
    description: "Testa a conexão com o Jira Cloud. Útil para verificar se as credenciais estão corretas.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "jira_get_next_bdev",
    description: "Obtém o próximo código BDEV disponível. Formato: [BDEV00000001], [BDEV00000002], etc.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "jira_create_bdev",
    description: "Cria um Epic no Jira com código BDEV. Este é o nível mais alto para uma nova funcionalidade.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nome da funcionalidade (ex: 'Programa de Cashback')"
        },
        description: {
          type: "string",
          description: "Descrição/resumo executivo da funcionalidade"
        },
        stakeholder: {
          type: "string",
          description: "Stakeholder principal (ex: 'Marketing')"
        },
        context: {
          type: "string",
          description: "Contexto de negócio adicional"
        },
        dependencies: {
          type: "array",
          items: { type: "string" },
          description: "Lista de dependências identificadas"
        },
        alerts: {
          type: "array",
          items: { type: "string" },
          description: "Alertas (ex: validações de compliance)"
        }
      },
      required: ["name", "description"]
    }
  },
  {
    name: "jira_create_feature",
    description: "Cria uma Feature (Story com label 'feature') ligada a um Epic (BDEV).",
    inputSchema: {
      type: "object",
      properties: {
        epic_key: {
          type: "string",
          description: "Key do Epic pai (ex: 'BCTT-123')"
        },
        name: {
          type: "string",
          description: "Nome da feature"
        },
        description: {
          type: "string",
          description: "Descrição da feature"
        },
        feature_number: {
          type: "number",
          description: "Número da feature (para gerar [FEAT-01], [FEAT-02], etc.)"
        }
      },
      required: ["epic_key", "name", "feature_number"]
    }
  },
  {
    name: "jira_create_user_story",
    description: "Cria uma User Story (Story com label 'user-story') ligada a uma Feature.",
    inputSchema: {
      type: "object",
      properties: {
        parent_key: {
          type: "string",
          description: "Key da Feature pai (ex: 'BCTT-124')"
        },
        story_id: {
          type: "string",
          description: "ID da user story (ex: 'US-001')"
        },
        narrative: {
          type: "string",
          description: "Narrativa da user story (Como X, quero Y, para Z)"
        },
        screen: {
          type: "string",
          description: "Nome do ecrã associado (opcional)"
        },
        acceptance_criteria: {
          type: "array",
          items: {
            type: "object",
            properties: {
              scenario: { type: "string" },
              given: { type: "string" },
              when: { type: "string" },
              then: { type: "string" }
            },
            required: ["scenario", "given", "when", "then"]
          },
          description: "Critérios de aceitação em formato Gherkin"
        },
        business_rules: {
          type: "array",
          items: { type: "string" },
          description: "Regras de negócio aplicáveis"
        }
      },
      required: ["parent_key", "story_id", "narrative", "acceptance_criteria"]
    }
  },
  {
    name: "jira_bulk_create_from_fa",
    description: "FA Agent: Cria toda a estrutura no Jira de uma vez (BDEV + Features + User Stories). Esta é a tool principal para exportar o trabalho do FA para o Jira.",
    inputSchema: {
      type: "object",
      properties: {
        functionality_name: {
          type: "string",
          description: "Nome da funcionalidade"
        },
        description: {
          type: "string",
          description: "Descrição/resumo executivo"
        },
        stakeholder: {
          type: "string",
          description: "Stakeholder principal"
        },
        dependencies: {
          type: "array",
          items: { type: "string" },
          description: "Dependências identificadas"
        },
        alerts: {
          type: "array",
          items: { type: "string" },
          description: "Alertas (compliance, regulamentação, etc.)"
        },
        epics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              features: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    user_stories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          narrative: { type: "string" },
                          screen: { type: "string" },
                          business_rules: {
                            type: "array",
                            items: { type: "string" }
                          },
                          acceptance_criteria: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                scenario: { type: "string" },
                                given: { type: "string" },
                                when: { type: "string" },
                                then: { type: "string" }
                              }
                            }
                          },
                          mvp: { type: "boolean" },
                          priority: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          description: "Estrutura completa: Epics > Features > User Stories"
        }
      },
      required: ["functionality_name", "description", "epics"]
    }
  },
  {
    name: "jira_search_issues",
    description: "Pesquisa issues no Jira usando JQL (Jira Query Language).",
    inputSchema: {
      type: "object",
      properties: {
        jql: {
          type: "string",
          description: "Query JQL (ex: 'project = BCTT AND labels = bdev')"
        },
        max_results: {
          type: "number",
          description: "Número máximo de resultados (default: 50)"
        }
      },
      required: ["jql"]
    }
  },
  {
    name: "jira_link_issues",
    description: "Cria um link entre duas issues no Jira. Útil para definir dependências (blocks, relates to).",
    inputSchema: {
      type: "object",
      properties: {
        from_issue_key: {
          type: "string",
          description: "Key da issue de origem (ex: 'BCTT-123')"
        },
        to_issue_key: {
          type: "string",
          description: "Key da issue de destino (ex: 'BCTT-124')"
        },
        link_type: {
          type: "string",
          enum: ["Blocks", "Relates"],
          description: "Tipo de link: 'Blocks' (A bloqueia B) ou 'Relates' (A relaciona-se com B)"
        }
      },
      required: ["from_issue_key", "to_issue_key", "link_type"]
    }
  },
  {
    name: "jira_add_attachment",
    description: "Adiciona um ficheiro em anexo a uma issue no Jira. Aceita documento em base64.",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Key da issue (ex: 'BCTT-123')"
        },
        file_name: {
          type: "string",
          description: "Nome do ficheiro (ex: 'documento.docx')"
        },
        file_base64: {
          type: "string",
          description: "Conteúdo do ficheiro em base64"
        }
      },
      required: ["issue_key", "file_name", "file_base64"]
    }
  },
  {
    name: "jira_bulk_create_with_document",
    description: "FA Agent: Cria toda a estrutura no Jira (BDEV + Features + User Stories) e anexa o documento 'Informação Adicional' ao Epic.",
    inputSchema: {
      type: "object",
      properties: {
        functionality_name: {
          type: "string",
          description: "Nome da funcionalidade"
        },
        description: {
          type: "string",
          description: "Descrição/resumo executivo"
        },
        stakeholder: {
          type: "string",
          description: "Stakeholder principal"
        },
        document_base64: {
          type: "string",
          description: "Documento 'Informação Adicional' em base64"
        },
        document_name: {
          type: "string",
          description: "Nome do ficheiro do documento"
        },
        epics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              features: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    user_stories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          narrative: { type: "string" },
                          screen: { type: "string" },
                          mvp: { type: "string" },
                          acceptance_criteria: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                scenario: { type: "string" },
                                given: { type: "string" },
                                when: { type: "string" },
                                then: { type: "string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          description: "Estrutura completa: Epics > Features > User Stories"
        },
        functional_flow: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from_story_id: { type: "string" },
              to_story_id: { type: "string" },
              link_type: { type: "string" }
            }
          },
          description: "Fluxo funcional: links entre user stories"
        }
      },
      required: ["functionality_name", "description", "epics"]
    }
  }
];

// ============================================
// JIRA TOOL HANDLERS
// ============================================

export const jiraToolHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  jira_test_connection: async () => {
    try {
      const client = getJiraClient();
      const result = await client.testConnection();

      if (result.success && result.user) {
        return JSON.stringify({
          success: true,
          message: "Conexão com Jira estabelecida com sucesso!",
          user: {
            displayName: result.user.displayName,
            email: result.user.emailAddress,
          },
          project: process.env.JIRA_PROJECT_KEY,
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          error: result.error,
        }, null, 2);
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
        hint: "Verifique se as variáveis JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN e JIRA_PROJECT_KEY estão configuradas no ficheiro .env",
      }, null, 2);
    }
  },

  jira_get_next_bdev: async () => {
    try {
      const client = getJiraClient();
      const bdevCode = await client.getNextBDEVCode();

      return JSON.stringify({
        success: true,
        bdev: bdevCode,
        message: `Próximo código BDEV disponível: ${bdevCode.formatted}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_create_bdev: async (args) => {
    try {
      const { name, description, stakeholder, context, dependencies, alerts } = args as {
        name: string;
        description: string;
        stakeholder?: string;
        context?: string;
        dependencies?: string[];
        alerts?: string[];
      };

      const client = getJiraClient();
      const bdevCode = await client.getNextBDEVCode();

      const epic = await client.createBDEV({
        name,
        description,
        stakeholder,
        context,
        dependencies,
        alerts,
      }, bdevCode);

      const epicUrl = `${process.env.JIRA_BASE_URL}/browse/${epic.key}`;

      return JSON.stringify({
        success: true,
        bdev_code: bdevCode.formatted,
        epic_key: epic.key,
        epic_url: epicUrl,
        message: `BDEV criado com sucesso: ${bdevCode.formatted} ${name}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_create_feature: async (args) => {
    try {
      const { epic_key, name, description, feature_number } = args as {
        epic_key: string;
        name: string;
        description?: string;
        feature_number: number;
      };

      const client = getJiraClient();

      const feature = await client.createFeature({
        epicKey: epic_key,
        name,
        description,
        featureNumber: feature_number,
      });

      const featureUrl = `${process.env.JIRA_BASE_URL}/browse/${feature.key}`;

      return JSON.stringify({
        success: true,
        feature_key: feature.key,
        feature_url: featureUrl,
        message: `Feature criada: [FEAT-${String(feature_number).padStart(2, '0')}] ${name}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_create_user_story: async (args) => {
    try {
      const { parent_key, story_id, narrative, screen, acceptance_criteria, business_rules } = args as {
        parent_key: string;
        story_id: string;
        narrative: string;
        screen?: string;
        acceptance_criteria: AcceptanceCriterion[];
        business_rules?: string[];
      };

      const client = getJiraClient();

      const userStory = await client.createUserStory({
        parentKey: parent_key,
        storyId: story_id,
        narrative,
        screen,
        acceptanceCriteria: acceptance_criteria,
        businessRules: business_rules,
      });

      const storyUrl = `${process.env.JIRA_BASE_URL}/browse/${userStory.key}`;

      return JSON.stringify({
        success: true,
        story_key: userStory.key,
        story_id,
        story_url: storyUrl,
        message: `User Story criada: ${story_id}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_bulk_create_from_fa: async (args) => {
    try {
      const {
        functionality_name,
        description,
        stakeholder,
        dependencies,
        alerts,
        epics,
      } = args as {
        functionality_name: string;
        description: string;
        stakeholder?: string;
        dependencies?: string[];
        alerts?: string[];
        epics: Array<{
          name: string;
          features: Array<{
            name: string;
            description?: string;
            user_stories: Array<{
              id: string;
              narrative: string;
              screen?: string;
              business_rules?: string[];
              acceptance_criteria: AcceptanceCriterion[];
              mvp?: boolean;
              priority?: string;
            }>;
          }>;
        }>;
      };

      // Convert to FAStructure format
      const structure: FAStructure = {
        functionalityName: functionality_name,
        description,
        stakeholder,
        dependencies,
        alerts,
        epics: epics.map(epic => ({
          name: epic.name,
          features: epic.features.map(feature => ({
            name: feature.name,
            description: feature.description,
            userStories: feature.user_stories.map(us => ({
              id: us.id,
              narrative: us.narrative,
              screen: us.screen,
              businessRules: us.business_rules,
              acceptanceCriteria: us.acceptance_criteria,
              mvp: us.mvp,
              priority: us.priority as 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have' | undefined,
            })),
          })),
        })),
      };

      const client = getJiraClient();
      const result = await client.createFromFAStructure(structure);

      return JSON.stringify({
        success: true,
        bdev_code: result.bdevCode,
        epic_key: result.epicKey,
        epic_url: result.epicUrl,
        summary: {
          total_features: result.summary.totalFeatures,
          total_user_stories: result.summary.totalUserStories,
        },
        features: result.features.map(f => ({
          key: f.featureKey,
          name: f.featureName,
          url: f.featureUrl,
          user_stories: f.userStories.map(us => ({
            key: us.storyKey,
            id: us.storyId,
            url: us.storyUrl,
          })),
        })),
        message: `Criados com sucesso: 1 Epic (${result.bdevCode}), ${result.summary.totalFeatures} Features, ${result.summary.totalUserStories} User Stories`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_search_issues: async (args) => {
    try {
      const { jql, max_results } = args as {
        jql: string;
        max_results?: number;
      };

      const client = getJiraClient();
      const result = await client.searchIssues(jql, max_results || 50);

      return JSON.stringify({
        success: true,
        total: result.total,
        issues: result.issues.map(issue => ({
          key: issue.key,
          summary: issue.fields.summary,
          type: issue.fields.issuetype.name,
          status: issue.fields.status.name,
          labels: issue.fields.labels,
          url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
        })),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_link_issues: async (args) => {
    try {
      const { from_issue_key, to_issue_key, link_type } = args as {
        from_issue_key: string;
        to_issue_key: string;
        link_type: string;
      };

      const client = getJiraClient();
      await client.createIssueLink(from_issue_key, to_issue_key, link_type);

      return JSON.stringify({
        success: true,
        message: `Link criado: ${from_issue_key} ${link_type.toLowerCase()} ${to_issue_key}`,
        from: from_issue_key,
        to: to_issue_key,
        link_type,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_add_attachment: async (args) => {
    try {
      const { issue_key, file_name, file_base64 } = args as {
        issue_key: string;
        file_name: string;
        file_base64: string;
      };

      const client = getJiraClient();
      const fileBuffer = Buffer.from(file_base64, 'base64');
      const result = await client.addAttachment(issue_key, file_name, fileBuffer);

      return JSON.stringify({
        success: true,
        message: `Ficheiro '${file_name}' anexado a ${issue_key}`,
        issue_key,
        attachment: result[0] || { filename: file_name },
        issue_url: `${process.env.JIRA_BASE_URL}/browse/${issue_key}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_bulk_create_with_document: async (args) => {
    try {
      const {
        functionality_name,
        description,
        stakeholder,
        document_base64,
        document_name,
        epics,
        functional_flow,
      } = args as {
        functionality_name: string;
        description: string;
        stakeholder?: string;
        document_base64?: string;
        document_name?: string;
        epics: Array<{
          name: string;
          features: Array<{
            name: string;
            description?: string;
            user_stories: Array<{
              id: string;
              narrative: string;
              screen?: string;
              mvp?: string;
              acceptance_criteria: AcceptanceCriterion[];
            }>;
          }>;
        }>;
        functional_flow?: Array<{
          from_story_id: string;
          to_story_id: string;
          link_type: string;
        }>;
      };

      // Convert to FAStructure format
      const structure: FAStructure = {
        functionalityName: functionality_name,
        description,
        stakeholder,
        epics: epics.map(epic => ({
          name: epic.name,
          features: epic.features.map(feature => ({
            name: feature.name,
            description: feature.description,
            userStories: feature.user_stories.map(us => ({
              id: us.id,
              narrative: us.narrative,
              screen: us.screen,
              acceptanceCriteria: us.acceptance_criteria,
              mvp: us.mvp === 'true' || us.mvp === 'MVP1',
              priority: 'Must Have' as const,
            })),
          })),
        })),
      };

      const client = getJiraClient();
      const result = await client.createFromFAStructure(structure);

      // Attach document to Epic — auto-read from temp file if not provided directly
      let docBase64 = document_base64;
      let docName = document_name;
      if (!docBase64) {
        try {
          const tmpDir = os.tmpdir();
          const docFiles = fs.readdirSync(tmpDir).filter((f: string) => f.startsWith('fa-doc-'));
          if (docFiles.length > 0) {
            const latest = docFiles.sort().pop()!;
            const stored = JSON.parse(fs.readFileSync(path.join(tmpDir, latest), 'utf-8'));
            docBase64 = stored.base64;
            docName = docName || stored.fileName;
          }
        } catch (e) {
          // Ignore — document attachment is optional
        }
      }
      let attachmentResult = null;
      if (docBase64 && docName) {
        const fileBuffer = Buffer.from(docBase64, 'base64');
        attachmentResult = await client.addAttachment(result.epicKey, docName, fileBuffer);
      }

      // Create functional flow links
      const linkResults: Array<{ from: string; to: string; success: boolean }> = [];
      if (functional_flow && functional_flow.length > 0) {
        // Map story IDs to Jira keys
        const storyIdToKey: Record<string, string> = {};
        result.features.forEach(f => {
          f.userStories.forEach(us => {
            storyIdToKey[us.storyId] = us.storyKey;
          });
        });

        for (const link of functional_flow) {
          const fromKey = storyIdToKey[link.from_story_id];
          const toKey = storyIdToKey[link.to_story_id];

          if (fromKey && toKey) {
            try {
              await client.createIssueLink(fromKey, toKey, link.link_type);
              linkResults.push({ from: fromKey, to: toKey, success: true });
            } catch (e) {
              linkResults.push({ from: fromKey, to: toKey, success: false });
            }
          }
        }
      }

      return JSON.stringify({
        success: true,
        bdev_code: result.bdevCode,
        epic_key: result.epicKey,
        epic_url: result.epicUrl,
        summary: {
          total_features: result.summary.totalFeatures,
          total_user_stories: result.summary.totalUserStories,
        },
        features: result.features.map(f => ({
          key: f.featureKey,
          name: f.featureName,
          url: f.featureUrl,
          user_stories: f.userStories.map(us => ({
            key: us.storyKey,
            id: us.storyId,
            url: us.storyUrl,
          })),
        })),
        document_attached: attachmentResult ? {
          success: true,
          filename: document_name,
        } : null,
        functional_flow_links: linkResults,
        message: `Criados com sucesso: 1 Epic (${result.bdevCode}), ${result.summary.totalFeatures} Features, ${result.summary.totalUserStories} User Stories${attachmentResult ? ', documento anexado' : ''}${linkResults.length > 0 ? `, ${linkResults.filter(l => l.success).length} links de fluxo` : ''}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },
};
