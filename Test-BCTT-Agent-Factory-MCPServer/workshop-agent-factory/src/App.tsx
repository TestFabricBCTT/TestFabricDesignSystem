import { useState, useCallback, useRef, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, alpha } from '@mui/material';
import { theme } from '@/theme/theme';
import { Layout, Header, Navigation } from '@/components/layout';
import { AgentList, AgentDetail } from '@/components/agents';
import { ChatModal } from '@/components/chat';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GovernanceDiagram } from '@/components/governance';
import { ProjectHistoryPanel, PrototypesPanel } from '@/components/interactions';
import { BdevSelectorDialog } from '@/components/interactions/BdevSelectorDialog';
import type { ProjectAgentAction } from '@/components/interactions';
import { Agent, PhaseId } from '@/types';
import type { BdevAvailable } from '@/services/api';
import { phases, getPhaseById, getAgentsByPhase, getAgentById } from '@/data/agents';
import { useChat } from '@/hooks/useChat';
import { useProjectHistory } from '@/hooks/useProjectHistory';
import { setSessionId, exportPrototypeToDisk } from '@/services/api';

/** Extract BDEV code from text (e.g. "BDEV123" from agent response) */
function extractBdevCode(text: string): string | null {
  const match = text.match(/BDEV\d+/i);
  return match ? match[0].toUpperCase() : null;
}

