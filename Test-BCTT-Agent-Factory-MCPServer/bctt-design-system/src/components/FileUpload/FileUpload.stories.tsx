import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mui/material';
import { FileUpload } from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'Components/FileUpload',
  component: FileUpload,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    variant: { control: 'select', options: ['single', 'multiple', 'dragdrop'] },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { variant: 'single', label: 'Selecionar ficheiro', accept: '.pdf,.jpg,.png' },
};

export const Multiple: Story = {
  args: { variant: 'multiple', label: 'Selecionar ficheiros', multiple: true },
};

export const DragAndDrop: Story = {
  args: { variant: 'dragdrop', accept: '.pdf,.jpg,.png', multiple: true },
};

export const AllVariants: Story = {
  render: () => (
    <Stack spacing={3} sx={{ width: 400 }}>
      <FileUpload variant="single" label="Documento de identificação" accept=".pdf" />
      <FileUpload variant="multiple" label="Comprovativos de rendimento" multiple />
      <FileUpload variant="dragdrop" accept=".pdf,.jpg,.png" multiple />
    </Stack>
  ),
};
