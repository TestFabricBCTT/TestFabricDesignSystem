import React from 'react';
import { Divider as MuiDivider, type DividerProps as MuiDividerProps } from '@mui/material';

export interface DividerProps extends Omit<MuiDividerProps, 'variant' | 'orientation'> {
  /** Orientação do divider (horizontal/vertical) */
  orientation?: string;
  /** Variante visual */
  variant?: string;
  /** Se deve ser usado como flex item */
  flexItem?: boolean;
}

export const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ variant = 'horizontal', orientation, children, ...props }, ref) => {
    return (
      <MuiDivider ref={ref} orientation={orientation as any} {...props}>
        {children}
      </MuiDivider>
    );
  }
);

Divider.displayName = 'Divider';
export default Divider;
