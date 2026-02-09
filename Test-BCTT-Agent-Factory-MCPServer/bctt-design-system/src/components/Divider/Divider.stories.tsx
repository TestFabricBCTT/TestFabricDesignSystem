import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Typography } from '@mui/material';
import { Divider } from './Divider';

/**
 * # Divider - BCTT Design System
 *
 * Componente para separar secções de conteúdo.
 *
 * ## Variantes
 * - **fullWidth**: Linha completa
 * - **inset**: Com margem à esquerda
 * - **middle**: Com margem nos dois lados
 */
const meta: Meta<typeof Divider> = {
  title: 'Components/Divider',
  component: Divider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Orientação do divider',
    },
    variant: {
      control: 'select',
      options: ['fullWidth', 'inset', 'middle'],
      description: 'Variante do divider',
    },
    textAlign: {
      control: 'select',
      options: ['left', 'center', 'right'],
      description: 'Alinhamento do texto (quando há children)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Divider horizontal — separador de largura total.
 */
export const Horizontal: Story = {
  args: { orientation: 'horizontal', variant: 'fullWidth' },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400 }}>
        <Typography>Conteúdo acima</Typography>
        <Story />
        <Typography>Conteúdo abaixo</Typography>
      </Box>
    ),
  ],
};

/**
 * Divider inset — com margem à esquerda.
 */
export const Inset: Story = {
  args: { orientation: 'horizontal', variant: 'inset' },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400 }}>
        <Typography>Conteúdo acima</Typography>
        <Story />
        <Typography>Conteúdo abaixo</Typography>
      </Box>
    ),
  ],
};

/**
 * Divider middle — com margem nos dois lados.
 */
export const Middle: Story = {
  args: { orientation: 'horizontal', variant: 'middle' },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400 }}>
        <Typography>Conteúdo acima</Typography>
        <Story />
        <Typography>Conteúdo abaixo</Typography>
      </Box>
    ),
  ],
};

/**
 * Divider vertical — separador vertical entre elementos.
 */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  decorators: [
    (Story) => (
      <Stack direction="row" spacing={2} sx={{ height: 40, alignItems: 'center' }}>
        <Typography>Esquerda</Typography>
        <Story />
        <Typography>Direita</Typography>
      </Stack>
    ),
  ],
};

/**
 * Divider com texto.
 */
export const WithText: Story = {
  args: { orientation: 'horizontal', textAlign: 'center' },
  render: (args) => (
    <Box sx={{ width: 400 }}>
      <Divider {...args}>OU</Divider>
    </Box>
  ),
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Box sx={{ width: 400 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2">Full Width</Typography>
        <Divider variant="fullWidth" />
        <Typography variant="subtitle2">Inset</Typography>
        <Divider variant="inset" />
        <Typography variant="subtitle2">Middle</Typography>
        <Divider variant="middle" />
        <Typography variant="subtitle2">Com texto</Typography>
        <Divider textAlign="center">SECÇÃO</Divider>
      </Stack>
    </Box>
  ),
};
