import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Typography } from '@mui/material';
import { AccountCard } from './AccountCard';

/**
 * # AccountCard - BCTT Design System
 *
 * Card de conta bancária com nome, NIB e saldo.
 *
 * ## Variantes
 * - **clickable**: Card clicável (com hover/cursor)
 * - **readonly**: Card apenas de leitura
 */
const meta: Meta<typeof AccountCard> = {
  title: 'Components/AccountCard',
  component: AccountCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    accountName: {
      control: 'text',
      description: 'Nome da conta',
    },
    nib: {
      control: 'text',
      description: 'NIB da conta',
    },
    balance: {
      control: 'text',
      description: 'Saldo da conta',
    },
    variant: {
      control: 'select',
      options: ['clickable', 'readonly'],
      description: 'Variante do card',
    },
    onClick: { action: 'onClick' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Card clicável (default).
 */
export const Clickable: Story = {
  args: {
    variant: 'clickable',
    accountName: 'Conta à Ordem',
    nib: 'PT50 0035 0000 1234 5678 9012 3',
    balance: '1.250,00 €',
  },
};

/**
 * Card apenas de leitura.
 */
export const Readonly: Story = {
  args: {
    variant: 'readonly',
    accountName: 'Conta Poupança',
    nib: 'PT50 0035 0000 9876 5432 1098 7',
    balance: '5.430,75 €',
  },
};

/**
 * Todas as variantes.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack spacing={2}>
      <AccountCard variant="clickable" accountName="Conta à Ordem" nib="PT50 0035 0000 1234 5678 9012 3" balance="1.250,00 €">
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={600}>Conta à Ordem</Typography>
          <Typography variant="caption" color="text.secondary">PT50 0035 0000 1234 5678 9012 3</Typography>
          <Typography variant="h6" color="text.primary" sx={{ mt: 1 }}>1.250,00 €</Typography>
        </Box>
      </AccountCard>
      <AccountCard variant="readonly" accountName="Conta Poupança" nib="PT50 0035 0000 9876 5432 1098 7" balance="5.430,75 €">
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={600}>Conta Poupança</Typography>
          <Typography variant="caption" color="text.secondary">PT50 0035 0000 9876 5432 1098 7</Typography>
          <Typography variant="h6" color="text.primary" sx={{ mt: 1 }}>5.430,75 €</Typography>
        </Box>
      </AccountCard>
    </Stack>
  ),
};
