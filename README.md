# Activity Assessment & Shared Services Tool

A web application for organizational process assessment and shared services business case development. Import process taxonomies, collect employee time-allocation data through surveys, analyze gaps between current and preferred work locations, and build cost-based business cases for shared services migration.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Database:** PostgreSQL with Prisma 7 ORM
- **Auth:** NextAuth.js (credentials provider)
- **UI:** Tailwind CSS 4, shadcn/ui (Radix), Recharts, react-arborist
- **Testing:** Vitest
- **Exports:** @react-pdf/renderer, SheetJS (xlsx)
- **Data Import:** Papa Parse (CSV), SheetJS (Excel)

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` or create `.env`:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/activity_assessment"
   NEXTAUTH_SECRET="change-me-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Set up the database:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
   The seed script creates a default admin user (`admin` / `admin`).

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    admin/              # Protected admin pages (projects, taxonomy, employees, surveys, analysis)
    api/                # REST API routes
      projects/         # Project CRUD + nested resources (taxonomy, employees, campaigns, analysis)
      survey/[token]/   # Public respondent endpoints (no auth)
      auth/             # NextAuth endpoints
    survey/[token]/     # Public respondent survey page
    login/              # Admin login page
  components/
    ui/                 # shadcn/ui primitives
    analysis/           # Visualization components (heat map, sunburst, waterfall, etc.)
  lib/
    analysis/           # Gap analysis engine, cost model, aggregation
    export/             # PDF and Excel report generation
    auth.ts             # NextAuth configuration
    prisma.ts           # Prisma client singleton
    project-context.tsx # React context for active project
  __tests__/            # Vitest tests (API routes, lib functions, middleware)
  __mocks__/            # Shared test mocks (Prisma)
  data/
    apqc-template.json  # Default APQC taxonomy (285 entries)
prisma/
  schema.prisma         # Database schema
  seed.ts               # Seed script
docs/plans/             # Design and implementation documents
```

## Key Features

### Admin (requires login)
- **Project Management** - Create and manage assessment projects
- **Taxonomy Management** - Interactive tree editor with APQC template, CSV/Excel import, preferred location tagging (Corporate, BusinessUnit, SharedServices)
- **Employee Data** - Import via CSV/Excel, searchable/sortable table, salary and FTE tracking
- **Survey Campaigns** - Individual or role-based modes, unique respondent links, response rate tracking
- **Gap Analysis** - Heat map, sunburst chart, waterfall chart, summary table, KPI cards
- **Exports** - PDF executive summary, Excel detailed report

### Respondent (no login, token-based)
- Activities grouped by process hierarchy
- Percentage allocation with running total
- Auto-save drafts, must sum to 100% to submit

## Scripts

```bash
npm run dev            # Start development server
npm run build          # Production build
npm run start          # Start production server
npm run lint           # Run ESLint
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```
