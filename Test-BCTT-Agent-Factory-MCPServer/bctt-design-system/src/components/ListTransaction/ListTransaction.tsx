import React from 'react';
import { ListItem as MuiListItem, ListItemText, Typography, Box } from '@mui/material';

export interface ListTransactionProps {
  /** Data */
  date: string;
  /** Descrição */
  description: string;
  /** Montante */
  amount: string;
  /** Tipo */
  type?: 'debit' | 'credit';
  /** Click handler */
  onClick?: () => void;
}

export const ListTransaction = React.forwardRef<HTMLLIElement, ListTransactionProps>(
  ({ date, description, amount, type = 'debit', onClick, ...props }, ref) => {
    return (
      <MuiListItem ref={ref} onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default' }} {...props}>
        <ListItemText
          primary={description}
          secondary={date}
        />
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="body1"
            fontWeight={600}
            color={type === 'credit' ? 'success.main' : 'text.primary'}
          >
            {type === 'credit' ? '+' : '-'}{amount}
          </Typography>
        </Box>
      </MuiListItem>
    );
  }
);

ListTransaction.displayName = 'ListTransaction';
export default ListTransaction;
