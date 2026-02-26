import type { ActivityAnalysis } from "./gap-analysis";

export type CostModelResult = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  parentId: string | null;
  effectiveLocation: string | null;
  currentCost: number;
  futureCost: number;
  savings: number;
  fteAffected: number;
};

/**
 * For activities where work is happening at non-preferred locations,
 * calculate what the cost would be if that work moved to shared services.
 */
export function computeCostModel(
  analyses: ActivityAnalysis[],
  sharedServicesSalary: number
): CostModelResult[] {
  return analyses.map((a) => {
    // Current cost at non-preferred locations
    const currentCost = a.costAtNonPreferred;
    // Future cost: same FTEs at shared services salary
    const futureCost = a.fteAtNonPreferred * sharedServicesSalary;
    const savings = currentCost - futureCost;

    return {
      nodeId: a.nodeId,
      nodeCode: a.nodeCode,
      nodeName: a.nodeName,
      level: a.level,
      parentId: a.parentId,
      effectiveLocation: a.effectiveLocation,
      currentCost,
      futureCost,
      savings: Math.max(0, savings), // Only count positive savings
      fteAffected: a.fteAtNonPreferred,
    };
  });
}
