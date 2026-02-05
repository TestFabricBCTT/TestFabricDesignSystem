import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export interface BadgeProps extends Omit<ChipProps, 'variant' | 'color' | 'label' | 'children'> {
  /**
   * Variante semântica do badge
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  /**
   * Tamanho do badge
   * @default 'medium'
   */
  size?: 'small' | 'medium';
  /**
   * Conteúdo do badge (usado como label)
   */
  children: React.ReactNode;
}

const variantStyles = {
  default: {
    backgroundColor: '#E4E9F2',
    color: '#333333',
  },
  primary: {
    backgroundColor: '#FBDFE3',
    color: '#C4001F',
  },
  success: {
    backgroundColor: '#CCF2F0',
    color: '#00BFB4',
  },
  warning: {
    backgroundColor: '#E9EECB',
    color: '#A4BF00',
  },
  error: {
    backgroundColor: '#FBDFE3',
    color: '#E00024',
  },
  info: {
    backgroundColor: '#E4E9F2',
    color: '#6E7B93',
  },
};

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'badgeVariant',
})<{ badgeVariant: BadgeProps['variant'] }>(({ badgeVariant = 'default' }) => ({
  ...variantStyles[badgeVariant],
  fontWeight: 600,
  borderRadius: 4,
}));

/**
 * Badge BCTT - Para labels, tags e estados
 *
 * @example
 * ```tsx
 * <Badge variant="success">Aprovado</Badge>
 * <Badge variant="warning">Pendente</Badge>
 * <Badge variant="error">Rejeitado</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = 'default', size = 'medium', children, ...props }, ref) => {
    return (
      <StyledChip
        ref={ref}
        label={children}
        size={size}
        badgeVariant={variant}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
