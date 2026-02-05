import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack } from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { TextField } from './TextField';
import React from 'react';

/**
 * # TextField - BCTT Design System
 *
 * Componente de input de texto baseado no MUI TextField.
 *
 * ## Variantes
 * - **outlined**: Input com borda (default)
 * - **filled**: Input com fundo preenchido
 */
const meta: Meta<typeof TextField> = {
  title: 'Components/TextField',
  component: TextField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['outlined', 'filled'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Input básico com label.
 */
export const Default: Story = {
  args: {
    label: 'Nome',
    placeholder: 'Introduza o seu nome',
  },
};

/**
 * Variante filled.
 */
export const Filled: Story = {
  args: {
    variant: 'filled',
    label: 'Email',
    placeholder: 'exemplo@email.com',
  },
};

/**
 * Com ícone à esquerda.
 */
export const WithLeftIcon: Story = {
  args: {
    label: 'Pesquisar',
    placeholder: 'O que procura?',
    leftIcon: <SearchIcon />,
  },
};

/**
 * Com ícone à direita.
 */
export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'exemplo@email.com',
    rightIcon: <EmailIcon />,
  },
};

/**
 * Campo obrigatório.
 */
export const Required: Story = {
  args: {
    label: 'Email',
    required: true,
    placeholder: 'obrigatório',
  },
};

/**
 * Com texto de ajuda.
 */
export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Mínimo 8 caracteres',
  },
};

/**
 * Estado de erro.
 */
export const WithError: Story = {
  args: {
    label: 'Email',
    defaultValue: 'email-invalido',
    errorMessage: 'Por favor introduza um email válido',
  },
};

/**
 * Estado desabilitado.
 */
export const Disabled: Story = {
  args: {
    label: 'Campo desabilitado',
    defaultValue: 'Não editável',
    disabled: true,
  },
};

/**
 * Tamanhos disponíveis.
 */
export const Sizes: Story = {
  render: () => (
    <Stack spacing={2}>
      <TextField size="small" label="Small" placeholder="Tamanho pequeno" />
      <TextField size="medium" label="Medium" placeholder="Tamanho médio" />
    </Stack>
  ),
};

/**
 * Exemplo de formulário de login.
 */
export const LoginForm: Story = {
  render: () => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <Box
        sx={{
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 2,
          width: 360,
        }}
      >
        <Stack spacing={3}>
          <TextField
            label="Email"
            type="email"
            placeholder="exemplo@bancoctt.pt"
            leftIcon={<EmailIcon />}
            fullWidth
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<LockIcon />}
            rightIcon={
              <Box
                component="span"
                sx={{ cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </Box>
            }
            fullWidth
          />
        </Stack>
      </Box>
    );
  },
};

/**
 * Exemplo de formulário de registo.
 */
export const RegistrationForm: Story = {
  render: () => (
    <Box
      sx={{
        p: 4,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
        width: 400,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField label="Nome" leftIcon={<PersonIcon />} fullWidth />
          <TextField label="Apelido" fullWidth />
        </Stack>
        <TextField
          label="Email"
          type="email"
          leftIcon={<EmailIcon />}
          helperText="Usaremos este email para comunicar consigo"
          fullWidth
        />
        <TextField
          label="NIF"
          placeholder="123456789"
          helperText="Número de Identificação Fiscal"
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          leftIcon={<LockIcon />}
          helperText="Mínimo 8 caracteres com letras e números"
          fullWidth
        />
      </Stack>
    </Box>
  ),
};
