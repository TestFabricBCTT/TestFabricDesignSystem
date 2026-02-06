/**
 * Figma API Client for DA (Design Agent)
 * Permite criar páginas e frames no Figma
 */

import dotenv from 'dotenv';
dotenv.config();

const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Get credentials from environment
function getFigmaCredentials() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  if (!token) {
    throw new Error('FIGMA_ACCESS_TOKEN not configured in .env');
  }
  if (!fileKey) {
    throw new Error('FIGMA_FILE_KEY not configured in .env');
  }

  return { token, fileKey };
}

// Make authenticated request to Figma API
async function figmaRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<unknown> {
  const { token } = getFigmaCredentials();

  const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
    method,
    headers: {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Get file information
 */
export async function getFileInfo(): Promise<{
  name: string;
  lastModified: string;
  version: string;
  pages: Array<{ id: string; name: string }>;
}> {
  const { fileKey } = getFigmaCredentials();
  const data = await figmaRequest(`/files/${fileKey}?depth=1`) as {
    name: string;
    lastModified: string;
    version: string;
    document: {
      children: Array<{ id: string; name: string; type: string }>;
    };
  };

  return {
    name: data.name,
    lastModified: data.lastModified,
    version: data.version,
    pages: data.document.children
      .filter(child => child.type === 'CANVAS')
      .map(page => ({ id: page.id, name: page.name })),
  };
}

/**
 * Get page by name
 */
export async function getPageByName(pageName: string): Promise<{
  id: string;
  name: string;
} | null> {
  const fileInfo = await getFileInfo();
  return fileInfo.pages.find(p => p.name === pageName) || null;
}

/**
 * Note: Figma's REST API doesn't directly support creating pages or frames.
 * For that, you need to use the Figma Plugin API or Figma's newer REST API v2.
 *
 * This client provides read operations and generates specifications
 * that can be used with a Figma plugin for creation.
 */

export interface WireframeSpec {
  screenId: string;
  screenName: string;
  userStory: string;
  type: 'mobile' | 'desktop' | 'responsive';
  width: number;
  height: number;
  header: {
    title: string;
    backButton: boolean;
    closeButton: boolean;
  };
  sections: Array<{
    type: 'info_banner' | 'form' | 'card_list' | 'summary' | 'action';
    components: string[];
  }>;
  footer: {
    primaryAction: string | null;
    secondaryAction: string | null;
  };
  states: ('default' | 'loading' | 'error' | 'empty' | 'success')[];
}

export interface FigmaFrameSpec {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  fills: Array<{ type: 'SOLID'; color: { r: number; g: number; b: number } }>;
  children?: FigmaFrameSpec[];
}

/**
 * Generate Figma-compatible frame specification from wireframe.
 * Creates structured child frames for header, each section with components, and footer.
 */
export function generateFigmaSpec(wireframe: WireframeSpec): FigmaFrameSpec {
  // Device dimensions
  const dimensions = {
    mobile: { width: 375, height: 812 },
    desktop: { width: 1440, height: 900 },
    responsive: { width: 375, height: 812 }, // Start with mobile
  };

  const { width, height } = dimensions[wireframe.type];
  const headerHeight = 56;
  const footerHeight = 72;
  const contentHeight = height - headerHeight - footerHeight;
  const padding = 16;
  const sectionGap = 16;

  // Build header children
  const headerChildren: FigmaFrameSpec[] = [];
  if (wireframe.header.backButton) {
    headerChildren.push({
      name: '← Back',
      width: 40, height: 40, x: 8, y: 8,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textSecondary }],
    });
  }
  headerChildren.push({
    name: `Title: ${wireframe.header.title}`,
    width: width - 96, height: 24, x: 48, y: 16,
    fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textPrimary }],
  });
  if (wireframe.header.closeButton) {
    headerChildren.push({
      name: '✕ Close',
      width: 40, height: 40, x: width - 48, y: 8,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textSecondary }],
    });
  }

  // Build section children inside content area
  const sectionChildren: FigmaFrameSpec[] = [];
  let currentY = padding;

  for (const section of wireframe.sections) {
    // Section container
    const sectionComponentChildren: FigmaFrameSpec[] = [];
    let compY = 8;

    // Section type label
    sectionComponentChildren.push({
      name: `[${section.type.toUpperCase()}]`,
      width: width - padding * 2 - 16, height: 20, x: 8, y: compY,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textSecondary }],
    });
    compY += 28;

    // Individual components — rendered with DS-aware styles
    for (const comp of section.components) {
      const compWidth = width - padding * 2 - 16;
      const { frame, totalHeight } = renderDSComponent(comp, 8, compY, compWidth);
      sectionComponentChildren.push(frame);
      compY += totalHeight + 8;
    }

    const sectionHeight = compY + 8;

    sectionChildren.push({
      name: `Section: ${section.type}`,
      width: width - padding * 2,
      height: sectionHeight,
      x: padding,
      y: currentY,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.surface }],
      children: sectionComponentChildren,
    });

    currentY += sectionHeight + sectionGap;
  }

  // Build footer children
  const footerChildren: FigmaFrameSpec[] = [];
  if (wireframe.footer.primaryAction) {
    footerChildren.push({
      name: `Button: ${wireframe.footer.primaryAction}`,
      width: width - padding * 2, height: 48, x: padding, y: 12,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.primary }],
    });
  }
  if (wireframe.footer.secondaryAction) {
    footerChildren.push({
      name: `Link: ${wireframe.footer.secondaryAction}`,
      width: width - padding * 2, height: 20, x: padding, y: 4,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textSecondary }],
    });
  }

  return {
    name: `${wireframe.screenId} - ${wireframe.screenName}`,
    width,
    height,
    x: 0,
    y: 0,
    fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.background }],
    children: [
      // Header
      {
        name: 'Header',
        width,
        height: headerHeight,
        x: 0,
        y: 0,
        fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.surface }],
        children: headerChildren,
      },
      // Content with sections and components
      {
        name: 'Content',
        width,
        height: contentHeight,
        x: 0,
        y: headerHeight,
        fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.background }],
        children: sectionChildren,
      },
      // Footer
      {
        name: 'Footer',
        width,
        height: footerHeight,
        x: 0,
        y: height - footerHeight,
        fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.surface }],
        children: footerChildren,
      },
    ],
  };
}

