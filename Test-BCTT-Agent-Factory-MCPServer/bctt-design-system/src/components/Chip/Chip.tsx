import React from 'react';
import { Chip as MuiChip, type ChipProps as MuiChipProps } from '@mui/material';

export interface ChipProps extends Omit<MuiChipProps, 'variant'> {
  /** Texto do chip */
  label: string;
  /** Variante de cor */
  variant?: 'success' | 'warning' | 'error' | 'default';
  /** Callback ao clicar no X */
  onDelete?: () => void;
  /** Ícone do chip */
  icon?: React.ReactElement;
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ variant = 'success', children, ...props }, ref) => {
    return (
      <MuiChip ref={ref} {...props}>
        {children}
      </MuiChip>
    );
  }
);

Chip.displayName = 'Chip';
export default Chip;
