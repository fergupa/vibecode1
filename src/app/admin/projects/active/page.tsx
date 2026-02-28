"use client";

import { useRouter } from "next/navigation";
import { useProject } from "@/lib/project-context";
import { ProjectSetupWizard } from "@/components/project-setup-wizard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  function handleNavigate(
    e: React.MouseEvent,
    project: (typeof projects)[0],
    path: string
  ) {
    e.stopPropagation();
    selectProject(project);
    router.push(path);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>% Submitted</TableHead>
              <TableHead>Taxonomy</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProjects.map((project) => {
              const pct =
                project.campaignStats.totalAssignments > 0
                  ? Math.round(
                      (project.campaignStats.completedAssignments /
                        project.campaignStats.totalAssignments) *
                        100
                    )
                  : null;

              const statusParts: string[] = [];
              if (project.campaignStats.active > 0)
                statusParts.push(`${project.campaignStats.active} active`);
              if (project.campaignStats.draft > 0)
                statusParts.push(`${project.campaignStats.draft} draft`);
              if (project.campaignStats.closed > 0)
                statusParts.push(`${project.campaignStats.closed} closed`);

              return (
                <TableRow
                  key={project.id}
                  className={
                    selectedProject?.id === project.id ? "bg-blue-50" : ""
                  }
                >
                  <TableCell>
                    <button
                      className="font-medium text-blue-600 hover:underline"
                      onClick={(e) => handleNavigate(e, project, "/admin")}
                    >
                      {project.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {statusParts.length > 0
                      ? statusParts.join(", ")
                      : "No campaigns"}
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={(e) =>
                        handleNavigate(e, project, "/admin/employees")
                      }
                    >
                      {project._count.employees}
                    </button>
                  </TableCell>
                  <TableCell>
                    {project.campaignStats.totalAssignments > 0
                      ? `${project.campaignStats.completedAssignments}/${project.campaignStats.totalAssignments}`
                      : "—"}
                  </TableCell>
                  <TableCell>{pct !== null ? `${pct}%` : "—"}</TableCell>
                  <TableCell>
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={(e) =>
                        handleNavigate(e, project, "/admin/taxonomy")
                      }
                    >
                      {project._count.taxonomyNodes}
                      {project._count.taxonomyNodes > 200 ? " APQC" : " nodes"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleCloseProject(e, project.id)}
                    >
                      Close Project
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
