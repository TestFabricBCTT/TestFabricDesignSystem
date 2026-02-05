import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Typography } from '@mui/material';
import { Badge, type BadgeProps } from './Badge';

/**
 * # Badge - BCTT Design System
 *
 * Componente para labels, tags e indicadores de estado.
 *
 * ## Variantes
 * - **default**: Badge neutro
 * - **primary**: Badge primário (vermelho)
 * - **success**: Badge de sucesso (verde)
 * - **warning**: Badge de aviso (amarelo)
 * - **error**: Badge de erro (vermelho)
 * - **info**: Badge informativo (azul-cinza)
 */
const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'error', 'info'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Badge default.
 */
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Default',
  },
};

/**
 * Badge primary.
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

/**
 * Badge success.
 */
export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Aprovado',
  },
};

/**
 * Badge warning.
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Pendente',
  },
};

/**
 * Badge error.
 */
export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Rejeitado',
  },
};

/**
 * Badge info.
 */
export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Informação',
  },
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
    </Stack>
  ),
};

/**
 * Tamanhos disponíveis.
 */
export const Sizes: Story = {
  render: () => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Badge size="small" variant="primary">
        Small
      </Badge>
      <Badge size="medium" variant="primary">
        Medium
      </Badge>
    </Stack>
  ),
};

/**
 * Exemplo de uso em lista.
 */
export const InContext: Story = {
  render: () => {
    const items: Array<{ name: string; status: BadgeProps['variant']; label: string }> = [
      { name: 'Transferência #1234', status: 'success', label: 'Concluída' },
      { name: 'Pagamento #5678', status: 'warning', label: 'Pendente' },
      { name: 'Transferência #9012', status: 'error', label: 'Falhou' },
      { name: 'Pagamento #3456', status: 'info', label: 'Em análise' },
    ];

    return (
      <Box sx={{ width: 400 }}>
        <Stack spacing={2}>
          {items.map((item, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2">{item.name}</Typography>
              <Badge variant={item.status}>{item.label}</Badge>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  },
};

/**
 * Exemplo de categorias.
 */
export const Categories: Story = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Badge variant="default">Conta Poupança</Badge>
      <Badge variant="primary">Cartão Gold</Badge>
      <Badge variant="info">Crédito Habitação</Badge>
      <Badge variant="success">PPR</Badge>
    </Stack>
  ),
};
