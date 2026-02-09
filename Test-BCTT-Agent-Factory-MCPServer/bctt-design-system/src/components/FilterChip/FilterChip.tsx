import React from 'react';
import { Chip as MuiChip, type ChipProps as MuiChipProps } from '@mui/material';

export interface FilterChipProps extends Omit<MuiChipProps, 'variant'> {
  /** Label */
  label: string;
  /** Variante */
  variant?: 'default' | 'outlined';
  /** Remove handler */
  onRemove?: () => void;
}

export const FilterChip = React.forwardRef<HTMLDivElement, FilterChipProps>(
  ({ variant = 'default', onRemove, ...props }, ref) => {
    return (
      <MuiChip
        ref={ref}
        variant={variant === 'outlined' ? 'outlined' : 'filled'}
        onDelete={onRemove}
        {...props}
      />
    );
  }
);

FilterChip.displayName = 'FilterChip';
export default FilterChip;
