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
    error: {
      control: 'select',
      options: ['true', 'false'],
      description: 'Estado de erro',
    },
    disabled: {
      control: 'select',
      options: ['true', 'false'],
      description: 'Estado desabilitado',
    },
    helperText: {
      control: 'text',
      description: 'Texto de ajuda ou erro',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder do campo',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultVariant: Story = {
  args: { variant: 'default' },
};

export const Error: Story = {
  args: { variant: 'error' },
};

export const Disabled: Story = {
  args: { variant: 'disabled' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <DatePicker variant="default" />
      <DatePicker variant="error" />
      <DatePicker variant="disabled" />
    </Stack>
  ),
};
