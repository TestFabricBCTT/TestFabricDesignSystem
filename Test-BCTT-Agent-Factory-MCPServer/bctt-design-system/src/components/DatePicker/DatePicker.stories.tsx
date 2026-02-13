import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label do campo de data',
    },
    variant: {
      control: 'select',
      options: ['desktop', 'mobile'],
      description: 'Variante desktop ou mobile',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado desabilitado',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  args: { variant: 'desktop' },
};

export const Mobile: Story = {
  args: { variant: 'mobile' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <DatePicker variant="desktop" />
      <DatePicker variant="mobile" />
    </Stack>
  ),
};
