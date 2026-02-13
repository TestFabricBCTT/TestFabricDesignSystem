import React from 'react';
import { Divider as MuiDivider, type DividerProps as MuiDividerProps } from '@mui/material';

export interface DividerProps extends Omit<MuiDividerProps, 'variant'> {
  /** Orientação do divider (horizontal/vertical) */
  orientation?: string;
  /** Variante visual */
  variant?: string;
  /** Se deve ser usado como flex item */
  flexItem?: boolean;
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ variant = 'horizontal', children, ...props }, ref) => {
    return (
      <MuiDivider ref={ref} {...props}>
        {children}
      </MuiDivider>
    );
  }
);

Divider.displayName = 'Divider';
export default Divider;
