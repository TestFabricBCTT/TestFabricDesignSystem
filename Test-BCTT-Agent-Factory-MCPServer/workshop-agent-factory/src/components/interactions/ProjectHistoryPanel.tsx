import { useState, useRef, useEffect } from 'react';
import {
  Fab,
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  IconButton,
  Chip,
  Divider,
  alpha,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  History as HistoryIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as NotStartedIcon,
  PlayCircleOutline as InProgressIcon,
  Chat as ChatIcon,
  Rocket as RocketIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Project, AgentIterationStatus } from '@/types';
import { getAgentById } from '@/data/agents';
import { getAgentColor } from '@/theme/theme';

const PIPELINE_AGENTS = ['ba', 'fa', 'da', 'pa', 'dsla'] as const;

export type ProjectAgentAction =
  | { type: 'view'; projectId: string; agentId: string }
  | { type: 'continue'; projectId: string; agentId: string }
  | { type: 'start'; projectId: string; agentId: string }
  | { type: 'launch-prototype'; projectId: string; bdevCode: string }
  | { type: 'export-prototype'; projectId: string; bdevCode: string };

interface ProjectHistoryPanelProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
  onAgentAction: (action: ProjectAgentAction) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function getStatusIcon(status: AgentIterationStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon sx={{ fontSize: 18, color: '#4CAF50' }} />;
    case 'in_progress':
      return <InProgressIcon sx={{ fontSize: 18, color: '#FF9800' }} />;
    case 'not_started':
    default:
      return <NotStartedIcon sx={{ fontSize: 18, color: alpha('#FFFFFF', 0.25) }} />;
  }
}

function getStatusLabel(status: AgentIterationStatus, msgCount: number): string {
  switch (status) {
    case 'completed':
      return `Concluído · ${msgCount} msgs`;
    case 'in_progress':
      return `Em curso · ${msgCount} msgs`;
    case 'not_started':
    default:
      return 'Não iniciado';
  }
}

function getCompletedCount(project: Project): number {
  return PIPELINE_AGENTS.filter(
    (id) => project.agents[id]?.status === 'completed',
  ).length;
}

export const ProjectHistoryPanel = ({
  projects,
  activeProject,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  onAgentAction,
}: ProjectHistoryPanelProps) => {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject =
    selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) ?? null
      : null;

  const handleBack = () => setSelectedProjectId(null);
  const handleClose = () => {
    setOpen(false);
    setSelectedProjectId(null);
  };

  return (
    <>
      {/* FAB - bottom right */}
      <Tooltip title="Pedidos" placement="left">
        <Fab
          size="medium"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: alpha('#C8102E', 0.9),
            color: '#FFFFFF',
            '&:hover': { bgcolor: '#C8102E' },
            zIndex: 1200,
          }}
        >
          <HistoryIcon />
        </Fab>
      </Tooltip>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            bgcolor: '#0F172A',
            backgroundImage: 'none',
            borderLeft: `1px solid ${alpha('#FFFFFF', 0.08)}`,
          },
        }}
      >
        {selectedProject ? (
          /* ========== Vista 2: Pipeline de Agentes ========== */
          <PipelineView
            project={selectedProject}
            onBack={handleBack}
            onClose={handleClose}
            onRenameProject={onRenameProject}
            onAgentAction={onAgentAction}
          />
        ) : (
          /* ========== Vista 1: Lista de Pedidos ========== */
          <ProjectListView
            projects={projects}
            activeProject={activeProject}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              onSelectProject(id);
            }}
            onNewProject={() => {
              handleClose();
              onNewProject();
            }}
            onDeleteProject={onDeleteProject}
            onRenameProject={onRenameProject}
          />
        )}
      </Drawer>
    </>
  );
};

/* ========================================
   Vista 1: Lista de Pedidos
   ======================================== */

interface ProjectListViewProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
}

