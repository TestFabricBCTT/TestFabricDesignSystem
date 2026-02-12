import { createTheme, alpha } from '@mui/material/styles';

// Cores do Banco CTT
const bancoCTTColors = {
  // Cores principais
  primary: {
    main: '#C8102E', // Vermelho CTT
    light: '#E54359',
    dark: '#9B0C24',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#1A1A1A', // Preto
    light: '#424242',
    dark: '#000000',
    contrastText: '#FFFFFF',
  },
  // Cores de fundo (dark mode)
  background: {
    default: '#030712',
    paper: '#0F172A',
    elevated: '#1E293B',
  },
  // Cores de texto
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    disabled: '#475569',
  },
  // Cores dos agentes
  agents: {
    ba: '#3B82F6', // Brainstorm Agent - Blue
    fa: '#10B981', // Functional Agent - Green
    da: '#F59E0B', // Design Agent - Amber
    dsla: '#8B5CF6', // DSLA - Purple
    pa: '#9333EA', // Prototype Agent - Violet
    fda: '#EC4899', // Frontend Dev Agent - Pink (legacy)
    bda: '#8B5CF6', // Backend Dev Agent - Purple (legacy)
    taa: '#7C3AED', // Technical Architecture Agent - Violet
    fde: '#EC4899', // Frontend Dev Engineer - Pink
    bde: '#8B5CF6', // Backend Dev Engineer - Purple
    fbs: '#EF4444', // Frontend Bug Solver - Red
    bbs: '#DC2626', // Backend Bug Solver - Red dark
    ute: '#06B6D4', // Unit Tester - Cyan
    lte: '#14B8A6', // Load Tester - Teal
    cqa: '#84CC16', // Code Quality Agent - Lime
    monitor: '#06B6D4', // Monitoring Agent - Cyan
  },
  // Cores de AI
  ai: {
    claude: '#D97706',
    gemini: '#4285F4',
    copilot: '#000000',
    mscopilot: '#0078D4',
  },
  // Cores de estado
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
  },
};

// Tema principal
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: bancoCTTColors.primary,
    secondary: bancoCTTColors.secondary,
    background: bancoCTTColors.background,
    text: bancoCTTColors.text,
    success: bancoCTTColors.success,
    warning: bancoCTTColors.warning,
    error: bancoCTTColors.error,
    info: bancoCTTColors.info,
  },
  typography: {
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    h1: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      color: bancoCTTColors.text.secondary,
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha('#FFFFFF', 0.1)} ${alpha('#FFFFFF', 0.02)}`,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: alpha('#FFFFFF', 0.02),
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha('#FFFFFF', 0.1),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: alpha('#FFFFFF', 0.2),
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.875rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 4px 16px ${alpha(bancoCTTColors.primary.main, 0.4)}`,
          },
        },
        outlined: {
          borderColor: alpha('#FFFFFF', 0.1),
          '&:hover': {
            borderColor: alpha('#FFFFFF', 0.2),
            backgroundColor: alpha('#FFFFFF', 0.05),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#FFFFFF', 0.02),
          border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 56,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: bancoCTTColors.background.paper,
          border: `1px solid ${alpha('#FFFFFF', 0.1)}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: alpha('#FFFFFF', 0.1),
            },
            '&:hover fieldset': {
              borderColor: alpha('#FFFFFF', 0.2),
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
          backgroundColor: alpha('#FFFFFF', 0.1),
        },
      },
    },
  },
});

// Exportar cores dos agentes para uso em componentes
export const agentColors = bancoCTTColors.agents;
export const aiColors = bancoCTTColors.ai;

// Helper para obter cor do agente
export const getAgentColor = (agentId: string): string => {
  return agentColors[agentId as keyof typeof agentColors] || bancoCTTColors.primary.main;
};

// Helper para obter cor do AI
export const getAIColor = (aiLogo: string): string => {
  return aiColors[aiLogo as keyof typeof aiColors] || bancoCTTColors.ai.claude;
};

export default theme;