/**
 * Generate multiple frame specs for all states
 */
export function generateAllStateSpecs(wireframe: WireframeSpec): FigmaFrameSpec[] {
  const specs: FigmaFrameSpec[] = [];
  const baseSpec = generateFigmaSpec(wireframe);

  wireframe.states.forEach((state, index) => {
    specs.push({
      ...baseSpec,
      name: `${wireframe.screenId} - ${wireframe.screenName} [${state}]`,
      x: index * (baseSpec.width + 40), // Space frames horizontally
    });
  });

  return specs;
}

/**
 * Generate page structure for a BDEV
 */
export function generateBdevPageStructure(
  bdevCode: string,
  wireframes: WireframeSpec[]
): {
  screensPage: { name: string; frames: FigmaFrameSpec[] };
  flowPage: { name: string; description: string };
} {
  const allFrames: FigmaFrameSpec[] = [];
  let currentY = 0;

  wireframes.forEach((wireframe) => {
    const stateSpecs = generateAllStateSpecs(wireframe);
    stateSpecs.forEach(spec => {
      spec.y = currentY;
      allFrames.push(spec);
    });
    currentY += 900 + 100; // Next row with spacing
  });

  return {
    screensPage: {
      name: `${bdevCode} - Ecrãs`,
      frames: allFrames,
    },
    flowPage: {
      name: `${bdevCode} - UX Flow`,
      description: 'Diagrama de navegação entre ecrãs',
    },
  };
}

/**
 * Export frame specs as JSON for Figma plugin import
 */
export function exportForFigmaPlugin(
  bdevCode: string,
  wireframes: WireframeSpec[]
): string {
  const structure = generateBdevPageStructure(bdevCode, wireframes);

  return JSON.stringify({
    version: '1.0',
    bdevCode,
    generatedAt: new Date().toISOString(),
    pages: [
      {
        name: structure.screensPage.name,
        type: 'screens',
        frames: structure.screensPage.frames,
      },
      {
        name: structure.flowPage.name,
        type: 'ux_flow',
        description: structure.flowPage.description,
        wireframes: wireframes.map(w => ({
          id: w.screenId,
          name: w.screenName,
          userStory: w.userStory,
        })),
      },
    ],
  }, null, 2);
}

