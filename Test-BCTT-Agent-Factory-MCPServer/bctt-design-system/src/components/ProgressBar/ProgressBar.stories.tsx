import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    variant: { control: 'select', options: ['determinate', 'indeterminate'] },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
  args: { variant: 'determinate', value: 65, label: 'Progresso' },
};

export const Indeterminate: Story = {
  args: { variant: 'indeterminate', label: 'A carregar...' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={3} sx={{ width: 400 }}>
      <ProgressBar variant="determinate" value={25} label="Passo 1 de 4" />
      <ProgressBar variant="determinate" value={75} label="Upload" />
      <ProgressBar variant="indeterminate" label="A processar..." />
    </Stack>
  ),
};
