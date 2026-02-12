import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getJiraClient } from './client.js';
import { FAStructure, AcceptanceCriterion, CreateBugInput } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

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
    name: "jira_create_bug",
    description: "Cria um Bug no Jira. Usado para reportar erros encontrados no código (frontend ou backend). O bug-watcher pode detectar estes bugs e despoletar agentes FBS/BBS para corrigi-los.",
    inputSchema: {
      type: "object",
      properties: {
        epic_key: {
          type: "string",
          description: "Key do Epic pai (opcional, ex: 'BCTT-336')"
        },
        summary: {
          type: "string",
          description: "Título/resumo do bug"
        },
        description: {
          type: "string",
          description: "Descrição detalhada do bug"
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor"],
          description: "Severidade do bug"
        },
        component: {
          type: "string",
          enum: ["frontend", "backend", "bff", "middleware", "core"],
          description: "Componente afectado"
        },
        steps_to_reproduce: {
          type: "array",
          items: { type: "string" },
          description: "Passos para reproduzir o bug"
        },
        expected_behavior: {
          type: "string",
          description: "Comportamento esperado"
        },
        actual_behavior: {
          type: "string",
          description: "Comportamento actual (errado)"
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels adicionais (ex: 'frontend-bug', 'backend-bug')"
        }
      },
      required: ["summary", "description", "severity", "component"]
    }
  },
  {
    name: "jira_create_task",
    description: "Cria uma Task no Jira. Usado para tarefas técnicas ou operacionais.",
    inputSchema: {
      type: "object",
      properties: {
        epic_key: {
          type: "string",
          description: "Key do Epic pai (opcional)"
        },
        summary: {
          type: "string",
          description: "Título/resumo da task"
        },
        description: {
          type: "string",
          description: "Descrição da task"
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels (ex: 'fase2', 'batch3')"
        }
      },
      required: ["summary"]
    }
  },
  {
    name: "jira_add_comment",
    description: "Adiciona um comentário a uma issue no Jira. Útil para reportar progresso de agentes, resultados de testes, etc.",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Key da issue (ex: 'BCTT-123')"
        },
        comment: {
          type: "string",
          description: "Texto do comentário"
        }
      },
      required: ["issue_key", "comment"]
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

  jira_create_bug: async (args) => {
    try {
      const { epic_key, summary, description, severity, component, steps_to_reproduce, expected_behavior, actual_behavior, labels } = args as {
        epic_key?: string;
        summary: string;
        description: string;
        severity: 'critical' | 'major' | 'minor';
        component: 'frontend' | 'backend' | 'bff' | 'middleware' | 'core';
        steps_to_reproduce?: string[];
        expected_behavior?: string;
        actual_behavior?: string;
        labels?: string[];
      };

      const client = getJiraClient();
      const input: CreateBugInput = {
        epicKey: epic_key,
        summary,
        description,
        severity,
        component,
        stepsToReproduce: steps_to_reproduce,
        expectedBehavior: expected_behavior,
        actualBehavior: actual_behavior,
        labels,
      };

      const bug = await client.createBug(input);
      const bugUrl = `${process.env.JIRA_BASE_URL}/browse/${bug.key}`;

      return JSON.stringify({
        success: true,
        bug_key: bug.key,
        bug_url: bugUrl,
        message: `Bug criado: ${bug.key} — ${summary}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_create_task: async (args) => {
    try {
      const { epic_key, summary, description, labels } = args as {
        epic_key?: string;
        summary: string;
        description?: string;
        labels?: string[];
      };

      const client = getJiraClient();
      const task = await client.createTask({
        epicKey: epic_key,
        summary,
        description,
        labels,
      });

      const taskUrl = `${process.env.JIRA_BASE_URL}/browse/${task.key}`;

      return JSON.stringify({
        success: true,
        task_key: task.key,
        task_url: taskUrl,
        message: `Task criada: ${task.key} — ${summary}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },

  jira_add_comment: async (args) => {
    try {
      const { issue_key, comment } = args as {
        issue_key: string;
        comment: string;
      };

      const client = getJiraClient();
      const result = await client.addComment(issue_key, comment);

      return JSON.stringify({
        success: true,
        comment_id: result.id,
        message: `Comentário adicionado a ${issue_key}`,
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
              business_rules?: string[];
              mvp?: boolean | string;
              priority?: string;
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
              businessRules: us.business_rules,
              acceptanceCriteria: us.acceptance_criteria,
              mvp: typeof us.mvp === 'boolean' ? us.mvp : us.mvp === 'true' || us.mvp === 'MVP1',
              priority: (us.priority === 'High' ? 'Must Have' : us.priority === 'Medium' ? 'Should Have' : us.priority === 'Low' ? 'Could Have' : 'Must Have') as 'Must Have' | 'Should Have' | 'Could Have',
            })),
          })),
        })),
      };

      const client = getJiraClient();
      const result = await client.createFromFAStructure(structure);

      // Attach document to Epic — ALWAYS read from temp file (never trust document_base64
      // parameter because truncateOutput corrupts large base64 strings in tool responses)
      let docBase64: string | undefined;
      let docName = document_name;
      if (true) {
        try {
          const tmpDir = os.tmpdir();
          const docFiles = fs.readdirSync(tmpDir)
            .filter((f: string) => f.startsWith('fa-doc-'))
            .sort()
            .reverse(); // newest first (timestamp in filename)
          if (docFiles.length > 0) {
            const stored = JSON.parse(fs.readFileSync(path.join(tmpDir, docFiles[0]), 'utf-8'));
            // Validate integrity via checksum
            if (stored.checksum) {
              const actual = crypto.createHash('sha256').update(stored.base64).digest('hex');
              if (actual !== stored.checksum) {
                console.error(`[Jira] Document checksum MISMATCH! Expected ${stored.checksum.substring(0, 12)}, got ${actual.substring(0, 12)}. File may be corrupted.`);
              } else {
                docBase64 = stored.base64;
                docName = docName || stored.fileName;
                console.error(`[Jira] Document loaded from temp file (${docFiles[0]}, checksum OK)`);
              }
            } else {
              // Legacy temp file without checksum — use as-is
              docBase64 = stored.base64;
              docName = docName || stored.fileName;
              console.error(`[Jira] Document loaded from temp file (${docFiles[0]}, no checksum)`);
            }
          }
          // Cleanup old temp files (>1 hour)
          for (const f of docFiles.slice(1)) {
            try {
              const filePath = path.join(tmpDir, f);
              const stat = fs.statSync(filePath);
              if (Date.now() - stat.mtimeMs > 3600000) {
                fs.unlinkSync(filePath);
              }
            } catch {}
          }
        } catch (e) {
          console.error('[Jira] Failed to read document from temp file:', e);
        }
      }
      let attachmentResult: { success: boolean; filename?: string; error?: string } | null = null;
      if (docBase64 && docName) {
        try {
          const fileBuffer = Buffer.from(docBase64, 'base64');
          await client.addAttachment(result.epicKey, docName, fileBuffer);
          attachmentResult = { success: true, filename: docName };
        } catch (e) {
          attachmentResult = { success: false, error: String(e) };
        }
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

      // Collect detailed error messages for debugging
      const errors: string[] = result.features.flatMap(f => [
        ...(f.error ? [`Feature "${f.featureName}": ${f.error}`] : []),
        ...f.userStories.filter(us => !us.success).map(us => `US ${us.storyId}: ${us.error || 'unknown error'}`),
      ]);

      return JSON.stringify({
        success: result.success,
        bdev_code: result.bdevCode,
        epic_key: result.epicKey,
        epic_url: result.epicUrl,
        summary: {
          total_features: result.summary.totalFeatures,
          total_user_stories: result.summary.totalUserStories,
          failed_features: result.summary.failedFeatures,
          failed_user_stories: result.summary.failedUserStories,
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
        document_attached: attachmentResult,
        functional_flow_links: linkResults,
        ...(errors.length > 0 && { errors }),
        message: result.success
          ? `Criados com sucesso: 1 Epic (${result.bdevCode}), ${result.summary.totalFeatures} Features, ${result.summary.totalUserStories} User Stories${attachmentResult?.success ? ', documento anexado' : ''}${linkResults.length > 0 ? `, ${linkResults.filter(l => l.success).length} links de fluxo` : ''}`
          : `Criação parcial: ${result.summary.failedFeatures} features falharam, ${result.summary.failedUserStories} user stories falharam. Epic: ${result.bdevCode}. Erros: ${errors.slice(0, 5).join('; ')}`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: String(error),
      }, null, 2);
    }
  },
};