// ============================================
// UX FLOW TYPES
// ============================================

export interface FlowConnection {
  from: string;       // screen_id or node_id
  to: string;         // screen_id or node_id
  type: 'happy' | 'exception';
  label: string;      // e.g. "Login sucesso", "Credenciais inválidas"
  rule?: string;      // Business rule group e.g. "RN01 - Autenticação"
}

export interface FlowNode {
  id: string;
  label: string;
  screenId?: string;  // If linked to a real screen, reference its id
  mvp?: string;       // MVP label (e.g. "MVP1", "MVP2")
}

export interface UxFlowSpec {
  bdevCode: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  wireframes: WireframeSpec[]; // Real screens to embed in the flow
}

// Arrow/connector specification for the plugin
export interface FlowArrowSpec {
  fromNodeId: string;
  toNodeId: string;
  color: { r: number; g: number; b: number };
  label: string;
  type: 'happy' | 'exception';
}

export interface UxFlowPageSpec {
  name: string;
  groups: Array<{
    ruleName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    nodes: Array<{
      id: string;
      label: string;
      mvp?: string;
      x: number;
      y: number;
      frame: FigmaFrameSpec; // Full screen frame or text box
    }>;
    arrows: FlowArrowSpec[];
  }>;
}

// ============================================
// UX FLOW GENERATION
// ============================================

/**
 * Generate the UX Flow page specification.
 * Groups nodes by business rule, embeds real screen frames where available,
 * and generates green (happy) / red (exception) arrow specs.
 */
