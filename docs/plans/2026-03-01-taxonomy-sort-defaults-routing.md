# Taxonomy Sort, APQC Defaults, and Region-Based Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three enhancements: fix numeric sorting of taxonomy codes, add best-practice preferred locations to APQC template, and add region-based SSC routing rules to the cost model.

**Architecture:** Client-side natural sort comparator for taxonomy tree display. APQC template JSON enrichment with seed route update. New `RoutingRule` Prisma model with matching logic integrated into gap analysis and cost model. Routing rules CRUD API and wizard UI.

**Tech Stack:** Next.js App Router, Prisma 7, TypeScript, Vitest, shadcn/ui

---

### Task 1: Natural Numeric Sort for Taxonomy Tree

**Files:**
- Modify: `src/components/taxonomy-tree.tsx`

**Step 1: Add natural sort comparator to `buildTree()`**

In `src/components/taxonomy-tree.tsx`, add this function before `buildTree()`:

```typescript
/**
 * Compare two dotted-numeric code strings numerically.
 * e.g. "2.0" < "10.0", "1.1.2" < "1.1.10"
 */
function naturalCodeCompare(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}
```

Then in `buildTree()`, after the "Build hierarchy" loop (after line 48 in the current file) and before "Compute effective locations", add:

```typescript
  // Sort children numerically by code
  for (const node of map.values()) {
    node.children.sort((a, b) => naturalCodeCompare(a.code, b.code));
  }
  roots.sort((a, b) => naturalCodeCompare(a.code, b.code));
```

**Step 2: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All existing tests pass (this is a display-only change).

**Step 3: Commit**

```bash
git add src/components/taxonomy-tree.tsx
git commit -m "fix: sort taxonomy tree codes numerically instead of alphabetically"
```

---

### Task 2: Add Default Preferred Locations to APQC Template

**Files:**
- Modify: `src/data/apqc-template.json` (13 level-1 entries)
- Modify: `src/app/api/projects/[id]/taxonomy/seed-apqc/route.ts`

**Step 1: Add `preferredLocation` to level-1 entries in `apqc-template.json`**

Add a `"preferredLocation"` field to each level-1 entry. Only level-1 entries get this field (children inherit). The mapping:

```json
{"code": "1.0", "preferredLocation": "Corporate", ...}
{"code": "2.0", "preferredLocation": "BusinessUnit", ...}
{"code": "3.0", "preferredLocation": "BusinessUnit", ...}
{"code": "4.0", "preferredLocation": "BusinessUnit", ...}
{"code": "5.0", "preferredLocation": "BusinessUnit", ...}
{"code": "6.0", "preferredLocation": "SharedServices", ...}
{"code": "7.0", "preferredLocation": "SharedServices", ...}
{"code": "8.0", "preferredLocation": "SharedServices", ...}
{"code": "9.0", "preferredLocation": "SharedServices", ...}
{"code": "10.0", "preferredLocation": "Corporate", ...}
{"code": "11.0", "preferredLocation": "Corporate", ...}
{"code": "12.0", "preferredLocation": "SharedServices", ...}
{"code": "13.0", "preferredLocation": "Corporate", ...}
```

For each level-1 entry, add the field right after `"level"`. Level 2-4 entries remain unchanged (no `preferredLocation` field).

**Step 2: Update the `ApqcEntry` type and seed route**

In `src/app/api/projects/[id]/taxonomy/seed-apqc/route.ts`, update the type:

```typescript
type ApqcEntry = {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  description: string | null;
  preferredLocation?: string | null;
};
```

In the first pass create loop, add `preferredLocation` to the data:

```typescript
    const node = await prisma.taxonomyNode.create({
      data: {
        projectId: id,
        code: entry.code,
        name: entry.name,
        level: entry.level,
        description: entry.description,
        sortOrder: 0,
        ...(entry.preferredLocation && {
          preferredLocation: entry.preferredLocation as "Corporate" | "BusinessUnit" | "SharedServices",
          locationInherited: false,
        }),
      },
    });
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/data/apqc-template.json src/app/api/projects/[id]/taxonomy/seed-apqc/route.ts
git commit -m "feat: add default preferred locations to APQC template"
```

