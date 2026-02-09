import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, typography, borderRadius } from '../../theme/bcttTheme';

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
    backgroundColor: colors.greyblue[300],
    color: colors.neutral[500],
  },
  primary: {
    backgroundColor: colors.primary[100],
    color: colors.primary.dark,
  },
  success: {
    backgroundColor: colors.bluegreen[200],
    color: colors.bluegreen.dark,
  },
  warning: {
    backgroundColor: colors.lime[200],
    color: colors.lime.dark,
  },
  error: {
    backgroundColor: colors.primary[100],
    color: colors.primary.main,
  },
  info: {
    backgroundColor: colors.greyblue[300],
    color: colors.greyblue.dark,
  },
};

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'badgeVariant',
})<{ badgeVariant: BadgeProps['variant'] }>(({ badgeVariant = 'default' }) => ({
  ...variantStyles[badgeVariant],
  fontWeight: typography.fontWeightSemiBold,
  borderRadius: borderRadius.sm,
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
