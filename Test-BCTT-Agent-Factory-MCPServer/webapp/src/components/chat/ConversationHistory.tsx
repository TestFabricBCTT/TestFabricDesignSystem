import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Box,
  alpha,
  Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Agent, Conversation } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface ConversationHistoryProps {
  open: boolean;
  agent: Agent | null;
  conversations: Conversation[];
  onClose: () => void;
  onSelect: (conversation: Conversation) => void;
}

export const ConversationHistory = ({
  open,
  agent,
  conversations,
  onClose,
  onSelect,
}: ConversationHistoryProps) => {
  if (!agent) return null;

  const agentColor = getAgentColor(agent.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(agentColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            {agent.icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Histórico - {agent.name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {conversations.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Nenhuma conversa guardada
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {conversations.map((conversation) => (
              <ListItem
                key={conversation.id}
                disablePadding
                sx={{
                  borderBottom: `1px solid ${alpha('#FFFFFF', 0.04)}`,
                }}
              >
                <ListItemButton
                  onClick={() => onSelect(conversation)}
                  sx={{
                    py: 2,
                    '&:hover': {
                      bgcolor: alpha(agentColor, 0.05),
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {conversation.title}
                        </Typography>
                        <Chip
                          label={`${conversation.messages.length} msgs`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: alpha('#FFFFFF', 0.1),
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {conversation.messages[0]?.content || 'Sem mensagens'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConversationHistory;
