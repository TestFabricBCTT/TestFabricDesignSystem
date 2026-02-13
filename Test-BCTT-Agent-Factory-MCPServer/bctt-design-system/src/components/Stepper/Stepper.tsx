import React from 'react';
import {
  Stepper as MuiStepper,
  Step,
  StepLabel,
  Box,
  type SxProps,
  type Theme,
} from '@mui/material';

export interface StepperProps {
  /** Current active step index */
  activeStep?: number;
  /** Step labels */
  steps?: string[];
  /** Orientation: horizontal or vertical */
  orientation?: 'horizontal' | 'vertical';
  /** Variant alias for orientation (horizontal | vertical) */
  variant?: 'horizontal' | 'vertical';
  /** MUI sx prop */
  sx?: SxProps<Theme>;
}

/** BCTT-branded step icon colors */
const stepperSx = {
  '& .MuiStepIcon-root': {
    color: '#E4E9F2',            // secondary.300 — inactive
  },
  '& .MuiStepIcon-root.Mui-active': {
    color: '#E00024',            // primary.main — active
  },
  '& .MuiStepIcon-root.Mui-completed': {
    color: '#33CBC4',            // bluegreen.main — completed
  },
  '& .MuiStepConnector-line': {
    borderColor: '#E4E9F2',      // secondary.300
  },
  '& .Mui-completed .MuiStepConnector-line': {
    borderColor: '#33CBC4',      // bluegreen.main
  },
  '& .MuiStepLabel-label.Mui-active': {
    color: '#E00024',
    fontWeight: 600,
  },
  '& .MuiStepLabel-label.Mui-completed': {
    color: '#333333',
  },
};

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ activeStep = 0, steps = [], orientation = 'horizontal', variant, sx }, ref) => {
    const resolvedOrientation = variant || orientation;

    return (
      <Box ref={ref} sx={{ width: '100%', ...sx }}>
        <MuiStepper
          activeStep={activeStep}
          orientation={resolvedOrientation}
          sx={stepperSx}
        >
          {steps.map((label, index) => (
            <Step key={index} completed={index < activeStep}>
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
