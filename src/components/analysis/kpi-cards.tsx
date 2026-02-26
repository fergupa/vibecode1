"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardsProps = {
  totalCurrentCost: number;
  totalFutureCost: number;
  totalSavings: number;
  fteAffected: number;
  responseRate: number;
  totalFte: number;
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function KpiCards({
  totalCurrentCost,
  totalFutureCost,
  totalSavings,
  fteAffected,
  responseRate,
  totalFte,
}: KpiCardsProps) {
  const cards = [
    {
      title: "Current Cost",
      value: formatCurrency(totalCurrentCost),
      description: "Cost at non-preferred locations",
    },
    {
      title: "Future Cost",
      value: formatCurrency(totalFutureCost),
      description: "Projected shared services cost",
    },
    {
      title: "Potential Savings",
      value: formatCurrency(totalSavings),
      description: `${fteAffected.toFixed(1)} FTEs affected`,
      highlight: true,
    },
    {
      title: "Total FTEs",
      value: totalFte.toFixed(1),
      description: `${responseRate}% response rate`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.highlight ? "border-green-200 bg-green-50" : ""}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${card.highlight ? "text-green-700" : ""}`}>
              {card.value}
            </p>
            <p className="text-xs text-gray-500">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