const ProjectListView = ({
  projects,
  activeProject,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
}: ProjectListViewProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onRenameProject(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
  <>
    {/* Header */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2.5,
        borderBottom: `1px solid ${alpha('#FFFFFF', 0.08)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <HistoryIcon sx={{ color: '#C8102E', fontSize: 22 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
          Pedidos Anteriores
        </Typography>
      </Box>
    </Box>

    {/* New Project button */}
    <Box sx={{ p: 2 }}>
      <Button
        variant="contained"
        fullWidth
        startIcon={<AddIcon />}
        onClick={onNewProject}
        sx={{
          bgcolor: alpha('#C8102E', 0.15),
          color: '#C8102E',
          fontWeight: 600,
          '&:hover': { bgcolor: alpha('#C8102E', 0.25) },
        }}
      >
        Novo Pedido
      </Button>
    </Box>

    <Divider sx={{ borderColor: alpha('#FFFFFF', 0.06) }} />

    {/* Project list */}
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      {projects.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <ChatIcon sx={{ fontSize: 40, color: alpha('#FFFFFF', 0.15), mb: 1 }} />
          <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.4) }}>
            Nenhum pedido guardado
          </Typography>
          <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.25) }}>
            Cria um novo pedido para começar
          </Typography>
        </Box>
      ) : (
        <List sx={{ py: 0 }}>
          {projects.map((project) => {
            const completed = getCompletedCount(project);
            const isActive = activeProject?.id === project.id;

            return (
              <ListItem
                key={project.id}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(project.id, project.title);
                      }}
                      sx={{
                        color: alpha('#FFFFFF', 0.3),
                        '&:hover': { color: alpha('#FFFFFF', 0.7) },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      sx={{
                        color: alpha('#FFFFFF', 0.3),
                        '&:hover': { color: '#FF4852' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                sx={{
                  borderBottom: `1px solid ${alpha('#FFFFFF', 0.04)}`,
                  ...(isActive && {
                    borderLeft: '3px solid #C8102E',
                  }),
                }}
              >
                <ListItemButton
                  onClick={() => onSelectProject(project.id)}
                  sx={{
                    py: 2,
                    pr: 6,
                    '&:hover': { bgcolor: alpha('#C8102E', 0.06) },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ mb: 0.5 }}>
                        {editingId === project.id ? (
                          <TextField
                            inputRef={editRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveEdit}
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                            variant="standard"
                            sx={{
                              maxWidth: 260,
                              '& .MuiInput-input': {
                                color: '#FFFFFF',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                py: 0,
                              },
                              '& .MuiInput-underline:before': {
                                borderBottomColor: alpha('#FFFFFF', 0.3),
                              },
                              '& .MuiInput-underline:after': {
                                borderBottomColor: '#C8102E',
                              },
                            }}
                          />
                        ) : (
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 260,
                            }}
                          >
                            {project.title}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {project.bdevCode && (
                          <Chip
                            label={project.bdevCode}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              bgcolor: alpha('#C8102E', 0.1),
                              color: '#C8102E',
                            }}
                          />
                        )}
                        <Typography
                          variant="caption"
                          sx={{ color: alpha('#FFFFFF', 0.35) }}
                        >
                          {timeAgo(project.updatedAt)}
                        </Typography>
                        {/* Progress dots */}
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                          {PIPELINE_AGENTS.map((agentId) => {
                            const status =
                              project.agents[agentId]?.status || 'not_started';
                            return (
                              <Box
                                key={agentId}
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor:
                                    status === 'completed'
                                      ? '#4CAF50'
                                      : status === 'in_progress'
                                        ? '#FF9800'
                                        : alpha('#FFFFFF', 0.15),
                                }}
                              />
                            );
                          })}
                          <Typography
                            variant="caption"
                            sx={{
                              color: alpha('#FFFFFF', 0.3),
                              fontSize: '0.6rem',
                              ml: 0.5,
                            }}
                          >
                            {completed}/{PIPELINE_AGENTS.length}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  </>
  );
};

/* ========================================
   Vista 2: Pipeline de Agentes
   ======================================== */

interface PipelineViewProps {
  project: Project;
  onBack: () => void;
  onClose: () => void;
  onRenameProject: (id: string, newTitle: string) => void;
  onAgentAction: (action: ProjectAgentAction) => void;
}

const PipelineView = ({
  project,
  onBack,
  onClose,
  onRenameProject,
  onAgentAction,
}: PipelineViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(project.title);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  const saveEdit = () => {
    if (editValue.trim()) {
      onRenameProject(project.id, editValue.trim());
    }
    setIsEditing(false);
  };

  return (
  <>
    {/* Header */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderBottom: `1px solid ${alpha('#FFFFFF', 0.08)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size="small"
          onClick={onBack}
          sx={{ color: alpha('#FFFFFF', 0.6) }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          {isEditing ? (
            <TextField
              inputRef={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              onBlur={saveEdit}
              size="small"
              variant="standard"
              sx={{
                maxWidth: 250,
                '& .MuiInput-input': {
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  py: 0,
                },
                '& .MuiInput-underline:before': {
                  borderBottomColor: alpha('#FFFFFF', 0.3),
                },
                '& .MuiInput-underline:after': {
                  borderBottomColor: '#C8102E',
                },
              }}
            />
          ) : (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => { setEditValue(project.title); setIsEditing(true); }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                }}
              >
                {project.title}
              </Typography>
              <EditIcon sx={{ fontSize: 14, color: alpha('#FFFFFF', 0.3) }} />
            </Box>
          )}
          {project.bdevCode && (
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.4) }}>
              {project.bdevCode}
            </Typography>
          )}
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={onClose}
        sx={{ color: alpha('#FFFFFF', 0.5) }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    {/* Agent pipeline */}
    <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
      {PIPELINE_AGENTS.map((agentId, index) => {
        const iteration = project.agents[agentId] || {
          agentId,
          status: 'not_started' as const,
          messages: [],
        };
        const agent = getAgentById(agentId);
        const agentColor = getAgentColor(agentId);
        const msgCount = iteration.messages.filter(
          (m) => m.role === 'user' || m.role === 'assistant',
        ).length;
        const isLast = index === PIPELINE_AGENTS.length - 1;

        return (
          <Box key={agentId}>
            <Box sx={{ px: 2.5, py: 2 }}>
              {/* Agent header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                {getStatusIcon(iteration.status)}
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: alpha(agentColor, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: agentColor,
                    flexShrink: 0,
                  }}
                >
                  {agent?.sigla || agentId.toUpperCase()}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.85rem' }}
                  >
                    {agent?.nome || agentId}
                  </Typography>
                  <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.4) }}>
                    {getStatusLabel(iteration.status, msgCount)}
                  </Typography>
                </Box>
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 6.5 }}>
                {iteration.status === 'completed' && (
                  <>
                    <ActionButton
                      label="Ver conversa"
                      icon={<ChatIcon sx={{ fontSize: 14 }} />}
                      onClick={() =>
                        onAgentAction({
                          type: 'view',
                          projectId: project.id,
                          agentId,
                        })
                      }
                    />
                    {/* PA-specific actions */}
                    {agentId === 'pa' && project.bdevCode && (
                      <>
                        <ActionButton
                          label="Lançar"
                          icon={<RocketIcon sx={{ fontSize: 14 }} />}
                          color="#4CAF50"
                          onClick={() =>
                            onAgentAction({
                              type: 'launch-prototype',
                              projectId: project.id,
                              bdevCode: project.bdevCode!,
                            })
                          }
                        />
                        <ActionButton
                          label="Exportar"
                          icon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            onAgentAction({
                              type: 'export-prototype',
                              projectId: project.id,
                              bdevCode: project.bdevCode!,
                            })
                          }
                        />
                      </>
                    )}
                  </>
                )}
                {iteration.status === 'in_progress' && (
                  <ActionButton
                    label="Continuar"
                    icon={<ChatIcon sx={{ fontSize: 14 }} />}
                    color="#FF9800"
                    onClick={() =>
                      onAgentAction({
                        type: 'continue',
                        projectId: project.id,
                        agentId,
                      })
                    }
                  />
                )}
                {iteration.status === 'not_started' && (
                  <ActionButton
                    label="Iniciar"
                    icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    onClick={() =>
                      onAgentAction({
                        type: 'start',
                        projectId: project.id,
                        agentId,
                      })
                    }
                  />
                )}
              </Box>
            </Box>

            {/* Connector line between agents */}
            {!isLast && (
              <Box
                sx={{
                  ml: 3.6,
                  height: 16,
                  width: 2,
                  bgcolor: alpha('#FFFFFF', 0.08),
                  borderRadius: 1,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  </>
  );
};

/* ========================================
   Action Button (small chip-like button)
   ======================================== */

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  color?: string;
  onClick: () => void;
}

const ActionButton = ({
  label,
  icon,
  color = '#FFFFFF',
  onClick,
}: ActionButtonProps) => (
  <Button
    size="small"
    startIcon={icon}
    onClick={onClick}
    sx={{
      height: 26,
      fontSize: '0.7rem',
      fontWeight: 500,
      color: alpha(color, 0.8),
      bgcolor: alpha(color, 0.08),
      borderRadius: 1.5,
      textTransform: 'none',
      px: 1.5,
      '&:hover': {
        bgcolor: alpha(color, 0.15),
        color,
      },
    }}
  >
    {label}
  </Button>
);

export default ProjectHistoryPanel;
