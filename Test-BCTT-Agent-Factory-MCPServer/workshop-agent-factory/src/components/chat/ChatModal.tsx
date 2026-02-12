import { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  alpha,
  Switch,
  FormControlLabel,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  CircularProgress,
  Button,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  RestartAlt as RestartIcon,
  Bolt as LiveIcon,
} from '@mui/icons-material';
import { Agent, ChatMessage as ChatMessageType } from '@/types';
import { DevPlanApproval } from '@/hooks/useChat';
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
  onDownload?: (type: string) => void;
  streamingText?: string;
  progress?: {
    currentStep: number;
    steps: string[];
    percentage: number;
  };
  pendingApproval?: DevPlanApproval | null;
  onApproveDevPlan?: (approved: boolean, comments?: string) => void;
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
  onDownload,
  streamingText,
  progress,
  pendingApproval,
  onApproveDevPlan,
}: ChatModalProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [rejectComments, setRejectComments] = useState('');
  const [visibleMessages, setVisibleMessages] = useState<ChatMessageType[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, streamingText]);

  // Demo mode auto-play
  useEffect(() => {
    if (!isLiveMode && messages.length > 0 && isAutoPlay && messageIndex < messages.length) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setVisibleMessages(prev => [...prev, messages[messageIndex]]);
          setMessageIndex(prev => prev + 1);
          setIsTyping(false);
        }, 1000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLiveMode, messages, messageIndex, isAutoPlay]);

  // Reset when opening
  useEffect(() => {
    if (open && !isLiveMode) {
      setMessageIndex(0);
      setVisibleMessages([]);
      setIsTyping(false);
    }
  }, [open, isLiveMode, agent?.id]);

  if (!agent) return null;

  const agentColor = getAgentColor(agent.id);
  const displayMessages = isLiveMode ? messages : visibleMessages;

  const handleNextMessage = () => {
    if (messageIndex < messages.length) {
      setVisibleMessages(prev => [...prev, messages[messageIndex]]);
      setMessageIndex(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    setMessageIndex(0);
    setVisibleMessages([]);
    setIsTyping(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0F172A',
          backgroundImage: 'none',
          borderRadius: 3,
          height: '85vh',
          maxHeight: 750,
        },
      }}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
            borderBottom: `1px solid ${alpha('#FFFFFF', 0.06)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: alpha(agentColor, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 700,
                color: agentColor,
              }}
            >
              {agent.sigla}
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                  {agent.nome}
                </Typography>
                <Chip
                  label={agent.sigla}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: alpha(agentColor, 0.15),
                    color: agentColor,
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
                {isLiveMode ? 'Modo Live - AI ativo' : 'Modo demonstração'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Demo controls */}
            {!isLiveMode && messages.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
                <Tooltip title={isAutoPlay ? 'Pausar' : 'Reproduzir'}>
                  <IconButton
                    size="small"
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    sx={{ color: alpha('#FFFFFF', 0.5) }}
                  >
                    {isAutoPlay ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Próxima mensagem">
                  <IconButton
                    size="small"
                    onClick={handleNextMessage}
                    disabled={messageIndex >= messages.length}
                    sx={{ color: alpha('#FFFFFF', 0.5) }}
                  >
                    <NextIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reiniciar">
                  <IconButton
                    size="small"
                    onClick={handleRestart}
                    sx={{ color: alpha('#FFFFFF', 0.5) }}
                  >
                    <RestartIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.4), ml: 1 }}>
                  {messageIndex}/{messages.length}
                </Typography>
              </Box>
            )}

            {/* Live mode toggle */}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LiveIcon sx={{ fontSize: 16, color: isLiveMode ? '#10B981' : alpha('#FFFFFF', 0.4) }} />
                  <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.6) }}>
                    Live
                  </Typography>
                </Box>
              }
              sx={{ mr: 1 }}
            />
            <IconButton onClick={onClose} size="small" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Progress indicator (for BA agent) */}
        {progress && progress.steps.length > 0 && (
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha('#FFFFFF', 0.06)}` }}>
            <Stepper activeStep={progress.currentStep} alternativeLabel>
              {progress.steps.map((label, i) => (
                <Step key={i} completed={i < progress.currentStep}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: i <= progress.currentStep ? agentColor : alpha('#FFFFFF', 0.4),
                        fontSize: '0.7rem',
                      },
                      '& .MuiStepIcon-root': {
                        color: i < progress.currentStep ? agentColor : alpha('#FFFFFF', 0.2),
                        '&.Mui-active': { color: agentColor },
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            <LinearProgress
              variant="determinate"
              value={progress.percentage}
              sx={{
                mt: 2,
                height: 4,
                borderRadius: 2,
                bgcolor: alpha('#FFFFFF', 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: agentColor,
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}

        {/* Messages area */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {displayMessages.length === 0 && !isTyping ? (
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
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 3,
                  bgcolor: alpha(agentColor, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: agentColor,
                  mb: 1,
                }}
              >
                {agent.sigla}
              </Box>
              <Typography variant="body1" sx={{ color: alpha('#FFFFFF', 0.7), textAlign: 'center' }}>
                Inicie uma conversa com o {agent.nome}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: alpha('#FFFFFF', 0.4), textAlign: 'center', maxWidth: 400 }}
              >
                {isLiveMode
                  ? 'Modo Live ativo - as respostas serão geradas pela IA em tempo real'
                  : 'Modo demonstração - veja um exemplo de conversa com este agente'}
              </Typography>
            </Box>
          ) : (
            <>
              {displayMessages.map((msg, index) => (
                <ChatMessage
                  key={index}
                  message={msg}
                  agentId={agent.id}
                  onDownload={onDownload}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 2,
                    bgcolor: alpha('#FFFFFF', 0.03),
                    borderRadius: 2,
                    maxWidth: 200,
                  }}
                >
                  <CircularProgress size={16} sx={{ color: agentColor }} />
                  <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.6) }}>
                    {agent.sigla} está a escrever...
                  </Typography>
                </Box>
              )}

              {/* Streaming text */}
              {streamingText && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: alpha('#FFFFFF', 0.03),
                    borderRadius: 2,
                    border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: alpha('#FFFFFF', 0.5), fontWeight: 600, mb: 0.5, display: 'block' }}
                  >
                    {agent.sigla.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.8), whiteSpace: 'pre-wrap' }}>
                    {streamingText}
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        width: 8,
                        height: 16,
                        bgcolor: agentColor,
                        ml: 0.5,
                        animation: 'blink 1s infinite',
                        '@keyframes blink': {
                          '0%, 50%': { opacity: 1 },
                          '51%, 100%': { opacity: 0 },
                        },
                      }}
                    />
                  </Typography>
                </Box>
              )}

              {/* Dev plan approval gate */}
              {pendingApproval?.plan && (
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: alpha('#F59E0B', 0.08),
                    borderRadius: 2,
                    border: `1px solid ${alpha('#F59E0B', 0.25)}`,
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 600, color: '#F59E0B', mb: 1.5, fontSize: '0.95rem' }}>
                    Plano de Desenvolvimento — {pendingApproval.plan.bdev_code} ({pendingApproval.agentId.toUpperCase()})
                  </Typography>

                  <Typography sx={{ color: alpha('#FFFFFF', 0.85), mb: 2, fontSize: '0.85rem' }}>
                    {pendingApproval.plan.plan.summary}
                  </Typography>

                  {/* Warnings */}
                  {pendingApproval.plan.warnings.length > 0 && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: alpha('#EF4444', 0.1), borderRadius: 1, border: `1px solid ${alpha('#EF4444', 0.3)}` }}>
                      {pendingApproval.plan.warnings.map((w, i) => (
                        <Typography key={i} sx={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 500 }}>
                          {w}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Files to create */}
                  {pendingApproval.plan.plan.files_to_create && pendingApproval.plan.plan.files_to_create.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>
                        Ficheiros a criar ({pendingApproval.plan.plan.files_to_create.length}):
                      </Typography>
                      {pendingApproval.plan.plan.files_to_create.map((f, i) => (
                        <Typography key={i} sx={{ color: alpha('#FFFFFF', 0.7), fontSize: '0.75rem', pl: 1 }}>
                          + {f.project}/{f.path} — {f.purpose}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Files to modify */}
                  {pendingApproval.plan.plan.files_to_modify && pendingApproval.plan.plan.files_to_modify.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>
                        Ficheiros a modificar ({pendingApproval.plan.plan.files_to_modify.length}):
                      </Typography>
                      {pendingApproval.plan.plan.files_to_modify.map((f, i) => (
                        <Typography key={i} sx={{ color: alpha('#FFFFFF', 0.7), fontSize: '0.75rem', pl: 1 }}>
                          ~ {f.project}/{f.path} — {f.changes}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Tables */}
                  {pendingApproval.plan.plan.tables_to_add && pendingApproval.plan.plan.tables_to_add.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>
                        Tabelas a criar ({pendingApproval.plan.plan.tables_to_add.length}):
                      </Typography>
                      {pendingApproval.plan.plan.tables_to_add.map((t, i) => (
                        <Typography key={i} sx={{ color: alpha('#FFFFFF', 0.7), fontSize: '0.75rem', pl: 1 }}>
                          + {t.name}: {t.columns}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {pendingApproval.plan.plan.tables_to_modify && pendingApproval.plan.plan.tables_to_modify.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>
                        Tabelas a modificar ({pendingApproval.plan.plan.tables_to_modify.length}):
                      </Typography>
                      {pendingApproval.plan.plan.tables_to_modify.map((t, i) => (
                        <Typography key={i} sx={{ color: alpha('#FFFFFF', 0.7), fontSize: '0.75rem', pl: 1 }}>
                          ~ {t.name}: {t.changes}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Reject comments */}
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Comentários (opcional)..."
                    value={rejectComments}
                    onChange={(e) => setRejectComments(e.target.value)}
                    sx={{
                      mb: 2,
                      '& .MuiInputBase-root': { bgcolor: alpha('#FFFFFF', 0.05), color: 'white', fontSize: '0.8rem' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#FFFFFF', 0.15) },
                    }}
                  />

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        onApproveDevPlan?.(true, rejectComments || undefined);
                        setRejectComments('');
                      }}
                      sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, fontWeight: 600, textTransform: 'none' }}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        onApproveDevPlan?.(false, rejectComments || undefined);
                        setRejectComments('');
                      }}
                      sx={{ borderColor: '#EF4444', color: '#EF4444', '&:hover': { borderColor: '#DC2626', bgcolor: alpha('#EF4444', 0.1) }, fontWeight: 600, textTransform: 'none' }}
                    >
                      Rejeitar
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Loading indicator for live mode */}
              {isLoading && isLiveMode && !streamingText && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 2,
                    bgcolor: alpha('#FFFFFF', 0.03),
                    borderRadius: 2,
                    maxWidth: 200,
                  }}
                >
                  <CircularProgress size={16} sx={{ color: agentColor }} />
                  <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.6) }}>
                    A processar...
                  </Typography>
                </Box>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input area */}
        <ChatInput
          agentId={agent.id}
          onSend={onSend}
          isLoading={isLoading}
          disabled={!isLiveMode && messages.length > 0}
          placeholder={
            isLiveMode
              ? `Pergunte ao ${agent.nome}...`
              : 'Ative o modo Live para conversar em tempo real'
          }
        />
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
