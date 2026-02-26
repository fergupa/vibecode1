import { describe, it, expect } from "vitest";
import { computeCostModel } from "@/lib/analysis/cost-model";
import type { ActivityAnalysis } from "@/lib/analysis/gap-analysis";

function makeAnalysis(overrides: Partial<ActivityAnalysis> = {}): ActivityAnalysis {
  return {
    nodeId: "n1",
    nodeCode: "1.0",
    nodeName: "Test Activity",
    level: 1,
    parentId: null,
    preferredLocation: "SharedServices",
    effectiveLocation: "SharedServices",
    currentLocationBreakdown: [],
    totalFte: 10,
    totalCost: 1_000_000,
    fteAtPreferred: 4,
    fteAtNonPreferred: 6,
    costAtPreferred: 400_000,
    costAtNonPreferred: 600_000,
    ...overrides,
  };
}

describe("computeCostModel", () => {
  it("computes savings when non-preferred cost exceeds shared services cost", () => {
    const analyses = [makeAnalysis()];
    const sharedServicesSalary = 75_000;
    const results = computeCostModel(analyses, sharedServicesSalary);

    expect(results).toHaveLength(1);
    const r = results[0];
    // Current cost at non-preferred = $600,000
    expect(r.currentCost).toBe(600_000);
    // Future cost = 6 FTE * $75,000 = $450,000
    expect(r.futureCost).toBe(450_000);
    // Savings = $600,000 - $450,000 = $150,000
    expect(r.savings).toBe(150_000);
    expect(r.fteAffected).toBe(6);
  });

  it("returns zero savings when shared services is more expensive", () => {
    const analyses = [
      makeAnalysis({
        fteAtNonPreferred: 2,
        costAtNonPreferred: 100_000, // $50K per FTE
      }),
    ];
    const sharedServicesSalary = 75_000; // $75K per FTE — more expensive
    const results = computeCostModel(analyses, sharedServicesSalary);

    expect(results[0].savings).toBe(0); // Math.max(0, ...) clips to 0
    expect(results[0].futureCost).toBe(150_000);
    expect(results[0].currentCost).toBe(100_000);
  });

  it("handles zero FTE at non-preferred locations", () => {
    const analyses = [
      makeAnalysis({
        fteAtNonPreferred: 0,
        costAtNonPreferred: 0,
      }),
    ];
    const results = computeCostModel(analyses, 75_000);
    expect(results[0].savings).toBe(0);
    expect(results[0].futureCost).toBe(0);
    expect(results[0].fteAffected).toBe(0);
  });

  it("processes multiple activities", () => {
    const analyses = [
      makeAnalysis({ nodeId: "n1", fteAtNonPreferred: 5, costAtNonPreferred: 500_000 }),
      makeAnalysis({ nodeId: "n2", fteAtNonPreferred: 3, costAtNonPreferred: 300_000 }),
    ];
    const results = computeCostModel(analyses, 75_000);
    expect(results).toHaveLength(2);

    // n1: savings = 500K - (5*75K) = 500K - 375K = 125K
    expect(results[0].savings).toBe(125_000);
    // n2: savings = 300K - (3*75K) = 300K - 225K = 75K
    expect(results[1].savings).toBe(75_000);
  });
});
