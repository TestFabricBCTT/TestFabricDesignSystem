import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  /**
   * Variante visual do botão
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  /**
   * Tamanho do botão
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Estado de loading
   * @default false
   */
  loading?: boolean;
  /**
   * Ícone à esquerda do texto
   */
  leftIcon?: React.ReactNode;
  /**
   * Ícone à direita do texto
   */
  rightIcon?: React.ReactNode;
  /**
   * Ocupar largura total do container
   * @default false
   */
  fullWidth?: boolean;
  /**
   * Conteúdo do botão
   */
  children: React.ReactNode;
}

/**
 * Botão BCTT - Baseado no MUI Button com estilos customizados
 *
 * @example
 * ```tsx
 * <Button variant="primary">Confirmar</Button>
 * <Button variant="secondary" leftIcon={<AddIcon />}>Adicionar</Button>
 * <Button variant="tertiary" loading>A processar...</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Map BCTT variants to MUI variants
    const getMuiVariant = (): MuiButtonProps['variant'] => {
      switch (variant) {
        case 'primary':
          return 'contained';
        case 'secondary':
          return 'outlined';
        case 'tertiary':
        case 'ghost':
          return 'text';
        default:
          return 'contained';
      }
    };

    // Get color based on variant
    const getColor = (): MuiButtonProps['color'] => {
      return 'primary';
    };

    return (
      <MuiButton
        ref={ref}
        variant={getMuiVariant()}
        color={getColor()}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : leftIcon}
        endIcon={!loading ? rightIcon : undefined}
        sx={{
          // Ghost variant specific styles
          ...(variant === 'ghost' && {
            '&:hover': {
              backgroundColor: 'rgba(224, 0, 36, 0.04)',
            },
          }),
        }}
        {...props}
      >
        {children}
      </MuiButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
