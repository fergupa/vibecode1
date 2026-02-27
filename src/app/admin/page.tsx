"use client";

import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/lib/project-context";
import { KpiCards } from "@/components/analysis/kpi-cards";
import { HeatMap } from "@/components/analysis/heat-map";
import { SunburstChart } from "@/components/analysis/sunburst-chart";
import { WaterfallChart } from "@/components/analysis/waterfall-chart";
import { LocationComparisonBars } from "@/components/analysis/location-comparison-bars";
import { SummaryTable } from "@/components/analysis/summary-table";
import { ExportButtons } from "@/components/analysis/export-buttons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LocationBreakdown = {
  location: string;
  fte: number;
  cost: number;
};

type AnalysisNode = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  parentId: string | null;
  effectiveLocation: string | null;
  totalFte: number;
  totalCost: number;
  fteAtPreferred: number;
  fteAtNonPreferred: number;
  costAtPreferred: number;
  costAtNonPreferred: number;
  currentCost: number;
  futureCost: number;
  savings: number;
  fteAffected: number;
  locationBreakdown: LocationBreakdown[];
};

type AnalysisTotals = {
  totalFte: number;
  totalCurrentCost: number;
  totalFutureCost: number;
  totalSavings: number;
  fteAffected: number;
  responseRate: number;
  locationBreakdown: LocationBreakdown[];
};

type AnalysisData = {
  totals: AnalysisTotals;
  nodes: AnalysisNode[];
};

type TabId = "overview" | "heatmap" | "sunburst" | "waterfall" | "comparison" | "detail";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "heatmap", label: "Heat Map" },
  { id: "sunburst", label: "Sunburst" },
  { id: "waterfall", label: "Waterfall" },
  { id: "comparison", label: "Comparison" },
  { id: "detail", label: "Detail Table" },
];

export default function HomePage() {
  const { projects, selectedProject, selectProject } = useProject();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const loadAnalysis = useCallback(async () => {
    if (!selectedProject) {
      setData(null);
      return;
    }
    setLoading(true);
    const res = await fetch(
      `/api/projects/${selectedProject.id}/analysis`
    );
    if (res.ok) {
      setData(await res.json());
    } else {
      setData(null);
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (project) selectProject(project);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Analysis</h1>
          <Select
            value={selectedProject?.id || ""}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProject && data && (
          <ExportButtons projectId={selectedProject.id} />
        )}
      </div>

      {!selectedProject && (
        <p className="text-gray-500">
          Select a project from the dropdown above to view analysis.
        </p>
      )}

      {selectedProject && loading && (
        <p className="text-gray-500">Running analysis...</p>
      )}

      {selectedProject && !loading && !data && (
        <p className="text-gray-500">
          Need completed survey responses to generate analysis.
        </p>
      )}

      {selectedProject && data && (
        <>
          {/* Tab navigation */}
          <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <KpiCards
                totalCurrentCost={data.totals.totalCurrentCost}
                totalFutureCost={data.totals.totalFutureCost}
                totalSavings={data.totals.totalSavings}
                fteAffected={data.totals.fteAffected}
                responseRate={data.totals.responseRate}
                totalFte={data.totals.totalFte}
              />
              <SummaryTable nodes={data.nodes} filterLevel={1} />
            </div>
          )}

          {activeTab === "heatmap" && <HeatMap nodes={data.nodes} />}

          {activeTab === "sunburst" && <SunburstChart nodes={data.nodes} />}

          {activeTab === "waterfall" && (
            <WaterfallChart
              nodes={data.nodes}
              totalCurrentCost={data.totals.totalCurrentCost}
              totalFutureCost={data.totals.totalFutureCost}
            />
          )}

          {activeTab === "comparison" && (
            <LocationComparisonBars nodes={data.nodes} />
          )}

          {activeTab === "detail" && <SummaryTable nodes={data.nodes} />}
        </>
      )}
    </div>
  );
}
