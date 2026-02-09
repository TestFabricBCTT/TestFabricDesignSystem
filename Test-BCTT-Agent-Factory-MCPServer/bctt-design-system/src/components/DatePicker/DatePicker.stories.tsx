import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { DatePicker } from './DatePicker';

/**
 * # DatePicker - BCTT Design System
 *
 * Componente para selecção de uma data única.
 */
const meta: Meta<typeof DatePicker> = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label do campo',
    },
    value: {
      control: 'text',
      description: 'Valor da data (YYYY-MM-DD)',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado desabilitado',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ocupar largura total',
    },
    onChange: { action: 'onChange' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * DatePicker padrão.
 */
export const DefaultVariant: Story = {
  args: { label: 'Data' },
};

/**
 * DatePicker desabilitado.
 */
export const Disabled: Story = {
  args: { label: 'Data', disabled: true },
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack spacing={2}>
      <DatePicker label="Data de início" />
      <DatePicker label="Data desabilitada" disabled />
    </Stack>
  ),
};
