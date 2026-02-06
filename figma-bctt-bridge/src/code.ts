/**
 * BCTT Bridge - Figma Plugin
 * Receives commands from MCP Server via WebSocket and creates pages/frames in Figma
 *
 * RESTRICTION: Only operates on project "AI" and file "AI Tests"
 */

// Design tokens from BCTT Design System
const COLORS = {
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
};

const SPACING = {
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 40,
  xxl: 60,
};

// Show the UI
figma.showUI(__html__, { width: 400, height: 500 });

// Allowed file - RESTRICTION
const ALLOWED_FILE_NAME = "AI Tests";

// Font loading cache
let fontsLoaded = false;

async function ensureFontsLoaded() {
  if (fontsLoaded) return;
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  fontsLoaded = true;
}

// Check if we're in the allowed file
function checkFileRestriction(): boolean {
  const fileName = figma.root.name;
  if (!fileName.includes(ALLOWED_FILE_NAME)) {
    figma.notify(`ERRO: Este plugin só funciona no ficheiro "${ALLOWED_FILE_NAME}". Ficheiro atual: "${fileName}"`, { error: true });
    return false;
  }
  return true;
}

// ============================================
// MESSAGE TYPES
// ============================================

interface CreatePageMessage {
  type: 'create-page';
  name: string;
}

interface CreateFrameMessage {
  type: 'create-frame';
  pageName: string;
  frame: {
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    backgroundColor?: string;
  };
}

interface CreateScreenMessage {
  type: 'create-screen';
  pageName: string;
  screen: {
    id: string;
    name: string;
    type: 'mobile' | 'desktop';
    header?: { title: string; backButton: boolean };
    footer?: { primaryAction: string | null; secondaryAction: string | null };
    states: string[];
  };
}

interface ScreenData {
  id: string;
  name: string;
  type: 'mobile' | 'desktop';
  states: string[];
  header?: {
    title: string;
    backButton: boolean;
    closeButton?: boolean;
  };
  sections?: Array<{
    type: string;
    components: string[];
  }>;
  footer?: {
    primaryAction: string | null;
    secondaryAction: string | null;
  };
}

interface CreateBdevStructureMessage {
  type: 'create-bdev-structure';
  bdevCode: string;
  screens: ScreenData[];
}

// UX Flow types matching what the server sends
interface FlowArrowSpec {
  fromNodeId: string;
  toNodeId: string;
  color: { r: number; g: number; b: number };
  label: string;
  type: 'happy' | 'exception';
}

interface FlowNodeSpec {
  id: string;
  label: string;
  mvp?: string;
  x: number;
  y: number;
  frame: FigmaFrameSpec;
}

interface FlowGroupSpec {
  ruleName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodes: FlowNodeSpec[];
  arrows: FlowArrowSpec[];
}

interface FigmaFrameSpec {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  fills: Array<{ type: 'SOLID'; color: { r: number; g: number; b: number } }>;
  children?: FigmaFrameSpec[];
}

interface UxFlowPageSpec {
  name: string;
  groups: FlowGroupSpec[];
}

interface CreateUxFlowMessage {
  type: 'create-ux-flow';
  bdevCode: string;
  flowPage: UxFlowPageSpec;
}

interface PingMessage {
  type: 'ping';
}

type PluginMessage = CreatePageMessage | CreateFrameMessage | CreateScreenMessage | CreateBdevStructureMessage | CreateUxFlowMessage | PingMessage;

// ============================================
// MESSAGE HANDLER
// ============================================

figma.ui.onmessage = async (msg: PluginMessage) => {
  // Always check file restriction first
  if (msg.type !== 'ping' && !checkFileRestriction()) {
    figma.ui.postMessage({ type: 'error', message: 'File restriction violated' });
    return;
  }

  switch (msg.type) {
    case 'ping':
      figma.ui.postMessage({ type: 'pong', fileName: figma.root.name });
      break;

    case 'create-page':
      await handleCreatePage(msg);
      break;

    case 'create-frame':
      await handleCreateFrame(msg);
      break;

    case 'create-screen':
      await handleCreateScreen(msg);
      break;

    case 'create-bdev-structure':
      await handleCreateBdevStructure(msg);
      break;

    case 'create-ux-flow':
      await handleCreateUxFlow(msg);
      break;
  }
};

