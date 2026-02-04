import { Card, CardContent, Box, Typography, Chip, IconButton, alpha } from '@mui/material';
import { Chat as ChatIcon, History as HistoryIcon } from '@mui/icons-material';
import { Agent } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface AgentCardProps {
  agent: Agent;
  hasConversations?: boolean;
  onChatClick: (agent: Agent) => void;
  onHistoryClick?: (agent: Agent) => void;
}

export const AgentCard = ({
  agent,
  hasConversations = false,
  onChatClick,
  onHistoryClick
}: AgentCardProps) => {
  const agentColor = getAgentColor(agent.id);

  return (
    <Card
      sx={{
        bgcolor: alpha('#FFFFFF', 0.02),
        border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
        borderRadius: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: alpha('#FFFFFF', 0.04),
          borderColor: alpha(agentColor, 0.3),
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(agentColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: agentColor,
            }}
          >
            {agent.sigla}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {hasConversations && onHistoryClick && (
              <IconButton
                size="small"
                onClick={() => onHistoryClick(agent)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: agentColor },
                }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => onChatClick(agent)}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: agentColor },
              }}
            >
              <ChatIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {agent.nome}
            </Typography>
            <Chip
              label={agent.sigla}
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {agent.missao}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {agent.responsabilidades.slice(0, 3).map((responsabilidade, index) => (
            <Chip
              key={index}
              label={responsabilidade}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha('#FFFFFF', 0.05),
                color: 'text.secondary',
                border: `1px solid ${alpha('#FFFFFF', 0.1)}`,
              }}
            />
          ))}
          {agent.responsabilidades.length > 3 && (
            <Chip
              label={`+${agent.responsabilidades.length - 3}`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha('#FFFFFF', 0.05),
                color: 'text.secondary',
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AgentCard;