export function generateUxFlowPage(spec: UxFlowSpec): UxFlowPageSpec {
  const { bdevCode, nodes, connections, wireframes } = spec;

  // Build a lookup of wireframes by screenId
  const wireframeMap = new Map<string, WireframeSpec>();
  for (const w of wireframes) {
    wireframeMap.set(w.screenId, w);
  }

  // Group connections by rule
  const ruleGroups = new Map<string, FlowConnection[]>();
  for (const conn of connections) {
    const rule = conn.rule || 'Fluxo Geral';
    if (!ruleGroups.has(rule)) {
      ruleGroups.set(rule, []);
    }
    ruleGroups.get(rule)!.push(conn);
  }

  // Collect node IDs per group
  const ruleNodeIds = new Map<string, Set<string>>();
  for (const [rule, conns] of ruleGroups) {
    const ids = new Set<string>();
    for (const c of conns) {
      ids.add(c.from);
      ids.add(c.to);
    }
    ruleNodeIds.set(rule, ids);
  }

  // Node lookup
  const nodeMap = new Map<string, FlowNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Layout constants
  const textBoxWidth = 200;
  const textBoxHeight = 80;
  const nodeSpacingX = 120;
  const groupPadding = 60;
  const groupSpacingY = 120;

  const groups: UxFlowPageSpec['groups'] = [];
  let groupY = 0;

  for (const [ruleName, conns] of ruleGroups) {
    const nodeIds = ruleNodeIds.get(ruleName)!;
    const nodeList = Array.from(nodeIds);

    // Simple left-to-right layout within the group
    const groupNodes: UxFlowPageSpec['groups'][0]['nodes'] = [];
    let nodeX = groupPadding;
    let maxNodeHeight = 0;

    for (const nodeId of nodeList) {
      const node = nodeMap.get(nodeId);
      const label = node?.label || nodeId;
      const linkedScreenId = node?.screenId || nodeId;
      const wireframe = wireframeMap.get(linkedScreenId);

      let frame: FigmaFrameSpec;
      let nodeWidth: number;
      let nodeHeight: number;

      if (wireframe) {
        // Real screen — generate the full frame spec
        frame = generateFigmaSpec(wireframe);
        nodeWidth = frame.width;
        nodeHeight = frame.height;
      } else {
        // Text box — no screen associated
        nodeWidth = textBoxWidth;
        nodeHeight = textBoxHeight;
        frame = {
          name: label,
          width: textBoxWidth,
          height: textBoxHeight,
          x: 0,
          y: 0,
          fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.surface }],
          children: [
            {
              name: `Label: ${label}`,
              width: textBoxWidth - 24,
              height: 20,
              x: 12,
              y: (textBoxHeight - 20) / 2,
              fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textPrimary }],
            },
          ],
        };
      }

      // Add MVP badge above the node frame if defined
      const mvpLabel = node?.mvp;
      if (mvpLabel) {
        const badgeWidth = 80;
        const badgeHeight = 24;
        const mvpBadge: FigmaFrameSpec = {
          name: `MVP: ${mvpLabel}`,
          width: badgeWidth,
          height: badgeHeight,
          x: 0,
          y: 0,
          fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.primaryDark }],
          children: [{
            name: mvpLabel,
            width: badgeWidth - 8,
            height: 14,
            x: 4,
            y: 5,
            fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.surface }],
          }],
        };

        // Wrap frame + badge into a container
        const containerWidth = nodeWidth;
        const containerHeight = badgeHeight + 8 + nodeHeight;
        frame = {
          name: `${label} [${mvpLabel}]`,
          width: containerWidth,
          height: containerHeight,
          x: 0,
          y: 0,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }], // transparent container
          children: [
            { ...mvpBadge, x: 0, y: 0 },
            { ...frame, x: 0, y: badgeHeight + 8 },
          ],
        };
        nodeHeight = containerHeight;
      }

      groupNodes.push({
        id: nodeId,
        label,
        mvp: mvpLabel,
        x: nodeX,
        y: groupPadding + 40, // 40px for rule title
        frame,
      });

      nodeX += nodeWidth + nodeSpacingX;
      if (nodeHeight > maxNodeHeight) maxNodeHeight = nodeHeight;
    }

    // Generate arrows for this group
    const arrows: FlowArrowSpec[] = conns.map(c => ({
      fromNodeId: c.from,
      toNodeId: c.to,
      color: c.type === 'happy' ? figmaDesignTokens.colors.success : figmaDesignTokens.colors.error,
      label: c.label,
      type: c.type,
    }));

    const groupWidth = nodeX + groupPadding;
    const groupHeight = groupPadding + 40 + maxNodeHeight + groupPadding;

    groups.push({
      ruleName,
      x: 0,
      y: groupY,
      width: groupWidth,
      height: groupHeight,
      nodes: groupNodes,
      arrows,
    });

    groupY += groupHeight + groupSpacingY;
  }

  return {
    name: `${bdevCode} - UX Flow`,
    groups,
  };
}

// ============================================
// DS-AWARE COMPONENT RENDERING
// ============================================

type RGBColor = { r: number; g: number; b: number };

interface DSComponentStyle {
  height: number;
  fill: RGBColor;
  borderRadius?: number;
  labelHeight?: number;  // For inputs: label above the field
}

/**
 * Map component string names to Design System-aware styles.
 * Parses "ComponentType: Label" format (e.g. "Input: Email", "Button: Confirmar").
 */
