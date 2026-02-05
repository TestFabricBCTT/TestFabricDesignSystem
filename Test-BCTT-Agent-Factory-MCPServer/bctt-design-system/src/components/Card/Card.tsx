import React from 'react';
import {
  Card as MuiCard,
  CardProps as MuiCardProps,
  CardContent,
  CardActions,
  CardHeader,
  CardMedia,
} from '@mui/material';
import { styled } from '@mui/material/styles';

export interface CardProps extends Omit<MuiCardProps, 'variant'> {
  /**
   * Variante visual do card
   * @default 'elevated'
   */
  variant?: 'elevated' | 'outlined' | 'filled';
  /**
   * Padding interno
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Efeito hover
   * @default false
   */
  hoverable?: boolean;
  /**
   * Conteúdo do card
   */
  children: React.ReactNode;
}

const paddingMap = {
  none: 0,
  sm: 2,
  md: 3,
  lg: 4,
};

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => !['hoverable', 'padding', 'cardVariant'].includes(prop as string),
})<{ hoverable?: boolean; cardVariant?: string }>(({ theme, hoverable, cardVariant }) => ({
  transition: 'all 0.2s ease-in-out',
  ...(hoverable && {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
  }),
  ...(cardVariant === 'filled' && {
    backgroundColor: theme.palette.grey[50],
    boxShadow: 'none',
  }),
}));

/**
 * Card BCTT - Baseado no MUI Card com estilos customizados
 *
 * @example
 * ```tsx
 * <Card variant="elevated">
 *   <CardContent>Conteúdo do card</CardContent>
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'elevated',
      padding = 'md',
      hoverable = false,
      children,
      sx,
      ...props
    },
    ref
  ) => {
    const getMuiVariant = (): MuiCardProps['variant'] => {
      if (variant === 'outlined') return 'outlined';
      return 'elevation';
    };

    return (
      <StyledCard
        ref={ref}
        variant={getMuiVariant()}
        elevation={variant === 'elevated' ? 2 : 0}
        hoverable={hoverable}
        cardVariant={variant}
        sx={{
          '& > .MuiCardContent-root': {
            padding: paddingMap[padding],
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

// Re-export MUI Card sub-components for convenience
export { CardContent, CardActions, CardHeader, CardMedia };

export default Card;
