# Activity Assessment Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js web app that imports process taxonomies and employee data, runs time-allocation surveys, and analyzes gaps between actual and preferred delivery locations to build shared services business cases.

**Architecture:** Single Next.js 15 App Router monolith with PostgreSQL via Prisma. Admin routes under `/admin/*` protected by NextAuth.js credentials. Respondent survey at `/survey/[token]` (no auth). Modular route groups: taxonomy, employees, surveys, analysis.

**Tech Stack:** Next.js 15, PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, Recharts, Papa Parse, SheetJS, NextAuth.js, @react-pdf/renderer

**Design Doc:** `docs/plans/2026-02-25-activity-assessment-survey-design.md`

---

## Phase 1: Project Scaffolding & Database

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

**Step 1: Scaffold Next.js with TypeScript and Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Accept defaults. This creates the full Next.js skeleton in the current directory.

**Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client next-auth bcryptjs
npm install -D @types/bcryptjs
```

**Step 3: Install UI and utility dependencies**

```bash
npx shadcn@latest init -d
npm install recharts papaparse xlsx @react-pdf/renderer react-arborist uuid
npm install -D @types/papaparse @types/uuid
```

**Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts on localhost:3000 with the default Next.js page.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with core dependencies"
```

---

### Task 2: Set up Prisma schema and database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env` (local only, add to .gitignore)
- Create: `.env.example`

**Step 1: Initialize Prisma**

```bash
npx prisma init
```

**Step 2: Write the full Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model AdminUser {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}

model Project {
  id                    String           @id @default(uuid())
  name                  String
  description           String?
  sharedServicesSalary  Decimal?         @db.Decimal(12, 2)
  createdAt             DateTime         @default(now())
  taxonomyNodes         TaxonomyNode[]
  employees             Employee[]
  surveyCampaigns       SurveyCampaign[]
}

enum PreferredLocation {
  Corporate
  BusinessUnit
  SharedServices
}

model TaxonomyNode {
  id                String            @id @default(uuid())
  projectId         String
  project           Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentId          String?
  parent            TaxonomyNode?     @relation("TaxonomyTree", fields: [parentId], references: [id], onDelete: Cascade)
  children          TaxonomyNode[]    @relation("TaxonomyTree")
  code              String
  name              String
  level             Int
  description       String?
  preferredLocation PreferredLocation?
  locationInherited Boolean           @default(true)
  sortOrder         Int               @default(0)
  surveyResponses   SurveyResponse[]

  @@unique([projectId, code])
  @@index([projectId, parentId])
  @@index([projectId, level])
}

model Employee {
  id                String             @id @default(uuid())
  projectId         String
  project           Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  employeeId        String
  name              String
  email             String?
  title             String
  department        String?
  location          String
  businessUnit      String?
  fullyLoadedSalary Decimal            @db.Decimal(12, 2)
  fte               Decimal            @default(1.0) @db.Decimal(5, 2)
  jobFamily         String?
  surveyAssignments SurveyAssignment[]

  @@unique([projectId, employeeId])
  @@index([projectId])
}

enum CampaignStatus {
  Draft
  Active
  Closed
}

enum CampaignMode {
  Individual
  RoleBased
}

model SurveyCampaign {
  id            String             @id @default(uuid())
  projectId     String
  project       Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name          String
  status        CampaignStatus     @default(Draft)
  mode          CampaignMode
  taxonomyLevel Int                @default(4)
  createdAt     DateTime           @default(now())
  closedAt      DateTime?
  assignments   SurveyAssignment[]

  @@index([projectId])
}

enum AssignmentStatus {
  Pending
  InProgress
  Completed
}

model SurveyAssignment {
  id         String           @id @default(uuid())
  campaignId String
  campaign   SurveyCampaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  employeeId String?
  employee   Employee?        @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  roleName   String?
  headcount  Int              @default(1)
  token      String           @unique
  status     AssignmentStatus @default(Pending)
  responses  SurveyResponse[]

  @@index([campaignId])
  @@index([token])
}

