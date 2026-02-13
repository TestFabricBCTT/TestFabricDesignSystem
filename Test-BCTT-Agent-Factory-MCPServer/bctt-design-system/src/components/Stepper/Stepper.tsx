import React from 'react';
import {
  Stepper as MuiStepper,
  Step,
  StepLabel,
  Box,
} from '@mui/material';

export interface StepperProps {
  /** Current active step index */
  activeStep?: number;
  /** Step labels */
  steps?: string[];
  /** Orientation: horizontal or vertical */
  orientation?: 'horizontal' | 'vertical';
}

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ activeStep = 0, steps = [], orientation = 'horizontal' }, ref) => {
    return (
      <Box ref={ref} sx={{ width: '100%' }}>
        <MuiStepper activeStep={activeStep} orientation={orientation}>
          {steps.map((label, index) => (
            <Step key={index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </MuiStepper>
      </Box>
    );
  }
);

Stepper.displayName = 'Stepper';
export default Stepper;
