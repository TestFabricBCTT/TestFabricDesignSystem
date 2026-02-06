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

// Demo mode protection: Jira API timeout in milliseconds
const JIRA_REQUEST_TIMEOUT_MS = 10000; // 10 seconds

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

    // Add timeout protection for demo mode
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JIRA_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Jira API timeout após ${JIRA_REQUEST_TIMEOUT_MS}ms para ${endpoint}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
  // PARALLEL PROCESSING HELPERS
  // ============================================

  private readonly BATCH_SIZE = 3;        // Concurrent requests per batch
  private readonly BATCH_DELAY_MS = 500;  // Delay between batches
  private readonly MAX_RETRIES = 3;       // Max retry attempts per request
  private readonly RETRY_BASE_DELAY_MS = 1000; // Base delay for exponential backoff

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES) {
          const waitTime = this.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.error(`[Jira] ${operationName} - Retry ${attempt}/${this.MAX_RETRIES} after ${waitTime}ms...`);
          await this.delay(waitTime);
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.MAX_RETRIES} retries`);
  }

  /**
   * Process items in parallel batches with retry and error handling
   */
  private async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    itemDescriptor: (item: T) => string = () => 'item'
  ): Promise<{ success: R[]; failed: Array<{ item: T; error: string }> }> {
    const success: R[] = [];
    const failed: Array<{ item: T; error: string }> = [];

    for (let i = 0; i < items.length; i += this.BATCH_SIZE) {
      const batch = items.slice(i, i + this.BATCH_SIZE);
      const batchNum = Math.floor(i / this.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(items.length / this.BATCH_SIZE);

      console.error(`[Jira] Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

      const results = await Promise.allSettled(
        batch.map(item =>
          this.withRetry(
            () => processor(item),
            itemDescriptor(item)
          )
        )
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          success.push(result.value);
        } else {
          const errorMsg = result.reason?.message || String(result.reason);
          console.error(`[Jira] Failed: ${itemDescriptor(batch[index])} - ${errorMsg}`);
          failed.push({ item: batch[index], error: errorMsg });
        }
      });

      // Delay between batches (except for last batch)
      if (i + this.BATCH_SIZE < items.length) {
        await this.delay(this.BATCH_DELAY_MS);
      }
    }

    console.error(`[Jira] Batch processing complete: ${success.length} success, ${failed.length} failed`);
    return { success, failed };
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
    // Using *navigable as per Atlassian migration docs (new API default is "id" only)
    return this.post<JiraSearchResult>('/search/jql', {
      jql,
      maxResults,
      fields: ["*navigable"]
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

    // Add timeout protection for demo mode
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JIRA_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Jira Attachment timeout após ${JIRA_REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
    console.error(`[Jira] Starting bulk create for: ${structure.functionalityName}`);

    // 1. Get next BDEV code (with retry)
    const bdevCode = await this.withRetry(
      () => this.getNextBDEVCode(),
      'getNextBDEVCode'
    );
    console.error(`[Jira] BDEV code: ${bdevCode.formatted}`);

    // 2. Create Epic (BDEV) with retry
    const epicInput: CreateBDEVInput = {
      name: structure.functionalityName,
      description: structure.description,
      stakeholder: structure.stakeholder,
      dependencies: structure.dependencies,
      alerts: structure.alerts,
    };

    const epic = await this.withRetry(
      () => this.createBDEV(epicInput, bdevCode),
      'createBDEV'
    );
    const epicUrl = `${this.config.baseUrl}/browse/${epic.key}`;
    console.error(`[Jira] Epic created: ${epic.key}`);

    // 3. Collect all features to create
    interface FeatureToCreate {
      epicKey: string;
      faFeature: FAStructure['epics'][0]['features'][0];
      featureNumber: number;
    }

    const featuresToCreate: FeatureToCreate[] = [];
    let featureNumber = 1;

    for (const faEpic of structure.epics) {
      for (const faFeature of faEpic.features) {
        featuresToCreate.push({
          epicKey: epic.key,
          faFeature,
          featureNumber: featureNumber++,
        });
      }
    }

    // 4. Create Features in parallel batches
    console.error(`[Jira] Creating ${featuresToCreate.length} features...`);

    const featureCreationResults = await this.processInBatches(
      featuresToCreate,
      async (item) => {
        const featureInput: CreateFeatureInput = {
          epicKey: item.epicKey,
          name: item.faFeature.name,
          description: item.faFeature.description,
          featureNumber: item.featureNumber,
        };

        const feature = await this.createFeature(featureInput);
        return {
          feature,
          faFeature: item.faFeature,
        };
      },
      (item) => `Feature: ${item.faFeature.name}`
    );

    // 5. Create User Stories in parallel batches for each successful feature
    const featureResults: CreateFeatureResult[] = [];
    let totalUserStories = 0;
    let failedUserStories = 0;

    for (const { feature, faFeature } of featureCreationResults.success) {
      const featureUrl = `${this.config.baseUrl}/browse/${feature.key}`;

      // Prepare user stories for this feature
      interface USToCreate {
        parentKey: string;
        faUS: typeof faFeature.userStories[0];
      }

      const usToCreate: USToCreate[] = faFeature.userStories.map(faUS => ({
        parentKey: feature.key,
        faUS,
      }));

      console.error(`[Jira] Creating ${usToCreate.length} user stories for feature ${feature.key}...`);

      // Create user stories in parallel batches
      const usResults = await this.processInBatches(
        usToCreate,
        async (item) => {
          const usInput: CreateUserStoryInput = {
            parentKey: item.parentKey,
            storyId: item.faUS.id,
            narrative: item.faUS.narrative,
            screen: item.faUS.screen,
            acceptanceCriteria: item.faUS.acceptanceCriteria,
            businessRules: item.faUS.businessRules,
          };

          const userStory = await this.createUserStory(usInput);
          return {
            userStory,
            storyId: item.faUS.id,
          };
        },
        (item) => `US: ${item.faUS.id}`
      );

      // Collect results
      const userStoryResults: CreateUserStoryResult[] = usResults.success.map(({ userStory, storyId }) => ({
        success: true,
        storyKey: userStory.key,
        storyId,
        storyUrl: `${this.config.baseUrl}/browse/${userStory.key}`,
      }));

      // Add failed stories with error info
      usResults.failed.forEach(({ item, error }) => {
        userStoryResults.push({
          success: false,
          storyKey: '',
          storyId: item.faUS.id,
          storyUrl: '',
          error,
        });
      });

      totalUserStories += usResults.success.length;
      failedUserStories += usResults.failed.length;

      featureResults.push({
        success: true,
        featureKey: feature.key,
        featureName: faFeature.name,
        featureUrl,
        userStories: userStoryResults,
      });
    }

    // Add failed features
    featureCreationResults.failed.forEach(({ item, error }) => {
      featureResults.push({
        success: false,
        featureKey: '',
        featureName: item.faFeature.name,
        featureUrl: '',
        userStories: [],
        error,
      });
    });

    const totalFeatures = featureCreationResults.success.length;
    const failedFeatures = featureCreationResults.failed.length;

    console.error(`[Jira] Bulk create complete:`);
    console.log(`  - Features: ${totalFeatures} success, ${failedFeatures} failed`);
    console.log(`  - User Stories: ${totalUserStories} success, ${failedUserStories} failed`);

    return {
      success: failedFeatures === 0 && failedUserStories === 0,
      bdevCode: bdevCode.formatted,
      epicKey: epic.key,
      epicUrl,
      features: featureResults,
      summary: {
        totalFeatures,
        totalUserStories,
        failedFeatures,
        failedUserStories,
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