model SurveyResponse {
  id             String         @id @default(uuid())
  assignmentId   String
  assignment     SurveyAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  taxonomyNodeId String
  taxonomyNode   TaxonomyNode   @relation(fields: [taxonomyNodeId], references: [id], onDelete: Cascade)
  percentTime    Decimal        @db.Decimal(5, 2)
  submittedAt    DateTime?

  @@unique([assignmentId, taxonomyNodeId])
  @@index([assignmentId])
}
```

**Step 3: Create `.env.example`**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/activity_assessment"
NEXTAUTH_SECRET="change-me-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**Step 4: Ensure `.env` is in `.gitignore`**

Add `.env` to `.gitignore` if not already present.

**Step 5: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Prisma Client is generated.

**Step 6: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Opens browser showing all models with empty tables.

**Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations .env.example .gitignore
git commit -m "feat: add Prisma schema with all data models"
```

---

### Task 3: Create Prisma client singleton and seed script

**Files:**
- Create: `src/lib/prisma.ts`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed config)

**Step 1: Create Prisma client singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 2: Create seed script with admin user and sample APQC taxonomy**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin
  const passwordHash = await bcrypt.hash("admin", 10);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      name: "Administrator",
    },
  });

  console.log("Seed complete: admin user created (admin/admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Step 3: Add seed config to `package.json`**

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

**Step 4: Install tsx and run seed**

```bash
npm install -D tsx
npx prisma db seed
```

Expected: "Seed complete: admin user created (admin/admin)"

**Step 5: Commit**

```bash
git add src/lib/prisma.ts prisma/seed.ts package.json
git commit -m "feat: add Prisma client singleton and seed script"
```

---

### Task 4: Set up NextAuth.js with Credentials provider

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth.ts`
- Create: `src/middleware.ts`

**Step 1: Create auth configuration**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.adminUser.findUnique({
          where: { username: credentials.username },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.username };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
```

**Step 2: Create API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Step 3: Create middleware to protect admin routes**

Create `src/middleware.ts`:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/admin/:path*"],
};
```

**Step 4: Verify login page redirects**

```bash
npm run dev
```

Navigate to `http://localhost:3000/admin` — should redirect to `/login`.

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth src/middleware.ts
git commit -m "feat: add NextAuth.js credentials authentication"
```

---

### Task 5: Create login page and admin layout shell

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin-sidebar.tsx`
- Create: `src/components/providers.tsx`

**Step 1: Install shadcn/ui components needed**

```bash
npx shadcn@latest add button input label card sidebar navigation-menu avatar dropdown-menu separator
```

**Step 2: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activity Assessment Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create admin sidebar component**

Create `src/components/admin-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/surveys", label: "Surveys" },
  { href: "/admin/analysis", label: "Analysis" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-gray-50 p-4">
      <h1 className="mb-8 text-lg font-bold">Activity Assessment</h1>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign Out
      </Button>
    </aside>
  );
}
```

**Step 4: Create SessionProvider wrapper**

Create `src/components/providers.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

> **Why:** NextAuth v4 client-side hooks (`signIn`, `signOut`, `useSession`) require a `<SessionProvider>` wrapper. Without this, the login page and admin sidebar will throw runtime errors.

**Step 5: Create admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
import { AdminSidebar } from "@/components/admin-sidebar";
import { Providers } from "@/components/providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </Providers>
  );
}
```

> **Note:** Also wrap the login page's parent layout (or the root `src/app/layout.tsx`) with `<Providers>` since the login page also uses `signIn` from `next-auth/react`.

**Step 6: Create admin dashboard placeholder**

Create `src/app/admin/page.tsx`:

```tsx
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome to the Activity Assessment Tool. Use the sidebar to manage your projects.
      </p>
    </div>
  );
}
```

**Step 7: Verify login flow works end-to-end**

```bash
npm run dev
```

1. Go to `/admin` → redirected to `/login`
2. Login with admin/admin → redirected to `/admin` dashboard
3. Sidebar navigation works

**Step 8: Commit**

```bash
git add src/app/login src/app/admin src/components/admin-sidebar.tsx src/components/providers.tsx
git commit -m "feat: add login page and admin layout with sidebar navigation"
```

---

## Phase 2: Project Management

