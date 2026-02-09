import { Box, Typography, Paper, alpha, Button, Chip } from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as ApproveIcon,
  Description as DocIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { ChatMessage as ChatMessageType, AgentId } from '@/types';
import { getAgentColor } from '@/theme/theme';

interface ChatMessageProps {
  message: ChatMessageType;
  agentId: AgentId;
  onDownload?: (type: string) => void;
  onApprove?: () => void;
}

export const ChatMessage = ({ message, agentId, onDownload, onApprove }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isDownload = message.role === 'download';
  const isApproval = message.role === 'approval';
  const agentColor = getAgentColor(agentId);

  // Parse markdown-style formatting (with fallback to raw text on error)
  const formatContent = (content: string) => {
    try {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        const lines = code.split('\n');
        const language = lines[0] || '';
        const codeContent = lines.slice(1).join('\n') || code;

        return (
          <Box
            key={i}
            sx={{
              my: 1.5,
              p: 2,
              bgcolor: alpha('#000', 0.4),
              borderRadius: 1.5,
              border: `1px solid ${alpha('#FFFFFF', 0.1)}`,
              overflow: 'auto',
            }}
          >
            {language && (
              <Chip
                label={language}
                size="small"
                sx={{
                  mb: 1,
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha('#FFFFFF', 0.1),
                  color: alpha('#FFFFFF', 0.7),
                }}
              />
            )}
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: alpha('#FFFFFF', 0.9),
                whiteSpace: 'pre-wrap',
                m: 0,
              }}
            >
              {codeContent}
            </Typography>
          </Box>
        );
      }

      // Handle regular text with bold and other formatting
      const formatted = part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n---\n/g, '<hr/>')
        .replace(/^##\s+(.*)$/gm, '<h3>$1</h3>')
        .replace(/^###\s+(.*)$/gm, '<h4>$1</h4>')
        .replace(/^\|\s*(.+)\s*\|$/gm, (_match, rowContent) => {
          const cells = rowContent.split('|').map((c: string) => c.trim());
          return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join('')}</tr>`;
        });

      return (
        <Typography
          key={i}
          component="div"
          variant="body2"
          sx={{
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            '& strong': { fontWeight: 600, color: 'white' },
            '& code': {
              bgcolor: alpha('#000', 0.3),
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.85em',
            },
            '& h3': {
              fontSize: '1rem',
              fontWeight: 600,
              color: 'white',
              mt: 2,
              mb: 1,
            },
            '& h4': {
              fontSize: '0.9rem',
              fontWeight: 600,
              color: agentColor,
              mt: 1.5,
              mb: 0.5,
            },
            '& hr': {
              border: 'none',
              borderTop: `1px solid ${alpha('#FFFFFF', 0.1)}`,
              my: 2,
            },
          }}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
    } catch (e) {
      console.error('[ChatMessage] formatContent error:', e);
      return (
        <Typography component="div" variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      );
    }
  };

  // System message styling
  if (isSystem) {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2,
          bgcolor: alpha('#3B82F6', 0.1),
          borderRadius: 2,
          borderLeft: `3px solid #3B82F6`,
        }}
      >
        <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 600, mb: 0.5, display: 'block' }}>
          SISTEMA
        </Typography>
        {formatContent(message.content)}
      </Box>
    );
  }

  // Download message styling
  if (isDownload) {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2.5,
          bgcolor: alpha('#10B981', 0.1),
          borderRadius: 2,
          border: `1px solid ${alpha('#10B981', 0.2)}`,
        }}
      >
        {formatContent(message.content)}

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<DocIcon />}
            onClick={() => onDownload?.('word')}
            sx={{
              bgcolor: '#10B981',
              '&:hover': { bgcolor: alpha('#10B981', 0.8) },
              textTransform: 'none',
            }}
          >
            Download Word
          </Button>
          {(agentId === 'fa' || agentId === 'da') && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => onDownload?.('csv')}
              sx={{
                borderColor: '#10B981',
                color: '#10B981',
                '&:hover': { bgcolor: alpha('#10B981', 0.1), borderColor: '#10B981' },
                textTransform: 'none',
              }}
            >
              Download CSV
            </Button>
          )}
          {agentId === 'dsla' && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CodeIcon />}
              onClick={() => onDownload?.('code')}
              sx={{
                borderColor: '#8B5CF6',
                color: '#8B5CF6',
                '&:hover': { bgcolor: alpha('#8B5CF6', 0.1), borderColor: '#8B5CF6' },
                textTransform: 'none',
              }}
            >
              Ver Componente
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  // Approval message styling
  if (isApproval) {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2.5,
          bgcolor: alpha('#F59E0B', 0.1),
          borderRadius: 2,
          border: `1px solid ${alpha('#F59E0B', 0.2)}`,
        }}
      >
        {formatContent(message.content)}

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<ApproveIcon />}
            onClick={onApprove}
            sx={{
              bgcolor: '#10B981',
              '&:hover': { bgcolor: alpha('#10B981', 0.8) },
              textTransform: 'none',
            }}
          >
            Aprovar
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: alpha('#FFFFFF', 0.3),
              color: alpha('#FFFFFF', 0.7),
              '&:hover': { bgcolor: alpha('#FFFFFF', 0.05), borderColor: alpha('#FFFFFF', 0.4) },
              textTransform: 'none',
            }}
          >
            Pedir alterações
          </Button>
        </Box>
      </Box>
    );
  }

  // Regular user/assistant message
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
          maxWidth: '85%',
          p: 2,
          borderRadius: 2,
          bgcolor: isUser ? alpha(agentColor, 0.1) : alpha('#FFFFFF', 0.03),
          border: `1px solid ${isUser ? alpha(agentColor, 0.2) : alpha('#FFFFFF', 0.06)}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.5,
            color: isUser ? agentColor : alpha('#FFFFFF', 0.5),
            fontWeight: 600,
          }}
        >
          {isUser ? 'Você' : agentId.toUpperCase()}
        </Typography>
        {formatContent(message.content)}
      </Paper>
    </Box>
  );
};

export default ChatMessage;
