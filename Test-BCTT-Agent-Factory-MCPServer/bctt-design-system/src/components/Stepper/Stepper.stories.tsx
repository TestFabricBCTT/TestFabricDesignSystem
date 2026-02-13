import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { Stepper } from './Stepper';

const defaultSteps = ['Simulação', 'Dados Pessoais', 'Dados Imóvel', 'Situação Profissional', 'Condições', 'Resultado', 'Confirmação'];

const meta: Meta<typeof Stepper> = {
  title: 'Components/Stepper',
  component: Stepper,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    activeStep: { control: { type: 'range', min: 0, max: 6 } },
    steps: { control: 'object' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { steps: defaultSteps, activeStep: 2, orientation: 'horizontal' },
};

export const Vertical: Story = {
  args: { steps: defaultSteps, activeStep: 3, orientation: 'vertical' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={4}>
      <Stepper steps={defaultSteps} activeStep={2} orientation="horizontal" />
      <Stepper steps={defaultSteps} activeStep={4} orientation="vertical" />
    </Stack>
  ),
};
