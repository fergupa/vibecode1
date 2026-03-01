import { describe, it, expect } from "vitest";
import { aggregateResults } from "@/lib/analysis/aggregation";
import type { ActivityAnalysis } from "@/lib/analysis/gap-analysis";
import type { CostModelResult } from "@/lib/analysis/cost-model";

function makeAnalysis(overrides: Partial<ActivityAnalysis>): ActivityAnalysis {
  return {
    nodeId: "n1",
    nodeCode: "1.0",
    nodeName: "Test",
    level: 1,
    parentId: null,
    preferredLocation: null,
    effectiveLocation: null,
    sharedServiceLocationId: null,
    currentLocationBreakdown: [],
    totalFte: 0,
    totalCost: 0,
    fteAtPreferred: 0,
    fteAtNonPreferred: 0,
    costAtPreferred: 0,
    costAtNonPreferred: 0,
    nonPreferredByRegion: [],
    categoryCode: null,
    ...overrides,
  };
}

function makeCostResult(overrides: Partial<CostModelResult>): CostModelResult {
  return {
    nodeId: "n1",
    nodeCode: "1.0",
    nodeName: "Test",
    level: 1,
    parentId: null,
    effectiveLocation: null,
    sharedServiceLocationId: null,
    currentCost: 0,
    futureCost: 0,
    savings: 0,
    fteAffected: 0,
    ...overrides,
  };
}

describe("aggregateResults", () => {
  it("rolls up child FTE/cost to parent nodes", () => {
    const analyses: ActivityAnalysis[] = [
      makeAnalysis({
        nodeId: "cat1",
        nodeCode: "1",
        nodeName: "Category",
        level: 1,
        parentId: null,
        totalFte: 0,
        totalCost: 0,
      }),
      makeAnalysis({
        nodeId: "proc1",
        nodeCode: "1.1",
        nodeName: "Process",
        level: 2,
        parentId: "cat1",
        totalFte: 5,
        totalCost: 500_000,
        fteAtNonPreferred: 3,
        costAtNonPreferred: 300_000,
        currentLocationBreakdown: [{ location: "New York", fte: 3, cost: 300_000 }, { location: "SSC", fte: 2, cost: 200_000 }],
      }),
      makeAnalysis({
        nodeId: "proc2",
        nodeCode: "1.2",
        nodeName: "Process 2",
        level: 2,
        parentId: "cat1",
        totalFte: 3,
        totalCost: 300_000,
        fteAtNonPreferred: 1,
        costAtNonPreferred: 100_000,
        currentLocationBreakdown: [{ location: "New York", fte: 1, cost: 100_000 }, { location: "SSC", fte: 2, cost: 200_000 }],
      }),
    ];

    const costResults: CostModelResult[] = [
      makeCostResult({ nodeId: "cat1", savings: 0 }),
      makeCostResult({ nodeId: "proc1", savings: 75_000, currentCost: 300_000, futureCost: 225_000, fteAffected: 3 }),
      makeCostResult({ nodeId: "proc2", savings: 25_000, currentCost: 100_000, futureCost: 75_000, fteAffected: 1 }),
    ];

    const { nodes, totals } = aggregateResults(analyses, costResults);

    // Find parent node
    const cat1 = nodes.find((n) => n.nodeId === "cat1")!;
    expect(cat1).toBeDefined();
    // Parent should have rolled-up values from both children
    expect(cat1.totalFte).toBe(8); // 5 + 3
    expect(cat1.totalCost).toBe(800_000); // 500K + 300K
    expect(cat1.fteAtNonPreferred).toBe(4); // 3 + 1
    expect(cat1.savings).toBe(100_000); // 75K + 25K

    // Location breakdown should be merged
    const nyBreakdown = cat1.locationBreakdown.find((lb) => lb.location === "New York");
    expect(nyBreakdown?.fte).toBe(4); // 3 + 1
    const sscBreakdown = cat1.locationBreakdown.find((lb) => lb.location === "SSC");
    expect(sscBreakdown?.fte).toBe(4); // 2 + 2

    // Project totals from level-1 nodes
    expect(totals.totalFte).toBe(8);
    expect(totals.totalSavings).toBe(100_000);
  });

  it("returns empty totals when no nodes have data", () => {
    const analyses: ActivityAnalysis[] = [
      makeAnalysis({ nodeId: "n1", level: 1 }),
    ];
    const costResults: CostModelResult[] = [
      makeCostResult({ nodeId: "n1" }),
    ];

    const { totals } = aggregateResults(analyses, costResults);
    expect(totals.totalFte).toBe(0);
    expect(totals.totalSavings).toBe(0);
    expect(totals.locationBreakdown).toHaveLength(0);
  });

  it("handles three-level hierarchy correctly", () => {
    const analyses: ActivityAnalysis[] = [
      makeAnalysis({ nodeId: "l1", nodeCode: "1", level: 1, parentId: null }),
      makeAnalysis({ nodeId: "l2", nodeCode: "1.1", level: 2, parentId: "l1" }),
      makeAnalysis({
        nodeId: "l3",
        nodeCode: "1.1.1",
        level: 3,
        parentId: "l2",
        totalFte: 2,
        totalCost: 200_000,
        fteAtNonPreferred: 1,
        currentLocationBreakdown: [{ location: "HQ", fte: 2, cost: 200_000 }],
      }),
    ];
    const costResults: CostModelResult[] = [
      makeCostResult({ nodeId: "l1" }),
      makeCostResult({ nodeId: "l2" }),
      makeCostResult({ nodeId: "l3", savings: 25_000, currentCost: 100_000, futureCost: 75_000, fteAffected: 1 }),
    ];

    const { nodes, totals } = aggregateResults(analyses, costResults);

    // Level 2 should get level 3's values
    const l2 = nodes.find((n) => n.nodeId === "l2")!;
    expect(l2.totalFte).toBe(2);

    // Level 1 should get level 2's rolled-up values (which include level 3)
    const l1 = nodes.find((n) => n.nodeId === "l1")!;
    expect(l1.totalFte).toBe(2);
    expect(l1.savings).toBe(25_000);

    expect(totals.totalFte).toBe(2);
    expect(totals.totalSavings).toBe(25_000);
  });
});
