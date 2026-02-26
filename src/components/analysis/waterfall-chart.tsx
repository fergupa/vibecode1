"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

type WaterfallChartProps = {
  nodes: {
    nodeCode: string;
    nodeName: string;
    level: number;
    savings: number;
  }[];
  totalCurrentCost: number;
  totalFutureCost: number;
};

export function WaterfallChart({
  nodes,
  totalCurrentCost,
  totalFutureCost,
}: WaterfallChartProps) {
  // Get level 1 nodes with savings, sorted by savings desc
  const level1 = nodes
    .filter((n) => n.level === 1 && n.savings > 0)
    .sort((a, b) => b.savings - a.savings);

  // Build waterfall data
  const data: { name: string; base: number; value: number; fill: string }[] = [];
  let running = totalCurrentCost;

  data.push({
    name: "Current Cost",
    base: 0,
    value: totalCurrentCost,
    fill: "#3b82f6",
  });

  for (const node of level1) {
    running -= node.savings;
    data.push({
      name: node.nodeCode,
      base: running,
      value: node.savings,
      fill: "#22c55e",
    });
  }

  data.push({
    name: "Future Cost",
    base: 0,
    value: totalFutureCost,
    fill: "#6366f1",
  });

  if (data.length <= 2) {
    return <p className="text-sm text-gray-400">No savings data for waterfall chart.</p>;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">Cost Savings Waterfall</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ left: 60, right: 20, top: 10, bottom: 40 }}>
          <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" />
          <YAxis
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `$${(v / 1_000_000).toFixed(1)}M`
                : `$${(v / 1_000).toFixed(0)}K`
            }
            fontSize={11}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Amount"]}
          />
          <ReferenceLine y={0} stroke="#666" />
          {/* Invisible base bar */}
          <Bar dataKey="base" stackId="a" fill="transparent" />
          <Bar dataKey="value" stackId="a">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
