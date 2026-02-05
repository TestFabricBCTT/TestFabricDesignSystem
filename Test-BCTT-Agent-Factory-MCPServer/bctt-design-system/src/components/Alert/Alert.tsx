import React from 'react';
import {
  Alert as MuiAlert,
  AlertProps as MuiAlertProps,
  AlertTitle,
  IconButton,
  Collapse,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export interface AlertProps extends Omit<MuiAlertProps, 'severity' | 'variant'> {
  /**
   * Tipo/severidade do alerta
   */
  variant: 'success' | 'warning' | 'error' | 'info';
  /**
   * Título do alerta (opcional)
   */
  title?: string;
  /**
   * Mensagem/descrição do alerta
   */
  children: React.ReactNode;
  /**
   * Mostrar botão de fechar
   * @default false
   */
  closable?: boolean;
  /**
   * Callback quando o alerta é fechado
   */
  onClose?: () => void;
}

/**
 * Alert BCTT - Para mensagens de feedback ao utilizador
 *
 * @example
 * ```tsx
 * <Alert variant="success" title="Sucesso!">
 *   Operação realizada com sucesso.
 * </Alert>
 *
 * <Alert variant="error" closable onClose={() => {}}>
 *   Ocorreu um erro. Por favor tente novamente.
 * </Alert>
 * ```
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, children, closable = false, onClose, ...props }, ref) => {
    const [open, setOpen] = React.useState(true);

    const handleClose = () => {
      setOpen(false);
      onClose?.();
    };

    return (
      <Collapse in={open}>
        <MuiAlert
          ref={ref}
          severity={variant}
          action={
            closable ? (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            ) : undefined
          }
          {...props}
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {children}
        </MuiAlert>
      </Collapse>
    );
  }
);

Alert.displayName = 'Alert';

export { AlertTitle };

export default Alert;