// ============================================
// DS COMPONENT RENDERING HELPERS
// ============================================

interface ComponentStyle {
  height: number;
  fill: RGB;
  borderRadius: number;
  hasLabel: boolean;
}

function getComponentStyle(componentStr: string): ComponentStyle {
  const lower = componentStr.toLowerCase();

  if (lower.startsWith('button:') || lower.startsWith('button primary')) {
    return { height: 48, fill: COLORS.primary, borderRadius: 8, hasLabel: false };
  }
  if (lower.includes('secondary')) {
    return { height: 48, fill: COLORS.surface, borderRadius: 8, hasLabel: false };
  }
  if (lower.startsWith('button ghost') || lower.startsWith('link:')) {
    return { height: 44, fill: COLORS.background, borderRadius: 0, hasLabel: false };
  }
  if (lower.startsWith('input:') || lower.startsWith('textinput:') || lower.startsWith('select:') || lower.startsWith('search:')) {
    return { height: 56, fill: COLORS.surface, borderRadius: 4, hasLabel: true };
  }
  if (lower.startsWith('card:')) {
    return { height: 96, fill: COLORS.surface, borderRadius: 16, hasLabel: false };
  }
  if (lower.startsWith('alert:') || lower.startsWith('banner:')) {
    return { height: 64, fill: { r: 0.95, g: 0.97, b: 1 }, borderRadius: 8, hasLabel: false };
  }
  if (lower.startsWith('list:') || lower.startsWith('listitem:') || lower.startsWith('accordion:')) {
    return { height: 56, fill: COLORS.surface, borderRadius: 0, hasLabel: false };
  }
  if (lower.startsWith('checkbox:') || lower.startsWith('radio:') || lower.startsWith('toggle:')) {
    return { height: 44, fill: COLORS.surface, borderRadius: 0, hasLabel: false };
  }
  if (lower.startsWith('stepper:')) {
    return { height: 48, fill: COLORS.background, borderRadius: 0, hasLabel: false };
  }

  return { height: 44, fill: COLORS.border, borderRadius: 4, hasLabel: false };
}

function getComponentLabel(componentStr: string): string {
  const parts = componentStr.split(':');
  return parts.length > 1 ? parts.slice(1).join(':').trim() : componentStr;
}

async function createTextNode(text: string, x: number, y: number, fontSize: number, color: RGB, fontStyle: string = "Regular"): Promise<TextNode> {
  await ensureFontsLoaded();
  const node = figma.createText();
  node.fontName = { family: "Inter", style: fontStyle };
  node.characters = text;
  node.fontSize = fontSize;
  node.fills = [{ type: 'SOLID', color }];
  node.x = x;
  node.y = y;
  return node;
}

async function renderComponent(componentStr: string, parent: FrameNode, x: number, y: number, availableWidth: number): Promise<number> {
  const style = getComponentStyle(componentStr);
  const label = getComponentLabel(componentStr);
  let totalHeight = 0;

  // For input fields: add label above
  if (style.hasLabel) {
    const labelText = await createTextNode(label + ' *', x, y, 12, COLORS.textSecondary, "Medium");
    parent.appendChild(labelText);
    totalHeight += 20;

    const field = figma.createFrame();
    field.name = `Field: ${label}`;
    field.resize(availableWidth, style.height - 20);
    field.x = x;
    field.y = y + 20;
    field.fills = [{ type: 'SOLID', color: style.fill }];
    field.cornerRadius = style.borderRadius;
    field.strokes = [{ type: 'SOLID', color: COLORS.border }];
    field.strokeWeight = 1;
    parent.appendChild(field);

    // Placeholder text inside field
    const placeholder = await createTextNode(label, x + 12, y + 20 + 10, 14, COLORS.textSecondary);
    parent.appendChild(placeholder);

    totalHeight += style.height - 20;
  } else {
    const frame = figma.createFrame();
    frame.name = componentStr;
    frame.resize(availableWidth, style.height);
    frame.x = x;
    frame.y = y;
    frame.fills = [{ type: 'SOLID', color: style.fill }];
    frame.cornerRadius = style.borderRadius;

    // Add border for secondary buttons
    if (componentStr.toLowerCase().includes('secondary')) {
      frame.strokes = [{ type: 'SOLID', color: COLORS.primary }];
      frame.strokeWeight = 1;
    }

    parent.appendChild(frame);

    // Add text label inside
    const textColor = componentStr.toLowerCase().startsWith('button:') || componentStr.toLowerCase().startsWith('button primary')
      ? COLORS.surface
      : COLORS.textPrimary;

    const btnText = await createTextNode(label, x + availableWidth / 2 - label.length * 3.5, y + (style.height - 16) / 2, 14, textColor, "Medium");
    parent.appendChild(btnText);

    totalHeight = style.height;
  }

  return totalHeight;
}

