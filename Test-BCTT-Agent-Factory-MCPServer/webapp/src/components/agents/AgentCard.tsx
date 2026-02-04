import { Card, CardContent, Box, Typography, Chip, alpha, IconButton, Tooltip } from '@mui/material';
import { Chat as ChatIcon, Info as InfoIcon } from '@mui/icons-material';
import { Agent } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface AgentCardProps {
  agent: Agent;
  onClick: (agent: Agent) => void;
  onChatClick: (agent: Agent) => void;
}

export const AgentCard = ({ agent, onClick, onChatClick }: AgentCardProps) => {
  const agentColor = getAgentColor(agent.id);

  return (
    <Card
      onClick={() => onClick(agent)}
      sx={{
        bgcolor: alpha('#FFFFFF', 0.02),
        border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          bgcolor: alpha('#FFFFFF', 0.04),
          borderColor: alpha(agentColor, 0.3),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(agentColor, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header with icon and actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              bgcolor: alpha(agentColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: agentColor,
              border: `2px solid ${alpha(agentColor, 0.2)}`,
            }}
          >
            {agent.sigla}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Ver detalhes">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(agent);
                }}
                sx={{
                  color: alpha('#FFFFFF', 0.4),
                  '&:hover': { color: agentColor, bgcolor: alpha(agentColor, 0.1) },
                }}
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Iniciar conversa">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onChatClick(agent);
                }}
                sx={{
                  color: alpha('#FFFFFF', 0.4),
                  '&:hover': { color: agentColor, bgcolor: alpha(agentColor, 0.1) },
                }}
              >
                <ChatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Agent Name and Badge */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', fontSize: '1rem' }}>
              {agent.nome}
            </Typography>
          </Box>
        </Box>

        {/* Mission */}
        <Typography
          variant="body2"
          sx={{
            color: alpha('#FFFFFF', 0.6),
            mb: 2,
            flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.5,
          }}
        >
          {agent.missao}
        </Typography>

        {/* Workflow steps preview */}
        {agent.fluxo && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 'auto' }}>
            {agent.fluxo.slice(0, 4).map((step, i) => (
              <Chip
                key={i}
                label={step.fase}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  bgcolor: alpha(agentColor, 0.08),
                  color: alpha('#FFFFFF', 0.7),
                  border: `1px solid ${alpha(agentColor, 0.15)}`,
                }}
              />
            ))}
          </Box>
        )}

        {/* AI Badge */}
        {agent.aiRecomendado && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: `1px solid ${alpha('#FFFFFF', 0.06)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                bgcolor: alpha(agent.aiRecomendado.cor, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: agent.aiRecomendado.cor,
              }}
            >
              AI
            </Box>
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              {agent.aiRecomendado.nome}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentCard;
