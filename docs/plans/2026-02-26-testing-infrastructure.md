# Testing Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Vitest testing infrastructure with unit tests for utilities, API route handlers, and auth middleware.

**Architecture:** Vitest as test runner with direct handler testing. Mock Prisma client and NextAuth at the module level using `vi.mock()`. Construct real `NextRequest` objects to test API routes without an HTTP server.

**Tech Stack:** Vitest, @vitejs/plugin-react, Next.js 16 App Router, Prisma 7, NextAuth 4

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install vitest and plugin**

Run:
```bash
npm install -D vitest @vitejs/plugin-react
```
Expected: packages added to devDependencies in package.json

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install vitest and react plugin"
```

---

### Task 2: Create Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts)

**Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    restoreMocks: true,
  },
});
```

**Step 2: Add test scripts to package.json**

Add these to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Step 3: Verify config loads**

Run:
```bash
npx vitest run
```
Expected: "No test files found" (no error about config)

**Step 4: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: add vitest configuration and test scripts"
```

---

### Task 3: Create Prisma Mock

**Files:**
- Create: `src/__mocks__/prisma.ts`

**Step 1: Create the shared Prisma mock**

```ts
import { vi } from "vitest";

export const prisma = {
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  adminUser: {
    findUnique: vi.fn(),
  },
};
```

This mock is used by test files via `vi.mock("@/lib/prisma", () => import("@/__mocks__/prisma"))`.

**Step 2: Commit**

```bash
git add src/__mocks__/prisma.ts
git commit -m "test: add shared Prisma client mock"
```

---

### Task 4: Write and Pass Utils Tests

**Files:**
- Create: `src/__tests__/lib/utils.test.ts`
- Reference: `src/lib/utils.ts`

**Step 1: Write the test file**

```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});
```

**Step 2: Run the test**

Run:
```bash
npx vitest run src/__tests__/lib/utils.test.ts
```
Expected: All 4 tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/lib/utils.test.ts
git commit -m "test: add unit tests for cn utility"
```

---

### Task 5: Write and Pass Projects List/Create Route Tests

**Files:**
- Create: `src/__tests__/api/projects/route.test.ts`
- Reference: `src/app/api/projects/route.ts`

**Step 1: Write the test file**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma before importing route handlers
vi.mock("@/lib/prisma", () => import("@/__mocks__/prisma"));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { GET, POST } from "@/app/api/projects/route";
import { prisma } from "@/__mocks__/prisma";
import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns projects when authenticated", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });

    const mockProjects = [
      { id: "1", name: "Project A", _count: { taxonomyNodes: 0, employees: 0, surveyCampaigns: 0 } },
    ];
    prisma.project.findMany.mockResolvedValue(mockProjects);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockProjects);
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { taxonomyNodes: true, employees: true, surveyCampaigns: true },
        },
      },
    });
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Name is required");
  });

  it("returns 400 when name is empty string", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates project with valid name", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });

    const mockProject = { id: "1", name: "New Project", description: null };
    prisma.project.create.mockResolvedValue(mockProject);

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "  New Project  ", description: "  A desc  " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toEqual(mockProject);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: "New Project", description: "A desc" },
    });
  });
});
```

**Step 2: Run the tests**

Run:
```bash
npx vitest run src/__tests__/api/projects/route.test.ts
```
Expected: All 6 tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/api/projects/route.test.ts
git commit -m "test: add tests for GET/POST /api/projects"
```

---

### Task 6: Write and Pass Projects [id] Route Tests

**Files:**
- Create: `src/__tests__/api/projects/[id]/route.test.ts`
- Reference: `src/app/api/projects/[id]/route.ts`

**Step 1: Write the test file**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => import("@/__mocks__/prisma"));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { GET, PATCH, DELETE } from "@/app/api/projects/[id]/route";
import { prisma } from "@/__mocks__/prisma";
import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

// Helper: the [id] route handlers receive params as a Promise
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/projects/1");
    const res = await GET(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });
    prisma.project.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/projects/missing");
    const res = await GET(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns project when found", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });

    const mockProject = { id: "1", name: "Test", _count: { taxonomyNodes: 0, employees: 0, surveyCampaigns: 0 } };
    prisma.project.findUnique.mockResolvedValue(mockProject);

    const req = new NextRequest("http://localhost/api/projects/1");
    const res = await GET(req, makeParams("1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockProject);
  });
});

describe("PATCH /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/projects/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("updates project fields", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });

    const mockProject = { id: "1", name: "Updated", description: null };
    prisma.project.update.mockResolvedValue(mockProject);

    const req = new NextRequest("http://localhost/api/projects/1", {
      method: "PATCH",
      body: JSON.stringify({ name: " Updated " }),
    });
    const res = await PATCH(req, makeParams("1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockProject);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { name: "Updated" },
    });
  });
});

describe("DELETE /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/projects/1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("deletes project and returns ok", async () => {
    mockedGetServerSession.mockResolvedValue({ user: { name: "admin" } });
    prisma.project.delete.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/projects/1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});
```

**Step 2: Run the tests**

Run:
```bash
npx vitest run src/__tests__/api/projects/[id]/route.test.ts
```
Expected: All 7 tests PASS

**Step 3: Commit**

```bash
git add "src/__tests__/api/projects/[id]/route.test.ts"
git commit -m "test: add tests for GET/PATCH/DELETE /api/projects/[id]"
```

---

### Task 7: Write and Pass Middleware Tests

**Files:**
- Create: `src/__tests__/middleware.test.ts`
- Reference: `src/middleware.ts`

**Step 1: Write the test file**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { middleware } from "@/middleware";
import { getToken } from "next-auth/jwt";

const mockedGetToken = vi.mocked(getToken);

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no token on admin route", async () => {
    mockedGetToken.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/admin/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=");
  });

  it("allows request through when token exists", async () => {
    mockedGetToken.mockResolvedValue({ name: "admin", sub: "1" });

    const req = new NextRequest("http://localhost/admin/dashboard");
    const res = await middleware(req);

    // NextResponse.next() returns a response that passes through
    expect(res.headers.get("location")).toBeNull();
  });
});
```

**Step 2: Run the tests**

Run:
```bash
npx vitest run src/__tests__/middleware.test.ts
```
Expected: All 2 tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/middleware.test.ts
git commit -m "test: add middleware auth tests"
```

---

### Task 8: Run Full Test Suite

**Step 1: Run all tests**

Run:
```bash
npm test
```
Expected: All tests pass (approximately 19 tests across 4 files)

**Step 2: Final commit if any cleanup needed**

If all tests pass with no changes needed, this task is done.
