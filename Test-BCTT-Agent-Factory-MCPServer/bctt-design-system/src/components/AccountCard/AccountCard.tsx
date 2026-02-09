import React from 'react';
import { Card as MuiCard, type CardProps as MuiCardProps } from '@mui/material';

export interface AccountCardProps extends Omit<MuiCardProps, 'variant'> {
  /** Nome da conta */
  accountName: string;
  /** NIB */
  nib: string;
  /** Saldo */
  balance: string;
  /** Click handler */
  onClick?: () => void;
  /** Variante */
  variant?: 'clickable' | 'readonly';
}

export const AccountCard = React.forwardRef<HTMLDivElement, AccountCardProps>(
  ({ variant = 'clickable', children, ...props }, ref) => {
    return (
      <MuiCard ref={ref} {...props}>
        {children}
      </MuiCard>
    );
  }
);

AccountCard.displayName = 'AccountCard';
export default AccountCard;
