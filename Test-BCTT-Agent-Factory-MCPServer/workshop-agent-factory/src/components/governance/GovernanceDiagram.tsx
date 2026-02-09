import {
  Dialog,
  Box,
  Typography,
  IconButton,
  alpha,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoMode as AutoModeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import type { PhaseId } from '@/types';
import { getGovernanceByPhase } from '@/data/governanceData';
import { FlowDiagram } from './FlowDiagram';

interface GovernanceDiagramProps {
  open: boolean;
  phaseId: PhaseId;
  onClose: () => void;
}

export const GovernanceDiagram = ({ open, phaseId, onClose }: GovernanceDiagramProps) => {
  const data = getGovernanceByPhase(phaseId);

  if (!data) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#0F172A', color: '#FFFFFF' }}>
          <Typography variant="h6">Diagrama de governação ainda não disponível para esta fase.</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: alpha('#FFFFFF', 0.5) }}>
            Em breve será adicionado.
          </Typography>
        </Box>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: '#0A1628',
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(200, 16, 46, 0.05) 0%, transparent 50%)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: `1px solid ${alpha('#FFFFFF', 0.08)}`,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: '#FFFFFF' }}
          >
            {data.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: alpha('#FFFFFF', 0.5), mt: 0.5 }}
          >
            {data.description}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: alpha('#FFFFFF', 0.6) }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
        {/* Flow Diagram */}
        <Box sx={{ mb: 4 }}>
          <FlowDiagram nodes={data.nodes} edges={data.edges} />
        </Box>

        {/* Legend */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            justifyContent: 'center',
            mb: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 2,
                bgcolor: alpha('#FFFFFF', 0.4),
              }}
            />
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              Fluxo automático (pipeline)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 0,
                borderTop: `2px dashed ${alpha('#FFFFFF', 0.4)}`,
              }}
            />
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              Interacção manual
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '4px',
                border: `1.5px solid ${alpha('#3B82F6', 0.6)}`,
                bgcolor: alpha('#3B82F6', 0.15),
              }}
            />
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              Agente AI
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '8px',
                border: `1.5px solid ${alpha('#64748B', 0.6)}`,
                bgcolor: alpha('#64748B', 0.15),
              }}
            />
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              Sistema externo
            </Typography>
          </Box>
        </Box>

        {/* Governance Rules */}
        <Box
          sx={{
            maxWidth: 800,
            mx: 'auto',
            p: 3,
            bgcolor: alpha('#FFFFFF', 0.03),
            borderRadius: 2,
            border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, color: '#FFFFFF', mb: 2 }}
          >
            Regras de Governação
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {data.governanceRules.map((rule, i) => {
              const isAutomatic = rule.toLowerCase().includes('automátic') || rule.toLowerCase().includes('auto-advance') || rule.toLowerCase().includes('pipeline');
              const isInteractive = rule.toLowerCase().includes('interactivo') || rule.toLowerCase().includes('utilizador');
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Chip
                    icon={isAutomatic ? <AutoModeIcon /> : isInteractive ? <PersonIcon /> : undefined}
                    label={isAutomatic ? 'Auto' : isInteractive ? 'Manual' : `R${i + 1}`}
                    size="small"
                    sx={{
                      mt: 0.2,
                      minWidth: 70,
                      bgcolor: isAutomatic
                        ? alpha('#10B981', 0.15)
                        : isInteractive
                          ? alpha('#3B82F6', 0.15)
                          : alpha('#FFFFFF', 0.06),
                      color: isAutomatic
                        ? '#10B981'
                        : isInteractive
                          ? '#3B82F6'
                          : alpha('#FFFFFF', 0.6),
                      '& .MuiChip-icon': {
                        color: 'inherit',
                        fontSize: 14,
                      },
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: alpha('#FFFFFF', 0.7), lineHeight: 1.6 }}
                  >
                    {rule}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default GovernanceDiagram;
