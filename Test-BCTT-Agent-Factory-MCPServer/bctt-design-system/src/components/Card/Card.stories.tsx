import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Typography, Avatar, IconButton } from '@mui/material';
import {
  MoreVert as MoreIcon,
  CreditCard as CardIcon,
  TrendingUp as TrendingIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { Card, CardContent, CardActions, CardHeader } from './Card';
import { Button } from '../Button';

/**
 * # Card - BCTT Design System
 *
 * Componente de card para agrupar conteúdo relacionado.
 *
 * ## Variantes
 * - **elevated**: Card com sombra (default)
 * - **outlined**: Card com borda
 * - **filled**: Card com fundo preenchido
 */
const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['elevated', 'outlined', 'filled'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Card básico com conteúdo.
 */
export const Default: Story = {
  args: {
    variant: 'elevated',
    children: (
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Título do Card
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Este é um exemplo de conteúdo dentro de um card. Pode conter texto,
          imagens, botões e outros componentes.
        </Typography>
      </CardContent>
    ),
  },
};

/**
 * Card outlined.
 */
export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Card Outlined
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Variante com borda, sem sombra.
        </Typography>
      </CardContent>
    ),
  },
};

/**
 * Card filled.
 */
export const Filled: Story = {
  args: {
    variant: 'filled',
    children: (
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Card Filled
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Variante com fundo preenchido.
        </Typography>
      </CardContent>
    ),
  },
};

/**
 * Card com hover.
 */
export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: (
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Card Clicável
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Passe o rato por cima para ver o efeito.
        </Typography>
      </CardContent>
    ),
  },
};

/**
 * Todas as variantes lado a lado.
 */
export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" spacing={3}>
      <Card variant="elevated" sx={{ width: 200 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            Elevated
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Com sombra
          </Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ width: 200 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            Outlined
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Com borda
          </Typography>
        </CardContent>
      </Card>
      <Card variant="filled" sx={{ width: 200 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            Filled
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Com fundo
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  ),
};

/**
 * Card de produto bancário.
 */
export const BankProductCard: Story = {
  render: () => (
    <Card sx={{ maxWidth: 340 }} hoverable>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <CardIcon />
          </Avatar>
        }
        action={
          <IconButton>
            <MoreIcon />
          </IconButton>
        }
        title="Cartão de Crédito"
        subheader="Visa Gold"
      />
      <CardContent>
        <Typography variant="h4" fontWeight={700} color="primary">
          €2.500,00
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Plafond disponível
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingIcon color="success" fontSize="small" />
          <Typography variant="body2" color="success.main">
            +12% este mês
          </Typography>
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" variant="tertiary">
          Ver movimentos
        </Button>
        <Button size="small" variant="primary">
          Pagar
        </Button>
      </CardActions>
    </Card>
  ),
};

/**
 * Card de conta.
 */
export const AccountCard: Story = {
  render: () => (
    <Card sx={{ maxWidth: 360 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <BankIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Conta à Ordem
            </Typography>
            <Typography variant="body2">PT50 0035 •••• •••• 1234</Typography>
          </Box>
        </Box>
        <Typography variant="h3" fontWeight={700}>
          €12.456,78
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Saldo disponível
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button variant="secondary" size="small">
          Transferir
        </Button>
        <Button variant="primary" size="small">
          Ver extrato
        </Button>
      </CardActions>
    </Card>
  ),
};

/**
 * Grid de cards.
 */
export const CardGrid: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, width: 700 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} hoverable variant="outlined">
          <CardContent>
            <Typography variant="h6">Card {i}</Typography>
            <Typography variant="body2" color="text.secondary">
              Descrição breve
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  ),
};
