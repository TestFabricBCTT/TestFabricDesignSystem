/**
 * Export Prototype to Disk
 * Generates a complete Vite+React standalone project from a prototype
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exportPrototype } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default output directory (relative to mcp-server root)
const OUTPUT_BASE = path.join(__dirname, '../../prototypes-output');

export interface ExportToDiskResult {
  success: boolean;
  outputPath: string;
  files: string[];
  command: string;
}

/**
 * Exports a prototype to a standalone Vite+React project on disk
 */
export function exportPrototypeToDisk(
  bdevCode: string,
  version?: number
): ExportToDiskResult {
  // Get exported prototype data
  const exported = exportPrototype(bdevCode, version);
  if (!exported) {
    throw new Error(`No prototype found for ${bdevCode}${version ? ` v${version}` : ''}`);
  }

  // Create output directory
  const outputDir = path.join(OUTPUT_BASE, bdevCode);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'src', 'screens'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'src', 'i18n'), { recursive: true });

  const writtenFiles: string[] = [];

  // 1. package.json
  const packageJson = {
    name: `prototype-${bdevCode.toLowerCase()}`,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.20.0',
      'react-i18next': '^13.5.0',
      i18next: '^23.7.0',
      '@bctt/design-system': `file:${path.relative(outputDir, path.resolve(process.cwd(), '..', 'bctt-design-system')).replace(/\\/g, '/')}`,
      '@mui/material': '^6.4.0',
      '@mui/icons-material': '^6.4.0',
      '@emotion/react': '^11.13.0',
      '@emotion/styled': '^11.13.0',
    },
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
      typescript: '^5.5.0',
      vite: '^5.4.0',
    },
  };
  fs.writeFileSync(
    path.join(outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  writtenFiles.push('package.json');

  // 2. vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'react',
      'react-dom',
    ],
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: true,
  },
});
`;
  fs.writeFileSync(path.join(outputDir, 'vite.config.ts'), viteConfig);
  writtenFiles.push('vite.config.ts');

  // 3. tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      isolatedModules: true,
      moduleDetection: 'force',
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
    },
    include: ['src'],
  };
  fs.writeFileSync(
    path.join(outputDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
  writtenFiles.push('tsconfig.json');

  // 4. index.html (with Inter font from Google Fonts)
  const indexHtml = `<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>Protótipo ${bdevCode}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);
  writtenFiles.push('index.html');

  // 5. src/main.tsx (with mobile viewport wrapper using DS tokens)
  const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import App from './App';

import ptTranslations from './i18n/pt.json';
import enTranslations from './i18n/en.json';

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: ptTranslations },
    en: { translation: enTranslations },
  },
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
});

