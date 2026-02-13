import React from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box,
  Typography,
} from '@mui/material';

export interface TimelineItem {
  label: string;
  description?: string;
}

export interface TimelineProps {
  /** Timeline items */
  items?: TimelineItem[];
  /** Active item index */
  activeItem?: number;
  /** Orientation: vertical or horizontal */
  orientation?: 'vertical' | 'horizontal';
}

export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ items = [], activeItem = 0, orientation = 'vertical' }, ref) => {
    return (
      <Box ref={ref}>
        <Stepper activeStep={activeItem} orientation={orientation} nonLinear>
          {items.map((item, index) => (
            <Step key={index} completed={index < activeItem}>
              <StepLabel>{item.label}</StepLabel>
              {orientation === 'vertical' && item.description && (
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  }
);

Timeline.displayName = 'Timeline';
export default Timeline;
