import React from 'react';
import { TextField as MuiTextField, type TextFieldProps as MuiTextFieldProps } from '@mui/material';

export interface DatePickerProps extends Omit<MuiTextFieldProps, 'variant'> {
  /** Data seleccionada */
  value?: Date;
  /** Callback ao mudar data */
  onChange?: (date: Date | null) => void;
  /** Variante desktop ou mobile */
  variant?: string;
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ variant = 'desktop', children, ...props }, ref) => {
    return (
      <MuiTextField ref={ref} {...props}>
        {children}
      </MuiTextField>
    );
  }
);

DatePicker.displayName = 'DatePicker';
export default DatePicker;
