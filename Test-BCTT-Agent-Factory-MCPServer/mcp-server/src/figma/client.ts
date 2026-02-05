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
 * Generate Figma-compatible frame specification from wireframe
 */
export function generateFigmaSpec(wireframe: WireframeSpec): FigmaFrameSpec {
  // Device dimensions
  const dimensions = {
    mobile: { width: 375, height: 812 },
    desktop: { width: 1440, height: 900 },
    responsive: { width: 375, height: 812 }, // Start with mobile
  };

  const { width, height } = dimensions[wireframe.type];

  return {
    name: `${wireframe.screenId} - ${wireframe.screenName}`,
    width,
    height,
    x: 0,
    y: 0,
    fills: [{ type: 'SOLID', color: { r: 0.969, g: 0.976, b: 0.988 } }], // greyblue.100
    children: [
      // Header placeholder
      {
        name: 'Header',
        width,
        height: 56,
        x: 0,
        y: 0,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      },
      // Content area placeholder
      {
        name: 'Content',
        width,
        height: height - 56 - 72, // minus header and footer
        x: 0,
        y: 56,
        fills: [{ type: 'SOLID', color: { r: 0.969, g: 0.976, b: 0.988 } }],
      },
      // Footer placeholder
      {
        name: 'Footer',
        width,
        height: 72,
        x: 0,
        y: height - 72,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
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