### Task 6: Create Project CRUD API routes

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`

**Step 1: Write the list/create API route**

Create `src/app/api/projects/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { taxonomyNodes: true, employees: true, surveyCampaigns: true },
      },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { name: name.trim(), description: description?.trim() || null },
  });

  return NextResponse.json(project, { status: 201 });
}
```

**Step 2: Write the single project API route**

Create `src/app/api/projects/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: { taxonomyNodes: true, employees: true, surveyCampaigns: true },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.sharedServicesSalary !== undefined && {
        sharedServicesSalary: body.sharedServicesSalary,
      }),
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

**Step 3: Verify with curl**

```bash
# Login first to get session cookie, then:
curl http://localhost:3000/api/projects
```

**Step 4: Commit**

```bash
git add src/app/api/projects
git commit -m "feat: add Project CRUD API routes"
```

---

### Task 7: Create project selection UI on admin dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/components/project-selector.tsx`
- Create: `src/lib/hooks/use-projects.ts`
- Create: `src/lib/project-context.tsx`

**Step 1: Create a project context for the admin area**

Create `src/lib/project-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  sharedServicesSalary: number | null;
  createdAt: string;
  _count: { taxonomyNodes: number; employees: number; surveyCampaigns: number };
};

type ProjectContextType = {
  projects: Project[];
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectProject: setSelectedProject,
        refreshProjects,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
```

**Step 2: Wire ProjectProvider into admin layout**

Update `src/app/admin/layout.tsx` to wrap children in `<ProjectProvider>`.

**Step 3: Build the dashboard page with project list and create form**

Update `src/app/admin/page.tsx` to show a list of projects, allow creating new ones, and selecting a project to work on.

**Step 4: Verify project creation and selection works**

```bash
npm run dev
```

1. Navigate to `/admin`
2. Create a new project
3. See it appear in the list
4. Select it

**Step 5: Commit**

```bash
git add src/lib/project-context.tsx src/app/admin/page.tsx src/app/admin/layout.tsx
git commit -m "feat: add project selection dashboard"
```

---

## Phase 3: Taxonomy Management

> **IMPORTANT (Next.js 15):** All API route handlers with dynamic segments (`[id]`, `[nodeId]`, `[campaignId]`, `[token]`) must use async params:
> ```typescript
> export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
>   const { id } = await params;
> ```
> This applies to every route handler in Phases 3-7. See Task 6 for the corrected pattern.

### Task 8: Create Taxonomy API routes

**Files:**
- Create: `src/app/api/projects/[id]/taxonomy/route.ts`
- Create: `src/app/api/projects/[id]/taxonomy/import/route.ts`
- Create: `src/app/api/projects/[id]/taxonomy/seed-apqc/route.ts`
- Create: `src/app/api/projects/[id]/taxonomy/[nodeId]/route.ts`

**Step 1: Create CRUD route for taxonomy nodes**

`src/app/api/projects/[id]/taxonomy/route.ts` — GET (list tree) and POST (create node).

GET returns the full tree for the project as a flat list (client builds the tree). POST creates a single node with `code, name, level, parentId, description, sortOrder`.

**Step 2: Create single node route**

`src/app/api/projects/[id]/taxonomy/[nodeId]/route.ts` — PATCH (update node including preferredLocation) and DELETE.

**Step 3: Create APQC seed endpoint**

`src/app/api/projects/[id]/taxonomy/seed-apqc/route.ts` — POST that inserts a default APQC taxonomy template. Use a JSON data file at `src/data/apqc-template.json` containing a representative subset of the APQC PCF (10-12 categories, ~50 processes, ~100 activities).

**Step 4: Create CSV import endpoint**

`src/app/api/projects/[id]/taxonomy/import/route.ts` — POST that accepts a CSV file with columns `Code, Name, Level, ParentCode, Description`. Parses with Papa Parse server-side, validates hierarchy, inserts nodes.

**Step 5: Create the APQC template data file**

Create `src/data/apqc-template.json` with a representative APQC hierarchy:
- Level 1: ~12 categories (e.g., "1.0 Develop Vision and Strategy", "2.0 Develop and Manage Products and Services", etc.)
- Level 2: ~40 process groups
- Level 3: ~80 processes
- Level 4: ~150 activities

**Step 6: Commit**

