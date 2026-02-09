import { useState, useCallback, useEffect } from 'react';
import { Project, AgentIteration } from '@/types';

const STORAGE_KEY = 'agent-factory-projects';

const PIPELINE_AGENTS = ['ba', 'fa', 'da', 'pa', 'dsla'] as const;

function createEmptyAgents(): Record<string, AgentIteration> {
  const agents: Record<string, AgentIteration> = {};
  for (const agentId of PIPELINE_AGENTS) {
    agents[agentId] = {
      agentId,
      status: 'not_started',
      messages: [],
    };
  }
  return agents;
}

function loadFromStorage(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  createProject: (title: string) => Project;
  updateAgentIteration: (
    projectId: string,
    agentId: string,
    data: Partial<AgentIteration>,
  ) => void;
  updateProject: (
    projectId: string,
    data: Partial<Pick<Project, 'title' | 'bdevCode'>>,
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

  const createProject = useCallback((title: string): Project => {
    const now = new Date().toISOString();
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      createdAt: now,
      updatedAt: now,
      agents: createEmptyAgents(),
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
      data: Partial<Pick<Project, 'title' | 'bdevCode'>>,
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
