import { useState, useCallback, useEffect, useRef } from 'react';
import { Agent, ChatMessage, Conversation } from '@/types';
import { getConversationsByAgent } from '@/data/conversations';
import {
  sendMessage as apiSendMessage,
  sendMessageStream,
  clearConversation,
  isApiReady,
} from '@/services/api';

// Pre-seeded welcome messages for agents in live mode
const agentWelcomeMessages: Record<string, string> = {
  ba: `Olá! Antes de começar o levantamento de requisitos, preciso saber:

**A) Modo Demo** - Levantamento rápido com ~5 perguntas essenciais
**B) Modo Completo** - Levantamento exaustivo e detalhado

Qual preferes? (A ou B)`,
};

export interface PipelineProgress {
  currentStep: number;
  steps: string[];
  percentage: number;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isLiveMode: boolean;
  isApiAvailable: boolean;
  currentAgent: Agent | null;
  conversations: Conversation[];
  pendingAutoAdvance: string | null;
  progress: PipelineProgress | null;
  streamingText: string;
  openChat: (agent: Agent) => void;
  closeChat: () => void;
  sendMessage: (content: string) => void;
  toggleLiveMode: () => void;
  setLiveMode: (value: boolean) => void;
  loadConversation: (conversation: Conversation) => void;
  clearHistory: () => void;
  resumeWithMessages: (agent: Agent, msgs: ChatMessage[]) => void;
  getCurrentMessages: () => ChatMessage[];
  clearAutoAdvance: () => void;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingAutoAdvance, setPendingAutoAdvance] = useState<string | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [streamingText, setStreamingText] = useState('');

  // Refs to avoid stale closures in sendMessage during auto-advance
  const currentAgentRef = useRef<Agent | null>(null);
  useEffect(() => { currentAgentRef.current = currentAgent; }, [currentAgent]);

  const isLiveModeRef = useRef(isLiveMode);
  useEffect(() => { isLiveModeRef.current = isLiveMode; }, [isLiveMode]);

  // AbortController ref to cancel ongoing SSE stream when chat closes
  const abortRef = useRef<AbortController | null>(null);

  // Check API availability on mount
  useEffect(() => {
    const checkApi = async () => {
      const ready = await isApiReady();
      setIsApiAvailable(ready);
    };
    checkApi();
  }, []);

  const openChat = useCallback((agent: Agent) => {
    setCurrentAgent(agent);
    setProgress(null); // Clear progress from previous agent
    setConversations(getConversationsByAgent(agent.id));

    // Show pre-seeded welcome message if configured for this agent
    const welcome = agentWelcomeMessages[agent.id];
    if (welcome) {
      setMessages([{ role: 'assistant', content: welcome }]);
    } else {
      setMessages([]);
    }
  }, []);

  const closeChat = useCallback(() => {
    // Abort any running SSE stream
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setCurrentAgent(null);
    setMessages([]);
    setIsLoading(false);
    setProgress(null);
    setStreamingText('');
  }, []);

  // When agent changes or live mode toggles, ensure welcome message is shown if no messages
  useEffect(() => {
    if (currentAgent && messages.length === 0) {
      const welcome = agentWelcomeMessages[currentAgent.id];
      if (welcome) {
        setMessages([{ role: 'assistant', content: welcome }]);
      }
    }
  }, [currentAgent]);

  const clearHistory = useCallback(async () => {
    if (currentAgent) {
      try {
        await clearConversation(currentAgent.id);
        setMessages([]);
      } catch (error) {
        console.error('Failed to clear conversation:', error);
      }
    }
  }, [currentAgent]);

  const sendMessage = useCallback(async (content: string) => {
    // Use ref to get the CURRENT agent (not stale closure from auto-advance)
    const agent = currentAgentRef.current;
    if (!agent) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);

    if (isLiveModeRef.current) {
      setIsLoading(true);

      try {
        // Use streaming API but buffer the response
        let responseContent = '';
        let autoAdvanceAgent: string | null = null;

        // Create abort controller for this stream (can be cancelled by closeChat)
        const controller = new AbortController();
        abortRef.current = controller;

        // Stream the response (buffered - don't update UI until complete)
        for await (const event of sendMessageStream(agent.id, content, controller.signal)) {
          if (event.type === 'phases') {
            // Pipeline started — show phase list in progress indicator
            const phaseList = (event as Record<string, unknown>).phases as Array<{ id: string; name: string }>;
            setProgress({
              currentStep: 0,
              steps: phaseList.map((p) => p.name),
              percentage: 0,
            });
          } else if (event.type === 'phase') {
            // Pipeline phase update
            const phaseEvent = event as Record<string, unknown>;
            const current = phaseEvent.current as number;
            const total = phaseEvent.total as number;
            const status = phaseEvent.status as string;
            setProgress((prev) => {
              if (!prev) return prev;
              const pct = Math.round((current / total) * 100);
              return {
                ...prev,
                currentStep: status === 'completed' ? current : current - 1,
                percentage: status === 'completed' ? pct : pct - Math.round(100 / total / 2),
              };
            });
          } else if (event.type === 'chunk' && event.content) {
            responseContent += event.content;
            setStreamingText(responseContent);
          } else if (event.type === 'tool') {
            console.log(`Tool used: ${event.name}`);
          } else if (event.type === 'end' && (event as Record<string, unknown>).autoAdvance) {
            const advance = (event as Record<string, unknown>).autoAdvance as { nextAgent: string };
            autoAdvanceAgent = advance.nextAgent;
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Streaming error');
          }
        }

        abortRef.current = null; // Stream completed normally

        // Clear streaming text and display the complete response
        setStreamingText('');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: responseContent,
          },
        ]);

        setIsLoading(false);
        setProgress(null);

        // Signal auto-advance if HANDOFF was detected
        if (autoAdvanceAgent) {
          console.log(`[auto-advance] HANDOFF detected → ${autoAdvanceAgent}`);
          // Small delay so the user sees the final response before transition
          setTimeout(() => setPendingAutoAdvance(autoAdvanceAgent), 1500);
        }
      } catch (error) {
        // If aborted by user closing chat, stop silently
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Error sending message:', error);

        // Fallback to non-streaming API
        try {
          const response = await apiSendMessage(agent.id, content);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: response.response,
            },
          ]);
        } catch (fallbackError) {
          const errorMessage = fallbackError instanceof Error
            ? fallbackError.message
            : 'Erro desconhecido';

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `⚠️ Erro ao comunicar com o servidor: ${errorMessage}\n\nVerifique se:\n- O servidor API está a correr (npm run dev:api)\n- A ANTHROPIC_API_KEY está configurada no .env`,
            },
          ]);
        }
        setIsLoading(false);
        setProgress(null);
        setStreamingText('');
      }
    } else {
      // Demo mode - find matching example response
      const agentConversations = getConversationsByAgent(agent.id);
      let foundResponse = false;

      for (const conv of agentConversations) {
        for (let i = 0; i < conv.mensagens.length - 1; i++) {
          const msg = conv.mensagens[i];
          if (
            msg.role === 'user' &&
            msg.content.toLowerCase().includes(content.toLowerCase().substring(0, 20))
          ) {
            const nextMsg = conv.mensagens[i + 1];
            if (nextMsg && nextMsg.role === 'assistant') {
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  { ...nextMsg },
                ]);
              }, 500);
              foundResponse = true;
              break;
            }
          }
        }
        if (foundResponse) break;
      }

      if (!foundResponse) {
        setTimeout(() => {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: `Olá! Sou o ${agent.nome}. Esta é uma demonstração. Ative o "Live Mode" para interagir com a IA real, ou use uma das conversas de exemplo no histórico.`,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }, 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLiveMode = useCallback(() => {
    setIsLiveMode((prev) => !prev);
  }, []);

  const setLiveMode = useCallback((value: boolean) => {
    setIsLiveMode(value);
  }, []);

  const clearAutoAdvance = useCallback(() => {
    setPendingAutoAdvance(null);
  }, []);

  const loadConversation = useCallback((conversation: Conversation) => {
    setMessages(conversation.mensagens);
  }, []);

  const resumeWithMessages = useCallback((agent: Agent, msgs: ChatMessage[]) => {
    setCurrentAgent(agent);
    setMessages(msgs);
    setIsLiveMode(true);
    setConversations(getConversationsByAgent(agent.id));
  }, []);

  const getCurrentMessages = useCallback(() => messages, [messages]);

  return {
    messages,
    isLoading,
    isLiveMode,
    isApiAvailable,
    currentAgent,
    conversations,
    pendingAutoAdvance,
    progress,
    streamingText,
    openChat,
    closeChat,
    sendMessage,
    toggleLiveMode,
    setLiveMode,
    loadConversation,
    clearHistory,
    resumeWithMessages,
    getCurrentMessages,
    clearAutoAdvance,
  };
};

export default useChat;