```bash
git add src/app/api/projects/[id]/taxonomy src/data/apqc-template.json
git commit -m "feat: add taxonomy CRUD, APQC seed, and CSV import API routes"
```

---

### Task 9: Build taxonomy tree editor UI

**Files:**
- Create: `src/app/admin/taxonomy/page.tsx`
- Create: `src/components/taxonomy-tree.tsx`
- Create: `src/components/taxonomy-node-editor.tsx`
- Create: `src/components/taxonomy-import-dialog.tsx`
- Create: `src/components/location-tag-badge.tsx`

**Step 1: Install additional shadcn/ui components**

```bash
npx shadcn@latest add dialog select badge tooltip scroll-area
# Note: tree-view is NOT an official shadcn component. Use react-arborist (already installed) for the tree UI.
```

**Step 2: Build the taxonomy tree component**

`src/components/taxonomy-tree.tsx` — Expandable/collapsible tree using react-arborist or a custom recursive component. Each node shows: code, name, level badge, preferred location tag. Click to select, right-click or action buttons for edit/delete/add child.

**Step 3: Build the location tag badge**

`src/components/location-tag-badge.tsx` — Small colored badge showing preferred location. Blue = Corporate, Green = Shared Services, Orange = Business Unit. Dimmed/italic if inherited.

**Step 4: Build the node editor panel**

`src/components/taxonomy-node-editor.tsx` — Side panel or dialog for editing a selected node's properties including the preferredLocation dropdown with an "Inherit from parent" option.

**Step 5: Build the import dialog**

`src/components/taxonomy-import-dialog.tsx` — Dialog with two options: "Seed APQC Template" button and "Upload CSV/Excel" file drop zone. Shows preview of parsed data before confirming import.

**Step 6: Build the taxonomy page**

`src/app/admin/taxonomy/page.tsx` — Combines all components. Header with project name, import button. Main area is the tree editor. Selected node details on the right or in a drawer.

**Step 7: Verify full taxonomy workflow**

1. Select a project
2. Click "Seed APQC Template" → tree populates
3. Expand/collapse nodes
4. Select a node → edit panel opens
5. Set preferred location on a parent → children show inherited tag
6. Add/edit/delete nodes inline

**Step 8: Commit**

```bash
git add src/app/admin/taxonomy src/components/taxonomy-*.tsx src/components/location-tag-badge.tsx
git commit -m "feat: add interactive taxonomy tree editor with location tagging"
```

---

## Phase 4: Employee Data Import

### Task 10: Create Employee API routes

**Files:**
- Create: `src/app/api/projects/[id]/employees/route.ts`
- Create: `src/app/api/projects/[id]/employees/import/route.ts`
- Create: `src/app/api/projects/[id]/employees/[empId]/route.ts`

**Step 1: Create list/create route**

GET with pagination, search, and filters (department, location, businessUnit). POST for single employee creation.

**Step 2: Create import route**

POST accepts CSV/Excel file. Columns: `EmployeeID, Name, Email, Title, Department, Location, BusinessUnit, FullyLoadedSalary, FTE, JobFamily`. Returns validation results — array of errors with row numbers plus count of valid rows. Accepts a `confirm=true` query param to actually insert after preview.

**Step 3: Create single employee route**

PATCH for inline editing, DELETE for removal.

**Step 4: Commit**

```bash
git add src/app/api/projects/[id]/employees
git commit -m "feat: add Employee CRUD and CSV import API routes"
```

---

### Task 11: Build employee management UI

**Files:**
- Create: `src/app/admin/employees/page.tsx`
- Create: `src/components/employee-table.tsx`
- Create: `src/components/employee-import-dialog.tsx`

**Step 1: Install shadcn/ui data table components**

```bash
npx shadcn@latest add table checkbox
npm install @tanstack/react-table
# Note: data-table is a shadcn guide (not an installable component). Build using Table + @tanstack/react-table.
```

**Step 2: Build the employee data table**

`src/components/employee-table.tsx` — Uses @tanstack/react-table with shadcn/ui Table. Columns: EmployeeID, Name, Title, Department, Location, BU, Salary, FTE, Job Family. Sortable columns, text search, dropdown filters for Department/Location/BU. Inline cell editing for corrections.

**Step 3: Build the import dialog**

