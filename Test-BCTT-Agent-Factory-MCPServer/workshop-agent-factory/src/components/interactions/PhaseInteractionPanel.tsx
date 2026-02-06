import { useState } from 'react';
import {
  Fab,
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  IconButton,
  Chip,
  Divider,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  History as HistoryIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { Phase, Interaction, Agent } from '@/types';
import { getAgentColor } from '@/theme/theme';
import { getAgentById } from '@/data/agents';

interface PhaseInteractionPanelProps {
  phase: Phase | undefined;
  interactions: Interaction[];
  onResume: (interaction: Interaction) => void;
  onNewIteration: () => void;
  onDelete: (id: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export const PhaseInteractionPanel = ({
  phase,
  interactions,
  onResume,
  onNewIteration,
  onDelete,
}: PhaseInteractionPanelProps) => {
  const [open, setOpen] = useState(false);

  if (!phase) return null;

  return (
    <>
      {/* FAB - bottom right */}
      <Tooltip title={`Interações - ${phase.nome}`} placement="left">
        <Fab
          size="medium"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: alpha(phase.cor || '#C8102E', 0.9),
            color: '#FFFFFF',
            '&:hover': {
              bgcolor: phase.cor || '#C8102E',
            },
            zIndex: 1200,
          }}
        >
          <HistoryIcon />
        </Fab>
      </Tooltip>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 380,
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
            <HistoryIcon sx={{ color: phase.cor || '#C8102E', fontSize: 22 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
                {phase.nome}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
                Interações
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: alpha('#FFFFFF', 0.5) }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* New Iteration button */}
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => {
              setOpen(false);
              onNewIteration();
            }}
            sx={{
              bgcolor: alpha(phase.cor || '#C8102E', 0.15),
              color: phase.cor || '#C8102E',
              fontWeight: 600,
              '&:hover': {
                bgcolor: alpha(phase.cor || '#C8102E', 0.25),
              },
            }}
          >
            Nova Iteração
          </Button>
        </Box>

        <Divider sx={{ borderColor: alpha('#FFFFFF', 0.06) }} />

        {/* Interaction list */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {interactions.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <ChatIcon sx={{ fontSize: 40, color: alpha('#FFFFFF', 0.15), mb: 1 }} />
              <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.4) }}>
                Nenhuma interação guardada
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.25) }}>
                As conversas em live mode serão guardadas aqui
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {interactions.map((interaction) => {
                const agent = getAgentById(interaction.agentId) as Agent | undefined;
                const agentColor = getAgentColor(interaction.agentId);
                const msgCount = interaction.messages.filter((m) => m.role !== 'system').length;

                return (
                  <ListItem
                    key={interaction.id}
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(interaction.id);
                        }}
                        sx={{ color: alpha('#FFFFFF', 0.3), '&:hover': { color: '#FF4852' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{
                      borderBottom: `1px solid ${alpha('#FFFFFF', 0.04)}`,
                    }}
                  >
                    <ListItemButton
                      onClick={() => {
                        setOpen(false);
                        onResume(interaction);
                      }}
                      sx={{
                        py: 2,
                        pr: 6,
                        '&:hover': {
                          bgcolor: alpha(agentColor, 0.06),
                        },
                      }}
                    >
                      {/* Agent badge */}
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: alpha(agentColor, 0.15),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: agentColor,
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        {interaction.agentSigla}
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
                                maxWidth: 180,
                              }}
                            >
                              {interaction.title}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={agent?.nome || interaction.agentId}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: alpha(agentColor, 0.1),
                                color: agentColor,
                              }}
                            />
                            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.35) }}>
                              {timeAgo(interaction.updatedAt)} · {msgCount} msgs
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

export default PhaseInteractionPanel;
