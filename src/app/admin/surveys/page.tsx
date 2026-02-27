"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useProject } from "@/lib/project-context";
import { CampaignCreateDialog } from "@/components/campaign-create-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Campaign = {
  id: string;
  name: string;
  status: "Draft" | "Active" | "Closed";
  mode: "Individual" | "RoleBased";
  taxonomyLevel: number;
  createdAt: string;
  responseRate: number;
  completedCount: number;
  totalAssignments: number;
  _count: { assignments: number };
};

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800",
  Active: "bg-blue-100 text-blue-800",
  Closed: "bg-green-100 text-green-800",
};

export default function SurveysPage() {
  const { selectedProject } = useProject();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const res = await fetch(
      `/api/projects/${selectedProject.id}/campaigns`
    );
    if (res.ok) {
      setCampaigns(await res.json());
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  if (!selectedProject) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Surveys</h1>
        <p className="mt-2 text-gray-500">
          Select a project from the Projects page first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Survey Campaigns</h1>
          <p className="text-sm text-gray-500">{selectedProject.name}</p>
        </div>
        <CampaignCreateDialog
          projectId={selectedProject.id}
          onCreated={loadCampaigns}
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-gray-500">
          No campaigns yet. Click &quot;Create Campaign&quot; to start.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/admin/surveys/${c.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={statusColors[c.status] || ""}
                    >
                      {c.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Mode: {c.mode}</span>
                      <span>Level {c.taxonomyLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{c.totalAssignments} assignments</span>
                      <span>{c.responseRate}% response rate</span>
                    </div>
                    {c.totalAssignments > 0 && (
                      <div className="h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${c.responseRate}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