`src/components/employee-import-dialog.tsx` — File upload (CSV/Excel), parse client-side with Papa Parse/SheetJS, show preview table with validation errors highlighted in red. "Confirm Import" button sends to API.

**Step 4: Build the employees page**

`src/app/admin/employees/page.tsx` — Header with employee count and "Import" button. Main area is the data table. Summary stats at top (total employees, total salary, avg FTE, location breakdown).

**Step 5: Verify**

1. Import a CSV of employee data
2. See validation errors
3. Fix and re-import
4. Browse, search, filter, and edit in the table

**Step 6: Commit**

```bash
git add src/app/admin/employees src/components/employee-*.tsx
git commit -m "feat: add employee data table with CSV/Excel import"
```

---

## Phase 5: Survey Engine

### Task 12: Create Survey Campaign API routes

**Files:**
- Create: `src/app/api/projects/[id]/campaigns/route.ts`
- Create: `src/app/api/projects/[id]/campaigns/[campaignId]/route.ts`
- Create: `src/app/api/projects/[id]/campaigns/[campaignId]/assignments/route.ts`
- Create: `src/app/api/projects/[id]/campaigns/[campaignId]/export-links/route.ts`

**Step 1: Campaign CRUD**

POST creates campaign (name, mode, taxonomyLevel). PATCH updates status (Draft→Active→Closed). GET returns campaign with assignment stats.

**Step 2: Assignment generation**

POST to `/assignments` generates SurveyAssignment records:
- **Individual mode**: Creates one assignment per selected employee (accepts employee filter params). Generates UUID token for each.
- **RoleBased mode**: Creates one assignment per unique jobFamily from employee data. Sets headcount from employee count per role.

**Step 3: Link export**

GET `/export-links` returns CSV content: `Name, Email, SurveyLink, Status` for all assignments in the campaign.

**Step 4: Commit**

```bash
git add src/app/api/projects/[id]/campaigns
git commit -m "feat: add survey campaign API with assignment generation and link export"
```

---

### Task 13: Build survey campaign management UI

**Files:**
- Create: `src/app/admin/surveys/page.tsx`
- Create: `src/app/admin/surveys/[campaignId]/page.tsx`
- Create: `src/components/campaign-create-dialog.tsx`
- Create: `src/components/campaign-dashboard.tsx`
- Create: `src/components/assignment-table.tsx`

**Step 1: Campaign list page**

`src/app/admin/surveys/page.tsx` — List of campaigns with status badges, response rates, and action buttons. "Create Campaign" button opens dialog.

**Step 2: Campaign creation dialog**

`src/components/campaign-create-dialog.tsx` — Form: name, mode selector (Individual/RoleBased), taxonomy level selector, employee filters (for Individual mode), role selection (for RoleBased mode).

**Step 3: Campaign detail page**

`src/app/admin/surveys/[campaignId]/page.tsx` — Shows campaign details, assignment table with response status, response rate progress bar, "Export Links CSV" button, "Activate"/"Close" campaign buttons.

**Step 4: Assignment table**

`src/components/assignment-table.tsx` — Shows each assignment: respondent name (or role), status (Pending/InProgress/Completed), link. Copy-link button per row.

**Step 5: Verify**

1. Create a campaign in Individual mode
2. Generate assignments
3. See assignment list with unique links
4. Export CSV of links
5. Activate campaign

**Step 6: Commit**

```bash
git add src/app/admin/surveys src/components/campaign-*.tsx src/components/assignment-table.tsx
git commit -m "feat: add survey campaign management UI with link generation"
```

---

### Task 14: Build survey respondent UI

**Files:**
- Create: `src/app/survey/[token]/page.tsx`
- Create: `src/app/api/survey/[token]/route.ts`
- Create: `src/app/api/survey/[token]/responses/route.ts`
- Create: `src/components/survey-form.tsx`
- Create: `src/components/activity-input.tsx`
- Create: `src/components/survey-progress-bar.tsx`

**Step 1: Survey data API route**

`src/app/api/survey/[token]/route.ts` — GET: Validates token, returns assignment info + taxonomy activities for the campaign's taxonomy level + any existing draft responses. No auth required.

**Step 2: Survey response save API**

