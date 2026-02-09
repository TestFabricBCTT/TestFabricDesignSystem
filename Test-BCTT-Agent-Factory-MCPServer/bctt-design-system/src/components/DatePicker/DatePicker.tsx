import React from 'react';
import { TextField as MuiTextField } from '@mui/material';

export interface DatePickerProps {
  /** Label */
  label?: string;
  /** Valor */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Desativado */
  disabled?: boolean;
  /** Largura total */
  fullWidth?: boolean;
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ label, value, onChange, disabled, fullWidth, ...props }, ref) => {
    return (
      <MuiTextField
        ref={ref}
        type="date"
        label={label || 'Data'}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        fullWidth={fullWidth}
        slotProps={{ inputLabel: { shrink: true } }}
        {...props}
      />
    );
  }
);

DatePicker.displayName = 'DatePicker';
export default DatePicker;
