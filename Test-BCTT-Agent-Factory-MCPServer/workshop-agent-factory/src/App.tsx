import { useState, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, alpha } from '@mui/material';
import { theme } from '@/theme/theme';
import { Layout, Header, Navigation } from '@/components/layout';
import { AgentList, AgentDetail } from '@/components/agents';
import { ChatModal } from '@/components/chat';
import { Agent, PhaseId } from '@/types';
import { phases, getPhaseById, getAgentsByPhase } from '@/data/agents';
import { useChat } from '@/hooks/useChat';

function App() {
  // Phase state
  const [activePhaseId, setActivePhaseId] = useState<PhaseId>('concepcao');
  const activePhase = getPhaseById(activePhaseId);
  const activeAgents = getAgentsByPhase(activePhaseId);

  // Agent detail state
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Chat state - using the real useChat hook that calls the API
  const [chatOpen, setChatOpen] = useState(false);
  const {
    messages,
    isLoading,
    isLiveMode,
    currentAgent: chatAgent,
    openChat,
    closeChat: closeChatHook,
    sendMessage,
    toggleLiveMode,
  } = useChat();

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
  }, [openChat]);

  // Close detail modal
  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setDetailAgent(null);
  }, []);

  // Close chat modal
  const handleChatClose = useCallback(() => {
    setChatOpen(false);
    closeChatHook();
  }, [closeChatHook]);

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
    // In production, this would generate and download the actual file
    alert(`A funcionalidade de download (${type}) será implementada com o MCP Server.`);
  }, []);

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
        />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
