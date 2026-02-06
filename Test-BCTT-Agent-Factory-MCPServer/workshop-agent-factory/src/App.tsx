import { useState, useCallback, useRef, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, alpha } from '@mui/material';
import { theme } from '@/theme/theme';
import { Layout, Header, Navigation } from '@/components/layout';
import { AgentList, AgentDetail } from '@/components/agents';
import { ChatModal } from '@/components/chat';
import { PhaseInteractionPanel, AgentPickerDialog } from '@/components/interactions';
import { Agent, PhaseId, Interaction } from '@/types';
import { phases, getPhaseById, getAgentsByPhase, getAgentById } from '@/data/agents';
import { useChat } from '@/hooks/useChat';
import { useInteractionHistory } from '@/hooks/useInteractionHistory';

function App() {
  // Phase state
  const [activePhaseId, setActivePhaseId] = useState<PhaseId>('concepcao');
  const activePhase = getPhaseById(activePhaseId);
  const activeAgents = getAgentsByPhase(activePhaseId);

  // Agent detail state
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Agent picker for new iteration
  const [pickerOpen, setPickerOpen] = useState(false);

  // Chat state - using the real useChat hook that calls the API
  const [chatOpen, setChatOpen] = useState(false);
  const {
    messages,
    isLoading,
    isLiveMode,
    currentAgent: chatAgent,
    pendingAutoAdvance,
    progress,
    openChat,
    closeChat: closeChatHook,
    sendMessage,
    toggleLiveMode,
    setLiveMode,
    resumeWithMessages,
    getCurrentMessages,
    clearAutoAdvance,
  } = useChat();

  // Interaction history
  const { getByPhase, save, update, remove } = useInteractionHistory();
  const phaseInteractions = getByPhase(activePhaseId);

  // Track active interaction for auto-save
  const activeInteractionId = useRef<string | null>(null);

  // Auto-advance: when an agent produces a HANDOFF, auto-open next agent
  useEffect(() => {
    if (!pendingAutoAdvance) return;

    const nextAgent = getAgentById(pendingAutoAdvance);
    if (!nextAgent) {
      console.warn(`[auto-advance] Agent ${pendingAutoAdvance} not found`);
      clearAutoAdvance();
      return;
    }

    console.log(`[auto-advance] Transitioning to ${nextAgent.sigla} (${nextAgent.nome})`);
    clearAutoAdvance();

    // Close current chat
    setChatOpen(false);
    closeChatHook();

    // Open next agent after a short visual transition
    setTimeout(() => {
      openChat(nextAgent);
      setLiveMode(true);
      setChatOpen(true);
      activeInteractionId.current = null;

      // Auto-send initial processing message
      setTimeout(() => {
        sendMessage('Analisa e processa com base no contexto recebido do agente anterior.');
      }, 500);
    }, 800);
  }, [pendingAutoAdvance, clearAutoAdvance, closeChatHook, openChat, setLiveMode, sendMessage]);

  // Phase change handler
  const handlePhaseChange = useCallback((phaseId: string) => {
    setActivePhaseId(phaseId as PhaseId);
  }, []);

  // Agent click handler - open detail modal
  const handleAgentClick = useCallback((agent: Agent) => {
    setDetailAgent(agent);
    setDetailOpen(true);
  }, []);

  // Chat click handler - open chat modal
  const handleChatClick = useCallback((agent: Agent) => {
    openChat(agent);
    setChatOpen(true);
    setDetailOpen(false);
    activeInteractionId.current = null;
  }, [openChat]);

  // Close detail modal
  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setDetailAgent(null);
  }, []);

  // Close chat modal - auto-save interaction
  const handleChatClose = useCallback(() => {
    const currentMsgs = getCurrentMessages();
    const liveMessages = currentMsgs.filter((m) => m.role === 'user' || m.role === 'assistant');

    if (chatAgent && isLiveMode && liveMessages.length > 1) {
      // Extract a title from the first user message
      const firstUserMsg = liveMessages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.substring(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
        : `Conversa com ${chatAgent.nome}`;

      if (activeInteractionId.current) {
        // Update existing interaction
        update(activeInteractionId.current, liveMessages, title);
      } else {
        // Save new interaction
        const interaction = save({
          phaseId: activePhaseId,
          agentId: chatAgent.id,
          agentSigla: chatAgent.sigla,
          title,
          messages: liveMessages,
        });
        activeInteractionId.current = interaction.id;
      }
    }

    setChatOpen(false);
    closeChatHook();
    activeInteractionId.current = null;
  }, [chatAgent, isLiveMode, activePhaseId, getCurrentMessages, save, update, closeChatHook]);

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

  // Resume an interaction from history
  const handleResumeInteraction = useCallback((interaction: Interaction) => {
    const agent = getAgentById(interaction.agentId);
    if (!agent) return;

    resumeWithMessages(agent, interaction.messages);
    activeInteractionId.current = interaction.id;
    setChatOpen(true);
  }, [resumeWithMessages]);

  // New iteration - open agent picker
  const handleNewIteration = useCallback(() => {
    setPickerOpen(true);
  }, []);

  // Agent picked for new iteration
  const handleAgentPicked = useCallback((agent: Agent) => {
    setPickerOpen(false);
    openChat(agent);
    toggleLiveMode(); // Start in live mode
    setChatOpen(true);
    activeInteractionId.current = null;
  }, [openChat, toggleLiveMode]);

  // Delete an interaction
  const handleDeleteInteraction = useCallback((id: string) => {
    remove(id);
  }, [remove]);

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
          />
        </Box>

        {/* Agent Detail Modal */}
        <AgentDetail
          open={detailOpen}
          agent={detailAgent}
          onClose={handleDetailClose}
          onChat={handleChatClick}
        />

        {/* Chat Modal - Now using real API via useChat hook */}
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
        />

        {/* Phase Interaction Panel - FAB + Drawer per phase */}
        <PhaseInteractionPanel
          phase={activePhase}
          interactions={phaseInteractions}
          onResume={handleResumeInteraction}
          onNewIteration={handleNewIteration}
          onDelete={handleDeleteInteraction}
        />

        {/* Agent Picker for new iteration */}
        <AgentPickerDialog
          open={pickerOpen}
          agents={activeAgents}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAgentPicked}
        />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