function App() {
  // Phase state
  const [activePhaseId, setActivePhaseId] = useState<PhaseId>('concepcao');
  const activePhase = getPhaseById(activePhaseId);
  const activeAgents = getAgentsByPhase(activePhaseId);

  // Agent detail state
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Governance diagram state
  const [governanceOpen, setGovernanceOpen] = useState(false);

  // BDEV selector dialog (Phase 2)
  const [bdevDialogOpen, setBdevDialogOpen] = useState(false);

  // Chat state - using the real useChat hook that calls the API
  const [chatOpen, setChatOpen] = useState(false);
  const {
    messages,
    isLoading,
    isLiveMode,
    currentAgent: chatAgent,
    pendingAutoAdvance,
    pendingApproval,
    progress,
    streamingText,
    openChat,
    closeChat: closeChatHook,
    sendMessage,
    toggleLiveMode,
    setLiveMode,
    resumeWithMessages,
    getCurrentMessages,
    clearAutoAdvance,
    handleApproveDevPlan,
  } = useChat();

  // Project history
  const {
    projects,
    activeProject,
    createProject,
    updateAgentIteration,
    updateProject,
    deleteProject,
    setActiveProject,
  } = useProjectHistory();

  // Ref to track active project ID for use inside closures
  const activeProjectRef = useRef<string | null>(null);
  useEffect(() => {
    activeProjectRef.current = activeProject?.id ?? null;
  }, [activeProject]);

  // Guard against duplicate auto-advance transitions
  const isTransitioningRef = useRef(false);
  const innerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance: when an agent produces a HANDOFF, auto-open next agent
  useEffect(() => {
    if (!pendingAutoAdvance) return;

    // Guard: if already transitioning, ignore duplicate
    if (isTransitioningRef.current) {
      clearAutoAdvance();
      return;
    }
    isTransitioningRef.current = true;

    const nextAgent = getAgentById(pendingAutoAdvance);
    if (!nextAgent) {
      console.warn(`[auto-advance] Agent ${pendingAutoAdvance} not found`);
      clearAutoAdvance();
      isTransitioningRef.current = false;
      return;
    }

    // Mark current agent as completed in project (save its messages)
    const projId = activeProjectRef.current;
    if (projId && chatAgent) {
      const currentMsgs = getCurrentMessages().filter(
        (m) => m.role === 'user' || m.role === 'assistant',
      );
      updateAgentIteration(projId, chatAgent.id, {
        status: 'completed',
        messages: currentMsgs,
        completedAt: new Date().toISOString(),
      });

      // Extract BDEV code from FA during auto-advance
      if (chatAgent.id === 'fa') {
        const allText = currentMsgs.map((m) => m.content).join(' ');
        const bdev = extractBdevCode(allText);
        if (bdev) {
          const currentProject = projects.find((p) => p.id === projId);
          const currentTitle = currentProject?.title || 'Novo Pedido';
          const titleWithBdev = currentTitle.startsWith(bdev)
            ? currentTitle
            : `${bdev} — ${currentTitle}`;
          updateProject(projId, { bdevCode: bdev, title: titleWithBdev });
        }
      }
    }

    console.log(`[auto-advance] Transitioning to ${nextAgent.sigla} (${nextAgent.nome})`);
    closeChatHook();

    const t1 = setTimeout(() => {
      try {
        // Mark next agent as in_progress in project
        if (projId) {
          updateAgentIteration(projId, nextAgent.id, {
            status: 'in_progress',
            startedAt: new Date().toISOString(),
          });
        }

        openChat(nextAgent);
        setLiveMode(true);
        setChatOpen(true);

        // Nested: send message after agent is open
        const t2 = setTimeout(() => {
          try {
            sendMessage('Analisa e processa com base no contexto recebido do agente anterior.');
          } catch (e) {
            console.error('[auto-advance] Failed to send message:', e);
          }
          clearAutoAdvance();
          isTransitioningRef.current = false;
        }, 500);
        innerTimeoutRef.current = t2;
      } catch (e) {
        console.error('[auto-advance] Failed to open next agent:', e);
        clearAutoAdvance();
        isTransitioningRef.current = false;
      }
    }, 800);

    return () => {
      clearTimeout(t1);
      if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current);
      isTransitioningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoAdvance]);

  // Phase change handler
  const handlePhaseChange = useCallback((phaseId: string) => {
    setActivePhaseId(phaseId as PhaseId);
  }, []);

  // Governance diagram handlers
  const handleGovernanceOpen = useCallback(() => {
    setGovernanceOpen(true);
  }, []);

  const handleGovernanceClose = useCallback(() => {
    setGovernanceOpen(false);
  }, []);

  // Agent click handler - open detail modal
  const handleAgentClick = useCallback((agent: Agent) => {
    setDetailAgent(agent);
    setDetailOpen(true);
  }, []);

  // Chat click handler - open chat modal with project tracking
  // Dashboard entry → ALWAYS creates a new project (continue existing via History panel)
  const handleChatClick = useCallback((agent: Agent) => {
    const project = createProject('Novo Pedido');
    setSessionId(project.id);
    activeProjectRef.current = project.id;

    // Mark agent as in_progress
    const projId = activeProjectRef.current;
    if (projId) {
      updateAgentIteration(projId, agent.id, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });
    }

    openChat(agent);
    setLiveMode(true);
    setChatOpen(true);
    setDetailOpen(false);
  }, [openChat, setLiveMode, createProject, updateAgentIteration]);

  // Close detail modal
  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setDetailAgent(null);
  }, []);

  // Close chat modal - auto-save to project
  const handleChatClose = useCallback(() => {
    const currentMsgs = getCurrentMessages();
    const liveMessages = currentMsgs.filter((m) => m.role === 'user' || m.role === 'assistant');
    const projId = activeProjectRef.current;

    if (chatAgent && projId && liveMessages.length > 1) {
      // If still loading, keep as in_progress (stream will be aborted by closeChatHook)
      const status = isLoading ? 'in_progress' : 'completed';
      updateAgentIteration(projId, chatAgent.id, {
        status,
        messages: liveMessages,
        ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
      });

      // Extract title from BA's first user message
      if (chatAgent.id === 'ba') {
        const firstUserMsg = liveMessages.find((m) => m.role === 'user');
        if (firstUserMsg) {
          const title = firstUserMsg.content.substring(0, 60) +
            (firstUserMsg.content.length > 60 ? '...' : '');
          updateProject(projId, { title });
        }
      }

      // Extract BDEV code from FA responses and update project title
      if (chatAgent.id === 'fa') {
        const allText = liveMessages.map((m) => m.content).join(' ');
        const bdev = extractBdevCode(allText);
        if (bdev) {
          const currentProject = projects.find((p) => p.id === projId);
          const currentTitle = currentProject?.title || 'Novo Pedido';
          const titleWithBdev = currentTitle.startsWith(bdev)
            ? currentTitle
            : `${bdev} — ${currentTitle}`;
          updateProject(projId, { bdevCode: bdev, title: titleWithBdev });
        }
      }
    }

    setChatOpen(false);
    closeChatHook(); // This now aborts the SSE stream (S1)
  }, [chatAgent, isLoading, getCurrentMessages, updateAgentIteration, updateProject, closeChatHook, projects]);

  // Toggle live mode
  const handleToggleLiveMode = useCallback(() => {
    toggleLiveMode();
  }, [toggleLiveMode]);

  // Send message - uses real API in live mode
  const handleSendMessage = useCallback(async (content: string) => {
    if (!chatAgent || !isLiveMode) return;
    sendMessage(content);
  }, [chatAgent, isLiveMode, sendMessage]);

  // Handle download from chat
  const handleDownload = useCallback((type: string) => {
    console.log('Download:', type);
    alert(`A funcionalidade de download (${type}) será implementada com o MCP Server.`);
  }, []);

  // Project history handlers
  const handleSelectProject = useCallback((projectId: string) => {
    setActiveProject(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSessionId(project.id);
      activeProjectRef.current = project.id;
    }
  }, [projects, setActiveProject]);

  const handleNewProject = useCallback(() => {
    const project = createProject('Novo Pedido');
    setSessionId(project.id);
    activeProjectRef.current = project.id;

    // Open BA to start
    const ba = getAgentById('ba');
    if (ba) {
      updateAgentIteration(project.id, 'ba', {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });
      openChat(ba);
      setLiveMode(true);
      setChatOpen(true);
    }
  }, [createProject, updateAgentIteration, openChat, setLiveMode]);

  // Phase 2: open BDEV selector dialog
  const handleNewPhase2Project = useCallback(() => {
    setBdevDialogOpen(true);
  }, []);

  // Phase 2: BDEV selected — create project with BDEV code
  const handleBdevSelect = useCallback((bdev: BdevAvailable) => {
    setBdevDialogOpen(false);
    const project = createProject(`${bdev.key} — ${bdev.summary}`, 'desenvolvimento');
    setSessionId(project.id);
    activeProjectRef.current = project.id;
    updateProject(project.id, { bdevCode: bdev.key });
  }, [createProject, updateProject]);

  const handleRenameProject = useCallback((id: string, newTitle: string) => {
    updateProject(id, { title: newTitle });
  }, [updateProject]);

  const handleAgentAction = useCallback((action: ProjectAgentAction) => {
    const project = projects.find((p) => p.id === action.projectId);
    if (!project) return;

    // Set this project as active + set session
    setActiveProject(project.id);
    setSessionId(project.id);
    activeProjectRef.current = project.id;

    if (action.type === 'view' || action.type === 'continue') {
      const agent = getAgentById(action.agentId);
      if (!agent) return;

      const iteration = project.agents[action.agentId];
      if (iteration && iteration.messages.length > 0) {
        resumeWithMessages(agent, iteration.messages);
      } else {
        openChat(agent);
        setLiveMode(true);
      }
      setChatOpen(true);
    } else if (action.type === 'start') {
      const agent = getAgentById(action.agentId);
      if (!agent) return;

      updateAgentIteration(project.id, action.agentId, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });
      openChat(agent);
      setLiveMode(true);
      setChatOpen(true);
    } else if (action.type === 'launch-prototype') {
      // Open PA chat and ask it to deploy
      const pa = getAgentById('pa');
      if (!pa) return;

      const iteration = project.agents['pa'];
      if (iteration && iteration.messages.length > 0) {
        resumeWithMessages(pa, iteration.messages);
      } else {
        openChat(pa);
      }
      setLiveMode(true);
      setChatOpen(true);
      // Send deploy command after a brief delay
      setTimeout(() => {
        sendMessage(`Faz deploy do protótipo ${action.bdevCode}`);
      }, 500);
    } else if (action.type === 'export-prototype') {
      exportPrototypeToDisk(action.bdevCode)
        .then((result) => {
          alert(`Protótipo exportado para: ${result.outputPath}`);
        })
        .catch((err) => {
          alert(`Erro ao exportar: ${err.message}`);
        });
    }
  }, [projects, setActiveProject, updateAgentIteration, openChat, setLiveMode, resumeWithMessages, sendMessage]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Header />
        <Navigation
          phases={phases}
          activePhase={activePhaseId}
          onPhaseChange={handlePhaseChange}
        />
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: alpha('#000', 0.2),
          }}
        >
          <AgentList
            phase={activePhase}
            agents={activeAgents}
            onAgentClick={handleAgentClick}
            onChatClick={handleChatClick}
            onGovernanceClick={handleGovernanceOpen}
          />
        </Box>

        {/* Governance Diagram Modal */}
        <GovernanceDiagram
          open={governanceOpen}
          phaseId={activePhaseId}
          onClose={handleGovernanceClose}
        />

        {/* Agent Detail Modal */}
        <AgentDetail
          open={detailOpen}
          agent={detailAgent}
          onClose={handleDetailClose}
          onChat={handleChatClick}
        />

        {/* Chat Modal - wrapped in ErrorBoundary for crash recovery */}
        <ErrorBoundary key={chatAgent?.id || 'none'} onReset={() => { setChatOpen(false); closeChatHook(); }}>
          <ChatModal
            open={chatOpen}
            agent={chatAgent}
            messages={messages}
            isLiveMode={isLiveMode}
            isLoading={isLoading}
            onClose={handleChatClose}
            onSend={handleSendMessage}
            onToggleLiveMode={handleToggleLiveMode}
            onDownload={handleDownload}
            progress={progress ?? undefined}
            streamingText={streamingText || undefined}
            pendingApproval={pendingApproval}
            onApproveDevPlan={handleApproveDevPlan}
          />
        </ErrorBoundary>

        {/* Project History Panel - FAB + Drawer */}
        <ProjectHistoryPanel
          projects={projects}
          activeProject={activeProject}
          activePhaseId={activePhaseId}
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject}
          onNewPhase2Project={handleNewPhase2Project}
          onDeleteProject={deleteProject}
          onRenameProject={handleRenameProject}
          onAgentAction={handleAgentAction}
        />

        {/* BDEV Selector Dialog (Phase 2) */}
        <BdevSelectorDialog
          open={bdevDialogOpen}
          onClose={() => setBdevDialogOpen(false)}
          onSelect={handleBdevSelect}
        />

        {/* Prototypes Panel - visible when PA agent is active */}
        <PrototypesPanel agentId={chatAgent?.id} />

      </Layout>
    </ThemeProvider>
  );
}

export default App;
