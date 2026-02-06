import { useState, useCallback, useEffect } from 'react';
import { Agent, ChatMessage, Conversation } from '@/types';
import { getConversationsByAgent } from '@/data/conversations';
import {
  sendMessage as apiSendMessage,
  sendMessageStream,
  clearConversation,
  isApiReady,
} from '@/services/api';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isLiveMode: boolean;
  isApiAvailable: boolean;
  currentAgent: Agent | null;
  conversations: Conversation[];
  openChat: (agent: Agent) => void;
  closeChat: () => void;
  sendMessage: (content: string) => void;
  toggleLiveMode: () => void;
  loadConversation: (conversation: Conversation) => void;
  clearHistory: () => void;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

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
    setMessages([]);
    setConversations(getConversationsByAgent(agent.id));
  }, []);

  const closeChat = useCallback(() => {
    setCurrentAgent(null);
    setMessages([]);
    setIsLoading(false);
  }, []);

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
    if (!currentAgent) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);

    if (isLiveMode) {
      setIsLoading(true);

      try {
        // Use streaming API but buffer the response
        let responseContent = '';

        // Stream the response (buffered - don't update UI until complete)
        for await (const event of sendMessageStream(currentAgent.id, content)) {
          if (event.type === 'chunk' && event.content) {
            responseContent += event.content;
          } else if (event.type === 'tool') {
            // Could show tool usage in UI
            console.log(`Tool used: ${event.name}`);
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Streaming error');
          }
        }

        // Display the complete response at once
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: responseContent,
          },
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Error sending message:', error);

        // Fallback to non-streaming API
        try {
          const response = await apiSendMessage(currentAgent.id, content);
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
      }
    } else {
      // Demo mode - find matching example response
      const agentConversations = getConversationsByAgent(currentAgent.id);
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
            content: `Olá! Sou o ${currentAgent.nome}. Esta é uma demonstração. Ative o "Live Mode" para interagir com a IA real, ou use uma das conversas de exemplo no histórico.`,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }, 500);
      }
    }
  }, [currentAgent, isLiveMode]);

  const toggleLiveMode = useCallback(() => {
    setIsLiveMode((prev) => !prev);
  }, []);

  const loadConversation = useCallback((conversation: Conversation) => {
    setMessages(conversation.mensagens);
  }, []);

  return {
    messages,
    isLoading,
    isLiveMode,
    isApiAvailable,
    currentAgent,
    conversations,
    openChat,
    closeChat,
    sendMessage,
    toggleLiveMode,
    loadConversation,
    clearHistory,
  };
};

export default useChat;
