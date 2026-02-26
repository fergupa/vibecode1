import type { ActivityAnalysis, LocationBreakdown } from "./gap-analysis";
import type { CostModelResult } from "./cost-model";

export type AggregatedNode = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  parentId: string | null;
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

export type ProjectTotals = {
  totalFte: number;
  totalCurrentCost: number;
  totalFutureCost: number;
  totalSavings: number;
  fteAffected: number;
  locationBreakdown: LocationBreakdown[];
};

/**
 * Roll up activity-level results to parent hierarchy levels.
 * Returns aggregated data for every node in the tree (not just leaves).
 */
export function aggregateResults(
  analyses: ActivityAnalysis[],
  costResults: CostModelResult[]
): { nodes: AggregatedNode[]; totals: ProjectTotals } {
  // Build cost lookup
  const costMap = new Map(costResults.map((c) => [c.nodeId, c]));

  // Create aggregated nodes from analysis data
  const nodeMap = new Map<string, AggregatedNode>();

  for (const a of analyses) {
    const cost = costMap.get(a.nodeId);
    nodeMap.set(a.nodeId, {
      nodeId: a.nodeId,
      nodeCode: a.nodeCode,
      nodeName: a.nodeName,
      level: a.level,
      parentId: a.parentId,
      effectiveLocation: a.effectiveLocation,
      totalFte: a.totalFte,
      totalCost: a.totalCost,
      fteAtPreferred: a.fteAtPreferred,
      fteAtNonPreferred: a.fteAtNonPreferred,
      costAtPreferred: a.costAtPreferred,
      costAtNonPreferred: a.costAtNonPreferred,
      currentCost: cost?.currentCost ?? 0,
      futureCost: cost?.futureCost ?? 0,
      savings: cost?.savings ?? 0,
      fteAffected: cost?.fteAffected ?? 0,
      locationBreakdown: [...a.currentLocationBreakdown],
    });
  }

  // Roll up from leaves to parents
  // Sort by level descending so we process children before parents
  const sorted = [...nodeMap.values()].sort((a, b) => b.level - a.level);

  for (const node of sorted) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.totalFte += node.totalFte;
      parent.totalCost += node.totalCost;
      parent.fteAtPreferred += node.fteAtPreferred;
      parent.fteAtNonPreferred += node.fteAtNonPreferred;
      parent.costAtPreferred += node.costAtPreferred;
      parent.costAtNonPreferred += node.costAtNonPreferred;
      parent.currentCost += node.currentCost;
      parent.futureCost += node.futureCost;
      parent.savings += node.savings;
      parent.fteAffected += node.fteAffected;

      // Merge location breakdowns
      for (const lb of node.locationBreakdown) {
        const existing = parent.locationBreakdown.find(
          (p) => p.location === lb.location
        );
        if (existing) {
          existing.fte += lb.fte;
          existing.cost += lb.cost;
        } else {
          parent.locationBreakdown.push({ ...lb });
        }
      }
    }
  }

  // Compute project totals from level-1 nodes
  const level1Nodes = [...nodeMap.values()].filter((n) => n.level === 1);
  const totalLocationMap = new Map<string, LocationBreakdown>();

  let totalFte = 0;
  let totalCurrentCost = 0;
  let totalFutureCost = 0;
  let totalSavings = 0;
  let fteAffected = 0;

  for (const n of level1Nodes) {
    totalFte += n.totalFte;
    totalCurrentCost += n.currentCost;
    totalFutureCost += n.futureCost;
    totalSavings += n.savings;
    fteAffected += n.fteAffected;

    for (const lb of n.locationBreakdown) {
      const existing = totalLocationMap.get(lb.location);
      if (existing) {
        existing.fte += lb.fte;
        existing.cost += lb.cost;
      } else {
        totalLocationMap.set(lb.location, { ...lb });
      }
    }
  }

  return {
    nodes: [...nodeMap.values()],
    totals: {
      totalFte,
      totalCurrentCost,
      totalFutureCost,
      totalSavings,
      fteAffected,
      locationBreakdown: [...totalLocationMap.values()],
    },
  };
}
