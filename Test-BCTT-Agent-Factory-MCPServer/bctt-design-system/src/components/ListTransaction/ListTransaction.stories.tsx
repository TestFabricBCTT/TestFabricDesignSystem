import type { Meta, StoryObj } from '@storybook/react';
import { Box, List } from '@mui/material';
import { ListTransaction } from './ListTransaction';

/**
 * # ListTransaction - BCTT Design System
 *
 * Componente para exibir uma transacção numa lista.
 *
 * ## Tipos
 * - **debit**: Transacção de débito (valor negativo)
 * - **credit**: Transacção de crédito (valor positivo)
 */
const meta: Meta<typeof ListTransaction> = {
  title: 'Components/ListTransaction',
  component: ListTransaction,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['debit', 'credit'],
      description: 'Tipo de transacção',
    },
    date: {
      control: 'text',
      description: 'Data da transacção',
    },
    description: {
      control: 'text',
      description: 'Descrição da transacção',
    },
    amount: {
      control: 'text',
      description: 'Montante',
    },
    onClick: { action: 'onClick' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Transacção de débito.
 */
export const Debit: Story = {
  args: {
    type: 'debit',
    date: '2024-01-15',
    description: 'Pagamento EDP',
    amount: '85,50€',
  },
};

/**
 * Transacção de crédito.
 */
export const Credit: Story = {
  args: {
    type: 'credit',
    date: '2024-01-14',
    description: 'Transferência recebida',
    amount: '1.250,00€',
  },
};

/**
 * Lista de transacções.
 */
export const TransactionList: Story = {
  render: () => (
    <Box sx={{ width: 400, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <List>
        <ListTransaction type="credit" date="15 Jan 2024" description="Transferência recebida" amount="1.250,00€" />
        <ListTransaction type="debit" date="14 Jan 2024" description="Pagamento EDP" amount="85,50€" />
        <ListTransaction type="debit" date="13 Jan 2024" description="Supermercado Continente" amount="127,30€" />
        <ListTransaction type="credit" date="12 Jan 2024" description="Vencimento" amount="2.500,00€" />
      </List>
    </Box>
  ),
};
