import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack } from '@mui/material';
import { DateRangePicker } from './DateRangePicker';

/**
 * # DateRangePicker - BCTT Design System
 *
 * Componente para selecção de datas.
 *
 * ## Variantes
 * - **single**: Selecção de uma data
 * - **range**: Selecção de intervalo de datas (De / Até)
 */
const meta: Meta<typeof DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['single', 'range'],
      description: 'Modo de selecção de data',
    },
    label: {
      control: 'text',
      description: 'Label do campo',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder do campo',
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
 * Selecção de data única.
 */
export const SingleDate: Story = {
  args: {
    variant: 'single',
    label: 'Data de início',
  },
};

/**
 * Selecção de intervalo de datas.
 */
export const DateRange: Story = {
  args: {
    variant: 'range',
  },
};

/**
 * Campo desabilitado.
 */
export const Disabled: Story = {
  args: {
    variant: 'single',
    label: 'Data',
    disabled: true,
  },
};

/**
 * Campo com largura total.
 */
export const FullWidth: Story = {
  args: {
    variant: 'single',
    label: 'Data de nascimento',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400 }}>
        <Story />
      </Box>
    ),
  ],
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack spacing={3}>
      <DateRangePicker variant="single" label="Data única" />
      <DateRangePicker variant="range" />
      <DateRangePicker variant="single" label="Desabilitado" disabled />
    </Stack>
  ),
};

/**
 * Exemplo de uso — filtro de extrato bancário.
 */
export const BankStatementFilter: Story = {
  render: () => (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, width: 450 }}>
      <Stack spacing={2}>
        <DateRangePicker variant="range" />
      </Stack>
    </Box>
  ),
};
