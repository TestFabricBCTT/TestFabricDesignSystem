import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';
import { typography } from '../../theme';

/**
 * # Tipografia - BCTT Design System
 *
 * Sistema tipográfico baseado na fonte Inter.
 * Inclui headings, body text e estilos de texto utilitários.
 */
const meta: Meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

/**
 * ## Escala Tipográfica
 * Todos os tamanhos e estilos de texto disponíveis.
 */
export const TypeScale: StoryObj = {
  render: () => (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary">
        Escala Tipográfica
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Font family: <strong>{typography.fontFamily}</strong>
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              h1 (36px)
            </Typography>
            <Typography variant="h1">
              Heading 1
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              h2 (30px)
            </Typography>
            <Typography variant="h2">
              Heading 2
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              h3 (24px)
            </Typography>
            <Typography variant="h3">
              Heading 3
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              h4 (20px)
            </Typography>
            <Typography variant="h4">
              Heading 4
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              h5 (18px)
            </Typography>
            <Typography variant="h5">
              Heading 5
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              h6 (16px)
            </Typography>
            <Typography variant="h6">
              Heading 6
            </Typography>
          </Box>
        </Paper>

        <Divider sx={{ my: 2 }} />

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              body1 (16px)
            </Typography>
            <Typography variant="body1">
              Body 1 - Texto principal para parágrafos e conteúdo.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              body2 (14px)
            </Typography>
            <Typography variant="body2">
              Body 2 - Texto secundário, descrições e legendas.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
              caption (12px)
            </Typography>
            <Typography variant="caption">
              Caption - Texto pequeno para labels e metadados.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  ),
};

/**
 * ## Font Weights
 * Pesos de fonte disponíveis.
 */
export const FontWeights: StoryObj = {
  render: () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Font Weights
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pesos de fonte disponíveis na Inter.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={400}>
              Aa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Regular (400)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={500}>
              Aa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Medium (500)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={600}>
              Aa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Semibold (600)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700}>
              Aa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bold (700)
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  ),
};

/**
 * ## Uso em Contexto
 * Exemplo de como a tipografia funciona em conjunto.
 */
export const InContext: StoryObj = {
  render: () => (
    <Paper sx={{ p: 4, maxWidth: 600 }}>
      <Typography variant="h2" gutterBottom>
        Bem-vindo ao Banco CTT
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        A sua conta à distância de um clique
      </Typography>
      <Typography variant="body1" paragraph>
        O Banco CTT oferece soluções financeiras simples e acessíveis para todos
        os portugueses. Com uma rede de mais de 600 balcões em todo o país,
        estamos sempre perto de si.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Abra já a sua conta e descubra as nossas vantagens exclusivas.
      </Typography>
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        * Sujeito a aprovação de crédito.
      </Typography>
    </Paper>
  ),
};
