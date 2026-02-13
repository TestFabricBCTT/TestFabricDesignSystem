import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { SliderWithInput } from './SliderWithInput';

const meta: Meta<typeof SliderWithInput> = {
  title: 'Components/SliderWithInput',
  component: SliderWithInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    label: { control: 'text' },
    unit: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 25, min: 5, max: 40, step: 1, label: 'Prazo', unit: 'anos' },
};

export const CurrencyRange: Story = {
  args: { value: 150000, min: 10000, max: 500000, step: 5000, label: 'Montante', unit: 'EUR' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={3} sx={{ width: 450 }}>
      <SliderWithInput value={25} min={5} max={40} step={1} label="Prazo do empréstimo" unit="anos" />
      <SliderWithInput value={150000} min={10000} max={500000} step={5000} label="Montante" unit="EUR" />
      <SliderWithInput value={2.5} min={0.5} max={5} step={0.1} label="Taxa de juro" unit="%" />
    </Stack>
  ),
};
