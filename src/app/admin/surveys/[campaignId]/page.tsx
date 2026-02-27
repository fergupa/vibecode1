"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/lib/project-context";
import { AssignmentTable } from "@/components/assignment-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Assignment = {
  id: string;
  token: string;
  status: "Pending" | "InProgress" | "Completed";
  roleName: string | null;
  headcount: number;
  employee: { name: string; email: string | null } | null;
};

type Campaign = {
  id: string;
  name: string;
  status: "Draft" | "Active" | "Closed";
  mode: "Individual" | "RoleBased";
  taxonomyLevel: number;
  createdAt: string;
  assignments: Assignment[];
};

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800",
  Active: "bg-blue-100 text-blue-800",
  Closed: "bg-green-100 text-green-800",
};

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { selectedProject } = useProject();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCampaign = useCallback(async () => {
    if (!selectedProject || !campaignId) return;
    const res = await fetch(
      `/api/projects/${selectedProject.id}/campaigns/${campaignId}`
    );
    if (res.ok) {
      setCampaign(await res.json());
    }
    setLoading(false);
  }, [selectedProject, campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  async function handleGenerateAssignments() {
    if (!selectedProject || !campaignId) return;
    setActionLoading(true);
    await fetch(
      `/api/projects/${selectedProject.id}/campaigns/${campaignId}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await loadCampaign();
    setActionLoading(false);
  }

  async function handleStatusChange(status: string) {
    if (!selectedProject || !campaignId) return;
    setActionLoading(true);
    await fetch(
      `/api/projects/${selectedProject.id}/campaigns/${campaignId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    await loadCampaign();
    setActionLoading(false);
  }

  async function handleExportLinks() {
    if (!selectedProject || !campaignId) return;
    const res = await fetch(
      `/api/projects/${selectedProject.id}/campaigns/${campaignId}/export-links`
    );
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-links-${campaignId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (!selectedProject) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Campaign</h1>
        <p className="mt-2 text-gray-500">Select a project from the Projects page first.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-gray-500">Loading campaign...</p>;
  }

  if (!campaign) {
    return <p className="text-red-600">Campaign not found.</p>;
  }

  const completed = campaign.assignments.filter(
    (a) => a.status === "Completed"
  ).length;
  const total = campaign.assignments.length;
  const responseRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <Badge
              variant="outline"
              className={statusColors[campaign.status] || ""}
            >
              {campaign.status}
            </Badge>
            <span>{campaign.mode} mode</span>
            <span>Level {campaign.taxonomyLevel}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "Draft" && total === 0 && (
            <Button
              onClick={handleGenerateAssignments}
              disabled={actionLoading}
            >
              Generate Assignments
            </Button>
          )}
          {campaign.status === "Draft" && total > 0 && (
            <Button
              onClick={() => handleStatusChange("Active")}
              disabled={actionLoading}
            >
              Activate Campaign
            </Button>
          )}
          {campaign.status === "Active" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("Closed")}
              disabled={actionLoading}
            >
              Close Campaign
            </Button>
          )}
          {total > 0 && (
            <Button variant="outline" onClick={handleExportLinks}>
              Export Links CSV
            </Button>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>
              Response Rate: {completed}/{total} ({responseRate}%)
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-green-500 transition-all"
              style={{ width: `${responseRate}%` }}
            />
          </div>
        </div>
      )}

      <AssignmentTable assignments={campaign.assignments} />
    </div>
  );
}
