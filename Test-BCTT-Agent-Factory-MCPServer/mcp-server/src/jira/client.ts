import {
  JiraConfig,
  JiraIssue,
  JiraSearchResult,
  JiraUser,
  CreateIssuePayload,
  LinkIssuesPayload,
  BDEVCode,
  CreateBDEVInput,
  CreateFeatureInput,
  CreateUserStoryInput,
  FAStructure,
  CreateBDEVResult,
  CreateFeatureResult,
  CreateUserStoryResult,
  AcceptanceCriterion,
  ADFDocument,
  ADFContent,
  ADFHeading,
  ADFParagraph,
  ADFBulletList,
  ADFListItem,
  ADFCodeBlock,
} from './types.js';

// ============================================
// JIRA CLIENT
// ============================================

export class JiraClient {
  private config: JiraConfig;
  private authHeader: string;

  constructor(config: JiraConfig) {
    this.config = config;
    // Basic auth: email:apiToken encoded in base64
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
  }

  // ============================================
  // HTTP HELPERS
  // ============================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}/rest/api/3${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API Error (${response.status}): ${errorText}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ============================================
  // USER OPERATIONS
  // ============================================

  async getCurrentUser(): Promise<JiraUser> {
    return this.get<JiraUser>('/myself');
  }

  async findUserByDisplayName(displayName: string): Promise<JiraUser | null> {
    const result = await this.get<JiraUser[]>(
      `/user/search?query=${encodeURIComponent(displayName)}`
    );
    return result.length > 0 ? result[0] : null;
  }

