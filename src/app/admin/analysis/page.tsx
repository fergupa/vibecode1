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

export default function AnalysisPage() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const loadAnalysis = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const res = await fetch(
      `/api/projects/${selectedProject.id}/analysis`
    );
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (!selectedProject) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analysis</h1>
        <p className="mt-2 text-gray-500">
          Select a project from the Dashboard first.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-gray-500">Running analysis...</p>;
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analysis</h1>
        <p className="mt-2 text-gray-500">
          Need completed survey responses to generate analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analysis</h1>
          <p className="text-sm text-gray-500">{selectedProject.name}</p>
        </div>
        <ExportButtons projectId={selectedProject.id} />
      </div>

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
    </div>
  );
}
