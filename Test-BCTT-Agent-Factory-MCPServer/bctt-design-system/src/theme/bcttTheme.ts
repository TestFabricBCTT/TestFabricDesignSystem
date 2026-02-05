import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * BCTT Design System - MUI Theme
 * Baseado nos tokens extraídos do Figma (file: iYTDVqOqX2DpMkZCHZq8px)
 */

// ===========================================
// COLOR TOKENS
// ===========================================

export const colors = {
  // Primary (Main Red) - Brand color
  primary: {
    100: '#FBDFE3',
    200: '#F4A3AF',
    300: '#EC677D',
    400: '#E63350',
    500: '#E00024', // Base
    600: '#C4001F',
    main: '#E00024',
    light: '#EC677D',
    dark: '#C4001F',
    contrastText: '#FFFFFF',
  },
  // Greyblue - Secondary
  greyblue: {
    100: '#F7F9FC',
    200: '#F1F4F8',
    300: '#E4E9F2',
    400: '#C5CEE0',
    500: '#8F9BB3',
    600: '#6E7B93',
    main: '#8F9BB3',
    light: '#E4E9F2',
    dark: '#6E7B93',
  },
  // Neutral - Text colors
  neutral: {
    white: '#FFFFFF',
    100: '#EBEBEB',
    200: '#CCCCCC',
    300: '#999999',
    400: '#666666',
    500: '#333333',
    600: '#000000',
  },
  // Blue Green - Success/Accent
  bluegreen: {
    100: '#E3F0F0',
    200: '#CCF2F0',
    300: '#99E5E1',
    400: '#66D8D3',
    500: '#33CBC4',
    600: '#00BFB4',
    main: '#33CBC4',
    light: '#99E5E1',
    dark: '#00BFB4',
    contrastText: '#FFFFFF',
  },
  // Lime - Warning
  lime: {
    100: '#F0F0E3',
    200: '#E9EECB',
    300: '#DAE39E',
    400: '#C9D86D',
    500: '#B5CB32',
    600: '#A4BF00',
    main: '#B5CB32',
    light: '#DAE39E',
    dark: '#A4BF00',
    contrastText: '#333333',
  },
  // Purple - Accent
  purple: {
    100: '#F1EAF1',
    200: '#EBE0EB',
    300: '#DEC8DE',
    400: '#C8B1CB',
    500: '#A681AB',
    600: '#68396F',
    main: '#A681AB',
    light: '#DEC8DE',
    dark: '#68396F',
    contrastText: '#FFFFFF',
  },
} as const;

// ===========================================
// TYPOGRAPHY TOKENS
// ===========================================

export const typography = {
  fontFamily: '"Inter", "Arial", sans-serif',
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
} as const;

// ===========================================
// SPACING TOKENS (base 4px - from Zeroheight)
// ===========================================

export const spacing = 4; // MUI base unit

// Spacing scale tokens (Zeroheight naming)
export const spacingTokens = {
  xxs: 4,   // $spacing-xxs - 4px
  xs: 8,    // $spacing-xs - 8px
  s: 12,    // $spacing-s - 12px
  sm: 16,   // $spacing-sm - 16px (alias)
  m: 16,    // $spacing-m - 16px
  md: 24,   // $spacing-md - 24px (alias)
  l: 24,    // $spacing-l - 24px
  lg: 32,   // $spacing-lg - 32px (alias)
  xl: 40,   // $spacing-xl - 40px
  xxl: 60,  // $spacing-xxl - 60px
  xxxl: 80, // $spacing-xxxl - 80px
} as const;

// Layout spacing (from Zeroheight Layout rules)
export const layoutSpacing = {
  sectionGap: 24,      // Spacing between sections
  fieldGap: 16,        // Spacing between form fields
  paddingMobile: 16,   // Mobile lateral padding
  paddingTablet: 24,   // Tablet lateral padding
  paddingDesktop: 24,  // Desktop lateral padding (max-width 600px centered)
  headerHeight: 56,    // Header fixed height
  footerHeight: 72,    // Footer with actions height
} as const;

// ===========================================
// BORDER RADIUS TOKENS
// ===========================================

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 16,
  full: 9999,
} as const;

// ===========================================
// SHADOW TOKENS
// ===========================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// ===========================================
// MUI THEME OPTIONS
// ===========================================

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: colors.primary.contrastText,
    },
    secondary: {
      main: colors.bluegreen.main,
      light: colors.bluegreen.light,
      dark: colors.bluegreen.dark,
      contrastText: colors.bluegreen.contrastText,
    },
    error: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
    },
    warning: {
      main: colors.lime.main,
      light: colors.lime.light,
      dark: colors.lime.dark,
      contrastText: colors.lime.contrastText,
    },
    info: {
      main: colors.greyblue.main,
      light: colors.greyblue.light,
      dark: colors.greyblue.dark,
    },
    success: {
      main: colors.bluegreen.main,
      light: colors.bluegreen.light,
      dark: colors.bluegreen.dark,
      contrastText: colors.bluegreen.contrastText,
    },
    grey: {
      50: colors.greyblue[100],
      100: colors.neutral[100],
      200: colors.neutral[200],
      300: colors.neutral[300],
      400: colors.neutral[400],
      500: colors.neutral[500],
      600: colors.neutral[600],
      700: colors.neutral[600],
      800: colors.neutral[600],
      900: colors.neutral[600],
    },
    text: {
      primary: colors.neutral[500],
      secondary: colors.neutral[400],
      disabled: colors.neutral[300],
    },
    background: {
      default: colors.greyblue[100],
      paper: colors.neutral.white,
    },
    divider: colors.greyblue[300],
  },
  typography: {
    fontFamily: typography.fontFamily,
    fontWeightRegular: typography.fontWeightRegular,
    fontWeightMedium: typography.fontWeightMedium,
    fontWeightBold: typography.fontWeightBold,
    h1: {
      fontSize: '2.25rem', // 36px
      fontWeight: typography.fontWeightBold,
      lineHeight: 1.25,
    },
    h2: {
      fontSize: '1.875rem', // 30px
      fontWeight: typography.fontWeightBold,
      lineHeight: 1.25,
    },
    h3: {
      fontSize: '1.5rem', // 24px
      fontWeight: typography.fontWeightSemiBold,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem', // 20px
      fontWeight: typography.fontWeightSemiBold,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem', // 18px
      fontWeight: typography.fontWeightMedium,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: typography.fontWeightMedium,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem', // 16px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.5,
    },
    button: {
      fontWeight: typography.fontWeightSemiBold,
      textTransform: 'none',
    },
  },
  spacing: spacing,
  shape: {
    borderRadius: borderRadius.md,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          textTransform: 'none',
          fontWeight: typography.fontWeightSemiBold,
        },
        sizeLarge: {
          height: 48,
          padding: '12px 32px',
          fontSize: '1.125rem',
        },
        sizeMedium: {
          height: 40,
          padding: '10px 24px',
        },
        sizeSmall: {
          height: 32,
          padding: '6px 16px',
          fontSize: '0.875rem',
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.sm,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          boxShadow: shadows.md,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.sm,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
        },
      },
    },
  },
};

// ===========================================
// CREATE THEME
// ===========================================

export const bcttTheme = createTheme(themeOptions);

export default bcttTheme;
