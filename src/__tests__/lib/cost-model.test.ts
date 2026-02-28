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
    sharedServiceLocationId: null,
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

function salaryMap(defaultSalary: number): Map<string | null, number> {
  return new Map([[null, defaultSalary]]);
}

describe("computeCostModel", () => {
  it("computes savings when non-preferred cost exceeds shared services cost", () => {
    const analyses = [makeAnalysis()];
    const results = computeCostModel(analyses, salaryMap(75_000));

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.currentCost).toBe(600_000);
    expect(r.futureCost).toBe(450_000);
    expect(r.savings).toBe(150_000);
    expect(r.fteAffected).toBe(6);
  });

  it("returns zero savings when shared services is more expensive", () => {
    const analyses = [
      makeAnalysis({
        fteAtNonPreferred: 2,
        costAtNonPreferred: 100_000,
      }),
    ];
    const results = computeCostModel(analyses, salaryMap(75_000));

    expect(results[0].savings).toBe(0);
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
    const results = computeCostModel(analyses, salaryMap(75_000));
    expect(results[0].savings).toBe(0);
    expect(results[0].futureCost).toBe(0);
    expect(results[0].fteAffected).toBe(0);
  });

  it("processes multiple activities", () => {
    const analyses = [
      makeAnalysis({ nodeId: "n1", fteAtNonPreferred: 5, costAtNonPreferred: 500_000 }),
      makeAnalysis({ nodeId: "n2", fteAtNonPreferred: 3, costAtNonPreferred: 300_000 }),
    ];
    const results = computeCostModel(analyses, salaryMap(75_000));
    expect(results).toHaveLength(2);
    expect(results[0].savings).toBe(125_000);
    expect(results[1].savings).toBe(75_000);
  });

  it("uses per-node SSC location salary when available", () => {
    const sscMap = new Map<string | null, number>([
      [null, 75_000],
      ["loc-manila", 50_000],
      ["loc-krakow", 90_000],
    ]);

    const analyses = [
      makeAnalysis({
        nodeId: "n1",
        sharedServiceLocationId: "loc-manila",
        fteAtNonPreferred: 4,
        costAtNonPreferred: 400_000,
      }),
      makeAnalysis({
        nodeId: "n2",
        sharedServiceLocationId: "loc-krakow",
        fteAtNonPreferred: 4,
        costAtNonPreferred: 400_000,
      }),
      makeAnalysis({
        nodeId: "n3",
        sharedServiceLocationId: null,
        fteAtNonPreferred: 4,
        costAtNonPreferred: 400_000,
      }),
    ];

    const results = computeCostModel(analyses, sscMap);

    // n1: Manila — 4 * 50K = 200K, savings = 400K - 200K = 200K
    expect(results[0].futureCost).toBe(200_000);
    expect(results[0].savings).toBe(200_000);

    // n2: Krakow — 4 * 90K = 360K, savings = 400K - 360K = 40K
    expect(results[1].futureCost).toBe(360_000);
    expect(results[1].savings).toBe(40_000);

    // n3: default — 4 * 75K = 300K, savings = 400K - 300K = 100K
    expect(results[2].futureCost).toBe(300_000);
    expect(results[2].savings).toBe(100_000);
  });
});