// ============================================
// SCREEN RENDERING
// ============================================

async function renderScreenFrame(
  _parent: PageNode,
  screen: ScreenData,
  state: string,
  x: number,
  y: number
): Promise<FrameNode> {
  await ensureFontsLoaded();

  const dimensions = screen.type === 'mobile'
    ? { width: 375, height: 812 }
    : { width: 1440, height: 900 };
  const padding = 16;
  const headerHeight = 56;
  const footerHeight = 72;

  // Main frame
  const frame = figma.createFrame();
  frame.name = `${screen.id} - ${screen.name} [${state}]`;
  frame.resize(dimensions.width, dimensions.height);
  frame.x = x;
  frame.y = y;
  frame.fills = [{ type: 'SOLID', color: COLORS.background }];

  // === HEADER ===
  const header = figma.createFrame();
  header.name = 'Header';
  header.resize(dimensions.width, headerHeight);
  header.x = 0;
  header.y = 0;
  header.fills = [{ type: 'SOLID', color: COLORS.surface }];
  frame.appendChild(header);

  if (screen.header) {
    // Back button
    if (screen.header.backButton) {
      const backBtn = figma.createFrame();
      backBtn.name = '← Back';
      backBtn.resize(40, 40);
      backBtn.x = 8;
      backBtn.y = 8;
      backBtn.fills = [];
      header.appendChild(backBtn);

      const arrow = await createTextNode('←', 16, 10, 20, COLORS.textPrimary, "Medium");
      header.appendChild(arrow);
    }

    // Title
    const titleText = await createTextNode(
      screen.header.title || screen.name,
      0, 0, 18, COLORS.textPrimary, "Semi Bold"
    );
    // Center the title
    titleText.x = Math.max(48, (dimensions.width - titleText.width) / 2);
    titleText.y = (headerHeight - 18) / 2;
    header.appendChild(titleText);

    // Close button
    if (screen.header.closeButton) {
      const closeText = await createTextNode('✕', dimensions.width - 36, 18, 16, COLORS.textSecondary, "Regular");
      header.appendChild(closeText);
    }
  }

  // Bottom border for header
  const headerBorder = figma.createFrame();
  headerBorder.name = 'Header border';
  headerBorder.resize(dimensions.width, 1);
  headerBorder.x = 0;
  headerBorder.y = headerHeight - 1;
  headerBorder.fills = [{ type: 'SOLID', color: COLORS.border }];
  frame.appendChild(headerBorder);

  // === CONTENT (sections with components) ===
  const content = figma.createFrame();
  content.name = 'Content';
  content.resize(dimensions.width, dimensions.height - headerHeight - footerHeight);
  content.x = 0;
  content.y = headerHeight;
  content.fills = [{ type: 'SOLID', color: COLORS.background }];
  frame.appendChild(content);

  const sections = screen.sections || [];
  let contentY = padding;

  for (const section of sections) {
    // Section container
    const sectionFrame = figma.createFrame();
    sectionFrame.name = `Section: ${section.type}`;
    const sectionWidth = dimensions.width - padding * 2;
    sectionFrame.resize(sectionWidth, 100); // Will resize after
    sectionFrame.x = padding;
    sectionFrame.y = contentY;
    sectionFrame.fills = [{ type: 'SOLID', color: COLORS.surface }];
    sectionFrame.cornerRadius = 12;
    content.appendChild(sectionFrame);

    // Section type label
    const sectionLabel = await createTextNode(
      section.type.toUpperCase(),
      8, 8, 10, COLORS.textSecondary, "Semi Bold"
    );
    sectionFrame.appendChild(sectionLabel);

    let compY = 28;
    const compPadding = 12;

    // Render each component
    for (const comp of section.components) {
      const compHeight = await renderComponent(
        comp,
        sectionFrame,
        compPadding,
        compY,
        sectionWidth - compPadding * 2
      );
      compY += compHeight + 12;
    }

    // Resize section to fit content
    const sectionHeight = compY + 8;
    sectionFrame.resize(sectionWidth, sectionHeight);
    contentY += sectionHeight + SPACING.m;
  }

  // If no sections, show placeholder
  if (sections.length === 0) {
    const placeholder = await createTextNode(
      `[${state}] Conteúdo do ecrã "${screen.name}"`,
      padding, padding, 14, COLORS.textSecondary
    );
    content.appendChild(placeholder);
  }

  // === FOOTER ===
  if (screen.footer) {
    const footer = figma.createFrame();
    footer.name = 'Footer';
    footer.resize(dimensions.width, footerHeight);
    footer.x = 0;
    footer.y = dimensions.height - footerHeight;
    footer.fills = [{ type: 'SOLID', color: COLORS.surface }];
    frame.appendChild(footer);

    // Top border
    const footerBorder = figma.createFrame();
    footerBorder.name = 'Footer border';
    footerBorder.resize(dimensions.width, 1);
    footerBorder.x = 0;
    footerBorder.y = 0;
    footerBorder.fills = [{ type: 'SOLID', color: COLORS.border }];
    footer.appendChild(footerBorder);

    let btnY = 12;

    // Primary action button
    if (screen.footer.primaryAction) {
      const btnWidth = dimensions.width - padding * 2;
      const btn = figma.createFrame();
      btn.name = `Button: ${screen.footer.primaryAction}`;
      btn.resize(btnWidth, 48);
      btn.x = padding;
      btn.y = btnY;
      btn.fills = [{ type: 'SOLID', color: COLORS.primary }];
      btn.cornerRadius = 8;
      footer.appendChild(btn);

      const btnText = await createTextNode(
        screen.footer.primaryAction,
        0, 0, 16, COLORS.surface, "Semi Bold"
      );
      btnText.x = padding + (btnWidth - btnText.width) / 2;
      btnText.y = btnY + (48 - 16) / 2;
      footer.appendChild(btnText);
    }

    // Secondary action link
    if (screen.footer.secondaryAction) {
      const link = await createTextNode(
        screen.footer.secondaryAction,
        0, btnY + 52, 14, COLORS.textSecondary, "Medium"
      );
      link.x = (dimensions.width - link.width) / 2;
      footer.appendChild(link);
    }
  }

  return frame;
}

