import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  alpha,
  Stack,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import type { CICDPipeline, CICDStep } from '@/services/api';
import { getCICDStatus } from '@/services/api';

function getStepIcon(status: CICDStep['status']) {
  switch (status) {
    case 'passed': return <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20 }} />;
    case 'failed': return <ErrorIcon sx={{ color: '#EF4444', fontSize: 20 }} />;
    case 'skipped': return <SkipNextIcon sx={{ color: '#94A3B8', fontSize: 20 }} />;
    case 'running': return <HourglassTopIcon sx={{ color: '#F59E0B', fontSize: 20, animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />;
    default: return <PlayArrowIcon sx={{ color: '#475569', fontSize: 20 }} />;
  }
}

function getStepColor(status: CICDStep['status']): string {
  switch (status) {
    case 'passed': return '#10B981';
    case 'failed': return '#EF4444';
    case 'skipped': return '#94A3B8';
    case 'running': return '#F59E0B';
    default: return '#475569';
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface CICDDashboardProps {
  /** Show when visible */
  visible?: boolean;
}

export function CICDDashboard({ visible = true }: CICDDashboardProps) {
  const [pipeline, setPipeline] = useState<CICDPipeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await getCICDStatus();
      setPipeline(status);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    fetchStatus();
    // Poll while running
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [visible, fetchStatus]);

  if (!visible) return null;

  if (error) {
    return (
      <Paper sx={{ p: 2, bgcolor: alpha('#EF4444', 0.1), border: `1px solid ${alpha('#EF4444', 0.3)}`, borderRadius: 2 }}>
        <Typography variant="body2" color="error">CI/CD: {error}</Typography>
      </Paper>
    );
  }

  if (!pipeline) {
    return (
      <Paper sx={{ p: 2, bgcolor: alpha('#FFFFFF', 0.02), border: `1px solid ${alpha('#FFFFFF', 0.06)}`, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">CI/CD Pipeline: Idle — nenhum pipeline executado</Typography>
      </Paper>
    );
  }

  const passedCount = pipeline.steps.filter(s => s.status === 'passed').length;
  const totalCount = pipeline.steps.length;
  const progress = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

  return (
    <Paper sx={{ bgcolor: alpha('#FFFFFF', 0.02), border: `1px solid ${alpha('#FFFFFF', 0.06)}`, borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '0.5px' }}>
            CI/CD PIPELINE
          </Typography>
          <Chip
            label={pipeline.status.toUpperCase()}
            size="small"
            sx={{
              bgcolor: alpha(
                pipeline.status === 'passed' ? '#10B981' :
                pipeline.status === 'failed' ? '#EF4444' :
                pipeline.status === 'running' ? '#F59E0B' : '#475569',
                0.15
              ),
              color: pipeline.status === 'passed' ? '#10B981' :
                pipeline.status === 'failed' ? '#EF4444' :
                pipeline.status === 'running' ? '#F59E0B' : '#94A3B8',
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          />
          <Chip label={pipeline.bdev} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
          <Chip label={pipeline.mvp} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
        </Stack>
        {pipeline.status === 'failed' && (
          <Button
            size="small"
            startIcon={<ReplayIcon />}
            onClick={() => {
              fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cicd/rerun-failed`, { method: 'POST' })
                .then(() => fetchStatus());
            }}
            sx={{ color: '#F59E0B', textTransform: 'none', fontSize: '0.75rem' }}
          >
            Re-run Failed
          </Button>
        )}
      </Box>

      {/* Progress bar */}
      {pipeline.status === 'running' && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            bgcolor: alpha('#FFFFFF', 0.05),
            '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' },
          }}
        />
      )}

      <Divider sx={{ borderColor: alpha('#FFFFFF', 0.06) }} />

      {/* Steps */}
      <Box sx={{ p: 1 }}>
        {pipeline.steps.map((step) => (
          <Accordion
            key={step.id}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: 'transparent',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0 },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: '#475569' }} />}
              sx={{
                minHeight: 36,
                px: 1,
                '& .MuiAccordionSummary-content': { margin: '4px 0', alignItems: 'center', gap: 1 },
              }}
            >
              {getStepIcon(step.status)}
              <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                {step.name}
              </Typography>
              {step.duration != null && (
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                  {formatDuration(step.duration)}
                </Typography>
              )}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: getStepColor(step.status),
                  ml: 0.5,
                }}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, py: 1 }}>
              {step.output ? (
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    color: '#94A3B8',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    bgcolor: alpha('#000', 0.3),
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {step.output}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {step.status === 'pending' ? 'Aguardando...' : 'Sem output disponível'}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Footer */}
      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${alpha('#FFFFFF', 0.06)}` }}>
        <Typography variant="caption" color="text.secondary">
          {passedCount}/{totalCount} steps passed
        </Typography>
        {pipeline.completedAt && (
          <Typography variant="caption" color="text.secondary">
            {new Date(pipeline.completedAt).toLocaleTimeString('pt-PT')}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default CICDDashboard;
