# Taxonomy Sort, APQC Defaults, and Region-Based Routing Design

**Goal:** Three enhancements to the taxonomy and cost model: fix numeric sorting, add best-practice preferred locations to the APQC template, and add region-based SSC routing rules for more accurate savings calculations.

**Architecture:** Client-side sort fix, template data enrichment with seed route update, and a new RoutingRule model with matching logic integrated into the cost model.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, shadcn/ui

---

## Feature 1: Natural Numeric Sort

### Problem

Taxonomy tree sorts codes alphabetically: `1.0, 10.0, 11.0, 2.0, 3.0`. Should sort numerically: `1.0, 2.0, 3.0, ..., 10.0, 11.0`.

### Approach

Add a `naturalCodeSort` comparator to `buildTree()` in `src/components/taxonomy-tree.tsx`. Splits the code string on `.` into numeric segments and compares segment-by-segment. Sort children after attaching to parent nodes.

No schema or API changes. The DB `orderBy: { code: "asc" }` still provides a reasonable initial order; final sort happens client-side.

### Files

- Modify: `src/components/taxonomy-tree.tsx`

---

## Feature 2: Default APQC Preferred Locations

### Problem

When the APQC taxonomy is seeded, all nodes start with no preferred location. Users must manually tag hundreds of nodes. Best-practice defaults should be pre-populated.

### Approach

Add `preferredLocation` field to level-1 entries in `src/data/apqc-template.json`. The `seed-apqc` route writes this field during import. Child nodes inherit via existing tree-walk inheritance.

Users can override at any level after seeding.

### Mapping

| Code | Category | Placement |
|------|----------|-----------|
| 1.0 | Develop Vision and Strategy | Corporate |
| 2.0 | Develop/Manage Products & Services | BusinessUnit |
| 3.0 | Market and Sell Products & Services | BusinessUnit |
| 4.0 | Deliver Products & Services | BusinessUnit |
| 5.0 | Manage Customer Service | BusinessUnit |
| 6.0 | Develop/Manage Human Capital | SharedServices |
| 7.0 | Manage Information Technology | SharedServices |
| 8.0 | Manage Financial Resources | SharedServices |
| 9.0 | Acquire, Construct, and Manage Assets | SharedServices |
| 10.0 | Manage Enterprise Risk, Compliance, Remediation, and Resiliency | Corporate |
| 11.0 | Manage External Relationships | Corporate |
| 12.0 | Develop and Manage Business Capabilities | SharedServices |
| 13.0 | Manage Health, Safety, Environment, and Sustainability | Corporate |

### Files

- Modify: `src/data/apqc-template.json` (add `preferredLocation` to 13 level-1 entries)
- Modify: `src/app/api/projects/[id]/taxonomy/seed-apqc/route.ts` (write `preferredLocation` during create)

---

## Feature 3: Region-Based SSC Routing Rules

### Problem

The cost model currently uses a single SSC salary per taxonomy node (or project default). In reality, organizations route work to different SSC locations based on employee region and activity type. For example: Americas transactional finance → Mexico SSC, Europe transactional finance → Poland SSC.

### Schema Changes

**Add `region` to Employee model:**

```prisma
region  String?    // e.g. "Americas", "Europe", "Asia"
```

Optional field. Employees without region fall back to default SSC behavior.

**New model: `RoutingRule`**

```prisma
model RoutingRule {
  id            String                @id @default(uuid())
  projectId     String
  project       Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  regionMatch   String?               // null = any region
  categoryMatch String?               // null = any category (level-1 code, e.g. "8.0")
  sscLocationId String
  sscLocation   SharedServiceLocation @relation(fields: [sscLocationId], references: [id], onDelete: Cascade)

  @@unique([projectId, regionMatch, categoryMatch])
  @@index([projectId])
}
```

Add relations to `Project` and `SharedServiceLocation`.

### Matching Logic

When calculating cost for an employee+activity pair:

1. Look up the activity's level-1 ancestor code (e.g., `8.3.2.1` → `8.0`)
2. Look up the employee's `region`
3. Find the most specific matching routing rule:
   - **Region + Category** (most specific — both conditions match)
   - **Region-only** (regionMatch set, categoryMatch null)
   - **Category-only** (categoryMatch set, regionMatch null)
   - Region+Category > Region-only > Category-only
4. If no rule matches, fall back to existing behavior:
   - Node-level `sharedServiceLocationId` (inherited)
   - Project default SSC location
   - Hardcoded $75,000

### Cost Model Integration

The gap analysis already produces `ActivityAnalysis` objects with `sharedServiceLocationId`. The cost model receives routing rules and employee context to resolve the correct SSC salary per employee+activity pair.

Current signature:
```typescript
computeCostModel(analyses: ActivityAnalysis[], sscSalaryMap: Map<string | null, number>)
```

New approach: The cost model receives routing rules and builds a resolver. For each activity's `fteAtNonPreferred`, it uses the employee breakdown to determine which SSC salary applies per employee's region.

This requires the gap analysis to preserve per-employee breakdowns (not just aggregate FTE) so the cost model can apply region-specific salaries.

### API

**New routes:** `src/app/api/projects/[id]/routing-rules/route.ts`

- **GET** — returns all routing rules for project with SSC location details
- **POST** — creates rule (`{ regionMatch?, categoryMatch?, sscLocationId }`). Validates at least one condition is set. Validates SSC location belongs to project.
- **DELETE** `[ruleId]` — removes rule

### UI

**Project setup wizard** — new "Routing Rules" section after SSC Locations (Step 1):

- Table: Region (dropdown or "Any"), Category (dropdown of level-1 APQC names or "Any"), SSC Location (dropdown of project's SSC locations)
- "Add Rule" button, delete button per row
- Validation: at least one of region/category must be set

### Employee CSV Import

Add `region` as an expected column in the employee CSV upload. If present, populate the field. If absent, leave null.

### Files

- Modify: `prisma/schema.prisma` (add `region` to Employee, add RoutingRule model, add relations)
- Create: `src/app/api/projects/[id]/routing-rules/route.ts`
- Create: `src/app/api/projects/[id]/routing-rules/[ruleId]/route.ts`
- Modify: `src/lib/analysis/gap-analysis.ts` (preserve per-employee breakdown)
- Modify: `src/lib/analysis/cost-model.ts` (routing rule resolution)
- Modify: `src/app/api/projects/[id]/analysis/route.ts` (pass routing rules)
- Modify: `src/app/api/projects/[id]/analysis/export-pdf/route.ts`
- Modify: `src/app/api/projects/[id]/analysis/export-excel/route.ts`
- Modify: `src/components/project-setup-wizard.tsx` (routing rules UI)
- Modify: employee CSV import (add region column)
- Modify: `src/__mocks__/prisma.ts` (add routingRule mock)
- Create: `src/__tests__/api/routing-rules.test.ts`
- Modify: `src/__tests__/lib/cost-model.test.ts`
