import { useState, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, alpha } from '@mui/material';
import { theme } from '@/theme/theme';
import { Layout, Header, Navigation } from '@/components/layout';
import { AgentList, AgentDetail } from '@/components/agents';
import { ChatModal } from '@/components/chat';
import { Agent, ChatMessage, PhaseId } from '@/types';
import { phases, getPhaseById, getAgentsByPhase } from '@/data/agents';
import { getConversationsByAgent } from '@/data/conversations';

function App() {
  // Phase state
  const [activePhaseId, setActivePhaseId] = useState<PhaseId>('concepcao');
  const activePhase = getPhaseById(activePhaseId);
  const activeAgents = getAgentsByPhase(activePhaseId);

  // Agent detail state
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Chat state
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');

  // Get demo conversations for the current agent
  const demoConversations = chatAgent ? getConversationsByAgent(chatAgent.id) : [];
  const demoMessages = demoConversations[0]?.mensagens || [];

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
    setChatAgent(agent);
    setChatOpen(true);
    setLiveMessages([]);
    setStreamingText('');
    setDetailOpen(false);
  }, []);

  // Close detail modal
  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setDetailAgent(null);
  }, []);

  // Close chat modal
  const handleChatClose = useCallback(() => {
    setChatOpen(false);
    setChatAgent(null);
    setLiveMessages([]);
    setStreamingText('');
  }, []);

  // Toggle live mode
  const handleToggleLiveMode = useCallback(() => {
    setIsLiveMode(prev => !prev);
    setLiveMessages([]);
    setStreamingText('');
  }, []);

  // Send message in live mode
  const handleSendMessage = useCallback(async (content: string) => {
    if (!chatAgent || !isLiveMode) return;

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content };
    setLiveMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response (in production, this would call the MCP server)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate streaming response
      const response = getSimulatedResponse(chatAgent.id, content);
      let currentText = '';

      for (let i = 0; i < response.length; i++) {
        currentText += response[i];
        setStreamingText(currentText);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Add complete message
      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setLiveMessages(prev => [...prev, assistantMessage]);
      setStreamingText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatAgent, isLiveMode]);

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

        {/* Chat Modal */}
        <ChatModal
          open={chatOpen}
          agent={chatAgent}
          messages={isLiveMode ? liveMessages : demoMessages}
          isLiveMode={isLiveMode}
          isLoading={isLoading}
          onClose={handleChatClose}
          onSend={handleSendMessage}
          onToggleLiveMode={handleToggleLiveMode}
          onDownload={handleDownload}
          streamingText={streamingText}
        />
      </Layout>
    </ThemeProvider>
  );
}

// Simulated response generator for demo purposes
function getSimulatedResponse(agentId: string, userMessage: string): string {
  const responses: Record<string, string> = {
    ba: `Obrigado pela tua mensagem. Vou ajudar-te a estruturar este pedido.

**Análise inicial:**
Com base no que descreveste, identifico os seguintes pontos-chave:

1. **Objetivo principal:** ${userMessage.substring(0, 50)}...
2. **Área de impacto:** A determinar após análise

**Próximas perguntas de clarificação:**
- Qual é o principal problema que esta funcionalidade resolve?
- Quem são os utilizadores afetados?
- Existem sistemas existentes que precisam ser integrados?

Podes responder a estas perguntas para que eu possa continuar a análise?`,

    fa: `Recebi o teu pedido. Vou transformar isto em user stories estruturadas.

**Epic identificado:** Baseado na tua descrição

**User Stories propostas:**

**US01:** Como utilizador, quero [ação principal], para [benefício].

**Critérios de Aceitação:**
\`\`\`gherkin
Given que estou autenticado
When acedo à funcionalidade
Then devo ver o resultado esperado
\`\`\`

Queres que detalhe mais alguma user story específica?`,

    da: `Vou analisar os requisitos de design para esta funcionalidade.

**Análise UX/UI:**

**Fluxo principal:**
1. Entrada → Processamento → Resultado

**Estados a considerar:**
- Default
- Loading
- Error
- Success
- Empty state

**Próximos passos:**
Vou consultar o ZeroHeight para garantir consistência com o Design System.`,

    dsla: `Vou analisar os componentes necessários para implementar esta funcionalidade.

**Componentes identificados:**

1. **Átomo:** Button (já existe na biblioteca)
2. **Molécula:** FormField (já existe)
3. **Organismo:** Novo componente necessário

**Proposta de specs:**
\`\`\`typescript
interface NovoComponenteProps {
  variant?: 'default' | 'compact';
  children: React.ReactNode;
}
\`\`\`

Posso avançar com a criação do componente?`,
  };

  return responses[agentId] || `Recebi a tua mensagem: "${userMessage.substring(0, 50)}..."

Vou processar este pedido e dar-te uma resposta estruturada.`;
}

export default App;
