import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { Timeline } from './Timeline';

const sampleItems = [
  { label: 'Pedido submetido', description: 'O seu pedido foi recebido com sucesso.' },
  { label: 'Em análise', description: 'A equipa de crédito está a analisar o seu pedido.' },
  { label: 'Aprovação', description: 'Aguarda decisão final.' },
  { label: 'Contrato', description: 'Assinatura do contrato.' },
  { label: 'Desembolso', description: 'Transferência do montante aprovado.' },
];

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    activeItem: { control: { type: 'range', min: 0, max: 4 } },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  args: { items: sampleItems, activeItem: 2, orientation: 'vertical' },
};

export const Horizontal: Story = {
  args: { items: sampleItems, activeItem: 1, orientation: 'horizontal' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={4}>
      <Timeline items={sampleItems} activeItem={2} orientation="vertical" />
      <Timeline items={sampleItems} activeItem={3} orientation="horizontal" />
    </Stack>
  ),
};
