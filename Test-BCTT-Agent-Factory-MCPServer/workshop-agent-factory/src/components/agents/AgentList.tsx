import { Box, Typography, alpha, Grid } from '@mui/material';
import { Agent, Phase } from '@/types';
import { AgentCard } from './AgentCard';

interface AgentListProps {
  phase: Phase | undefined;
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onChatClick: (agent: Agent) => void;
}

export const AgentList = ({ phase, agents, onAgentClick, onChatClick }: AgentListProps) => {
  if (!phase) return null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Phase Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: alpha('#C8102E', 0.15),
                borderRadius: 1,
                fontSize: '0.875rem',
                color: '#C8102E',
                fontWeight: 700,
              }}
            >
              {phase.numero}
            </Box>
            {phase.nome}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.6), maxWidth: 600 }}>
          {phase.descricao}
        </Typography>
      </Box>

      {/* Agents Grid */}
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
          <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.5) }}>
            Nenhum agente disponível nesta fase
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={agent.id}>
              <AgentCard
                agent={agent}
                onClick={onAgentClick}
                onChatClick={onChatClick}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AgentList;
