import { useState, KeyboardEvent } from 'react';
import { Box, TextField, IconButton, alpha, CircularProgress } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { AgentId } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface ChatInputProps {
  agentId: AgentId;
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export const ChatInput = ({
  agentId,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Escreva a sua mensagem...'
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const agentColor = getAgentColor(agentId);

  const handleSend = () => {
    if (message.trim() && !disabled && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        p: 2,
        borderTop: `1px solid ${alpha('#FFFFFF', 0.06)}`,
        bgcolor: alpha('#000', 0.2),
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: alpha('#FFFFFF', 0.05),
            '& fieldset': {
              borderColor: alpha('#FFFFFF', 0.1),
            },
            '&:hover fieldset': {
              borderColor: alpha(agentColor, 0.3),
            },
            '&.Mui-focused fieldset': {
              borderColor: agentColor,
            },
          },
          '& .MuiInputBase-input': {
            color: 'text.primary',
            fontSize: '0.875rem',
          },
        }}
      />
      <IconButton
        onClick={handleSend}
        disabled={!message.trim() || disabled || isLoading}
        sx={{
          bgcolor: agentColor,
          color: 'white',
          width: 48,
          height: 48,
          minWidth: 48,
          flexShrink: 0,
          '&:hover': {
            bgcolor: alpha(agentColor, 0.8),
          },
          '&.Mui-disabled': {
            bgcolor: alpha(agentColor, 0.3),
            color: alpha('#FFFFFF', 0.5),
          },
        }}
      >
        {isLoading ? (
          <CircularProgress size={24} sx={{ color: 'white' }} />
        ) : (
          <SendIcon />
        )}
      </IconButton>
    </Box>
  );
};

export default ChatInput;
