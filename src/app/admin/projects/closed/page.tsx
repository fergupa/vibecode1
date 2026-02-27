"use client";

import { useProject } from "@/lib/project-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClosedProjectsPage() {
  const { projects, refreshProjects, loading } = useProject();

  const closedProjects = projects.filter((p) => p.closedAt);

  async function handleReopenProject(
    e: React.MouseEvent,
    projectId: string
  ) {
    e.stopPropagation();
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closedAt: null }),
    });
    await refreshProjects();
  }

  if (loading) {
    return <p className="text-gray-500">Loading projects...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Closed Projects</h1>

      {closedProjects.length === 0 ? (
        <p className="text-gray-500">No closed projects.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {closedProjects.map((project) => (
            <Card key={project.id}>
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
                      {project.campaignStats.total} campaign{project.campaignStats.total !== 1 ? "s" : ""}
                      {project.campaignStats.totalAssignments > 0 && (
                        <span className="ml-2">
                          {project.campaignStats.completedAssignments}/
                          {project.campaignStats.totalAssignments} responses
                        </span>
                      )}
                    </div>
                  )}
                  {project.closedAt && (
                    <div className="text-xs text-gray-400">
                      Closed {new Date(project.closedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleReopenProject(e, project.id)}
                  >
                    Reopen
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
