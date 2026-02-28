"use client";

import { useRouter } from "next/navigation";
import { useProject } from "@/lib/project-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClosedProjectsPage() {
  const router = useRouter();
  const { projects, selectedProject, selectProject, refreshProjects, loading } =
    useProject();

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
      <h1 className="text-2xl font-bold">Closed Projects</h1>

      {closedProjects.length === 0 ? (
        <p className="text-gray-500">No closed projects.</p>
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
              <TableHead>Closed Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closedProjects.map((project) => {
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
                  <TableCell className="text-gray-500">
                    {project.closedAt
                      ? new Date(project.closedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleReopenProject(e, project.id)}
                    >
                      Reopen
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
