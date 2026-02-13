import React from 'react';
import { TextField, type TextFieldProps, InputAdornment } from '@mui/material';

export interface CurrencyInputProps extends Omit<TextFieldProps, 'variant' | 'value' | 'onChange'> {
  /** Currency value */
  value?: number;
  /** Currency code */
  currency?: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Callback when value changes */
  onChange?: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLDivElement, CurrencyInputProps>(
  ({ value = 0, currency = 'EUR', min, max, readOnly = false, onChange, ...props }, ref) => {
    const symbol = currency === 'EUR' ? '\u20AC' : currency;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
      let num = parseFloat(raw) || 0;
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      onChange?.(num);
    };

    const formatted = new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    return (
      <TextField
        ref={ref}
        value={formatted}
        onChange={handleChange as any}
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">{symbol}</InputAdornment>,
            readOnly,
          },
        }}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
export default CurrencyInput;