// ============================================
// HANDLERS
// ============================================

async function handleCreatePage(msg: CreatePageMessage) {
  try {
    const existingPage = figma.root.children.find(p => p.name === msg.name);
    if (existingPage) {
      figma.ui.postMessage({ type: 'page-exists', name: msg.name, id: existingPage.id });
      figma.notify(`Página "${msg.name}" já existe`);
      return;
    }

    const page = figma.createPage();
    page.name = msg.name;

    figma.ui.postMessage({ type: 'page-created', name: msg.name, id: page.id });
    figma.notify(`Página "${msg.name}" criada com sucesso`);
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error) });
  }
}

async function handleCreateFrame(msg: CreateFrameMessage) {
  try {
    const page = figma.root.children.find(p => p.name === msg.pageName) as PageNode | undefined;
    if (!page) {
      figma.ui.postMessage({ type: 'error', message: `Página "${msg.pageName}" não encontrada` });
      return;
    }

    await figma.setCurrentPageAsync(page);

    const frame = figma.createFrame();
    frame.name = msg.frame.name;
    frame.resize(msg.frame.width, msg.frame.height);
    frame.x = msg.frame.x;
    frame.y = msg.frame.y;
    frame.fills = [{ type: 'SOLID', color: COLORS.background }];

    figma.ui.postMessage({ type: 'frame-created', name: frame.name, id: frame.id });
    figma.notify(`Frame "${frame.name}" criado`);
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error) });
  }
}

