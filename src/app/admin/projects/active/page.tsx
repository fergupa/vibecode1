"use client";

import { useRouter } from "next/navigation";
import { useProject } from "@/lib/project-context";
import { ProjectSetupWizard } from "@/components/project-setup-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ActiveProjectsPage() {
  const router = useRouter();
  const { projects, selectedProject, selectProject, refreshProjects, loading } =
    useProject();

  const activeProjects = projects.filter((p) => !p.closedAt);

  async function handleCloseProject(
    e: React.MouseEvent,
    projectId: string
  ) {
    e.stopPropagation();
    if (!confirm("Close this project? It will move to Closed Projects.")) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closedAt: new Date().toISOString() }),
    });
    await refreshProjects();
  }

  function handleSelectProject(project: typeof projects[0]) {
    selectProject(project);
    router.push("/admin");
  }

  if (loading) {
    return <p className="text-gray-500">Loading projects...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Active Projects</h1>
        <ProjectSetupWizard
          onComplete={async () => {
            await refreshProjects();
          }}
        />
      </div>

      {activeProjects.length === 0 ? (
        <p className="text-gray-500">
          No active projects. Click &quot;New Project&quot; to create one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selectedProject?.id === project.id
                  ? "ring-2 ring-blue-500"
                  : ""
              }`}
              onClick={() => handleSelectProject(project)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex gap-4">
                    <span>
                      {project._count.taxonomyNodes > 200
                        ? `${project._count.taxonomyNodes} APQC nodes`
                        : `${project._count.taxonomyNodes} taxonomy nodes`}
                    </span>
                    <span>{project._count.employees} employees</span>
                  </div>
                  {project.campaignStats.total > 0 && (
                    <div>
                      {project.campaignStats.active > 0 && (
                        <span>
                          {project.campaignStats.active} active campaign{project.campaignStats.active !== 1 ? "s" : ""}
                        </span>
                      )}
                      {project.campaignStats.totalAssignments > 0 && (
                        <span className="ml-2">
                          {project.campaignStats.completedAssignments}/
                          {project.campaignStats.totalAssignments} responses
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleCloseProject(e, project.id)}
                  >
                    Close Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
