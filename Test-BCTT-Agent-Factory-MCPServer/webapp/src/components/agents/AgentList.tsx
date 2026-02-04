import { Box, Grid, Typography, alpha } from '@mui/material';
import { Agent, Phase } from '@/types';
import { AgentCard } from './AgentCard';
import { hasConversations } from '@/data/conversations';

interface AgentListProps {
  phase: Phase;
  agents: Agent[];
  onChatClick: (agent: Agent) => void;
  onHistoryClick?: (agent: Agent) => void;
}

export const AgentList = ({ phase, agents, onChatClick, onHistoryClick }: AgentListProps) => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          {phase.numero} {phase.nome}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {phase.descricao}
        </Typography>
      </Box>

      {agents.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: alpha('#FFFFFF', 0.02),
            borderRadius: 2,
            border: `1px dashed ${alpha('#FFFFFF', 0.1)}`,
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nenhum agente disponível nesta fase
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={agent.id}>
              <AgentCard
                agent={agent}
                hasConversations={hasConversations(agent.id)}
                onChatClick={onChatClick}
                onHistoryClick={onHistoryClick}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AgentList;
