import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  Chip,
  CircularProgress,
  alpha,
} from '@mui/material';
import { Rocket as RocketIcon } from '@mui/icons-material';
import { fetchBdevsAvailable, BdevAvailable } from '@/services/api';

interface BdevSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (bdev: BdevAvailable) => void;
}

export const BdevSelectorDialog = ({
  open,
  onClose,
  onSelect,
}: BdevSelectorDialogProps) => {
  const [bdevs, setBdevs] = useState<BdevAvailable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    fetchBdevsAvailable()
      .then((data) => setBdevs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open]);

  const handleConfirm = () => {
    const bdev = bdevs.find((b) => b.key === selected);
    if (bdev) onSelect(bdev);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0F172A',
          border: `1px solid ${alpha('#FFFFFF', 0.1)}`,
        },
      }}
    >
      <DialogTitle sx={{ color: '#FFFFFF', fontWeight: 600, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RocketIcon sx={{ color: '#7C3AED' }} />
          Seleccionar BDEV para Desenvolvimento
        </Box>
        <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5), mt: 0.5, display: 'block' }}>
          BDEVs com status "Ready for Development" (Fase 1 concluída)
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: '#7C3AED' }} />
          </Box>
        )}

        {error && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="body2" sx={{ color: '#EF4444' }}>
              {error}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.4) }}>
              Verifica se o MCP Server está a correr (porta 3001)
            </Typography>
          </Box>
        )}

        {!loading && !error && bdevs.length === 0 && (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.5), mb: 1 }}>
              Nenhum BDEV disponível
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.3) }}>
              Completa a Fase 1 primeiro (BA → FA → DA → DSLA → PA)
            </Typography>
          </Box>
        )}

        {!loading && bdevs.length > 0 && (
          <List sx={{ py: 0 }}>
            {bdevs.map((bdev) => (
              <ListItem key={bdev.key} disablePadding>
                <ListItemButton
                  selected={selected === bdev.key}
                  onClick={() => setSelected(bdev.key)}
                  sx={{
                    px: 3,
                    py: 1.5,
                    '&.Mui-selected': {
                      bgcolor: alpha('#7C3AED', 0.12),
                      borderLeft: '3px solid #7C3AED',
                    },
                    '&:hover': {
                      bgcolor: alpha('#7C3AED', 0.06),
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={bdev.key}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: alpha('#7C3AED', 0.15),
                            color: '#7C3AED',
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: '#FFFFFF', fontWeight: 500 }}
                        >
                          {bdev.summary}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{ color: alpha('#FFFFFF', 0.4) }}
                      >
                        {bdev.status}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{ color: alpha('#FFFFFF', 0.6) }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!selected}
          onClick={handleConfirm}
          sx={{
            bgcolor: '#7C3AED',
            '&:hover': { bgcolor: '#6D28D9' },
            '&.Mui-disabled': { bgcolor: alpha('#7C3AED', 0.2) },
          }}
        >
          Iniciar Desenvolvimento
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BdevSelectorDialog;
