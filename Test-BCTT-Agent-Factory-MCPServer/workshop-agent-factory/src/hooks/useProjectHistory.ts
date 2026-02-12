import { useState, useCallback, useEffect } from 'react';
import { Project, AgentIteration, PhaseId } from '@/types';

const STORAGE_KEY = 'agent-factory-projects';

export const PHASE1_AGENTS = ['ba', 'fa', 'da', 'dsla', 'pa'] as const;
export const PHASE2_AGENTS = ['taa', 'fde', 'bde', 'ute', 'fbs', 'bbs'] as const;

export function getPipelineAgents(phaseId?: PhaseId): readonly string[] {
  if (phaseId === 'desenvolvimento') return PHASE2_AGENTS;
  return PHASE1_AGENTS;
}

function createEmptyAgents(phaseId?: PhaseId): Record<string, AgentIteration> {
  const agents: Record<string, AgentIteration> = {};
  const pipeline = getPipelineAgents(phaseId);
  for (const agentId of pipeline) {
    agents[agentId] = {
      agentId,
      status: 'not_started',
      messages: [],
    };
  }
  return agents;
}

function migrateProject(project: Project): Project {
  // Projects without phaseId are Phase 1 (created before Batch 4)
  if (!project.phaseId) {
    return { ...project, phaseId: 'concepcao' };
  }
  return project;
}

function loadFromStorage(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const projects: Project[] = raw ? JSON.parse(raw) : [];
    return projects.map(migrateProject);
  } catch {
    return [];
  }
}

function saveToStorage(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export interface UseProjectHistoryReturn {
  projects: Project[];
  activeProject: Project | null;
  createProject: (title: string, phaseId?: PhaseId) => Project;
  updateAgentIteration: (
    projectId: string,
    agentId: string,
    data: Partial<AgentIteration>,
  ) => void;
  updateProject: (
    projectId: string,
    data: Partial<Pick<Project, 'title' | 'bdevCode' | 'mvp'>>,
  ) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
}

export const useProjectHistory = (): UseProjectHistoryReturn => {
  const [projects, setProjects] = useState<Project[]>(loadFromStorage);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Persist whenever projects change
  useEffect(() => {
    saveToStorage(projects);
  }, [projects]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? null;

  const createProject = useCallback((title: string, phaseId: PhaseId = 'concepcao'): Project => {
    const now = new Date().toISOString();
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      phaseId,
      createdAt: now,
      updatedAt: now,
      agents: createEmptyAgents(phaseId),
    };
    setProjects((prev) => [project, ...prev]);
    setActiveProjectId(project.id);
    return project;
  }, []);

  const updateAgentIteration = useCallback(
    (
      projectId: string,
      agentId: string,
      data: Partial<AgentIteration>,
    ) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const existing = p.agents[agentId] || {
            agentId,
            status: 'not_started',
            messages: [],
          };
          return {
            ...p,
            updatedAt: new Date().toISOString(),
            agents: {
              ...p.agents,
              [agentId]: { ...existing, ...data },
            },
          };
        }),
      );
    },
    [],
  );

  const updateProject = useCallback(
    (
      projectId: string,
      data: Partial<Pick<Project, 'title' | 'bdevCode' | 'mvp'>>,
    ) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, ...data, updatedAt: new Date().toISOString() }
            : p,
        ),
      );
    },
    [],
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveProjectId((prev) => (prev === id ? null : prev));
  }, []);

  const setActiveProject = useCallback((id: string | null) => {
    setActiveProjectId(id);
  }, []);

  return {
    projects,
    activeProject,
    createProject,
    updateAgentIteration,
    updateProject,
    deleteProject,
    setActiveProject,
  };
};

export default useProjectHistory;