---

### Task 3: Add `region` Field to Employee Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/projects/[id]/employees/import/route.ts`

**Step 1: Add `region` to Employee model in schema**

In `prisma/schema.prisma`, add after the `location` field (line 69):

```prisma
  region            String?
```

**Step 2: Run `npx prisma db push`**

Run: `npx prisma db push`
Expected: Schema synced, no data loss.

**Step 3: Run `npx prisma generate`**

Run: `npx prisma generate`
Expected: Prisma client regenerated.

**Step 4: Update employee CSV import to accept `Region` column**

In `src/app/api/projects/[id]/employees/import/route.ts`, add `Region` to the `CsvRow` type:

```typescript
type CsvRow = {
  EmployeeID: string;
  Name: string;
  Email: string;
  Title: string;
  Department: string;
  Location: string;
  Region: string;
  BusinessUnit: string;
  FullyLoadedSalary: string;
  FTE: string;
  JobFamily: string;
};
```

In the import loop (the `prisma.employee.create` call), add the region field:

```typescript
        region: row.Region?.trim() || null,
```

**Step 5: Update the wizard employee CSV instructions**

In `src/components/project-setup-wizard.tsx`, update the CSV column description (around line 544):

```tsx
                Upload a CSV with columns: EmployeeID, Name, Email, Title,
                Department, Location, Region, BusinessUnit, FullyLoadedSalary, FTE,
                JobFamily
```

**Step 6: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add prisma/schema.prisma src/app/api/projects/[id]/employees/import/route.ts src/components/project-setup-wizard.tsx
git commit -m "feat: add region field to Employee model and CSV import"
```

---

### Task 4: Add RoutingRule Model and Prisma Mock

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/__mocks__/prisma.ts`

**Step 1: Add RoutingRule model to schema**

In `prisma/schema.prisma`, add after the `SharedServiceLocation` model:

```prisma
model RoutingRule {
  id            String                @id @default(uuid())
  projectId     String
  project       Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  regionMatch   String?
  categoryMatch String?
  sscLocationId String
  sscLocation   SharedServiceLocation @relation(fields: [sscLocationId], references: [id], onDelete: Cascade)

  @@unique([projectId, regionMatch, categoryMatch])
  @@index([projectId])
}
```

Add `routingRules RoutingRule[]` relation to the `Project` model (after `sharedServiceLocations`):

```prisma
  routingRules           RoutingRule[]
```

Add `routingRules RoutingRule[]` relation to the `SharedServiceLocation` model (after `taxonomyNodes`):

```prisma
  routingRules  RoutingRule[]
```

**Step 2: Run `npx prisma db push` and `npx prisma generate`**

Run: `npx prisma db push && npx prisma generate`
Expected: Schema synced, client regenerated.

**Step 3: Add `routingRule` to Prisma mock**

In `src/__mocks__/prisma.ts`, add:

```typescript
  routingRule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
```

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add prisma/schema.prisma src/__mocks__/prisma.ts
git commit -m "feat: add RoutingRule model and Prisma mock"
```

---

### Task 5: Routing Rules CRUD API

**Files:**
- Create: `src/app/api/projects/[id]/routing-rules/route.ts`
- Create: `src/app/api/projects/[id]/routing-rules/[ruleId]/route.ts`

**Step 1: Write the routing rules list/create API test**

Create `src/__tests__/api/routing-rules.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/projects/[id]/routing-rules/route";
import { DELETE } from "@/app/api/projects/[id]/routing-rules/[ruleId]/route";

const mockGetSession = vi.mocked(getServerSession);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRuleParams(id: string, ruleId: string) {
  return { params: Promise.resolve({ id, ruleId }) };
}

