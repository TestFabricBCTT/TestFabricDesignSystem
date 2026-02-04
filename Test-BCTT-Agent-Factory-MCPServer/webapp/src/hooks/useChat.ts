import { useState, useCallback } from 'react';
import { Agent, ChatMessage, Conversation } from '@/types';
import { getConversationsByAgent } from '@/data/conversations';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isLiveMode: boolean;
  currentAgent: Agent | null;
  conversations: Conversation[];
  openChat: (agent: Agent) => void;
  closeChat: () => void;
  sendMessage: (content: string) => void;
  toggleLiveMode: () => void;
  loadConversation: (conversation: Conversation) => void;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

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

  const sendMessage = useCallback(async (content: string) => {
    if (!currentAgent) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    if (isLiveMode) {
      setIsLoading(true);

      // Simulate API call - will be replaced with actual Claude API
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: `[${currentAgent.id.toUpperCase()}] Esta é uma resposta simulada. Para respostas reais, configure a API key do Claude no ficheiro .env`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } else {
      // Demo mode - find matching example response
      const agentConversations = getConversationsByAgent(currentAgent.id);
      let foundResponse = false;

      for (const conv of agentConversations) {
        for (let i = 0; i < conv.messages.length - 1; i++) {
          const msg = conv.messages[i];
          if (
            msg.role === 'user' &&
            msg.content.toLowerCase().includes(content.toLowerCase().substring(0, 20))
          ) {
            const nextMsg = conv.messages[i + 1];
            if (nextMsg && nextMsg.role === 'assistant') {
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  { ...nextMsg, timestamp: new Date().toISOString() },
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
            content: `Olá! Sou o ${currentAgent.name}. Esta é uma demonstração. Ative o "Live Mode" para interagir com a IA real, ou use uma das conversas de exemplo no histórico.`,
            timestamp: new Date().toISOString(),
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
    setMessages(conversation.messages);
  }, []);

  return {
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
  };
};

export default useChat;
