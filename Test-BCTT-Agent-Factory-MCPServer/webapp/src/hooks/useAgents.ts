import { useState, useMemo, useCallback } from 'react';
import { PhaseId } from '@/types';
import { phases, getAgentsByPhase } from '@/data/agents';

export const useAgents = () => {
  const [activePhaseId, setActivePhaseId] = useState<PhaseId>('concepcao');

  const activePhase = useMemo(() => {
    return phases.find((p) => p.id === activePhaseId) || phases[0];
  }, [activePhaseId]);

  const activeAgents = useMemo(() => {
    return getAgentsByPhase(activePhaseId);
  }, [activePhaseId]);

  const changePhase = useCallback((phaseId: string) => {
    setActivePhaseId(phaseId as PhaseId);
  }, []);

  return {
    phases,
    activePhase,
    activePhaseId,
    activeAgents,
    changePhase,
  };
};

export default useAgents;
