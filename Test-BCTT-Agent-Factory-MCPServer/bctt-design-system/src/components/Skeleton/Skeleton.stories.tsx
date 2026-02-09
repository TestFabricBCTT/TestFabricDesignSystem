import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack } from '@mui/material';
import { Skeleton } from './Skeleton';

/**
 * # Skeleton - BCTT Design System
 *
 * Componente de placeholder para conteúdo em loading.
 *
 * ## Variantes
 * - **text**: Placeholder para texto
 * - **rectangular**: Placeholder rectangular (imagens, cards)
 * - **circular**: Placeholder circular (avatares)
 */
const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'rectangular', 'circular'],
      description: 'Variante do skeleton',
    },
    width: {
      control: 'text',
      description: 'Largura do skeleton (px ou %)',
    },
    height: {
      control: 'text',
      description: 'Altura do skeleton (px ou %)',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', false],
      description: 'Tipo de animação',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Skeleton de texto — usado como placeholder para linhas de texto.
 */
export const Text: Story = {
  args: { variant: 'text', width: 200, height: 20 },
};

/**
 * Skeleton rectangular — usado como placeholder para imagens ou cards.
 */
export const Rectangular: Story = {
  args: { variant: 'rectangular', width: 200, height: 120 },
};

/**
 * Skeleton circular — usado como placeholder para avatares.
 */
export const Circular: Story = {
  args: { variant: 'circular', width: 48, height: 48 },
};

/**
 * Animação wave.
 */
export const WaveAnimation: Story = {
  args: { variant: 'rectangular', width: 200, height: 120, animation: 'wave' },
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack spacing={2} alignItems="flex-start">
      <Skeleton variant="text" width={200} height={20} />
      <Skeleton variant="rectangular" width={200} height={120} />
      <Skeleton variant="circular" width={48} height={48} />
    </Stack>
  ),
};

/**
 * Exemplo de uso — card em loading.
 */
export const CardLoading: Story = {
  render: () => (
    <Box sx={{ width: 300, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Stack spacing={1}>
        <Skeleton variant="rectangular" width="100%" height={140} />
        <Skeleton variant="text" width="80%" height={24} />
        <Skeleton variant="text" width="60%" height={16} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={100} height={16} />
        </Stack>
      </Stack>
    </Box>
  ),
};
