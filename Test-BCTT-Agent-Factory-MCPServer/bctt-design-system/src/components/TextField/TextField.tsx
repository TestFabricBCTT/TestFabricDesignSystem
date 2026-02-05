import React from 'react';
import {
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  InputAdornment,
} from '@mui/material';

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'variant'> {
  /**
   * Variante visual do input
   * @default 'outlined'
   */
  variant?: 'outlined' | 'filled';
  /**
   * Ícone à esquerda do input
   */
  leftIcon?: React.ReactNode;
  /**
   * Ícone à direita do input
   */
  rightIcon?: React.ReactNode;
  /**
   * Texto de ajuda abaixo do input
   */
  helperText?: string;
  /**
   * Mensagem de erro (ativa estado de erro)
   */
  errorMessage?: string;
}

/**
 * TextField BCTT - Baseado no MUI TextField com estilos customizados
 *
 * @example
 * ```tsx
 * <TextField label="Email" placeholder="exemplo@email.com" />
 * <TextField label="Pesquisar" leftIcon={<SearchIcon />} />
 * <TextField label="Password" type="password" errorMessage="Password inválida" />
 * ```
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      variant = 'outlined',
      leftIcon,
      rightIcon,
      helperText,
      errorMessage,
      error,
      ...props
    },
    ref
  ) => {
    const hasError = !!errorMessage || error;

    return (
      <MuiTextField
        inputRef={ref}
        variant={variant}
        error={hasError}
        helperText={errorMessage || helperText}
        InputProps={{
          startAdornment: leftIcon ? (
            <InputAdornment position="start">{leftIcon}</InputAdornment>
          ) : undefined,
          endAdornment: rightIcon ? (
            <InputAdornment position="end">{rightIcon}</InputAdornment>
          ) : undefined,
          ...props.InputProps,
        }}
        {...props}
      />
    );
  }
);

TextField.displayName = 'TextField';

export default TextField;
