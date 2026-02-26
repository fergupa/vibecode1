"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AnalysisNode = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  effectiveLocation: string | null;
  totalFte: number;
  fteAtNonPreferred: number;
  costAtNonPreferred: number;
  savings: number;
  locationBreakdown: { location: string; fte: number; cost: number }[];
};

type SummaryTableProps = {
  nodes: AnalysisNode[];
  filterLevel?: number;
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function SummaryTable({ nodes, filterLevel }: SummaryTableProps) {
  const [sortKey, setSortKey] = useState<string>("savings");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = nodes.filter(
    (n) =>
      (filterLevel ? n.level === filterLevel : n.level <= 3) &&
      n.totalFte > 0
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortKey] as number;
    const bVal = (b as Record<string, unknown>)[sortKey] as number;
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIndicator = (key: string) =>
    sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Location Mix</TableHead>
            <TableHead>Preferred</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("fteAtNonPreferred")}
            >
              FTE Gap{sortIndicator("fteAtNonPreferred")}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("costAtNonPreferred")}
            >
              Cost Gap{sortIndicator("costAtNonPreferred")}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("savings")}
            >
              Savings{sortIndicator("savings")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500">
                No analysis data available.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((node) => (
              <TableRow key={node.nodeId}>
                <TableCell className="font-mono text-xs text-gray-400">
                  {node.nodeCode}
                </TableCell>
                <TableCell className="font-medium">{node.nodeName}</TableCell>
                <TableCell>
                  <div className="flex h-4 w-24 overflow-hidden rounded">
                    {node.locationBreakdown.map((lb, i) => {
                      const pct =
                        node.totalFte > 0
                          ? (lb.fte / node.totalFte) * 100
                          : 0;
                      const colors = [
                        "#3b82f6",
                        "#22c55e",
                        "#f59e0b",
                        "#ef4444",
                        "#8b5cf6",
                      ];
                      return (
                        <div
                          key={i}
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: colors[i % colors.length],
                          }}
                          title={`${lb.location}: ${lb.fte.toFixed(1)} FTE`}
                        />
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {node.effectiveLocation || "—"}
                </TableCell>
                <TableCell>{node.fteAtNonPreferred.toFixed(1)}</TableCell>
                <TableCell>{formatCurrency(node.costAtNonPreferred)}</TableCell>
                <TableCell className="font-medium text-green-700">
                  {node.savings > 0 ? formatCurrency(node.savings) : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
