import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { FilterChip } from './FilterChip';

/**
 * # FilterChip - BCTT Design System
 *
 * Componente de chip para filtros activos.
 *
 * ## Variantes
 * - **default**: Chip preenchido
 * - **outlined**: Chip com contorno
 */
const meta: Meta<typeof FilterChip> = {
  title: 'Components/FilterChip',
  component: FilterChip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined'],
      description: 'Variante visual',
    },
    label: {
      control: 'text',
      description: 'Texto do chip',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado desabilitado',
    },
    onRemove: { action: 'onRemove' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * FilterChip padrão.
 */
export const DefaultVariant: Story = {
  args: { variant: 'default', label: 'Filtro activo' },
};

/**
 * FilterChip outlined.
 */
export const Outlined: Story = {
  args: { variant: 'outlined', label: 'Filtro outline' },
};

/**
 * FilterChip removível.
 */
export const Removable: Story = {
  args: { variant: 'default', label: 'Removível' },
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <FilterChip variant="default" label="Conta à ordem" />
      <FilterChip variant="outlined" label="Últimos 30 dias" />
      <FilterChip variant="default" label="Débitos" onRemove={() => {}} />
    </Stack>
  ),
};
