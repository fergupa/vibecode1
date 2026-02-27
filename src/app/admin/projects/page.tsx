"use client";

import { useProject } from "@/lib/project-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectSetupWizard } from "@/components/project-setup-wizard";

export default function ProjectsPage() {
  const { projects, selectedProject, selectProject, refreshProjects, loading } =
    useProject();

  if (loading) {
    return <p className="text-gray-500">Loading projects...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-gray-600">
            {selectedProject
              ? `Working on: ${selectedProject.name}`
              : "Select or create a project to get started."}
          </p>
        </div>
        <ProjectSetupWizard onComplete={async () => { await refreshProjects(); }} />
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">
          No projects yet. Click &quot;New Project&quot; to create one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selectedProject?.id === project.id
                  ? "ring-2 ring-blue-500"
                  : ""
              }`}
              onClick={() => selectProject(project)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{project._count.taxonomyNodes} activities</span>
                  <span>{project._count.employees} employees</span>
                  <span>{project._count.surveyCampaigns} surveys</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
