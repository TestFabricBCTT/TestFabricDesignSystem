import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { DateRangePicker } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const single: Story = {
  args: { variant: 'single', children: 'DateRangePicker - single' },
};

export const range: Story = {
  args: { variant: 'range', children: 'DateRangePicker - range' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <DateRangePicker variant="single">single</DateRangePicker>
      <DateRangePicker variant="range">range</DateRangePicker>
    </Stack>
  ),
};
