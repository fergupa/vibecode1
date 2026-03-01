# Activity Assessment & Shared Services Tool

A Next.js 16 web application for organizational process assessment and shared services business case development. Collects employee time-allocation data through surveys, analyzes gaps between current and preferred work locations, and builds cost-based business cases.

## Architecture

- **Next.js App Router** with TypeScript, Tailwind CSS 4, shadcn/ui
- **PostgreSQL** via Prisma 7 ORM (schema in `prisma/schema.prisma`)
- **NextAuth.js** credentials auth protecting `/admin/*` routes
- **Two user surfaces:** Admin (authenticated) and Respondent (token-based, no login)

## Key Models

- **Project** - Top-level container scoping all data
- **TaxonomyNode** - Self-referential tree (APQC hierarchy: Category > Process Group > Process > Activity) with `preferredLocation` tagging and optional `sharedServiceLocationId` override
- **Employee** - Staff data with salary, FTE, location, region, department
- **SharedServiceLocation** - Per-project SSC locations with different salary costs; one marked as default
- **RoutingRule** - Per-project rules mapping employee region + APQC category to SSC locations (most-specific-match wins)
- **SurveyCampaign** - Individual or RoleBased mode, status lifecycle (Draft > Active > Closed)
- **SurveyAssignment** - Per-respondent with unique token
- **SurveyResponse** - Time allocation per taxonomy node (must sum to 100%)

## Key Directories

- `src/app/admin/` - Protected admin pages (projects, taxonomy, employees, surveys, analysis)
- `src/app/api/projects/` - REST API with nested resources (taxonomy, employees, campaigns, analysis, ssc-locations, routing-rules)
- `src/app/api/survey/[token]/` and `src/app/survey/[token]/` - Public respondent endpoints/pages
- `src/components/analysis/` - Visualization components (heat map, sunburst, waterfall, summary table)
- `src/lib/analysis/` - Gap analysis engine, cost model, aggregation logic
- `src/lib/export/` - PDF and Excel report generation
- `src/__tests__/` - Vitest tests with shared Prisma mock (`src/__mocks__/prisma.ts`)
- `src/data/apqc-template.json` - Default 285-entry APQC taxonomy with best-practice preferred locations on level-1 categories

## Conventions

- API routes follow REST patterns under `/api/projects/[id]/...`
- Prisma client singleton in `src/lib/prisma.ts`
- shadcn/ui components in `src/components/ui/`
- Tests use Vitest with mocked Prisma client; run with `npm test`
- Design docs saved to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Default admin credentials: `admin` / `admin` (seed script in `prisma/seed.ts`)

## Skills

All skills are in `.claude/skills/`. Before responding to any task, check if a skill applies using the `using-superpowers` skill.

**Mandatory:** Invoke the `brainstorming` skill before any creative work — creating features, building components, adding functionality, or modifying behavior.

### Development Workflow (obra/superpowers)

| Skill | When to Use |
|-------|-------------|
| `using-superpowers` | Every conversation — determines which skills to invoke |
| `brainstorming` | Before any creative work: new features, components, functionality changes |
| `writing-plans` | When you have a spec or requirements for a multi-step task, before coding |
| `executing-plans` | When you have a written implementation plan to execute in a separate session |
| `subagent-driven-development` | When executing implementation plans with independent tasks in the current session |
| `test-driven-development` | When implementing any feature or bugfix, before writing implementation code |
| `systematic-debugging` | When encountering any bug, test failure, or unexpected behavior |
| `dispatching-parallel-agents` | When facing 2+ independent tasks with no shared state |
| `using-git-worktrees` | When starting feature work that needs isolation from current workspace |
| `finishing-a-development-branch` | When implementation is complete and you need to integrate the work |
| `requesting-code-review` | When completing tasks, major features, or before merging |
| `receiving-code-review` | When receiving code review feedback, before implementing suggestions |
| `verification-before-completion` | Before claiming work is complete, fixed, or passing |
| `writing-skills` | When creating or editing skills |

### React & Next.js (vercel-labs)

| Skill | When to Use |
|-------|-------------|
| `react-best-practices` | When writing, reviewing, or refactoring React/Next.js code for performance. 57 rules across 8 categories (waterfalls, bundle size, server perf, client data fetching, re-renders, rendering, JS perf, advanced patterns). See `AGENTS.md` for the full compiled guide. |

### Security (wshobson/agents)

| Skill | When to Use |
|-------|-------------|
| `security-scanning/stride-analysis-patterns` | When conducting threat modeling or analyzing system security using STRIDE |
| `security-scanning/attack-tree-construction` | When mapping attack scenarios or identifying defense gaps |
| `security-scanning/security-requirement-extraction` | When translating threats into actionable requirements or security user stories |
| `security-scanning/threat-mitigation-mapping` | When prioritizing security investments or designing defense-in-depth |
| `security-scanning/sast-configuration` | When setting up Semgrep, SonarQube, or CodeQL for automated vulnerability detection |

### Browser Automation (vercel-labs)

| Skill | When to Use |
|-------|-------------|
| `agent-browser` | When the user needs to interact with websites: navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Core workflow: navigate → snapshot → interact with refs → re-snapshot. |

## Design Documents

Save design documents to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit them.

## Worktrees

Use `.worktrees/` for git worktrees (already in .gitignore).
