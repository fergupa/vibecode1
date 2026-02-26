"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  sharedServicesSalary: number | null;
  createdAt: string;
  _count: { taxonomyNodes: number; employees: number; surveyCampaigns: number };
};

type ProjectContextType = {
  projects: Project[];
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectProject: setSelectedProject,
        refreshProjects,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
