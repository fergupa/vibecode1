import { prisma } from "@/lib/prisma";

export type LocationBreakdown = {
  location: string;
  fte: number;
  cost: number;
};

export type RegionCostBreakdown = {
  region: string | null;
  fte: number;
  cost: number;
};

export type ActivityAnalysis = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  level: number;
  parentId: string | null;
  preferredLocation: string | null;
  effectiveLocation: string | null;
  sharedServiceLocationId: string | null;
  currentLocationBreakdown: LocationBreakdown[];
  totalFte: number;
  totalCost: number;
  fteAtPreferred: number;
  fteAtNonPreferred: number;
  costAtPreferred: number;
  costAtNonPreferred: number;
  nonPreferredByRegion: RegionCostBreakdown[];
  categoryCode: string | null;
};

/**
 * Compute effective preferred location for each node by walking up the tree.
 */
function computeEffectiveLocations(
  nodes: { id: string; parentId: string | null; preferredLocation: string | null }[]
): Map<string, string | null> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, string | null>();

  function getEffective(nodeId: string): string | null {
    if (cache.has(nodeId)) return cache.get(nodeId)!;
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    if (node.preferredLocation) {
      cache.set(nodeId, node.preferredLocation);
      return node.preferredLocation;
    }
    if (node.parentId) {
      const parentLoc = getEffective(node.parentId);
      cache.set(nodeId, parentLoc);
      return parentLoc;
    }
    cache.set(nodeId, null);
    return null;
  }

  for (const node of nodes) {
    getEffective(node.id);
  }
  return cache;
}

/**
 * Compute effective SSC location ID for each node by walking up the tree.
 * Nodes with sharedServiceLocationId set use it; otherwise inherit from parent.
 * null means "use project default SSC location".
 */
function computeEffectiveSSCLocations(
  nodes: { id: string; parentId: string | null; sharedServiceLocationId: string | null }[]
): Map<string, string | null> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, string | null>();

  function getEffective(nodeId: string): string | null {
    if (cache.has(nodeId)) return cache.get(nodeId)!;
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    if (node.sharedServiceLocationId) {
      cache.set(nodeId, node.sharedServiceLocationId);
      return node.sharedServiceLocationId;
    }
    if (node.parentId) {
      const parentLoc = getEffective(node.parentId);
      cache.set(nodeId, parentLoc);
      return parentLoc;
    }
    cache.set(nodeId, null);
    return null;
  }

  for (const node of nodes) {
    getEffective(node.id);
  }
  return cache;
}

/**
 * For each node, find its level-1 ancestor code.
 * Level-1 nodes return their own code. Others walk up the tree.
 */
function computeCategoryCodes(
  nodes: { id: string; code: string; level: number; parentId: string | null }[]
): Map<string, string | null> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, string | null>();

  function getCategory(nodeId: string): string | null {
    if (cache.has(nodeId)) return cache.get(nodeId)!;
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    if (node.level === 1) {
      cache.set(nodeId, node.code);
      return node.code;
    }
    if (node.parentId) {
      const parentCat = getCategory(node.parentId);
      cache.set(nodeId, parentCat);
      return parentCat;
    }
    cache.set(nodeId, null);
    return null;
  }

  for (const node of nodes) {
    getCategory(node.id);
  }
  return cache;
}

