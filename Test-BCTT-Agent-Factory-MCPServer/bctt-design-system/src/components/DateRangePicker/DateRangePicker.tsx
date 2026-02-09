import React from 'react';
import { TextField as MuiTextField } from '@mui/material';
import { Box } from '@mui/material';

export interface DateRangePickerProps {
  /** Data de início */
  startDate?: Date | null;
  /** Data de fim */
  endDate?: Date | null;
  /** Callback quando as datas mudam */
  onChange?: (startDate: Date | null, endDate: Date | null) => void;
  /** Label do campo */
  label?: string;
  /** Placeholder do campo */
  placeholder?: string;
  /** Variante */
  variant?: 'single' | 'range';
  /** Desativado */
  disabled?: boolean;
  /** Largura total */
  fullWidth?: boolean;
}

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  ({ variant = 'single', label, placeholder, disabled, fullWidth, startDate, endDate, onChange, ...props }, ref) => {
    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value ? new Date(e.target.value) : null;
      onChange?.(date, endDate || null);
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value ? new Date(e.target.value) : null;
      onChange?.(startDate || null, date);
    };

    const formatDate = (date: Date | null | undefined) =>
      date ? date.toISOString().split('T')[0] : '';

    return (
      <Box ref={ref} sx={{ display: 'flex', gap: 1 }} {...props}>
        <MuiTextField
          type="date"
          label={label || (variant === 'range' ? 'De' : 'Data')}
          placeholder={placeholder}
          disabled={disabled}
          fullWidth={fullWidth}
          value={formatDate(startDate)}
          onChange={handleStartChange}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {variant === 'range' && (
          <MuiTextField
            type="date"
            label="Até"
            disabled={disabled}
            fullWidth={fullWidth}
            value={formatDate(endDate)}
            onChange={handleEndChange}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
      </Box>
    );
  }
);

DateRangePicker.displayName = 'DateRangePicker';
export default DateRangePicker;
