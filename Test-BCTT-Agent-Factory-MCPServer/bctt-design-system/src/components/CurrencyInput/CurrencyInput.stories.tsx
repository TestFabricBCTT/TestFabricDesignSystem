import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { CurrencyInput } from './CurrencyInput';

const meta: Meta<typeof CurrencyInput> = {
  title: 'Components/CurrencyInput',
  component: CurrencyInput,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    currency: { control: 'select', options: ['EUR'] },
    min: { control: 'number' },
    max: { control: 'number' },
    readOnly: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 150000, label: 'Montante', currency: 'EUR' },
};

export const ReadOnly: Story = {
  args: { value: 85432.50, label: 'Valor aprovado', readOnly: true },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={2} sx={{ width: 300 }}>
      <CurrencyInput value={150000} label="Montante pretendido" />
      <CurrencyInput value={85432.50} label="Valor aprovado" readOnly />
      <CurrencyInput value={1250.75} label="Prestação mensal" readOnly />
    </Stack>
  ),
};
