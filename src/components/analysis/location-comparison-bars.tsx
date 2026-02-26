"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type LocationComparisonProps = {
  nodes: {
    nodeCode: string;
    nodeName: string;
    level: number;
    effectiveLocation: string | null;
    locationBreakdown: { location: string; fte: number }[];
    totalFte: number;
  }[];
};

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export function LocationComparisonBars({ nodes }: LocationComparisonProps) {
  // Filter to level 1 nodes with data
  const level1 = nodes.filter((n) => n.level === 1 && n.totalFte > 0);

  // Get all unique locations
  const allLocations = [
    ...new Set(
      level1.flatMap((n) => n.locationBreakdown.map((l) => l.location))
    ),
  ].sort();

  // Build chart data
  const data = level1.map((node) => {
    const row: Record<string, string | number> = {
      name: node.nodeCode,
      fullName: node.nodeName,
    };
    for (const loc of allLocations) {
      const lb = node.locationBreakdown.find((l) => l.location === loc);
      row[loc] = lb ? Math.round(lb.fte * 100) / 100 : 0;
    }
    return row;
  });

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400">No location comparison data.</p>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">FTE Distribution by Location</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ left: 40, right: 20, top: 10, bottom: 40 }}
        >
          <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" />
          <YAxis
            label={{ value: "FTE", angle: -90, position: "insideLeft" }}
            fontSize={11}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const item = data.find((d) => d.name === label);
              return (
                <div className="rounded border bg-white p-2 text-xs shadow">
                  <p className="font-medium">
                    {item?.fullName || label}
                  </p>
                  {payload.map((p) => (
                    <p key={p.dataKey as string} style={{ color: p.color }}>
                      {p.dataKey}: {(p.value as number).toFixed(2)} FTE
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend />
          {allLocations.map((loc, i) => (
            <Bar
              key={loc}
              dataKey={loc}
              stackId="a"
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