`src/app/api/survey/[token]/responses/route.ts`:
- PUT: Saves draft responses (array of `{ taxonomyNodeId, percentTime }`). Updates assignment status to InProgress. Does NOT require sum=100.
- POST: Submits final responses. Validates sum=100. Sets assignment status to Completed and submittedAt timestamps.

**Step 3: Build activity input component**

`src/components/activity-input.tsx` — Single row for one activity: name label, number input (0-100), "I don't do this" button that sets to 0 and dims the row. Slider optional.

**Step 4: Build progress bar component**

`src/components/survey-progress-bar.tsx` — Shows "X% of 100% allocated". Green when exactly 100, yellow when under, red when over. Sticky at top of survey.

**Step 5: Build the survey form**

`src/components/survey-form.tsx` — Groups activities by parent Process/Process Group with collapsible sections. Running total at top. Auto-saves drafts every 30 seconds via PUT. "Submit" button validates sum=100, shows confirmation dialog, then POSTs.

**Step 6: Build the survey page**

`src/app/survey/[token]/page.tsx` — Server component that fetches assignment data. If token invalid, show error. If already completed, show summary. Otherwise render survey form. Mobile-friendly layout.

**Step 7: Build thank-you / summary view**

After submission (or when revisiting a completed survey), show a read-only summary of the allocation with a simple bar chart.

**Step 8: Verify full survey flow**

1. Create campaign, generate assignments
2. Open a survey link in incognito
3. Fill in percentages, see running total
4. Partially fill, close tab, reopen — draft restored
5. Complete to 100%, submit
6. See confirmation page
7. Admin dashboard shows Completed status

**Step 9: Commit**

```bash
git add src/app/survey src/app/api/survey src/components/survey-*.tsx src/components/activity-input.tsx
git commit -m "feat: add survey respondent UI with auto-save and validation"
```

---

## Phase 6: Analysis & Value Proposition

### Task 15: Build analysis computation engine

**Files:**
- Create: `src/lib/analysis/gap-analysis.ts`
- Create: `src/lib/analysis/cost-model.ts`
- Create: `src/lib/analysis/aggregation.ts`
- Create: `src/app/api/projects/[id]/analysis/route.ts`

**Step 1: Write gap analysis logic**

`src/lib/analysis/gap-analysis.ts`:

For each taxonomy activity node:
1. Get all survey responses for this node
2. For each response, look up the employee's location (via assignment → employee)
3. Calculate weighted FTE: `employee.fte * (percentTime / 100)`
4. Calculate weighted cost: `employee.fullyLoadedSalary * employee.fte * (percentTime / 100)`
5. Group by employee location
6. Compare against the node's effective preferred location (own or inherited)
7. Return: `{ nodeId, nodeName, currentLocationBreakdown, preferredLocation, fteGap, costGap }`

**Step 2: Write cost model logic**

`src/lib/analysis/cost-model.ts`:

For activities where current location != preferred location:
- `currentCost` = sum of weighted costs at non-preferred locations
- `futureCost` = same FTEs * project's sharedServicesSalary
- `savings` = currentCost - futureCost
- Handle role-based mode by multiplying by headcount

**Step 3: Write aggregation logic**

`src/lib/analysis/aggregation.ts`:

Roll up activity-level results to Process, Process Group, and Category levels. Sum FTEs, costs, and savings.

**Step 4: Create analysis API route**

`src/app/api/projects/[id]/analysis/route.ts` — GET returns the full analysis results: activity-level detail + rollups at each hierarchy level + project totals.

**Step 5: Verify with test data**

Seed a project with known values, submit surveys, call the analysis endpoint, and verify the numbers are correct.

**Step 6: Commit**

```bash
git add src/lib/analysis src/app/api/projects/[id]/analysis
git commit -m "feat: add gap analysis and cost modeling engine"
```

---

### Task 16: Build analysis dashboard UI

**Files:**
- Create: `src/app/admin/analysis/page.tsx`
- Create: `src/components/analysis/heat-map.tsx`
- Create: `src/components/analysis/sunburst-chart.tsx`
- Create: `src/components/analysis/waterfall-chart.tsx`
- Create: `src/components/analysis/location-comparison-bars.tsx`
- Create: `src/components/analysis/summary-table.tsx`
- Create: `src/components/analysis/kpi-cards.tsx`