export async function runGapAnalysis(projectId: string): Promise<ActivityAnalysis[]> {
  // Get all taxonomy nodes for the project
  const allNodes = await prisma.taxonomyNode.findMany({
    where: { projectId },
    select: {
      id: true, code: true, name: true, level: true, parentId: true,
      preferredLocation: true, sharedServiceLocationId: true,
    },
  });

  const effectiveLocations = computeEffectiveLocations(allNodes);
  const effectiveSSCLocations = computeEffectiveSSCLocations(allNodes);
  const categoryCodes = computeCategoryCodes(allNodes);

  // Get all completed survey responses for this project
  const responses = await prisma.surveyResponse.findMany({
    where: {
      submittedAt: { not: null },
      assignment: {
        campaign: { projectId },
        status: "Completed",
      },
    },
    select: {
      taxonomyNodeId: true,
      percentTime: true,
      assignment: {
        select: {
          headcount: true,
          employee: {
            select: {
              location: true,
              region: true,
              fullyLoadedSalary: true,
              fte: true,
            },
          },
        },
      },
    },
  });

  // Group responses by taxonomy node
  const responsesByNode = new Map<string, typeof responses>();
  for (const r of responses) {
    if (!responsesByNode.has(r.taxonomyNodeId)) {
      responsesByNode.set(r.taxonomyNodeId, []);
    }
    responsesByNode.get(r.taxonomyNodeId)!.push(r);
  }

  // Compute analysis for each node
  const results: ActivityAnalysis[] = [];

  for (const node of allNodes) {
    const nodeResponses = responsesByNode.get(node.id) || [];
    const effectiveLoc = effectiveLocations.get(node.id) || null;

    const locationMap = new Map<string, { fte: number; cost: number }>();
    const regionMap = new Map<string | null, { fte: number; cost: number }>();

    for (const r of nodeResponses) {
      const pct = Number(r.percentTime);
      const emp = r.assignment.employee;
      const headcount = r.assignment.headcount;

      if (emp) {
        // Individual mode
        const location = emp.location || "Unknown";
        const empFte = Number(emp.fte);
        const empSalary = Number(emp.fullyLoadedSalary);
        const weightedFte = empFte * (pct / 100);
        const weightedCost = empSalary * empFte * (pct / 100);

        const current = locationMap.get(location) || { fte: 0, cost: 0 };
        current.fte += weightedFte;
        current.cost += weightedCost;
        locationMap.set(location, current);

        // Track region for non-preferred work (used by routing rules)
        if (effectiveLoc && location !== effectiveLoc) {
          const region = emp.region ?? null;
          const currentRegion = regionMap.get(region) || { fte: 0, cost: 0 };
          currentRegion.fte += weightedFte;
          currentRegion.cost += weightedCost;
          regionMap.set(region, currentRegion);
        }
      } else {
        // Role-based mode — use headcount, no salary/location data per se
        const location = "Unknown";
        const weightedFte = headcount * (pct / 100);
        const current = locationMap.get(location) || { fte: 0, cost: 0 };
        current.fte += weightedFte;
        locationMap.set(location, current);
      }
    }

    const breakdown: LocationBreakdown[] = [];
    let totalFte = 0;
    let totalCost = 0;
    let fteAtPreferred = 0;
    let fteAtNonPreferred = 0;
    let costAtPreferred = 0;
    let costAtNonPreferred = 0;

    for (const [location, data] of locationMap) {
      breakdown.push({ location, fte: data.fte, cost: data.cost });
      totalFte += data.fte;
      totalCost += data.cost;

      if (effectiveLoc && location === effectiveLoc) {
        fteAtPreferred += data.fte;
        costAtPreferred += data.cost;
      } else {
        fteAtNonPreferred += data.fte;
        costAtNonPreferred += data.cost;
      }
    }

    results.push({
      nodeId: node.id,
      nodeCode: node.code,
      nodeName: node.name,
      level: node.level,
      parentId: node.parentId,
      preferredLocation: node.preferredLocation,
      effectiveLocation: effectiveLoc,
      sharedServiceLocationId: effectiveSSCLocations.get(node.id) || null,
      currentLocationBreakdown: breakdown,
      totalFte,
      totalCost,
      fteAtPreferred,
      fteAtNonPreferred,
      costAtPreferred,
      costAtNonPreferred,
      nonPreferredByRegion: [...regionMap.entries()].map(([region, data]) => ({
        region,
        fte: data.fte,
        cost: data.cost,
      })),
      categoryCode: categoryCodes.get(node.id) || null,
    });
  }

  return results;
}
