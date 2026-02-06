import { useState, useCallback, useEffect } from 'react';
import { Interaction, PhaseId, ChatMessage } from '@/types';

const STORAGE_KEY = 'agent-factory-interactions';

function loadFromStorage(): Interaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(interactions: Interaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(interactions));
}

export interface UseInteractionHistoryReturn {
  interactions: Interaction[];
  getByPhase: (phaseId: PhaseId) => Interaction[];
  save: (interaction: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>) => Interaction;
  update: (id: string, messages: ChatMessage[], title?: string) => void;
  remove: (id: string) => void;
  getById: (id: string) => Interaction | undefined;
}

export const useInteractionHistory = (): UseInteractionHistoryReturn => {
  const [interactions, setInteractions] = useState<Interaction[]>(loadFromStorage);

  // Persist whenever interactions change
  useEffect(() => {
    saveToStorage(interactions);
  }, [interactions]);

  const getByPhase = useCallback(
    (phaseId: PhaseId) =>
      interactions
        .filter((i) => i.phaseId === phaseId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [interactions]
  );

  const save = useCallback(
    (data: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>): Interaction => {
      const now = new Date().toISOString();
      const interaction: Interaction = {
        ...data,
        id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      setInteractions((prev) => [interaction, ...prev]);
      return interaction;
    },
    []
  );

  const update = useCallback(
    (id: string, messages: ChatMessage[], title?: string) => {
      setInteractions((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                messages,
                ...(title ? { title } : {}),
                updatedAt: new Date().toISOString(),
              }
            : i
        )
      );
    },
    []
  );

  const remove = useCallback((id: string) => {
    setInteractions((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const getById = useCallback(
    (id: string) => interactions.find((i) => i.id === id),
    [interactions]
  );

  return { interactions, getByPhase, save, update, remove, getById };
};

export default useInteractionHistory;
