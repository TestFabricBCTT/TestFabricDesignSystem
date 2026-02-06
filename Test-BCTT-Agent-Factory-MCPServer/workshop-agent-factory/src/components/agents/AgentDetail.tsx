import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Chip,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Input as InputIcon,
  Output as OutputIcon,
  Psychology as AIIcon,
  WorkspacePremium as BadgeIcon,
} from '@mui/icons-material';
import { Agent } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface AgentDetailProps {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onChat: (agent: Agent) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ pt: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}
  >
    {value === index && children}
  </Box>
);

export const AgentDetail = ({ open, agent, onClose, onChat }: AgentDetailProps) => {
  const [tab, setTab] = useState(0);

  if (!agent) return null;

  const agentColor = getAgentColor(agent.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0F172A',
          backgroundImage: 'none',
          borderRadius: 3,
          height: '85vh',
          maxHeight: 800,
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${alpha('#FFFFFF', 0.06)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: alpha(agentColor, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: agentColor,
              }}
            >
              {agent.sigla}
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'white' }}>
                  {agent.nome}
                </Typography>
                <Chip
                  label={agent.sigla}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    bgcolor: alpha(agentColor, 0.15),
                    color: agentColor,
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.7), mt: 0.5 }}>
                {agent.missao}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: alpha('#FFFFFF', 0.5) }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: `1px solid ${alpha('#FFFFFF', 0.06)}` }}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            sx={{
              px: 3,
              '& .MuiTab-root': {
                color: alpha('#FFFFFF', 0.5),
                textTransform: 'none',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: agentColor,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: agentColor,
              },
            }}
          >
            <Tab label="Detalhes" />
            <Tab label="Workflow" />
            <Tab label="AI Recomendado" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'hidden', px: 3 }}>
          {/* Detalhes Tab */}
          <TabPanel value={tab} index={0}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {/* Responsabilidades */}
              <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
                  Responsabilidades
                </Typography>
                <List dense disablePadding>
                  {agent.responsabilidades.map((resp, i) => (
                    <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <CheckIcon sx={{ fontSize: 18, color: agentColor }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={resp}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: { color: alpha('#FFFFFF', 0.8) },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              {/* Inputs & Outputs */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InputIcon sx={{ fontSize: 20, color: '#3B82F6' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
                      Inputs
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {agent.inputs.map((input, i) => (
                      <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemText
                          primary={`• ${input}`}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { color: alpha('#FFFFFF', 0.7) },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>

                <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <OutputIcon sx={{ fontSize: 20, color: '#10B981' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
                      Outputs
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {agent.outputs.map((output, i) => (
                      <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemText
                          primary={`• ${output}`}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { color: alpha('#FFFFFF', 0.7) },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            </Box>

            {/* Memory Section (BA only) */}
            {agent.memoria && (
              <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
                  {agent.memoria.titulo}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {agent.memoria.niveis.map((nivel, i) => (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: alpha('#FFFFFF', 0.02),
                        borderRadius: 1.5,
                        border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: agentColor, mb: 0.5 }}>
                        {nivel.nome}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.6), display: 'block' }}>
                        {nivel.desc}
                      </Typography>
                      <Chip
                        label={nivel.tipo}
                        size="small"
                        sx={{
                          mt: 1,
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: alpha(agentColor, 0.1),
                          color: agentColor,
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
          </TabPanel>

          {/* Workflow Tab */}
          <TabPanel value={tab} index={1}>
            {agent.fluxo && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {agent.fluxo.map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Paper
                      sx={{
                        p: 2.5,
                        bgcolor: alpha('#FFFFFF', 0.02),
                        borderRadius: 2,
                        minWidth: 180,
                        border: `1px solid ${alpha(agentColor, 0.2)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Typography variant="h6">{step.icon}</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: agentColor }}>
                          {step.fase}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.7) }}>
                        {step.desc}
                      </Typography>
                    </Paper>
                    {i < agent.fluxo!.length - 1 && (
                      <ArrowIcon sx={{ color: alpha('#FFFFFF', 0.3), fontSize: 28 }} />
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Additional workflow-specific content */}
            {agent.templateDoc && (
              <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
                  {agent.templateDoc.titulo}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {agent.templateDoc.seccoes.map((sec, i) => (
                    <Chip
                      key={i}
                      label={sec.nome}
                      size="small"
                      sx={{
                        bgcolor: alpha('#FFFFFF', 0.05),
                        color: alpha('#FFFFFF', 0.8),
                        '&:hover': { bgcolor: alpha('#FFFFFF', 0.1) },
                      }}
                      title={sec.desc}
                    />
                  ))}
                </Box>
              </Paper>
            )}

            {agent.mvpRules && (
              <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
                  {agent.mvpRules.titulo}
                </Typography>
                <Typography variant="body2" sx={{ color: agentColor, mb: 2 }}>
                  Regra: {agent.mvpRules.regra}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#10B981', mb: 1 }}>
                      Válido
                    </Typography>
                    {agent.mvpRules.valido.map((v, i) => (
                      <Typography key={i} variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), display: 'block', mb: 0.5 }}>
                        • {v}
                      </Typography>
                    ))}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#EF4444', mb: 1 }}>
                      Inválido
                    </Typography>
                    {agent.mvpRules.invalido.map((v, i) => (
                      <Typography key={i} variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), display: 'block', mb: 0.5 }}>
                        • {v}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </Paper>
            )}
          </TabPanel>

          {/* AI Recomendado Tab */}
          <TabPanel value={tab} index={2}>
            {agent.aiRecomendado && (
              <Box>
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: alpha(agent.aiRecomendado.cor, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(agent.aiRecomendado.cor, 0.2)}`,
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: alpha(agent.aiRecomendado.cor, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AIIcon sx={{ color: agent.aiRecomendado.cor, fontSize: 28 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                        {agent.aiRecomendado.nome}
                      </Typography>
                      <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.6) }}>
                        {agent.aiRecomendado.provider} • {agent.aiRecomendado.modelo}
                      </Typography>
                    </Box>
                    <Chip
                      icon={<BadgeIcon sx={{ fontSize: 16 }} />}
                      label="Recomendado"
                      size="small"
                      sx={{
                        ml: 'auto',
                        bgcolor: alpha(agent.aiRecomendado.cor, 0.15),
                        color: agent.aiRecomendado.cor,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Paper>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  {/* Vantagens */}
                  <Paper sx={{ p: 2.5, bgcolor: alpha('#10B981', 0.05), borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#10B981', mb: 2 }}>
                      Vantagens
                    </Typography>
                    <List dense disablePadding>
                      {agent.aiRecomendado.vantagens.map((v, i) => (
                        <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckIcon sx={{ fontSize: 18, color: '#10B981' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={v}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { color: alpha('#FFFFFF', 0.8) },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>

                  {/* Desvantagens */}
                  <Paper sx={{ p: 2.5, bgcolor: alpha('#F59E0B', 0.05), borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#F59E0B', mb: 2 }}>
                      Desvantagens
                    </Typography>
                    <List dense disablePadding>
                      {agent.aiRecomendado.desvantagens.map((d, i) => (
                        <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <WarningIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={d}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { color: alpha('#FFFFFF', 0.8) },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>

                {/* Alternativas */}
                {agent.aiRecomendado.alternativas.length > 0 && (
                  <Paper sx={{ p: 2.5, bgcolor: alpha('#FFFFFF', 0.02), borderRadius: 2, mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
                      Alternativas
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {agent.aiRecomendado.alternativas.map((alt, i) => (
                        <Box
                          key={i}
                          sx={{
                            flex: 1,
                            p: 2,
                            bgcolor: alpha('#FFFFFF', 0.02),
                            borderRadius: 1.5,
                            border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'white', mb: 0.5 }}>
                            {alt.nome}
                          </Typography>
                          <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.6) }}>
                            {alt.razao}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}
          </TabPanel>
        </Box>

        {/* Footer Action */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${alpha('#FFFFFF', 0.06)}`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Box
            component="button"
            onClick={() => onChat(agent)}
            sx={{
              px: 3,
              py: 1.5,
              bgcolor: agentColor,
              color: 'white',
              border: 'none',
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(agentColor, 0.8),
                transform: 'translateY(-1px)',
              },
            }}
          >
            Conversar com {agent.sigla}
            <ArrowIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AgentDetail;
