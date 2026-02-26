"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type SunburstNode = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  parentId: string | null;
  effectiveLocation: string | null;
  totalFte: number;
  fteAtPreferred: number;
  fteAtNonPreferred: number;
};

type SunburstChartProps = {
  nodes: SunburstNode[];
};

function getAlignmentColor(node: SunburstNode): string {
  if (node.totalFte === 0) return "#e5e7eb";
  const alignedRatio = node.fteAtPreferred / node.totalFte;
  if (alignedRatio >= 0.8) return "#22c55e"; // mostly aligned
  if (alignedRatio >= 0.5) return "#f59e0b"; // partially
  return "#ef4444"; // mostly misaligned
}

export function SunburstChart({ nodes }: SunburstChartProps) {
  const level1 = nodes
    .filter((n) => n.level === 1 && n.totalFte > 0)
    .sort((a, b) => b.totalFte - a.totalFte);

  const level2 = nodes
    .filter((n) => n.level === 2 && n.totalFte > 0)
    .sort((a, b) => b.totalFte - a.totalFte);

  if (level1.length === 0) {
    return <p className="text-sm text-gray-400">No data for sunburst chart.</p>;
  }

  const innerData = level1.map((n) => ({
    name: n.nodeCode,
    fullName: n.nodeName,
    value: Math.round(n.totalFte * 100) / 100,
    color: getAlignmentColor(n),
  }));

  const outerData = level2.map((n) => ({
    name: n.nodeCode,
    fullName: n.nodeName,
    value: Math.round(n.totalFte * 100) / 100,
    color: getAlignmentColor(n),
  }));

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">FTE Allocation Sunburst</h3>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500" /> Aligned
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-yellow-500" /> Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500" /> Misaligned
        </span>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          {/* Inner ring: Level 1 categories */}
          <Pie
            data={innerData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={1}
          >
            {innerData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          {/* Outer ring: Level 2 process groups */}
          {outerData.length > 0 && (
            <Pie
              data={outerData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={125}
              outerRadius={180}
              paddingAngle={0.5}
            >
              {outerData.map((entry, index) => (
                <Cell key={index} fill={entry.color} opacity={0.7} />
              ))}
            </Pie>
          )}
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]?.payload) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded border bg-white p-2 text-xs shadow">
                  <p className="font-medium">{d.fullName}</p>
                  <p>{d.value} FTE</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
