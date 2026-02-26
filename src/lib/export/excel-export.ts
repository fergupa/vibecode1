import * as XLSX from "xlsx";

type LocationBreakdown = {
  location: string;
  fte: number;
  cost: number;
};

type AnalysisNode = {
  nodeCode: string;
  nodeName: string;
  level: number;
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

type Totals = {
  totalFte: number;
  totalCurrentCost: number;
  totalFutureCost: number;
  totalSavings: number;
  fteAffected: number;
  responseRate: number;
};

export function buildExcelBuffer(
  projectName: string,
  totals: Totals,
  nodes: AnalysisNode[]
): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryData = [
    ["Activity Assessment Report"],
    ["Project", projectName],
    ["Generated", new Date().toISOString().split("T")[0]],
    [],
    ["Key Metrics"],
    ["Total FTEs Analyzed", totals.totalFte],
    ["Cost at Non-Preferred Locations", totals.totalCurrentCost],
    ["Projected Shared Services Cost", totals.totalFutureCost],
    ["Total Potential Savings", totals.totalSavings],
    ["FTEs Affected", totals.fteAffected],
    ["Response Rate", `${totals.responseRate}%`],
    [],
    ["Top Savings Opportunities"],
    ["Code", "Activity", "Savings", "FTE Affected"],
    ...nodes
      .filter((n) => n.savings > 0)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10)
      .map((n) => [n.nodeCode, n.nodeName, n.savings, n.fteAffected]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, "Executive Summary");

  // Sheet 2: Activity Detail
  const detailHeaders = [
    "Code",
    "Activity",
    "Level",
    "Preferred Location",
    "Total FTE",
    "FTE at Preferred",
    "FTE at Non-Preferred",
    "Cost at Preferred",
    "Cost at Non-Preferred",
    "Current Cost",
    "Future Cost",
    "Savings",
  ];
  const detailRows = nodes
    .filter((n) => n.totalFte > 0)
    .sort((a, b) => a.nodeCode.localeCompare(b.nodeCode))
    .map((n) => [
      n.nodeCode,
      n.nodeName,
      n.level,
      n.effectiveLocation || "",
      n.totalFte,
      n.fteAtPreferred,
      n.fteAtNonPreferred,
      n.costAtPreferred,
      n.costAtNonPreferred,
      n.currentCost,
      n.futureCost,
      n.savings,
    ]);
  const ws2 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  XLSX.utils.book_append_sheet(wb, ws2, "Activity Detail");

  // Sheet 3: Location Comparison
  const allLocations = [
    ...new Set(
      nodes.flatMap((n) => n.locationBreakdown.map((l) => l.location))
    ),
  ].sort();
  const locHeaders = ["Code", "Activity", ...allLocations.map((l) => `${l} FTE`), ...allLocations.map((l) => `${l} Cost`)];
  const locRows = nodes
    .filter((n) => n.locationBreakdown.length > 0)
    .sort((a, b) => a.nodeCode.localeCompare(b.nodeCode))
    .map((n) => {
      const fteByLoc = allLocations.map(
        (loc) => n.locationBreakdown.find((l) => l.location === loc)?.fte ?? 0
      );
      const costByLoc = allLocations.map(
        (loc) => n.locationBreakdown.find((l) => l.location === loc)?.cost ?? 0
      );
      return [n.nodeCode, n.nodeName, ...fteByLoc, ...costByLoc];
    });
  const ws3 = XLSX.utils.aoa_to_sheet([locHeaders, ...locRows]);
  XLSX.utils.book_append_sheet(wb, ws3, "Location Comparison");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}