**Step 1: Build KPI summary cards**

`src/components/analysis/kpi-cards.tsx` — Top-of-page cards: Total Current Cost, Total Future State Cost, Total Potential Savings, FTEs Affected, Response Rate.

**Step 2: Build the heat map**

`src/components/analysis/heat-map.tsx` — Matrix using Recharts. Rows = activities/processes, Columns = locations. Cell color intensity = FTE concentration. Red overlay where work is at non-preferred location.

**Step 3: Build the sunburst chart**

`src/components/analysis/sunburst-chart.tsx` — Hierarchical donut chart. Rings = taxonomy levels (inner=Category, outer=Activity). Segment size = FTE or cost. Color = alignment (green = at preferred, red = not at preferred).

**Step 4: Build the waterfall chart**

`src/components/analysis/waterfall-chart.tsx` — Using Recharts Bar chart in waterfall mode. Starts at total current cost, subtracts savings per process area, ends at future cost.

**Step 5: Build location comparison bars**

`src/components/analysis/location-comparison-bars.tsx` — Side-by-side bar chart per process area. Left bar = current location distribution, Right bar = preferred.

**Step 6: Build the summary table**

`src/components/analysis/summary-table.tsx` — Sortable data table: Activity, Current Location Mix (as mini bar), Preferred Location, FTE at non-preferred, Cost at non-preferred, Potential Savings. Drill-down by clicking a row to see employee-level detail.

**Step 7: Build the analysis page**

`src/app/admin/analysis/page.tsx` — Tabs or scrollable sections: Overview (KPIs), Heat Map, Sunburst, Waterfall, Comparison, Detail Table. Filters: by category, by location, by savings threshold.

**Step 8: Verify**

1. Complete a full workflow (taxonomy → employees → survey → responses)
2. Navigate to Analysis
3. See all charts populated with real data
4. Filter and drill down

**Step 9: Commit**

```bash
git add src/app/admin/analysis src/components/analysis
git commit -m "feat: add analysis dashboard with heat map, sunburst, waterfall, and summary table"
```

---

## Phase 7: Export & Reports

### Task 17: Build export functionality

**Files:**
- Create: `src/app/api/projects/[id]/analysis/export-excel/route.ts`
- Create: `src/app/api/projects/[id]/analysis/export-pdf/route.ts`
- Create: `src/components/analysis/export-buttons.tsx`
- Create: `src/lib/export/pdf-report.tsx`
- Create: `src/lib/export/excel-export.ts`

**Step 1: Build Excel export**

`src/lib/export/excel-export.ts` — Uses SheetJS (xlsx) to create a multi-sheet workbook:
- Sheet 1: Executive Summary (totals, top findings)
- Sheet 2: Activity Detail (full analysis table)
- Sheet 3: Employee Detail (responses with costs)
- Sheet 4: Location Comparison

API route streams the file as download.

**Step 2: Build PDF report**

`src/lib/export/pdf-report.tsx` — Uses @react-pdf/renderer to build a styled PDF:
- Title page with project name and date
- Executive summary with KPIs
- Top 10 savings opportunities table
- Key visualizations (rendered as images from Recharts)

API route generates and streams the PDF.

**Step 3: Build chart-to-image export**

Add a "Download PNG" button to each chart component using Recharts' built-in ref + canvas export.

**Step 4: Build export buttons component**

`src/components/analysis/export-buttons.tsx` — Row of buttons: "Export Excel", "Export PDF", "Export Charts (ZIP)". Each triggers the corresponding API endpoint.

**Step 5: Add export buttons to analysis page**

Wire `export-buttons.tsx` into the analysis page header.

**Step 6: Verify**

1. Click "Export Excel" → downloads .xlsx with correct data
2. Click "Export PDF" → downloads styled PDF report
3. Click download on individual chart → saves PNG

**Step 7: Commit**

```bash
git add src/app/api/projects/[id]/analysis/export-* src/components/analysis/export-buttons.tsx src/lib/export
git commit -m "feat: add Excel, PDF, and chart export functionality"
```

---

## Phase 8: Polish & Testing

### Task 18: Add loading states, error handling, and empty states