  // ============================================
  // ISSUE OPERATIONS
  // ============================================

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.get<JiraIssue>(`/issue/${issueKey}`);
  }

  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraSearchResult> {
    // Updated to use new Jira Cloud API endpoint (POST /search/jql)
    // Old endpoint /search?jql=... was deprecated (HTTP 410 Gone)
    return this.post<JiraSearchResult>('/search/jql', {
      jql,
      maxResults,
      fields: ['summary', 'status', 'issuetype', 'parent', 'labels', 'assignee', 'description']
    });
  }

  async createIssue(payload: CreateIssuePayload): Promise<JiraIssue> {
    return this.post<JiraIssue>('/issue', payload);
  }

  async linkIssues(payload: LinkIssuesPayload): Promise<void> {
    await this.post<void>('/issueLink', payload);
  }

  // ============================================
  // ATTACHMENT OPERATIONS
  // ============================================

  async addAttachment(issueKey: string, fileName: string, fileBuffer: Buffer): Promise<{ id: string; filename: string }[]> {
    const url = `${this.config.baseUrl}/rest/api/3/issue/${issueKey}/attachments`;

    // Create form data boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    // Build multipart form data manually
    const formDataParts = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '',
      '', // Will be replaced with buffer
    ];

    const header = formDataParts.join('\r\n');
    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuffer = Buffer.from(header);
    const footerBuffer = Buffer.from(footer);
    const bodyBuffer = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'X-Atlassian-Token': 'no-check',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira Attachment Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result as { id: string; filename: string }[];
  }

  // ============================================
  // LINK TYPES
  // ============================================

  async getLinkTypes(): Promise<{ linkTypes: Array<{ id: string; name: string; inward: string; outward: string }> }> {
    return this.get('/issueLinkType');
  }

  async createIssueLink(
    inwardIssueKey: string,
    outwardIssueKey: string,
    linkType: string
  ): Promise<void> {
    const payload: LinkIssuesPayload = {
      type: {
        name: linkType,
      },
      inwardIssue: {
        key: inwardIssueKey,
      },
      outwardIssue: {
        key: outwardIssueKey,
      },
    };

    await this.linkIssues(payload);
  }

  // ============================================
  // BDEV OPERATIONS
  // ============================================

  async getNextBDEVCode(): Promise<BDEVCode> {
    // Search for existing BDEVs in the project
    const jql = `project = ${this.config.projectKey} AND summary ~ "BDEV*" ORDER BY created DESC`;
    const result = await this.searchIssues(jql, 1);

    let nextNumber = 1;

    if (result.issues.length > 0) {
      const lastBDEV = result.issues[0].fields.summary;
      // Extract number from [BDEV00000001] format
      const match = lastBDEV.match(/\[BDEV(\d{8})\]/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNumber = String(nextNumber).padStart(8, '0');

    return {
      code: `BDEV${paddedNumber}`,
      number: nextNumber,
      formatted: `[BDEV${paddedNumber}]`,
    };
  }

  // ============================================
  // CREATE EPIC (BDEV)
  // ============================================

  async createBDEV(input: CreateBDEVInput, bdevCode: BDEVCode): Promise<JiraIssue> {
    // Find assignee
    const assignee = await this.findUserByDisplayName('Rodrigo Horta');

    // Build description in Atlassian Document Format (ADF)
    const descriptionContent = this.buildBDEVDescription(input);

    const payload: CreateIssuePayload = {
      fields: {
        project: {
          key: this.config.projectKey,
        },
        summary: `${bdevCode.formatted} ${input.name}`,
        description: descriptionContent,
        issuetype: {
          name: 'Epic',
        },
        labels: ['bdev', 'fa-generated'],
        ...(assignee && { assignee: { accountId: assignee.accountId } }),
      },
    };

    return this.createIssue(payload);
  }

  private buildBDEVDescription(input: CreateBDEVInput): ADFDocument {
    const contentArray: ADFContent[] = [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Resumo Executivo' }],
      } as ADFHeading,
      {
        type: 'paragraph',
        content: [{ type: 'text', text: input.description }],
      } as ADFParagraph,
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Origem' }],
      } as ADFHeading,
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Pedido por: BA (Brainstorm Agent)` }],
      } as ADFParagraph,
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Data: ${new Date().toISOString().split('T')[0]}` }],
      } as ADFParagraph,
    ];

    if (input.stakeholder) {
      contentArray.push({
        type: 'paragraph',
        content: [{ type: 'text', text: `Stakeholder: ${input.stakeholder}` }],
      } as ADFParagraph);
    }

    if (input.context) {
      contentArray.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Contexto de Negócio' }],
        } as ADFHeading,
        {
          type: 'paragraph',
          content: [{ type: 'text', text: input.context }],
        } as ADFParagraph
      );
    }

    if (input.dependencies && input.dependencies.length > 0) {
      contentArray.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Dependências Identificadas' }],
        } as ADFHeading,
        {
          type: 'bulletList',
          content: input.dependencies.map(dep => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: dep }],
            } as ADFParagraph],
          } as ADFListItem)),
        } as ADFBulletList
      );
    }

    if (input.alerts && input.alerts.length > 0) {
      contentArray.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Alertas' }],
        } as ADFHeading,
        {
          type: 'bulletList',
          content: input.alerts.map(alert => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: alert }],
            } as ADFParagraph],
          } as ADFListItem)),
        } as ADFBulletList
      );
    }

    return {
      type: 'doc',
      version: 1,
      content: contentArray,
    };
  }

  // ============================================
  // CREATE FEATURE
  // ============================================

  async createFeature(input: CreateFeatureInput): Promise<JiraIssue> {
    const assignee = await this.findUserByDisplayName('Rodrigo Horta');

    const featureLabel = `FEAT-${String(input.featureNumber).padStart(2, '0')}`;

    const payload: CreateIssuePayload = {
      fields: {
        project: {
          key: this.config.projectKey,
        },
        summary: `[${featureLabel}] ${input.name}`,
        description: input.description ? {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: input.description }],
          }],
        } : undefined,
        issuetype: {
          name: 'Story',
        },
        labels: ['feature', 'fa-generated'],
        parent: {
          key: input.epicKey,
        },
        ...(assignee && { assignee: { accountId: assignee.accountId } }),
      },
    };

    return this.createIssue(payload);
  }

  // ============================================
  // CREATE USER STORY
  // ============================================

  async createUserStory(input: CreateUserStoryInput): Promise<JiraIssue> {
    const assignee = await this.findUserByDisplayName('Rodrigo Horta');

    // Build description with acceptance criteria
    const description = this.buildUserStoryDescription(input);

    const payload: CreateIssuePayload = {
      fields: {
        project: {
          key: this.config.projectKey,
        },
        summary: `${input.storyId}: ${input.narrative.split(',')[0].trim()}`,
        description,
        issuetype: {
          name: 'Story',
        },
        labels: ['user-story', 'fa-generated'],
        parent: {
          key: input.parentKey,
        },
        ...(assignee && { assignee: { accountId: assignee.accountId } }),
      },
    };

    return this.createIssue(payload);
  }

  private buildUserStoryDescription(input: CreateUserStoryInput): ADFDocument {
    const contentArray: ADFContent[] = [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Narrativa' }],
      } as ADFHeading,
      {
        type: 'paragraph',
        content: [{ type: 'text', text: input.narrative }],
      } as ADFParagraph,
    ];

    if (input.screen) {
      contentArray.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Ecrã' }],
        } as ADFHeading,
        {
          type: 'paragraph',
          content: [{ type: 'text', text: input.screen }],
        } as ADFParagraph
      );
    }

    if (input.businessRules && input.businessRules.length > 0) {
      contentArray.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Regras de Negócio' }],
        } as ADFHeading,
        {
          type: 'bulletList',
          content: input.businessRules.map(rule => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: rule }],
            } as ADFParagraph],
          } as ADFListItem)),
        } as ADFBulletList
      );
    }

    // Add acceptance criteria
    if (input.acceptanceCriteria && input.acceptanceCriteria.length > 0) {
      contentArray.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Critérios de Aceitação' }],
        } as ADFHeading
      );

      input.acceptanceCriteria.forEach((ac, index) => {
        contentArray.push(
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: `Cenário ${index + 1}: ${ac.scenario}` }],
          } as ADFHeading,
          {
            type: 'codeBlock',
            attrs: { language: 'gherkin' },
            content: [{
              type: 'text',
              text: `Given ${ac.given}\nWhen ${ac.when}\nThen ${ac.then}`,
            }],
          } as ADFCodeBlock
        );
      });
    }

    return {
      type: 'doc',
      version: 1,
      content: contentArray,
    };
  }

  // ============================================
  // BULK CREATE FROM FA STRUCTURE
  // ============================================

  async createFromFAStructure(structure: FAStructure): Promise<CreateBDEVResult> {
    // 1. Get next BDEV code
    const bdevCode = await this.getNextBDEVCode();

    // 2. Create Epic (BDEV)
    const epicInput: CreateBDEVInput = {
      name: structure.functionalityName,
      description: structure.description,
      stakeholder: structure.stakeholder,
      dependencies: structure.dependencies,
      alerts: structure.alerts,
    };

    const epic = await this.createBDEV(epicInput, bdevCode);
    const epicUrl = `${this.config.baseUrl}/browse/${epic.key}`;

    // 3. Create Features and User Stories
    const featureResults: CreateFeatureResult[] = [];
    let totalUserStories = 0;
    let featureNumber = 1;

    for (const faEpic of structure.epics) {
      for (const faFeature of faEpic.features) {
        // Create Feature
        const featureInput: CreateFeatureInput = {
          epicKey: epic.key,
          name: faFeature.name,
          description: faFeature.description,
          featureNumber,
        };

        const feature = await this.createFeature(featureInput);
        const featureUrl = `${this.config.baseUrl}/browse/${feature.key}`;

        // Create User Stories
        const userStoryResults: CreateUserStoryResult[] = [];

        for (const faUS of faFeature.userStories) {
          const usInput: CreateUserStoryInput = {
            parentKey: feature.key,
            storyId: faUS.id,
            narrative: faUS.narrative,
            screen: faUS.screen,
            acceptanceCriteria: faUS.acceptanceCriteria,
            businessRules: faUS.businessRules,
          };

          const userStory = await this.createUserStory(usInput);
          const usUrl = `${this.config.baseUrl}/browse/${userStory.key}`;

          userStoryResults.push({
            success: true,
            storyKey: userStory.key,
            storyId: faUS.id,
            storyUrl: usUrl,
          });

          totalUserStories++;
        }

        featureResults.push({
          success: true,
          featureKey: feature.key,
          featureName: faFeature.name,
          featureUrl,
          userStories: userStoryResults,
        });

        featureNumber++;
      }
    }

    return {
      success: true,
      bdevCode: bdevCode.formatted,
      epicKey: epic.key,
      epicUrl,
      features: featureResults,
      summary: {
        totalFeatures: featureResults.length,
        totalUserStories,
      },
    };
  }

  // ============================================
  // TEST CONNECTION
  // ============================================

  async testConnection(): Promise<{ success: boolean; user?: JiraUser; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      return { success: true, user };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let jiraClient: JiraClient | null = null;

export function getJiraClient(): JiraClient {
  if (!jiraClient) {
    const config: JiraConfig = {
      baseUrl: process.env.JIRA_BASE_URL || '',
      email: process.env.JIRA_USER_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      projectKey: process.env.JIRA_PROJECT_KEY || '',
    };

    if (!config.baseUrl || !config.email || !config.apiToken || !config.projectKey) {
      throw new Error(
        'Jira configuration missing. Set JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY in .env'
      );
    }

    jiraClient = new JiraClient(config);
  }

  return jiraClient;
}

export function resetJiraClient(): void {
  jiraClient = null;
}
