import React from 'react';
import { Divider as MuiDivider, type DividerProps as MuiDividerProps } from '@mui/material';

export interface DividerProps extends Omit<MuiDividerProps, 'variant'> {
  /** Orientação do divider */
  orientation?: 'horizontal' | 'vertical';
  /** Variante do divider */
  variant?: 'fullWidth' | 'inset' | 'middle';
  /** Alinhamento do texto (quando há children) */
  textAlign?: 'left' | 'center' | 'right';
}

export const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ variant = 'fullWidth', children, ...props }, ref) => {
    return (
      <MuiDivider ref={ref} variant={variant} {...props}>
        {children}
      </MuiDivider>
    );
  }
);

Divider.displayName = 'Divider';
export default Divider;