// Mobile viewport wrapper styles (tokens from bctt-design-system)
const style = document.createElement('style');
style.textContent = \`
  body {
    margin: 0;
    background-color: #E4E9F2;
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }
  #root {
    width: 100%;
    max-width: 390px;
    min-height: 100vh;
    background-color: #F7F9FC;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    position: relative;
    overflow-x: hidden;
  }
  @media (max-width: 390px) {
    #root {
      max-width: 100%;
      box-shadow: none;
    }
  }
\`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
  fs.writeFileSync(path.join(outputDir, 'src', 'main.tsx'), mainTsx);
  writtenFiles.push('src/main.tsx');

  // 6. Rewrite App.tsx — replace @bctt/design-system imports with @mui/material
  const appCode = rewriteImports(exported.app.code);
  fs.writeFileSync(path.join(outputDir, 'src', 'App.tsx'), appCode);
  writtenFiles.push('src/App.tsx');

  // 7. Screen files — rewrite imports
  for (const screen of exported.screens) {
    const screenCode = rewriteImports(screen.code);
    fs.writeFileSync(
      path.join(outputDir, 'src', 'screens', screen.filename),
      screenCode
    );
    writtenFiles.push(`src/screens/${screen.filename}`);
  }

  // 8. Translation files
  fs.writeFileSync(
    path.join(outputDir, 'src', 'i18n', 'pt.json'),
    exported.translations.pt.content
  );
  writtenFiles.push('src/i18n/pt.json');

  fs.writeFileSync(
    path.join(outputDir, 'src', 'i18n', 'en.json'),
    exported.translations.en.content
  );
  writtenFiles.push('src/i18n/en.json');

  // 9. README.md
  fs.writeFileSync(path.join(outputDir, 'README.md'), exported.readme);
  writtenFiles.push('README.md');

  return {
    success: true,
    outputPath: outputDir,
    files: writtenFiles,
    command: 'npm install && npm run dev',
  };
}

/**
 * Known exports from @bctt/design-system.
 * Used as safety net: if the AI generates an import that doesn't exist in the DS,
 * we redirect it to @mui/material so the prototype doesn't break.
 */
const DS_EXPORTS = new Set([
  // BCTT Components (custom wrappers)
  'Button', 'ButtonProps', 'TextField', 'TextFieldProps',
  'Card', 'CardContent', 'CardActions', 'CardHeader', 'CardMedia', 'CardProps',
  'Badge', 'BadgeProps', 'Alert', 'AlertTitle', 'AlertProps',
  'Chip', 'ChipProps', 'Skeleton', 'SkeletonProps',
  'Divider', 'DividerProps', 'DateRangePicker', 'DateRangePickerProps',
  'ListTransaction', 'ListTransactionProps', 'FilterChip', 'FilterChipProps',
  'DatePicker', 'DatePickerProps',
  // Theme
  'bcttTheme', 'colors', 'typography', 'borderRadius', 'shadows',
  'spacing', 'spacingTokens', 'layoutSpacing',
  // MUI Layout Primitives (re-exported)
  'Box', 'Typography', 'Grid', 'Stack', 'Divider', 'Container', 'Paper',
  'Toolbar', 'IconButton', 'CircularProgress', 'LinearProgress',
  'Chip', 'Avatar', 'List', 'ListItem', 'ListItemText', 'ListItemIcon', 'ListItemButton',
  'Collapse', 'Fade', 'Skeleton', 'ThemeProvider', 'CssBaseline',
  // MUI styled/alpha utilities
  'alpha', 'styled',
  // MUI UI Components (re-exported)
  'AppBar', 'Tabs', 'Tab', 'Select', 'MenuItem', 'FormControl', 'InputLabel',
  'FormControlLabel', 'Checkbox', 'Radio', 'RadioGroup', 'Switch',
  'Drawer', 'Dialog', 'DialogTitle', 'DialogContent', 'DialogActions',
  'Snackbar', 'Tooltip', 'Menu',
  'Accordion', 'AccordionSummary', 'AccordionDetails',
  'Stepper', 'Step', 'StepLabel', 'Breadcrumbs', 'Link', 'MuiBadge',
]);

/**
 * Rewrites prototype imports.
 * - Removes i18n imports (configured in main.tsx)
 * - Rewrites icons subpath to @mui/icons-material
 * - Safety net: splits unknown imports from @bctt/design-system to @mui/material
 */
function rewriteImports(code: string): string {
  let result = code
    // 1. Remove import './i18n' (i18n is configured in main.tsx)
    .replace(/import\s+['"]\.\/i18n['"];?\s*\/\/.*\n?/g, '')
    .replace(/import\s+['"]\.\/i18n['"];?\s*\n?/g, '')
    // 2. Icons subpath (not yet exported by DS package)
    .replace(
      /from\s+['"]@bctt\/design-system\/icons['"];?/g,
      "from '@mui/icons-material';"
    );

  // 3. Safety net: split unknown imports to @mui/material
  result = result.replace(
    /import\s*\{([^}]+)\}\s*from\s+['"]@bctt\/design-system['"];?/g,
    (_match: string, importList: string) => {
      const allImports = importList.split(',').map((s: string) => s.trim()).filter(Boolean);
      // Strip 'type ' prefix for checking, keep it for output
      const dsImports: string[] = [];
      const muiImports: string[] = [];

      for (const imp of allImports) {
        const cleanName = imp.replace(/^type\s+/, '');
        if (DS_EXPORTS.has(cleanName)) {
          dsImports.push(imp);
        } else {
          muiImports.push(imp);
        }
      }

      const parts: string[] = [];
      if (dsImports.length > 0) {
        parts.push(`import { ${dsImports.join(', ')} } from '@bctt/design-system';`);
      }
      if (muiImports.length > 0) {
        parts.push(`import { ${muiImports.join(', ')} } from '@mui/material';`);
      }
      return parts.join('\n');
    }
  );

  return result;
}

// ============================================
// DEPLOY PROTOTYPE (auto-serve)
// ============================================

const execAsync = promisify(exec);
const PROTOTYPE_PORT = 5173;

// Track running prototype dev server
let runningServer: ChildProcess | null = null;
let runningBdev: string | null = null;

/**
 * Returns info about the currently running prototype server, if any
 */
export function getRunningPrototype(): { bdevCode: string; port: number } | null {
  if (runningServer && runningBdev) {
    return { bdevCode: runningBdev, port: PROTOTYPE_PORT };
  }
  return null;
}

/**
 * Stops the running prototype dev server
 */
export function stopPrototypeServer(): void {
  if (runningServer) {
    console.log(`[prototype] Stopping dev server for ${runningBdev}`);
    // On Windows, need to kill the process tree (shell: true creates a cmd.exe wrapper)
    if (process.platform === 'win32' && runningServer.pid) {
      try {
        // taskkill /F /T kills process tree on Windows
        exec(`taskkill /F /T /PID ${runningServer.pid}`, () => { /* ignore errors */ });
      } catch { /* ignore */ }
    } else {
      runningServer.kill();
    }
    runningServer = null;
    runningBdev = null;
  }
}

export interface DeployResult {
  success: boolean;
  url: string;
  outputPath: string;
  files: string[];
}

/**
 * Exports a prototype to disk, installs dependencies, and starts Vite dev server.
 * Returns the localhost URL where the prototype is accessible.
 */
export async function deployPrototype(
  bdevCode: string,
  version?: number
): Promise<DeployResult> {
  // 1. Export to disk (creates full Vite+React project)
  const result = exportPrototypeToDisk(bdevCode, version);

  // 2. Kill any existing prototype server
  stopPrototypeServer();

  // 3. Install dependencies (can take 30-120s on first run)
  console.log(`[prototype] Installing dependencies for ${bdevCode}...`);
  try {
    await execAsync('npm install', {
      cwd: result.outputPath,
      timeout: 180000, // 3 minutes max
    });
  } catch (error) {
    throw new Error(`npm install failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log(`[prototype] Dependencies installed for ${bdevCode}`);

  // 4. Start Vite dev server as background process
  const serverProcess = spawn('npx', ['vite', '--port', String(PROTOTYPE_PORT), '--host'], {
    cwd: result.outputPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  runningServer = serverProcess;
  runningBdev = bdevCode;

  // Handle unexpected exit
  serverProcess.on('exit', (code) => {
    if (runningServer === serverProcess) {
      console.log(`[prototype] Dev server exited with code ${code}`);
      runningServer = null;
      runningBdev = null;
    }
  });

  // 5. Wait for Vite to output the Local URL (signals readiness)
  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Vite dev server did not start within 60s'));
    }, 60000);

    const checkOutput = (data: Buffer) => {
      const output = data.toString();
      // Vite outputs "Local: http://localhost:PORT/" when ready
      const match = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    };

    serverProcess.stdout?.on('data', checkOutput);
    serverProcess.stderr?.on('data', checkOutput);

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      runningServer = null;
      runningBdev = null;
      reject(new Error(`Failed to start Vite: ${err.message}`));
    });
  });

  console.log(`[prototype] Dev server running at ${url} for ${bdevCode}`);

  return {
    success: true,
    url,
    outputPath: result.outputPath,
    files: result.files,
  };
}
