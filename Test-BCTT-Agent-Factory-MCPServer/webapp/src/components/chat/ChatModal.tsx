import { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  alpha,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Agent, ChatMessage as ChatMessageType } from '@/types';
import { getAgentColor } from '@/theme/theme';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatModalProps {
  open: boolean;
  agent: Agent | null;
  messages: ChatMessageType[];
  isLiveMode: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  onToggleLiveMode: () => void;
}

export const ChatModal = ({
  open,
  agent,
  messages,
  isLiveMode,
  isLoading,
  onClose,
  onSend,
  onToggleLiveMode,
}: ChatModalProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!agent) return null;

  const agentColor = getAgentColor(agent.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRadius: 3,
          height: '80vh',
          maxHeight: 700,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha('#FFFFFF', 0.06)}`,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: alpha(agentColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            {agent.icon}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {agent.name}
              </Typography>
              <Chip
                label={agent.id.toUpperCase()}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: alpha(agentColor, 0.1),
                  color: agentColor,
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {agent.description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isLiveMode}
                onChange={onToggleLiveMode}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#10B981',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#10B981',
                  },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Live Mode
              </Typography>
            }
            sx={{ mr: 1 }}
          />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', textAlign: 'center' }}
              >
                Inicie uma conversa com o {agent.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', textAlign: 'center', maxWidth: 400 }}
              >
                {isLiveMode
                  ? 'Modo Live ativo - as respostas serão geradas pela IA'
                  : 'Modo demonstração - use os exemplos de conversa'}
              </Typography>
            </Box>
          ) : (
            messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} agentId={agent.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        <ChatInput
          agentId={agent.id}
          onSend={onSend}
          isLoading={isLoading}
          placeholder={`Pergunte ao ${agent.name}...`}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
