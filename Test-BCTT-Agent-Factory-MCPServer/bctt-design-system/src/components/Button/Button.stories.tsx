import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack } from '@mui/material';
import { Add as AddIcon, ArrowForward as ArrowIcon, Download as DownloadIcon } from '@mui/icons-material';
import { Button } from './Button';

/**
 * # Button - BCTT Design System
 *
 * Componente de botão baseado no MUI Button com estilos BCTT.
 *
 * ## Variantes
 * - **primary**: Botão principal, fundo vermelho
 * - **secondary**: Botão secundário, borda vermelha
 * - **tertiary**: Botão terciário, apenas texto
 * - **ghost**: Botão fantasma, hover subtil
 */
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'ghost'],
      description: 'Variante visual do botão',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Tamanho do botão',
    },
    loading: {
      control: 'boolean',
      description: 'Estado de loading',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado desabilitado',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ocupar largura total',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Botão primário - usar para ações principais.
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Confirmar',
    size: "medium"
  },
};

/**
 * Botão secundário - usar para ações secundárias.
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Cancelar',
  },
};

/**
 * Botão terciário - usar para ações menos importantes.
 */
export const Tertiary: Story = {
  args: {
    variant: 'tertiary',
    children: 'Saber mais',
  },
};

/**
 * Botão ghost - hover subtil, ideal para navegação.
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Voltar',
  },
};

/**
 * Todas as variantes lado a lado.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="ghost">Ghost</Button>
    </Stack>
  ),
};

/**
 * Todos os tamanhos disponíveis.
 */
export const Sizes: Story = {
  render: () => (
    <Stack direction="row" spacing={2} alignItems="center">
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </Stack>
  ),
};

/**
 * Botões com ícones.
 */
export const WithIcons: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Button leftIcon={<AddIcon />}>Adicionar</Button>
      <Button rightIcon={<ArrowIcon />}>Continuar</Button>
      <Button leftIcon={<DownloadIcon />} variant="secondary">
        Download
      </Button>
    </Stack>
  ),
};

/**
 * Estado de loading.
 */
export const Loading: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Button loading>A processar...</Button>
      <Button loading variant="secondary">
        A carregar...
      </Button>
    </Stack>
  ),
};

/**
 * Estado desabilitado.
 */
export const Disabled: Story = {
  render: () => (
    <Stack direction="row" spacing={2}>
      <Button disabled>Primary</Button>
      <Button disabled variant="secondary">
        Secondary
      </Button>
      <Button disabled variant="tertiary">
        Tertiary
      </Button>
    </Stack>
  ),
};

/**
 * Botão de largura total.
 */
export const FullWidth: Story = {
  render: () => (
    <Box sx={{ width: 300 }}>
      <Stack spacing={2}>
        <Button fullWidth>Entrar</Button>
        <Button fullWidth variant="secondary">
          Criar conta
        </Button>
      </Stack>
    </Box>
  ),
};

/**
 * Exemplo de uso em contexto de formulário.
 */
export const FormExample: Story = {
  render: () => (
    <Box
      sx={{
        p: 3,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
        maxWidth: 400,
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Button fullWidth size="large">
            Confirmar pagamento
          </Button>
        </Box>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button variant="tertiary">Voltar</Button>
          <Button variant="secondary">Guardar rascunho</Button>
        </Stack>
      </Stack>
    </Box>
  ),
};
