import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  IconButton,
  alpha,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Agent } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface AgentPickerDialogProps {
  open: boolean;
  agents: Agent[];
  onClose: () => void;
  onSelect: (agent: Agent) => void;
}

export const AgentPickerDialog = ({
  open,
  agents,
  onClose,
  onSelect,
}: AgentPickerDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0F172A',
          backgroundImage: 'none',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha('#FFFFFF', 0.06)}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
          Escolher Agente
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: alpha('#FFFFFF', 0.5) }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <List sx={{ py: 0 }}>
          {agents.map((agent) => {
            const agentColor = getAgentColor(agent.id);

            return (
              <ListItem
                key={agent.id}
                disablePadding
                sx={{ borderBottom: `1px solid ${alpha('#FFFFFF', 0.04)}` }}
              >
                <ListItemButton
                  onClick={() => onSelect(agent)}
                  sx={{
                    py: 2,
                    '&:hover': { bgcolor: alpha(agentColor, 0.06) },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha(agentColor, 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: agentColor,
                      mr: 2,
                      flexShrink: 0,
                    }}
                  >
                    {agent.sigla}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
                        {agent.nome}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          color: alpha('#FFFFFF', 0.45),
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {agent.missao}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default AgentPickerDialog;
