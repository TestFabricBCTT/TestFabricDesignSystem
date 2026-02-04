import { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/theme/theme';
import { Layout, Header, Navigation } from '@/components/layout';
import { AgentList } from '@/components/agents';
import { ChatModal, ConversationHistory } from '@/components/chat';
import { useAgents, useChat } from '@/hooks';
import { Agent, Conversation } from '@/types';

function App() {
  const { phases, activePhase, activePhaseId, activeAgents, changePhase } = useAgents();
  const {
    messages,
    isLoading,
    isLiveMode,
    currentAgent,
    conversations,
    openChat,
    closeChat,
    sendMessage,
    toggleLiveMode,
    loadConversation,
  } = useChat();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAgent, setHistoryAgent] = useState<Agent | null>(null);

  const handleChatClick = (agent: Agent) => {
    openChat(agent);
  };

  const handleHistoryClick = (agent: Agent) => {
    setHistoryAgent(agent);
    openChat(agent);
    setHistoryOpen(true);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    loadConversation(conversation);
    setHistoryOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Header />
        <Navigation
          phases={phases}
          activePhase={activePhaseId}
          onPhaseChange={changePhase}
        />
        <AgentList
          phase={activePhase}
          agents={activeAgents}
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
        />

        <ChatModal
          open={currentAgent !== null && !historyOpen}
          agent={currentAgent}
          messages={messages}
          isLiveMode={isLiveMode}
          isLoading={isLoading}
          onClose={closeChat}
          onSend={sendMessage}
          onToggleLiveMode={toggleLiveMode}
        />

        <ConversationHistory
          open={historyOpen}
          agent={historyAgent}
          conversations={conversations}
          onClose={() => setHistoryOpen(false)}
          onSelect={handleSelectConversation}
        />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