**Files:**
- Modify: all page components
- Create: `src/components/loading-spinner.tsx`
- Create: `src/components/empty-state.tsx`
- Create: `src/components/error-boundary.tsx`

**Step 1: Create shared UI components**

- `loading-spinner.tsx` — Consistent loading indicator
- `empty-state.tsx` — "No data yet" with call-to-action (e.g., "Import taxonomy to get started")
- `error-boundary.tsx` — Client error boundary with retry

**Step 2: Add loading and empty states to all pages**

- Taxonomy page: "No taxonomy loaded — Seed APQC or Import CSV"
- Employees page: "No employees imported — Import CSV"
- Surveys page: "No campaigns yet — Create your first campaign"
- Analysis page: "Need survey responses to generate analysis"

**Step 3: Add API error handling**

Wrap all API calls in try/catch with user-friendly error messages via toast notifications.

```bash
npx shadcn@latest add toast sonner
```

**Step 4: Commit**

```bash
git add src/components/loading-spinner.tsx src/components/empty-state.tsx src/components/error-boundary.tsx
git commit -m "feat: add loading states, empty states, and error handling"
```

---

### Task 19: Add end-to-end smoke tests

**Files:**
- Create: `src/__tests__/api/projects.test.ts`
- Create: `src/__tests__/api/taxonomy.test.ts`
- Create: `src/__tests__/api/employees.test.ts`
- Create: `src/__tests__/api/campaigns.test.ts`
- Create: `src/__tests__/api/survey.test.ts`
- Create: `src/__tests__/api/analysis.test.ts`

**Step 1: Set up test infrastructure**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Add vitest config to `vitest.config.ts`.

**Step 2: Write API integration tests**

Test the core happy path:
1. Create a project
2. Seed APQC taxonomy
3. Import employees via CSV
4. Create a campaign
5. Generate assignments
6. Submit survey responses
7. Run analysis — verify cost calculations

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/__tests__ vitest.config.ts
git commit -m "test: add API integration tests for full workflow"
```

---

### Task 20: Update home page and final cleanup

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/not-found.tsx`

**Step 1: Update the root page**

`src/app/page.tsx` — Simple landing that redirects to `/admin` if logged in, or shows a brief description with login link.

**Step 2: Update the root layout**

`src/app/layout.tsx` — Set page title "Activity Assessment Tool", add meta description.

**Step 3: Add 404 page**

`src/app/not-found.tsx` — Clean not-found page.

**Step 4: Final verification**

Run the full app, test complete workflow end-to-end:
1. Login → Create project → Seed taxonomy → Tag locations → Import employees → Create campaign → Generate links → Fill survey → View analysis → Export reports

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/not-found.tsx
git commit -m "feat: add landing page, metadata, and 404 page"
```

---

## Task Dependency Map

```
Task 1 (Next.js scaffold)
  └→ Task 2 (Prisma schema)
      └→ Task 3 (Prisma client + seed)
          ├→ Task 4 (NextAuth)
          │   └→ Task 5 (Login + admin layout)
          │       └→ Task 6 (Project API)
          │           └→ Task 7 (Project UI)
          │               ├→ Task 8 (Taxonomy API)
          │               │   └→ Task 9 (Taxonomy UI)
          │               ├→ Task 10 (Employee API)
          │               │   └→ Task 11 (Employee UI)
          │               └→ Task 12 (Campaign API)
          │                   └→ Task 13 (Campaign UI)
          │                       └→ Task 14 (Survey respondent UI)
          │                           └→ Task 15 (Analysis engine)
          │                               └→ Task 16 (Analysis dashboard)
          │                                   └→ Task 17 (Export)
          └→ Task 18 (Polish) — can run in parallel after Task 14
          └→ Task 19 (Tests) — can run after Task 15
          └→ Task 20 (Cleanup) — final
```

## Estimated Scope

- **20 tasks** across 8 phases
- Tasks 1-7: Foundation (~8 tasks of scaffolding, DB, auth, projects)
- Tasks 8-11: Data import (taxonomy + employees)
- Tasks 12-14: Survey engine (campaigns + respondent UI)
- Tasks 15-17: Analysis and export
- Tasks 18-20: Polish, testing, cleanup
