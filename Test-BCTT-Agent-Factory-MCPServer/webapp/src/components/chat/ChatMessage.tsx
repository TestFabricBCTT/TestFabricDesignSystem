import { Box, Typography, Paper, alpha } from '@mui/material';
import { ChatMessage as ChatMessageType, AgentId } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface ChatMessageProps {
  message: ChatMessageType;
  agentId: AgentId;
}

export const ChatMessage = ({ message, agentId }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const agentColor = getAgentColor(agentId);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: '80%',
          p: 2,
          borderRadius: 2,
          bgcolor: isUser ? alpha(agentColor, 0.1) : alpha('#FFFFFF', 0.05),
          border: `1px solid ${isUser ? alpha(agentColor, 0.2) : alpha('#FFFFFF', 0.08)}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.5,
            color: isUser ? agentColor : 'text.secondary',
            fontWeight: 500,
          }}
        >
          {isUser ? 'Você' : agentId.toUpperCase()}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            '& code': {
              bgcolor: alpha('#000', 0.3),
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.85em',
            },
          }}
        >
          {message.content}
        </Typography>
        {message.timestamp && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              color: 'text.disabled',
              fontSize: '0.65rem',
            }}
          >
            {new Date(message.timestamp).toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ChatMessage;
