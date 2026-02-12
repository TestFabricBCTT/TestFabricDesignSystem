import React from 'react';
import { TextField as MuiTextField, type TextFieldProps as MuiTextFieldProps } from '@mui/material';

export interface DatePickerProps extends Omit<MuiTextFieldProps, 'variant' | 'onChange'> {
  /** Label do campo de data */
  label?: string;
  /** Valor da data (formato YYYY-MM-DD) */
  value?: string;
  /** Callback quando a data muda */
  onChange?: (value: string) => void;
  /** Estado de erro */
  error?: boolean;
  /** Texto de ajuda ou erro */
  helperText?: string;
  /** Estado desabilitado */
  disabled?: boolean;
  /** Placeholder do campo */
  placeholder?: string;
  /** Data mínima permitida (YYYY-MM-DD) */
  minDate?: string;
  /** Data máxima permitida (YYYY-MM-DD) */
  maxDate?: string;
  /** Largura total */
  fullWidth?: boolean;
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ children, onChange, ...props }, ref) => {
    return (
      <MuiTextField
        ref={ref}
        {...props}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      >
        {children}
      </MuiTextField>
    );
  }
);

DatePicker.displayName = 'DatePicker';
export default DatePicker;
