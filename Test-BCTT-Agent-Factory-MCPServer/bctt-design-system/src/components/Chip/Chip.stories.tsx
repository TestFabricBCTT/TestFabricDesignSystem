import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { Chip } from './Chip';

/**
 * # Chip - BCTT Design System
 *
 * Componente para tags e estados visuais.
 *
 * ## Variantes
 * - **success**: Estado concluído / positivo
 * - **warning**: Estado pendente / atenção
 * - **error**: Estado falhado / negativo
 * - **default**: Estado neutro
 */
const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'error', 'default'],
      description: 'Variante de cor do chip',
    },
    label: {
      control: 'text',
      description: 'Texto do chip',
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
      description: 'Tamanho do chip',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado desabilitado',
    },
    onDelete: { action: 'onDelete' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Chip de sucesso — usado para estados concluídos.
 */
export const Success: Story = {
  args: { variant: 'success', label: 'Concluído' },
};

/**
 * Chip de aviso — usado para estados pendentes.
 */
export const Warning: Story = {
  args: { variant: 'warning', label: 'Pendente' },
};

/**
 * Chip de erro — usado para estados falhados.
 */
export const Error: Story = {
  args: { variant: 'error', label: 'Falhado' },
};

/**
 * Chip default — estado neutro.
 */
export const DefaultVariant: Story = {
  args: { variant: 'default', label: 'Default' },
};

/**
 * Chip com botão de eliminar.
 */
export const WithDelete: Story = {
  args: { variant: 'success', label: 'Removível' },
};

/**
 * Todas as variantes lado a lado.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Chip variant="success" label="Concluído" />
      <Chip variant="warning" label="Pendente" />
      <Chip variant="error" label="Falhado" />
      <Chip variant="default" label="Default" />
    </Stack>
  ),
};

/**
 * Chips com diferentes tamanhos.
 */
export const Sizes: Story = {
  render: () => (
    <Stack direction="row" spacing={2} alignItems="center">
      <Chip variant="success" label="Small" size="small" />
      <Chip variant="success" label="Medium" size="medium" />
    </Stack>
  ),
};

/**
 * Exemplo de uso em contexto — estados de transações.
 */
export const TransactionStates: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <Chip variant="success" label="Aprovado" size="small" />
      <Chip variant="warning" label="Em análise" size="small" />
      <Chip variant="error" label="Recusado" size="small" />
      <Chip variant="default" label="Rascunho" size="small" />
    </Stack>
  ),
};
