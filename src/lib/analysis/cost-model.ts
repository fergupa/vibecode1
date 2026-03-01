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

export type RoutingRule = {
  regionMatch: string | null;
  categoryMatch: string | null;
  sscLocationId: string;
};

/**
 * Resolve which SSC salary to use for a given employee region + activity category.
 *
 * Priority:
 * 1. Routing rule: region + category match (most specific)
 * 2. Routing rule: region-only match
 * 3. Routing rule: category-only match
 * 4. Node-level sharedServiceLocationId
 * 5. Project default SSC (null key in sscSalaryMap)
 * 6. Hardcoded fallback: $75,000
 */
export function resolveSSCSalary(
  employeeRegion: string | null,
  categoryCode: string | null,
  nodeSSCLocationId: string | null,
  rules: RoutingRule[],
  sscSalaryMap: Map<string | null, number>
): number {
  // 1. Region + category match
  if (employeeRegion && categoryCode) {
    const exact = rules.find(
      (r) => r.regionMatch === employeeRegion && r.categoryMatch === categoryCode
    );
    if (exact) return sscSalaryMap.get(exact.sscLocationId) ?? 75000;
  }

  // 2. Region-only match
  if (employeeRegion) {
    const regionOnly = rules.find(
      (r) => r.regionMatch === employeeRegion && r.categoryMatch === null
    );
    if (regionOnly) return sscSalaryMap.get(regionOnly.sscLocationId) ?? 75000;
  }

  // 3. Category-only match
  if (categoryCode) {
    const catOnly = rules.find(
      (r) => r.categoryMatch === categoryCode && r.regionMatch === null
    );
    if (catOnly) return sscSalaryMap.get(catOnly.sscLocationId) ?? 75000;
  }

  // 4. Node-level SSC location
  if (nodeSSCLocationId) {
    const nodeSalary = sscSalaryMap.get(nodeSSCLocationId);
    if (nodeSalary !== undefined) return nodeSalary;
  }

  // 5. Project default, 6. Hardcoded fallback
  return sscSalaryMap.get(null) ?? 75000;
}

/**
 * For activities where work is happening at non-preferred locations,
 * calculate what the cost would be if that work moved to shared services.
 *
 * sscSalaryMap keys are SharedServiceLocation IDs; null key = project default.
 */
export function computeCostModel(
  analyses: ActivityAnalysis[],
  sscSalaryMap: Map<string | null, number>,
  routingRules: RoutingRule[] = []
): CostModelResult[] {
  return analyses.map((a) => {
    const currentCost = a.costAtNonPreferred;
    let futureCost: number;

    if (routingRules.length > 0 && a.nonPreferredByRegion.length > 0) {
      // Region-aware cost: apply routing rules per region bucket
      futureCost = 0;
      for (const rb of a.nonPreferredByRegion) {
        const salary = resolveSSCSalary(
          rb.region,
          a.categoryCode,
          a.sharedServiceLocationId,
          routingRules,
          sscSalaryMap
        );
        futureCost += rb.fte * salary;
      }
    } else {
      // Original behavior: single salary lookup
      const salary =
        sscSalaryMap.get(a.sharedServiceLocationId) ??
        sscSalaryMap.get(null) ??
        75000;
      futureCost = a.fteAtNonPreferred * salary;
    }

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
      savings: Math.max(0, savings),
      fteAffected: a.fteAtNonPreferred,
    };
  });
}
