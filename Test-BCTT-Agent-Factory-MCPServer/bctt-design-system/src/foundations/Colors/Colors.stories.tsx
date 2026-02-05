import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Grid, Paper, alpha } from '@mui/material';
import { colors } from '../../theme';

/**
 * # Cores - BCTT Design System
 *
 * Paleta de cores extraída do Figma do Banco CTT.
 * Cada cor tem 6 níveis (100-600) para diferentes usos.
 */
const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

interface ColorSwatchProps {
  name: string;
  color: string;
  textColor?: string;
}

const ColorSwatch = ({ name, color, textColor = '#333' }: ColorSwatchProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      bgcolor: color,
      color: textColor,
      borderRadius: 1,
      border: `1px solid ${alpha('#000', 0.1)}`,
    }}
  >
    <Typography variant="body2" fontWeight={600}>
      {name}
    </Typography>
    <Typography variant="caption" sx={{ opacity: 0.8 }}>
      {color}
    </Typography>
  </Paper>
);

interface ColorPaletteProps {
  title: string;
  description: string;
  colors: Record<string, string>;
  darkFrom?: number;
}

const ColorPalette = ({ title, description, colors: colorMap, darkFrom = 500 }: ColorPaletteProps) => (
  <Box sx={{ mb: 6 }}>
    <Typography variant="h5" gutterBottom fontWeight={600}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      {description}
    </Typography>
    <Grid container spacing={2}>
      {Object.entries(colorMap).map(([key, value]) => {
        const numKey = parseInt(key);
        const isDark = !isNaN(numKey) && numKey >= darkFrom;
        return (
          <Grid item xs={6} sm={4} md={2} key={key}>
            <ColorSwatch
              name={key}
              color={value}
              textColor={isDark || key === 'main' || key === 'dark' ? '#FFF' : '#333'}
            />
          </Grid>
        );
      })}
    </Grid>
  </Box>
);

/**
 * ## Todas as Cores
 * Visão geral completa da paleta de cores BCTT.
 */
export const AllColors: StoryObj = {
  render: () => (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary">
        Paleta de Cores BCTT
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Tokens de cor extraídos do Figma. Use estas cores através do tema MUI.
      </Typography>

      <ColorPalette
        title="🔴 Primary (Main Red)"
        description="Cor principal da marca Banco CTT. Usar para CTAs, links e elementos de destaque."
        colors={{
          '100': colors.primary[100],
          '200': colors.primary[200],
          '300': colors.primary[300],
          '400': colors.primary[400],
          '500': colors.primary[500],
          '600': colors.primary[600],
        }}
      />

      <ColorPalette
        title="🔵 Greyblue"
        description="Cor secundária para backgrounds, borders e textos secundários."
        colors={{
          '100': colors.greyblue[100],
          '200': colors.greyblue[200],
          '300': colors.greyblue[300],
          '400': colors.greyblue[400],
          '500': colors.greyblue[500],
          '600': colors.greyblue[600],
        }}
        darkFrom={500}
      />

      <ColorPalette
        title="⚫ Neutral"
        description="Escala de cinzas para texto, borders e backgrounds."
        colors={{
          white: colors.neutral.white,
          '100': colors.neutral[100],
          '200': colors.neutral[200],
          '300': colors.neutral[300],
          '400': colors.neutral[400],
          '500': colors.neutral[500],
          '600': colors.neutral[600],
        }}
        darkFrom={400}
      />

      <ColorPalette
        title="🟢 Blue Green (Success)"
        description="Cor de sucesso e feedback positivo."
        colors={{
          '100': colors.bluegreen[100],
          '200': colors.bluegreen[200],
          '300': colors.bluegreen[300],
          '400': colors.bluegreen[400],
          '500': colors.bluegreen[500],
          '600': colors.bluegreen[600],
        }}
        darkFrom={500}
      />

      <ColorPalette
        title="🟡 Lime (Warning)"
        description="Cor de aviso e alertas."
        colors={{
          '100': colors.lime[100],
          '200': colors.lime[200],
          '300': colors.lime[300],
          '400': colors.lime[400],
          '500': colors.lime[500],
          '600': colors.lime[600],
        }}
        darkFrom={600}
      />

      <ColorPalette
        title="🟣 Purple"
        description="Cor de destaque secundária e elementos decorativos."
        colors={{
          '100': colors.purple[100],
          '200': colors.purple[200],
          '300': colors.purple[300],
          '400': colors.purple[400],
          '500': colors.purple[500],
          '600': colors.purple[600],
        }}
        darkFrom={500}
      />
    </Box>
  ),
};

/**
 * ## Cores Semânticas
 * Cores com significado específico para estados e feedback.
 */
export const SemanticColors: StoryObj = {
  render: () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Cores Semânticas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Use estas cores para comunicar estados e feedback ao utilizador.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <ColorSwatch name="Success" color={colors.bluegreen.main} textColor="#FFF" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <ColorSwatch name="Warning" color={colors.lime.main} textColor="#333" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <ColorSwatch name="Error" color={colors.primary.main} textColor="#FFF" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <ColorSwatch name="Info" color={colors.greyblue.main} textColor="#FFF" />
        </Grid>
      </Grid>
    </Box>
  ),
};
