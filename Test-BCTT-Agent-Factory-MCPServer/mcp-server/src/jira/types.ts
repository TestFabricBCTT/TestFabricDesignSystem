// ============================================
// JIRA API TYPES
// ============================================

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: JiraIssueType;
    project: JiraProject;
    status: {
      name: string;
    };
    assignee?: JiraUser;
    labels?: string[];
    parent?: {
      key: string;
    };
    customfield_acceptance_criteria?: string;
  };
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

// ============================================
// BDEV / FA TYPES
// ============================================

export interface BDEVCode {
  code: string;
  number: number;
  formatted: string; // [BDEV00000001]
}

export interface CreateBDEVInput {
  name: string;
  description: string;
  stakeholder?: string;
  context?: string;
  dependencies?: string[];
  alerts?: string[];
}

export interface CreateFeatureInput {
  epicKey: string;
  name: string;
  description?: string;
  featureNumber: number;
}

export interface CreateUserStoryInput {
  parentKey: string; // Feature key
  storyId: string; // US-001, US-002, etc.
  narrative: string;
  screen?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules?: string[];
}

export interface AcceptanceCriterion {
  scenario: string;
  given: string;
  when: string;
  then: string;
}

// ============================================
// FA STRUCTURE (from BA)
// ============================================

export interface FAStructure {
  functionalityName: string;
  area?: string;
  stakeholder?: string;
  description: string;
  epics: FAEpic[];
  dependencies?: string[];
  alerts?: string[];
}

export interface FAEpic {
  name: string;
  features: FAFeature[];
}

export interface FAFeature {
  name: string;
  description?: string;
  userStories: FAUserStory[];
}

export interface FAUserStory {
  id: string; // US-001
  narrative: string;
  screen?: string;
  fields?: FAField[];
  businessRules?: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  mvp?: boolean;
  priority?: 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have';
}

export interface FAField {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
  format?: string;
}

// ============================================
// JIRA API PAYLOADS - Atlassian Document Format (ADF)
// ============================================

// ADF Content Types
export type ADFContent = ADFParagraph | ADFHeading | ADFBulletList | ADFCodeBlock | ADFListItem;

export interface ADFText {
  type: 'text';
  text: string;
}

export interface ADFParagraph {
  type: 'paragraph';
  content?: ADFText[];
}

export interface ADFHeading {
  type: 'heading';
  attrs?: { level: number };
  content?: ADFText[];
}

export interface ADFListItem {
  type: 'listItem';
  content: ADFParagraph[];
}

export interface ADFBulletList {
  type: 'bulletList';
  content: ADFListItem[];
}

export interface ADFCodeBlock {
  type: 'codeBlock';
  attrs?: { language?: string };
  content?: ADFText[];
}

export interface ADFDocument {
  type: 'doc';
  version: 1;
  content: ADFContent[];
}

export interface CreateIssuePayload {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description?: ADFDocument;
    issuetype: {
      name: string;
    };
    labels?: string[];
    assignee?: {
      accountId: string;
    };
    parent?: {
      key: string;
    };
    // Custom field for acceptance criteria (if available)
    [key: string]: unknown;
  };
}

export interface LinkIssuesPayload {
  type: {
    name: string;
  };
  inwardIssue: {
    key: string;
  };
  outwardIssue: {
    key: string;
  };
}

// ============================================
// JIRA CREATION RESULTS
// ============================================

export interface CreateBDEVResult {
  success: boolean;
  bdevCode: string;
  epicKey: string;
  epicUrl: string;
  features: CreateFeatureResult[];
  summary: {
    totalFeatures: number;
    totalUserStories: number;
    failedFeatures?: number;
    failedUserStories?: number;
  };
}

export interface CreateFeatureResult {
  success: boolean;
  featureKey: string;
  featureName: string;
  featureUrl: string;
  userStories: CreateUserStoryResult[];
  error?: string;
}

export interface CreateUserStoryResult {
  success: boolean;
  storyKey: string;
  storyId: string;
  storyUrl: string;
  error?: string;
}
