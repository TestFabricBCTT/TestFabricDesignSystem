import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { ResultCard } from './ResultCard';

const meta: Meta<typeof ResultCard> = {
  title: 'Components/ResultCard',
  component: ResultCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    value: { control: 'text' },
    description: { control: 'text' },
    variant: { control: 'select', options: ['summary', 'detail', 'comparison'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Summary: Story = {
  args: { title: 'Prestação mensal', value: '523,45 €', description: 'Taxa fixa a 30 anos', variant: 'summary' },
};

export const Detail: Story = {
  args: { title: 'Montante aprovado', value: '150.000 €', description: 'Financiamento a 80% do valor do imóvel', variant: 'detail' },
};

export const Comparison: Story = {
  args: { title: 'TAEG', value: '4,2%', description: 'Taxa anual efetiva global', variant: 'comparison' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <ResultCard title="Prestação mensal" value="523,45 €" description="Taxa fixa" variant="summary" />
      <ResultCard title="Montante" value="150.000 €" description="80% do imóvel" variant="detail" />
      <ResultCard title="TAEG" value="4,2%" description="Taxa anual" variant="comparison" />
    </Stack>
  ),
};
