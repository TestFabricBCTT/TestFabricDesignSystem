import React from 'react';
import { Slider, TextField, Box, Typography } from '@mui/material';

export interface SliderWithInputProps {
  /** Slider value */
  value?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Slider label */
  label?: string;
  /** Value unit (e.g., EUR, anos) */
  unit?: string;
  /** Callback when value changes */
  onChange?: (value: number) => void;
}

export const SliderWithInput = React.forwardRef<HTMLDivElement, SliderWithInputProps>(
  ({ value = 50, min = 0, max = 100, step = 1, label, unit, onChange }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value);

    React.useEffect(() => { setInternalValue(value); }, [value]);

    const handleSliderChange = (_: Event, newValue: number | number[]) => {
      const v = Array.isArray(newValue) ? newValue[0] : newValue;
      setInternalValue(v);
      onChange?.(v);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = Number(e.target.value);
      if (v < min) v = min;
      if (v > max) v = max;
      setInternalValue(v);
      onChange?.(v);
    };

    return (
      <Box ref={ref} sx={{ width: '100%', minWidth: 250 }}>
        {label && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {label}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Slider
            value={internalValue}
            min={min}
            max={max}
            step={step}
            onChange={handleSliderChange}
            sx={{ flex: 1 }}
          />
          <TextField
            value={internalValue}
            onChange={handleInputChange}
            type="number"
            size="small"
            slotProps={{ input: { inputProps: { min, max, step } } }}
            sx={{ width: 100 }}
          />
          {unit && (
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 30 }}>{unit}</Typography>
          )}
        </Box>
      </Box>
    );
  }
);

SliderWithInput.displayName = 'SliderWithInput';
export default SliderWithInput;
