import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const text: Story = {
  args: { variant: 'text', children: 'Skeleton - text' },
};

export const rectangular: Story = {
  args: { variant: 'rectangular', children: 'Skeleton - rectangular' },
};

export const circular: Story = {
  args: { variant: 'circular', children: 'Skeleton - circular' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Skeleton variant="text">text</Skeleton>
      <Skeleton variant="rectangular">rectangular</Skeleton>
      <Skeleton variant="circular">circular</Skeleton>
    </Stack>
  ),
};
