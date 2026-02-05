import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack } from '@mui/material';
import { Alert } from './Alert';

/**
 * # Alert - BCTT Design System
 *
 * Componente para mensagens de feedback ao utilizador.
 *
 * ## Variantes
 * - **success**: Mensagem de sucesso
 * - **warning**: Mensagem de aviso
 * - **error**: Mensagem de erro
 * - **info**: Mensagem informativa
 */
const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info'],
    },
    closable: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Alert de sucesso.
 */
export const Success: Story = {
  args: {
    variant: 'success',
    children: 'A sua transferência foi realizada com sucesso.',
  },
};

/**
 * Alert de aviso.
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'A sua sessão irá expirar em 5 minutos.',
  },
};

/**
 * Alert de erro.
 */
export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Ocorreu um erro ao processar o seu pedido. Por favor tente novamente.',
  },
};

/**
 * Alert informativo.
 */
export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Existem atualizações disponíveis para a sua conta.',
  },
};

/**
 * Alert com título.
 */
export const WithTitle: Story = {
  args: {
    variant: 'success',
    title: 'Pagamento confirmado',
    children: 'O seu pagamento de €150,00 foi processado com sucesso.',
  },
};

/**
 * Alert com botão de fechar.
 */
export const Closable: Story = {
  args: {
    variant: 'info',
    title: 'Novidade',
    closable: true,
    children: 'Agora pode fazer transferências instantâneas gratuitamente.',
  },
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack spacing={2} sx={{ width: 500 }}>
      <Alert variant="success" title="Sucesso">
        Operação realizada com sucesso.
      </Alert>
      <Alert variant="warning" title="Aviso">
        Por favor reveja os dados antes de continuar.
      </Alert>
      <Alert variant="error" title="Erro">
        Não foi possível completar a operação.
      </Alert>
      <Alert variant="info" title="Informação">
        O horário de atendimento foi alterado.
      </Alert>
    </Stack>
  ),
};

/**
 * Exemplo de uso em formulário.
 */
export const FormValidation: Story = {
  render: () => (
    <Box sx={{ width: 400 }}>
      <Stack spacing={2}>
        <Alert variant="error">
          Por favor corrija os seguintes erros:
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>O campo email é obrigatório</li>
            <li>A password deve ter pelo menos 8 caracteres</li>
          </ul>
        </Alert>
      </Stack>
    </Box>
  ),
};

/**
 * Alert de confirmação de operação.
 */
export const TransactionConfirmation: Story = {
  render: () => (
    <Box sx={{ width: 450 }}>
      <Alert variant="success" title="Transferência realizada">
        Foi transferido <strong>€250,00</strong> para a conta{' '}
        <strong>PT50 0035 •••• 1234</strong>.
        <br />
        <br />
        <small>Referência: TRF-2024-001234</small>
      </Alert>
    </Box>
  ),
};

/**
 * Alerts empilhados.
 */
export const Stacked: Story = {
  render: () => (
    <Stack spacing={1} sx={{ width: 500 }}>
      <Alert variant="info" closable>
        Novo: Agora pode pagar com MB Way.
      </Alert>
      <Alert variant="warning" closable>
        O seu cartão expira em 30 dias.
      </Alert>
    </Stack>
  ),
};