function getDSComponentStyle(componentStr: string): DSComponentStyle {
  const lower = componentStr.toLowerCase();

  // Button variants
  if (lower.startsWith('button:') || lower.startsWith('button primary')) {
    return { height: 48, fill: figmaDesignTokens.colors.primary, borderRadius: 8 };
  }
  if (lower.startsWith('button secondary') || lower.includes('secondary')) {
    return { height: 48, fill: figmaDesignTokens.colors.surface, borderRadius: 8 };
  }
  if (lower.startsWith('button ghost') || lower.startsWith('link:')) {
    return { height: 44, fill: { r: 0, g: 0, b: 0 }, borderRadius: 0 }; // transparent-ish
  }

  // Input / form fields
  if (lower.startsWith('input:') || lower.startsWith('textinput:') || lower.startsWith('select:') || lower.startsWith('search:')) {
    return { height: 56, fill: figmaDesignTokens.colors.surface, borderRadius: 4, labelHeight: 20 };
  }

  // Cards
  if (lower.startsWith('card:')) {
    return { height: 96, fill: figmaDesignTokens.colors.surface, borderRadius: 16 };
  }

  // Alerts / Banners
  if (lower.startsWith('alert:') || lower.startsWith('banner:')) {
    return { height: 64, fill: { r: 0.95, g: 0.97, b: 1 }, borderRadius: 8 };
  }

  // List items
  if (lower.startsWith('list:') || lower.startsWith('listitem:') || lower.startsWith('accordion:')) {
    return { height: 56, fill: figmaDesignTokens.colors.surface, borderRadius: 0 };
  }

  // Checkbox / Radio / Toggle
  if (lower.startsWith('checkbox:') || lower.startsWith('radio:') || lower.startsWith('toggle:')) {
    return { height: 44, fill: figmaDesignTokens.colors.surface, borderRadius: 0 };
  }

  // Stepper
  if (lower.startsWith('stepper:')) {
    return { height: 48, fill: figmaDesignTokens.colors.background, borderRadius: 0 };
  }

  // Tabs
  if (lower.startsWith('tabs:') || lower.startsWith('tabbar:')) {
    return { height: 44, fill: figmaDesignTokens.colors.surface, borderRadius: 0 };
  }

  // Default fallback
  return { height: 44, fill: figmaDesignTokens.colors.border, borderRadius: 4 };
}

/**
 * Render a single DS component as a FigmaFrameSpec with proper styling.
 */
function renderDSComponent(componentStr: string, x: number, y: number, availableWidth: number): { frame: FigmaFrameSpec; totalHeight: number } {
  const style = getDSComponentStyle(componentStr);
  const children: FigmaFrameSpec[] = [];

  let totalHeight = style.height;

  // For inputs: add label above the field
  if (style.labelHeight) {
    const label = componentStr.split(':').slice(1).join(':').trim() || componentStr;
    children.push({
      name: `Label: ${label}`,
      width: availableWidth,
      height: style.labelHeight,
      x: 0,
      y: 0,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.textPrimary }],
    });
    children.push({
      name: `Field: ${label}`,
      width: availableWidth,
      height: style.height - style.labelHeight - 4,
      x: 0,
      y: style.labelHeight + 4,
      fills: [{ type: 'SOLID', color: figmaDesignTokens.colors.surface }],
    });
    totalHeight = style.height;
  }

  const frame: FigmaFrameSpec = {
    name: componentStr,
    width: availableWidth,
    height: style.height,
    x,
    y,
    fills: [{ type: 'SOLID', color: style.fill }],
    children: children.length > 0 ? children : undefined,
  };

  return { frame, totalHeight };
}

// Design tokens for Figma
export const figmaDesignTokens = {
  colors: {
    primary: { r: 0.878, g: 0, b: 0.141 },        // #E00024
    primaryDark: { r: 0.769, g: 0, b: 0.122 },    // #C4001F
    textPrimary: { r: 0.2, g: 0.2, b: 0.2 },      // #333333
    textSecondary: { r: 0.4, g: 0.4, b: 0.4 },    // #666666
    background: { r: 0.969, g: 0.976, b: 0.988 }, // #F7F9FC
    surface: { r: 1, g: 1, b: 1 },                // #FFFFFF
    border: { r: 0.894, g: 0.914, b: 0.949 },     // #E4E9F2
    success: { r: 0, g: 0.749, b: 0.706 },        // #00BFB4
    warning: { r: 0.643, g: 0.749, b: 0 },        // #A4BF00
    error: { r: 1, g: 0.282, b: 0.322 },          // #FF4852
  },
  spacing: {
    xxs: 4,
    xs: 8,
    s: 12,
    m: 16,
    l: 24,
    xl: 40,
    xxl: 60,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 10,
    xl: 16,
  },
  typography: {
    fontFamily: 'Inter',
    h1: { size: 36, weight: 700 },
    h2: { size: 30, weight: 700 },
    h3: { size: 24, weight: 600 },
    h4: { size: 20, weight: 600 },
    h5: { size: 18, weight: 500 },
    h6: { size: 16, weight: 500 },
    body1: { size: 16, weight: 400 },
    body2: { size: 14, weight: 400 },
    caption: { size: 12, weight: 400 },
  },
};
