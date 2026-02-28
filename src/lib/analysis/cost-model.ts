import type { ActivityAnalysis } from "./gap-analysis";

export type CostModelResult = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  parentId: string | null;
  effectiveLocation: string | null;
  sharedServiceLocationId: string | null;
  currentCost: number;
  futureCost: number;
  savings: number;
  fteAffected: number;
};

/**
 * For activities where work is happening at non-preferred locations,
 * calculate what the cost would be if that work moved to shared services.
 *
 * sscSalaryMap keys are SharedServiceLocation IDs; null key = project default.
 */
export function computeCostModel(
  analyses: ActivityAnalysis[],
  sscSalaryMap: Map<string | null, number>
): CostModelResult[] {
  return analyses.map((a) => {
    // Current cost at non-preferred locations
    const currentCost = a.costAtNonPreferred;
    // Look up salary: node-specific SSC location → project default → hardcoded fallback
    const salary =
      sscSalaryMap.get(a.sharedServiceLocationId) ??
      sscSalaryMap.get(null) ??
      75000;
    // Future cost: same FTEs at the applicable shared services salary
    const futureCost = a.fteAtNonPreferred * salary;
    const savings = currentCost - futureCost;

    return {
      nodeId: a.nodeId,
      nodeCode: a.nodeCode,
      nodeName: a.nodeName,
      level: a.level,
      parentId: a.parentId,
      effectiveLocation: a.effectiveLocation,
      sharedServiceLocationId: a.sharedServiceLocationId,
      currentCost,
      futureCost,
      savings: Math.max(0, savings), // Only count positive savings
      fteAffected: a.fteAtNonPreferred,
    };
  });
}