describe("GET /api/projects/[id]/routing-rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns routing rules with SSC location details", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const mockRules = [
      {
        id: "r1",
        projectId: "p1",
        regionMatch: "Americas",
        categoryMatch: "8.0",
        sscLocationId: "loc1",
        sscLocation: { id: "loc1", name: "Mexico SSC", salary: 45000 },
      },
    ];
    vi.mocked(prisma.routingRule.findMany).mockResolvedValue(mockRules as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].regionMatch).toBe("Americas");
    expect(body[0].sscLocation.name).toBe("Mexico SSC");
  });
});

describe("POST /api/projects/[id]/routing-rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when both regionMatch and categoryMatch are null", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules", {
      method: "POST",
      body: JSON.stringify({ sscLocationId: "loc1" }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("creates routing rule with valid data", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    vi.mocked(prisma.sharedServiceLocation.findUnique).mockResolvedValue({
      id: "loc1",
      projectId: "p1",
      name: "Mexico",
      salary: 45000,
      isDefault: false,
    } as never);
    const created = {
      id: "r1",
      projectId: "p1",
      regionMatch: "Americas",
      categoryMatch: "8.0",
      sscLocationId: "loc1",
    };
    vi.mocked(prisma.routingRule.create).mockResolvedValue(created as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules", {
      method: "POST",
      body: JSON.stringify({
        regionMatch: "Americas",
        categoryMatch: "8.0",
        sscLocationId: "loc1",
      }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.regionMatch).toBe("Americas");
  });
});