async function handleCreateScreen(msg: CreateScreenMessage) {
  try {
    const page = figma.root.children.find(p => p.name === msg.pageName) as PageNode | undefined;
    if (!page) {
      figma.ui.postMessage({ type: 'error', message: `Página "${msg.pageName}" não encontrada` });
      return;
    }

    await figma.setCurrentPageAsync(page);

    const dimensions = msg.screen.type === 'mobile'
      ? { width: 375, height: 812 }
      : { width: 1440, height: 900 };

    for (let i = 0; i < msg.screen.states.length; i++) {
      const screenData: ScreenData = {
        id: msg.screen.id,
        name: msg.screen.name,
        type: msg.screen.type,
        states: msg.screen.states,
        header: msg.screen.header ? {
          title: msg.screen.header.title,
          backButton: msg.screen.header.backButton,
          closeButton: false,
        } : undefined,
        footer: msg.screen.footer || undefined,
      };
      await renderScreenFrame(
        page,
        screenData,
        msg.screen.states[i],
        i * (dimensions.width + 40),
        0
      );
    }

    figma.ui.postMessage({ type: 'screen-created', id: msg.screen.id, statesCount: msg.screen.states.length });
    figma.notify(`Ecrã "${msg.screen.name}" criado com ${msg.screen.states.length} estados`);
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error) });
  }
}

async function handleCreateBdevStructure(msg: CreateBdevStructureMessage) {
  try {
    const { bdevCode, screens } = msg;

    // Create Ecrãs page
    const screensPageName = `${bdevCode} - Ecrãs`;
    let screensPage = figma.root.children.find(p => p.name === screensPageName) as PageNode | undefined;
    if (!screensPage) {
      screensPage = figma.createPage();
      screensPage.name = screensPageName;
    }

    // Create UX Flow page
    const flowPageName = `${bdevCode} - UX Flow`;
    let flowPage = figma.root.children.find(p => p.name === flowPageName) as PageNode | undefined;
    if (!flowPage) {
      flowPage = figma.createPage();
      flowPage.name = flowPageName;
    }

    // Switch to screens page
    await figma.setCurrentPageAsync(screensPage);
    await ensureFontsLoaded();

    // Create each screen with real content
    let currentY = 0;
    for (const screen of screens) {
      const dimensions = screen.type === 'mobile'
        ? { width: 375, height: 812 }
        : { width: 1440, height: 900 };

      const states = screen.states || ['default'];

      for (let i = 0; i < states.length; i++) {
        await renderScreenFrame(
          screensPage,
          screen,
          states[i],
          i * (dimensions.width + 40),
          currentY
        );
      }

      currentY += dimensions.height + 100;
    }

    figma.ui.postMessage({
      type: 'bdev-structure-created',
      bdevCode,
      pagesCreated: [screensPageName, flowPageName],
      screensCount: screens.length
    });
    figma.notify(`Estrutura BDEV "${bdevCode}" criada: ${screens.length} ecrãs com conteúdo em 2 páginas`);
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error) });
  }
}

// ============================================
// UX FLOW HANDLER
// ============================================

