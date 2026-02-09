import { useState, useEffect, useCallback } from 'react';
import {
  Fab,
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  alpha,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Widgets as WidgetsIcon,
  Close as CloseIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Layers as ScreenIcon,
} from '@mui/icons-material';
import { fetchPrototypes, exportPrototypeToDisk, PrototypeSummary } from '@/services/api';

interface PrototypesPanelProps {
  agentId: string | undefined;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#FFA726',
  fa_approved: '#42A5F5',
  client_approved: '#66BB6A',
  final: '#AB47BC',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  fa_approved: 'FA Aprovado',
  client_approved: 'Cliente Aprovado',
  final: 'Final',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PrototypesPanel = ({ agentId }: PrototypesPanelProps) => {
  const [open, setOpen] = useState(false);
  const [prototypes, setPrototypes] = useState<PrototypeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPA = agentId === 'pa';

  const loadPrototypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrototypes();
      setPrototypes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar protótipos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load prototypes when drawer opens
  useEffect(() => {
    if (open) {
      loadPrototypes();
    }
  }, [open, loadPrototypes]);

  // Only show for PA agent
  if (!isPA) return null;

  const handleExport = async (proto: PrototypeSummary) => {
    setExporting(proto.id);
    setExportResult(null);
    try {
      const result = await exportPrototypeToDisk(proto.bdevCode, proto.version);
      setExportResult(`Exportado para: ${result.outputPath}\nComando: ${result.command}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar');
    } finally {
      setExporting(null);
    }
  };

  const accentColor = '#AB47BC'; // Purple for PA/prototypes

  return (
    <>
      {/* FAB - above the phase interaction FAB */}
      <Tooltip title="Protótipos PA" placement="left">
        <Fab
          size="medium"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            bgcolor: alpha(accentColor, 0.9),
            color: '#FFFFFF',
            '&:hover': {
              bgcolor: accentColor,
            },
            zIndex: 1200,
          }}
        >
          <WidgetsIcon />
        </Fab>
      </Tooltip>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 400,
            bgcolor: '#0F172A',
            backgroundImage: 'none',
            borderLeft: `1px solid ${alpha('#FFFFFF', 0.08)}`,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
            borderBottom: `1px solid ${alpha('#FFFFFF', 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WidgetsIcon sx={{ color: accentColor, fontSize: 22 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
                Protótipos
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
                {prototypes.length} protótipo{prototypes.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              onClick={loadPrototypes}
              size="small"
              sx={{ color: alpha('#FFFFFF', 0.5) }}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              onClick={() => setOpen(false)}
              size="small"
              sx={{ color: alpha('#FFFFFF', 0.5) }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Export result alert */}
        {exportResult && (
          <Alert
            severity="success"
            onClose={() => setExportResult(null)}
            sx={{ m: 1.5, fontSize: '0.75rem' }}
          >
            {exportResult}
          </Alert>
        )}

        {/* Error alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ m: 1.5, fontSize: '0.75rem' }}
          >
            {error}
          </Alert>
        )}

        <Divider sx={{ borderColor: alpha('#FFFFFF', 0.06) }} />

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={32} sx={{ color: accentColor }} />
              <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.4), mt: 2 }}>
                A carregar protótipos...
              </Typography>
            </Box>
          ) : prototypes.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <WidgetsIcon sx={{ fontSize: 40, color: alpha('#FFFFFF', 0.15), mb: 1 }} />
              <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.4) }}>
                Nenhum protótipo encontrado
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.25) }}>
                Os protótipos gerados pelo PA aparecerão aqui
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {prototypes.map((proto) => {
                const statusColor = STATUS_COLORS[proto.status] || '#9E9E9E';
                const statusLabel = STATUS_LABELS[proto.status] || proto.status;
                const isExporting = exporting === proto.id;

                return (
                  <ListItem
                    key={proto.id}
                    disablePadding
                    secondaryAction={
                      <Tooltip title="Exportar para disco">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(proto);
                          }}
                          disabled={isExporting}
                          sx={{
                            color: alpha('#FFFFFF', 0.4),
                            '&:hover': { color: '#66BB6A' },
                          }}
                        >
                          {isExporting ? (
                            <CircularProgress size={18} sx={{ color: accentColor }} />
                          ) : (
                            <ExportIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    }
                    sx={{
                      borderBottom: `1px solid ${alpha('#FFFFFF', 0.04)}`,
                    }}
                  >
                    <ListItemButton
                      sx={{
                        py: 2,
                        pr: 6,
                        '&:hover': {
                          bgcolor: alpha(accentColor, 0.06),
                        },
                      }}
                    >
                      {/* BDEV badge */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: alpha(accentColor, 0.15),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        <ScreenIcon sx={{ fontSize: 20, color: accentColor }} />
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                color: '#FFFFFF',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 160,
                              }}
                            >
                              {proto.bdevCode}
                            </Typography>
                            <Chip
                              label={`v${proto.version}`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: alpha('#FFFFFF', 0.08),
                                color: alpha('#FFFFFF', 0.6),
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={statusLabel}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: alpha(statusColor, 0.15),
                                color: statusColor,
                              }}
                            />
                            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.35) }}>
                              {proto.screenCount} ecrã{proto.screenCount !== 1 ? 's' : ''} · {formatDate(proto.updatedAt)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default PrototypesPanel;
