import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { variant: 'success', label: 'Concluído' },
};

export const Warning: Story = {
  args: { variant: 'warning', label: 'Pendente' },
};

export const Error: Story = {
  args: { variant: 'error', label: 'Falhado' },
};

export const DefaultVariant: Story = {
  args: { variant: 'default', label: 'Default' },
};

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