describe("DELETE /api/projects/[id]/routing-rules/[ruleId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules/r1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeRuleParams("p1", "r1"));
    expect(res.status).toBe(401);
  });

  it("deletes routing rule", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    vi.mocked(prisma.routingRule.findUnique).mockResolvedValue({
      id: "r1",
      projectId: "p1",
    } as never);
    vi.mocked(prisma.routingRule.delete).mockResolvedValue({} as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules/r1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeRuleParams("p1", "r1"));
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/api/routing-rules.test.ts`
Expected: FAIL — modules not found.

**Step 3: Implement GET/POST route**

Create `src/app/api/projects/[id]/routing-rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rules = await prisma.routingRule.findMany({
    where: { projectId: id },
    include: {
      sscLocation: {
        select: { id: true, name: true, salary: true },
      },
    },
    orderBy: [{ regionMatch: "asc" }, { categoryMatch: "asc" }],
  });

  return NextResponse.json(rules);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { regionMatch, categoryMatch, sscLocationId } = body;

  if (!regionMatch && !categoryMatch) {
    return NextResponse.json(
      { error: "At least one of regionMatch or categoryMatch is required" },
      { status: 400 }
    );
  }

  if (!sscLocationId) {
    return NextResponse.json(
      { error: "sscLocationId is required" },
      { status: 400 }
    );
  }

  // Validate SSC location belongs to this project
  const sscLocation = await prisma.sharedServiceLocation.findUnique({
    where: { id: sscLocationId },
  });
  if (!sscLocation || sscLocation.projectId !== id) {
    return NextResponse.json(
      { error: "SSC location not found in this project" },
      { status: 400 }
    );
  }

  const rule = await prisma.routingRule.create({
    data: {
      projectId: id,
      regionMatch: regionMatch?.trim() || null,
      categoryMatch: categoryMatch?.trim() || null,
      sscLocationId,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
```

**Step 4: Implement DELETE route**

Create `src/app/api/projects/[id]/routing-rules/[ruleId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ruleId } = await params;

  const rule = await prisma.routingRule.findUnique({
    where: { id: ruleId },
  });
  if (!rule || rule.projectId !== id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.routingRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ message: "Deleted" });
}
```

**Step 5: Run tests**

Run: `npm test -- src/__tests__/api/routing-rules.test.ts`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/app/api/projects/[id]/routing-rules/ src/__tests__/api/routing-rules.test.ts
git commit -m "feat: add routing rules CRUD API with tests"
```

---

### Task 6: Add Routing Rule Resolution to Cost Model

**Files:**
- Modify: `src/lib/analysis/gap-analysis.ts`
- Modify: `src/lib/analysis/cost-model.ts`
- Modify: `src/__tests__/lib/cost-model.test.ts`

**Step 1: Write failing cost model tests for routing rules**

Add to `src/__tests__/lib/cost-model.test.ts`:

```typescript
import { resolveSSCSalary } from "@/lib/analysis/cost-model";
import type { RoutingRule } from "@/lib/analysis/cost-model";

describe("resolveSSCSalary", () => {
  const sscSalaryMap = new Map<string | null, number>([
    [null, 75_000],          // project default
    ["loc-mexico", 45_000],
    ["loc-poland", 55_000],
    ["loc-india", 40_000],
  ]);

  const rules: RoutingRule[] = [
    { regionMatch: "Americas", categoryMatch: "8.0", sscLocationId: "loc-mexico" },
    { regionMatch: "Europe", categoryMatch: "8.0", sscLocationId: "loc-poland" },
    { regionMatch: "Asia", categoryMatch: null, sscLocationId: "loc-india" },
    { regionMatch: null, categoryMatch: "6.0", sscLocationId: "loc-poland" },
  ];

  it("matches region + category (most specific)", () => {
    const salary = resolveSSCSalary("Americas", "8.0", null, rules, sscSalaryMap);
    expect(salary).toBe(45_000); // Mexico
  });

  it("matches region-only when no region+category rule exists", () => {
    const salary = resolveSSCSalary("Asia", "1.0", null, rules, sscSalaryMap);
    expect(salary).toBe(40_000); // India (region-only rule)
  });

  it("matches category-only when no region rule exists", () => {
    const salary = resolveSSCSalary("Africa", "6.0", null, rules, sscSalaryMap);
    expect(salary).toBe(55_000); // Poland (category-only rule for 6.0)
  });

  it("falls back to node SSC location when no rule matches", () => {
    const salary = resolveSSCSalary("Africa", "1.0", "loc-mexico", rules, sscSalaryMap);
    expect(salary).toBe(45_000); // Mexico (node-level override)
  });

  it("falls back to project default when nothing matches", () => {
    const salary = resolveSSCSalary("Africa", "1.0", null, rules, sscSalaryMap);
    expect(salary).toBe(75_000); // project default
  });

  it("falls back to 75000 when no default exists", () => {
    const emptySscMap = new Map<string | null, number>();
    const salary = resolveSSCSalary("Africa", "1.0", null, [], emptySscMap);
    expect(salary).toBe(75_000);
  });

  it("prefers region+category over region-only", () => {
    // Americas + 8.0 has specific rule → Mexico
    // Americas without category match would not have a region-only rule
    const salary = resolveSSCSalary("Americas", "8.0", null, rules, sscSalaryMap);
    expect(salary).toBe(45_000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/lib/cost-model.test.ts`
Expected: FAIL — `resolveSSCSalary` not found.

**Step 3: Implement `resolveSSCSalary` and export it**

In `src/lib/analysis/cost-model.ts`, add the types and resolver function:

```typescript
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
```

**Step 4: Run tests**

Run: `npm test -- src/__tests__/lib/cost-model.test.ts`
Expected: All tests pass (both old `computeCostModel` and new `resolveSSCSalary` tests).

**Step 5: Commit**

```bash
git add src/lib/analysis/cost-model.ts src/__tests__/lib/cost-model.test.ts
git commit -m "feat: add resolveSSCSalary with routing rule matching logic"
```

---

### Task 7: Update Gap Analysis to Preserve Employee Region + Category Data

**Files:**
- Modify: `src/lib/analysis/gap-analysis.ts`
- Modify: `src/lib/analysis/cost-model.ts`

The current gap analysis aggregates employee data into location buckets, losing per-employee region info. For routing rules to work, we need to preserve per-employee-region breakdowns so the cost model can apply different SSC salaries per region.

**Step 1: Add `regionBreakdown` to `ActivityAnalysis`**

In `src/lib/analysis/gap-analysis.ts`, add a new type and field:

```typescript
export type RegionCostBreakdown = {
  region: string | null;
  fte: number;
  cost: number;
};
```

Add to `ActivityAnalysis` type (after `costAtNonPreferred`):

```typescript
  nonPreferredByRegion: RegionCostBreakdown[];
  categoryCode: string | null;
```

**Step 2: Compute category code (level-1 ancestor)**

Add a helper function after `computeEffectiveSSCLocations`:

```typescript
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
```

**Step 3: Update gap analysis query to include employee `region`**

In `runGapAnalysis`, update the survey response select to include `region`:

```typescript
          employee: {
            select: {
              location: true,
              region: true,
              fullyLoadedSalary: true,
              fte: true,
            },
          },
```

**Step 4: Compute region breakdown for non-preferred FTE**

In the per-node computation loop, add a region map alongside the location map:

After line `const locationMap = new Map<string, { fte: number; cost: number }>();` add:

```typescript
    const regionMap = new Map<string | null, { fte: number; cost: number }>();
```

Inside the `if (emp)` block, after updating `locationMap`, add:

```typescript
        // Track region for non-preferred work (used by routing rules)
        if (effectiveLoc && location !== effectiveLoc) {
          const region = emp.region ?? null;
          const current = regionMap.get(region) || { fte: 0, cost: 0 };
          current.fte += weightedFte;
          current.cost += weightedCost;
          regionMap.set(region, current);
        }
```

**Step 5: Include region breakdown and category code in results**

Compute category codes at the top of `runGapAnalysis` (after `effectiveSSCLocations`):

```typescript
  const categoryCodes = computeCategoryCodes(allNodes);
```

In the results push, add:

```typescript
      nonPreferredByRegion: [...regionMap.entries()].map(([region, data]) => ({
        region,
        fte: data.fte,
        cost: data.cost,
      })),
      categoryCode: categoryCodes.get(node.id) || null,
```

**Step 6: Update `computeCostModel` to use routing rules**

Update the `computeCostModel` signature in `src/lib/analysis/cost-model.ts`:

```typescript
export function computeCostModel(
  analyses: ActivityAnalysis[],
  sscSalaryMap: Map<string | null, number>,
  routingRules: RoutingRule[] = []
): CostModelResult[] {
```

Update the function body — when routing rules exist and the activity has `nonPreferredByRegion` data, compute future cost per region:

```typescript
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
```

**Step 7: Update existing cost model tests to include new fields**

Update the `makeAnalysis` helper in `src/__tests__/lib/cost-model.test.ts` to include the new fields:

```typescript
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
    nonPreferredByRegion: [],
    categoryCode: "1.0",
    ...overrides,
  };
}
```

Add a test for routing rules in the cost model:

```typescript
  it("uses routing rules to compute region-aware future cost", () => {
    const sscMap = new Map<string | null, number>([
      [null, 75_000],
      ["loc-mexico", 45_000],
      ["loc-poland", 55_000],
    ]);
    const rules: RoutingRule[] = [
      { regionMatch: "Americas", categoryMatch: "8.0", sscLocationId: "loc-mexico" },
      { regionMatch: "Europe", categoryMatch: "8.0", sscLocationId: "loc-poland" },
    ];
    const analyses = [
      makeAnalysis({
        nodeCode: "8.3.2.1",
        categoryCode: "8.0",
        fteAtNonPreferred: 6,
        costAtNonPreferred: 600_000,
        nonPreferredByRegion: [
          { region: "Americas", fte: 4, cost: 400_000 },
          { region: "Europe", fte: 2, cost: 200_000 },
        ],
      }),
    ];

    const results = computeCostModel(analyses, sscMap, rules);
    // Americas: 4 * 45K = 180K, Europe: 2 * 55K = 110K, total = 290K
    expect(results[0].futureCost).toBe(290_000);
    expect(results[0].savings).toBe(310_000); // 600K - 290K
  });
```

**Step 8: Run tests**

Run: `npm test -- src/__tests__/lib/cost-model.test.ts`
Expected: All tests pass.

**Step 9: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 10: Commit**

```bash
git add src/lib/analysis/gap-analysis.ts src/lib/analysis/cost-model.ts src/__tests__/lib/cost-model.test.ts
git commit -m "feat: integrate routing rules into gap analysis and cost model"
```

---

### Task 8: Update Analysis API Routes to Pass Routing Rules

**Files:**
- Modify: `src/app/api/projects/[id]/analysis/route.ts`
- Modify: `src/app/api/projects/[id]/analysis/export-pdf/route.ts`
- Modify: `src/app/api/projects/[id]/analysis/export-excel/route.ts`

**Step 1: Update analysis route**

In `src/app/api/projects/[id]/analysis/route.ts`:

Add `routingRules` to the project query select:

```typescript
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      sharedServicesSalary: true,
      sharedServiceLocations: true,
      routingRules: {
        select: {
          regionMatch: true,
          categoryMatch: true,
          sscLocationId: true,
        },
      },
    },
  });
```

Pass routing rules to `computeCostModel`:

```typescript
  const costModel = computeCostModel(gapAnalysis, sscSalaryMap, project.routingRules);
```

**Step 2: Update PDF export route**

Same pattern in `src/app/api/projects/[id]/analysis/export-pdf/route.ts`:

Add `routingRules` to the project select and pass to `computeCostModel`:

```typescript
    select: { name: true, sharedServicesSalary: true, sharedServiceLocations: true, routingRules: { select: { regionMatch: true, categoryMatch: true, sscLocationId: true } } },
```

```typescript
  const costModel = computeCostModel(gapAnalysis, sscSalaryMap, project.routingRules);
```

**Step 3: Update Excel export route**

Same pattern in `src/app/api/projects/[id]/analysis/export-excel/route.ts`:

Add `routingRules` to the project select and pass to `computeCostModel`.

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/app/api/projects/[id]/analysis/
git commit -m "feat: pass routing rules through analysis and export routes"
```

---

### Task 9: Add Routing Rules UI to Project Setup Wizard

**Files:**
- Modify: `src/components/project-setup-wizard.tsx`

**Step 1: Add routing rules state to wizard**

After the SSC locations state (around line 60), add:

```typescript
  // Step 1c: Routing Rules
  const [routingRules, setRoutingRules] = useState<
    { regionMatch: string; categoryMatch: string; sscLocationIndex: number }[]
  >([]);
```

Define the APQC category options as a constant at the top of the file (before the component):

```typescript
const APQC_CATEGORIES = [
  { code: "1.0", name: "Develop Vision and Strategy" },
  { code: "2.0", name: "Develop and Manage Products and Services" },
  { code: "3.0", name: "Market and Sell Products and Services" },
  { code: "4.0", name: "Deliver Products and Services" },
  { code: "5.0", name: "Manage Customer Service" },
  { code: "6.0", name: "Develop and Manage Human Capital" },
  { code: "7.0", name: "Manage Information Technology" },
  { code: "8.0", name: "Manage Financial Resources" },
  { code: "9.0", name: "Acquire, Construct, and Manage Assets" },
  { code: "10.0", name: "Manage Enterprise Risk, Compliance" },
  { code: "11.0", name: "Manage External Relationships" },
  { code: "12.0", name: "Develop and Manage Business Capabilities" },
  { code: "13.0", name: "Manage Health, Safety, Environment" },
];
```

**Step 2: Add routing rules UI section**

In the Step 1 (project) section, after the SSC Locations section (after the "Add Location" button, around line 498), add:

```tsx
              <div className="space-y-2">
                <Label>Routing Rules (Optional)</Label>
                <p className="text-xs text-gray-500">
                  Route employees to different SSC locations based on their region
                  and/or activity category. Most specific rule wins.
                </p>
                {routingRules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={rule.regionMatch || "__any__"}
                      onValueChange={(v) => {
                        const updated = [...routingRules];
                        updated[i] = { ...updated[i], regionMatch: v === "__any__" ? "" : v };
                        setRoutingRules(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any Region</SelectItem>
                        <SelectItem value="Americas">Americas</SelectItem>
                        <SelectItem value="Europe">Europe</SelectItem>
                        <SelectItem value="Asia">Asia</SelectItem>
                        <SelectItem value="Africa">Africa</SelectItem>
                        <SelectItem value="Oceania">Oceania</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={rule.categoryMatch || "__any__"}
                      onValueChange={(v) => {
                        const updated = [...routingRules];
                        updated[i] = { ...updated[i], categoryMatch: v === "__any__" ? "" : v };
                        setRoutingRules(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any Category</SelectItem>
                        {APQC_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.code} value={cat.code}>
                            {cat.code} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(rule.sscLocationIndex)}
                      onValueChange={(v) => {
                        const updated = [...routingRules];
                        updated[i] = { ...updated[i], sscLocationIndex: Number(v) };
                        setRoutingRules(updated);
                      }}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="SSC Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {sscLocations.map((loc, j) => (
                          <SelectItem key={j} value={String(j)}>
                            {loc.name || `Location ${j + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-500"
                      onClick={() => setRoutingRules(routingRules.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRoutingRules([
                      ...routingRules,
                      { regionMatch: "", categoryMatch: "", sscLocationIndex: 0 },
                    ])
                  }
                >
                  Add Rule
                </Button>
              </div>
```

**Step 3: Send routing rules when creating the project**

In `handleCreateProject`, after the project is created successfully (in the `else` block where `setCreatedProject(data)` is called), add routing rule creation calls:

```typescript
        // Create routing rules
        if (routingRules.length > 0) {
          // First fetch the created SSC locations to get their IDs
          const sscRes = await fetch(`/api/projects/${data.id}/ssc-locations`);
          if (sscRes.ok) {
            const createdSSCLocations: { id: string; name: string }[] = await sscRes.json();
            for (const rule of routingRules) {
              if (!rule.regionMatch && !rule.categoryMatch) continue;
              const sscLoc = createdSSCLocations[rule.sscLocationIndex];
              if (!sscLoc) continue;
              await fetch(`/api/projects/${data.id}/routing-rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  regionMatch: rule.regionMatch || null,
                  categoryMatch: rule.categoryMatch || null,
                  sscLocationId: sscLoc.id,
                }),
              });
            }
          }
        }
```

**Step 4: Reset routing rules in `resetState`**

Add to the `resetState` function:

```typescript
    setRoutingRules([]);
```

**Step 5: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 6: Build check**

Run: `npx next build`
Expected: Build succeeds with no type errors.

**Step 7: Commit**

```bash
git add src/components/project-setup-wizard.tsx
git commit -m "feat: add routing rules UI to project setup wizard"
```

---

### Task 10: Update Aggregation to Pass Through New Fields

**Files:**
- Modify: `src/lib/analysis/aggregation.ts`

The aggregation module needs to handle the new `nonPreferredByRegion` and `categoryCode` fields. Since aggregation rolls up from children to parents, these per-activity fields don't need to be aggregated — the cost model processes them before aggregation. No functional changes needed, but verify existing aggregation tests still pass.

**Step 1: Run tests**

Run: `npm test -- src/__tests__/lib/aggregation.test.ts`
Expected: All tests pass. If the `ActivityAnalysis` type change causes issues (missing required fields in test data), update the test helper to include the new fields.

**Step 2: If aggregation tests need updating**

Add `nonPreferredByRegion: []` and `categoryCode: null` to any test `ActivityAnalysis` objects.

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 4: Commit (only if changes were needed)**

```bash
git add src/__tests__/lib/aggregation.test.ts
git commit -m "test: update aggregation tests for new ActivityAnalysis fields"
```

---

### Task 11: Final Verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 2: Run build**

Run: `npx next build`
Expected: Build succeeds.

**Step 3: Verify Prisma is in sync**

Run: `npx prisma db push --dry-run`
Expected: No changes needed (schema already applied).
