import React from 'react';
import { LinearProgress, type LinearProgressProps, Box, Typography } from '@mui/material';

export interface ProgressBarProps extends Omit<LinearProgressProps, 'variant'> {
  /** Progress value (0-100) */
  value?: number;
  /** Variant: determinate or indeterminate */
  variant?: 'determinate' | 'indeterminate';
  /** Progress label */
  label?: string;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ variant = 'determinate', value = 0, label, sx, ...props }, ref) => {
    return (
      <Box ref={ref} sx={{ width: '100%', minWidth: 200, ...sx }}>
        {label && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {variant === 'determinate' && (
              <Typography variant="body2" color="text.secondary">{Math.round(value)}%</Typography>
            )}
          </Box>
        )}
        <LinearProgress
          variant={variant}
          value={variant === 'determinate' ? value : undefined}
          sx={{ height: 8, borderRadius: 4 }}
          {...props}
        />
      </Box>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
export default ProgressBar;
