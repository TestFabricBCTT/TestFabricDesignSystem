import React from 'react';
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';

export interface ResultCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string;
  /** Additional description */
  description?: string;
  /** Visual variant: summary, detail, comparison */
  variant?: 'summary' | 'detail' | 'comparison';
}

export const ResultCard = React.forwardRef<HTMLDivElement, ResultCardProps>(
  ({ title, value, description, variant = 'summary' }, ref) => {
    return (
      <Card
        ref={ref}
        variant={variant === 'summary' ? 'elevation' : 'outlined'}
        elevation={variant === 'summary' ? 2 : 0}
        sx={{ minWidth: 200 }}
      >
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {variant === 'detail' && <Divider sx={{ mb: 1 }} />}
          <Typography
            variant={variant === 'comparison' ? 'h5' : 'h4'}
            color="primary"
            fontWeight="bold"
          >
            {value}
          </Typography>
          {description && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {description}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }
);

ResultCard.displayName = 'ResultCard';
export default ResultCard;