async function handleCreateUxFlow(msg: CreateUxFlowMessage) {
  try {
    const { bdevCode, flowPage: flowPageSpec } = msg;
    await ensureFontsLoaded();

    // Find or create the UX Flow page
    const flowPageName = flowPageSpec.name || `${bdevCode} - UX Flow`;
    let flowPage = figma.root.children.find(p => p.name === flowPageName) as PageNode | undefined;
    if (!flowPage) {
      flowPage = figma.createPage();
      flowPage.name = flowPageName;
    }

    await figma.setCurrentPageAsync(flowPage);

    // Clear existing content on the flow page
    while (flowPage.children.length > 0) {
      flowPage.children[0].remove();
    }

    // Render each group (business rule)
    for (const group of flowPageSpec.groups) {
      // Group container frame
      const groupFrame = figma.createFrame();
      groupFrame.name = `Rule: ${group.ruleName}`;
      groupFrame.resize(Math.max(group.width, 800), Math.max(group.height, 400));
      groupFrame.x = group.x;
      groupFrame.y = group.y;
      groupFrame.fills = [{ type: 'SOLID', color: COLORS.background }];
      groupFrame.cornerRadius = 16;
      groupFrame.strokes = [{ type: 'SOLID', color: COLORS.border }];
      groupFrame.strokeWeight = 2;
      flowPage.appendChild(groupFrame);

      // Group title
      const titleText = await createTextNode(
        group.ruleName,
        SPACING.l, SPACING.m, 20, COLORS.textPrimary, "Bold"
      );
      groupFrame.appendChild(titleText);

      // Track node positions for arrows
      const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();

      // Render nodes
      for (const node of group.nodes) {
        await renderFigmaFrameSpec(node.frame, groupFrame, node.x, node.y);

        nodePositions.set(node.id, {
          x: node.x,
          y: node.y,
          width: node.frame.width,
          height: node.frame.height,
        });

        // Add node label above if not already in frame name
        if (node.mvp) {
          const mvpBadge = figma.createFrame();
          mvpBadge.name = `MVP: ${node.mvp}`;
          mvpBadge.resize(60, 20);
          mvpBadge.x = node.x;
          mvpBadge.y = node.y - 24;
          mvpBadge.fills = [{ type: 'SOLID', color: COLORS.primaryDark }];
          mvpBadge.cornerRadius = 4;
          groupFrame.appendChild(mvpBadge);

          const mvpText = await createTextNode(node.mvp, node.x + 8, node.y - 22, 10, COLORS.surface, "Semi Bold");
          groupFrame.appendChild(mvpText);
        }
      }

      // Render arrows (connections between nodes)
      for (const arrow of group.arrows) {
        const fromPos = nodePositions.get(arrow.fromNodeId);
        const toPos = nodePositions.get(arrow.toNodeId);
        if (!fromPos || !toPos) continue;

        const startX = fromPos.x + fromPos.width;
        const startY = fromPos.y + fromPos.height / 2;
        const endX = toPos.x;
        const endY = toPos.y + toPos.height / 2;

        const arrowColor = arrow.type === 'happy' ? COLORS.success : COLORS.error;

        // Create line as a thin frame
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 1) continue;

        const line = figma.createFrame();
        line.name = `Arrow: ${arrow.label} (${arrow.type})`;
        line.resize(Math.max(length, 1), 3);
        line.x = startX;
        line.y = startY - 1;
        line.fills = [{ type: 'SOLID', color: arrowColor }];
        line.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
        groupFrame.appendChild(line);

        // Arrow label
        const midX = (startX + endX) / 2;
        const midY = Math.min(startY, endY) - 16;
        const labelText = await createTextNode(
          arrow.label,
          midX - arrow.label.length * 3,
          midY,
          10,
          arrowColor,
          "Medium"
        );
        groupFrame.appendChild(labelText);

        // Arrow head (small triangle-like frame)
        const arrowHead = figma.createFrame();
        arrowHead.name = '▶';
        arrowHead.resize(10, 10);
        arrowHead.x = endX - 12;
        arrowHead.y = endY - 5;
        arrowHead.fills = [{ type: 'SOLID', color: arrowColor }];
        arrowHead.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
        groupFrame.appendChild(arrowHead);
      }
    }

    figma.ui.postMessage({
      type: 'ux-flow-created',
      bdevCode,
      groupsCount: flowPageSpec.groups.length,
    });
    figma.notify(`UX Flow "${bdevCode}" criado: ${flowPageSpec.groups.length} grupos de regras de negócio`);
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error) });
  }
}

// Recursively render a FigmaFrameSpec into Figma nodes
async function renderFigmaFrameSpec(
  spec: FigmaFrameSpec,
  parent: FrameNode | PageNode,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = spec.name;
  frame.resize(spec.width, spec.height);
  frame.x = offsetX + spec.x;
  frame.y = offsetY + spec.y;
  if (spec.fills && spec.fills.length > 0) {
    frame.fills = spec.fills.map(f => ({ type: 'SOLID' as const, color: f.color }));
  }
  parent.appendChild(frame);

  // Render children
  if (spec.children) {
    for (const child of spec.children) {
      // If child name starts with "Label:" or "Title:" render as text
      if (child.name.startsWith('Label:') || child.name.startsWith('Title:') || child.name.startsWith('MVP:')) {
        const text = child.name.split(':').slice(1).join(':').trim();
        const textColor = child.fills?.[0]?.color || COLORS.textPrimary;
        const textNode = await createTextNode(text, child.x, child.y, 14, textColor, "Medium");
        frame.appendChild(textNode);
      } else {
        await renderFigmaFrameSpec(child, frame, 0, 0);
      }
    }
  }

  return frame;
}

// Initial check
if (!checkFileRestriction()) {
  figma.notify(`Por favor abre o ficheiro "${ALLOWED_FILE_NAME}" para usar este plugin`, { error: true });
}
