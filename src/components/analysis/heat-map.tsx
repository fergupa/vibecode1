"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type AnalysisNode = {
  nodeCode: string;
  nodeName: string;
  level: number;
  effectiveLocation: string | null;
  locationBreakdown: { location: string; fte: number; cost: number }[];
};

type HeatMapProps = {
  nodes: AnalysisNode[];
  maxLevel?: number;
};

export function HeatMap({ nodes, maxLevel = 3 }: HeatMapProps) {
  // Filter to relevant levels and nodes with data
  const filtered = nodes.filter(
    (n) => n.level <= maxLevel && n.locationBreakdown.length > 0
  );

  // Get all unique locations
  const locations = [
    ...new Set(filtered.flatMap((n) => n.locationBreakdown.map((l) => l.location))),
  ].sort();

  // Build scatter data: x = location index, y = node index, z = FTE
  const data: { x: number; y: number; z: number; name: string; location: string; isNonPreferred: boolean }[] = [];
  const maxFte = Math.max(
    ...filtered.flatMap((n) => n.locationBreakdown.map((l) => l.fte)),
    0.01
  );

  filtered.forEach((node, yi) => {
    for (const lb of node.locationBreakdown) {
      const xi = locations.indexOf(lb.location);
      const isNonPreferred =
        !!node.effectiveLocation && lb.location !== node.effectiveLocation;
      data.push({
        x: xi,
        y: yi,
        z: lb.fte,
        name: node.nodeName,
        location: lb.location,
        isNonPreferred,
      });
    }
  });

  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No data for heat map.</p>;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">FTE Heat Map by Location</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, filtered.length * 30)}>
        <ScatterChart margin={{ left: 150, right: 20, top: 10, bottom: 30 }}>
          <XAxis
            type="number"
            dataKey="x"
            domain={[-0.5, locations.length - 0.5]}
            ticks={locations.map((_, i) => i)}
            tickFormatter={(i) => locations[i] || ""}
            interval={0}
            fontSize={11}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[-0.5, filtered.length - 0.5]}
            ticks={filtered.map((_, i) => i)}
            tickFormatter={(i) => {
              const n = filtered[i];
              return n ? `${n.nodeCode} ${n.nodeName}`.slice(0, 25) : "";
            }}
            interval={0}
            fontSize={10}
            width={140}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]?.payload) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded border bg-white p-2 text-xs shadow">
                  <p className="font-medium">{d.name}</p>
                  <p>{d.location}: {d.z.toFixed(2)} FTE</p>
                  {d.isNonPreferred && (
                    <p className="text-red-600">Non-preferred location</p>
                  )}
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isNonPreferred ? "#ef4444" : "#3b82f6"}
                opacity={Math.max(0.2, Math.min(1, entry.z / maxFte))}
                r={Math.max(4, Math.min(16, (entry.z / maxFte) * 16))}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
