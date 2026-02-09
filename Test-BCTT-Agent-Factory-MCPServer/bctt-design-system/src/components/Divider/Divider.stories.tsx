import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'Components/Divider',
  component: Divider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const horizontal: Story = {
  args: { variant: 'horizontal', children: 'Divider - horizontal' },
};

export const vertical: Story = {
  args: { variant: 'vertical', children: 'Divider - vertical' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Divider variant="horizontal">horizontal</Divider>
      <Divider variant="vertical">vertical</Divider>
    </Stack>
  ),
};
