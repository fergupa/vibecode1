# Testing Infrastructure Design

**Date:** 2026-02-26
**Approach:** Vitest + Direct Handler Testing (unit + API tests)

## Overview

Set up Vitest-based testing for the Activity Assessment Tool. Tests cover utility functions, API route handlers, and auth middleware using direct imports with mocked dependencies (Prisma, NextAuth).

## Dependencies

- `vitest` — test runner (dev dependency)
- `@vitejs/plugin-react` — JSX/path alias support (dev dependency)

## Configuration

### vitest.config.ts

- Path alias: `@/*` → `./src/*` (matches tsconfig)
- Test environment: `node`
- Test pattern: `src/**/*.test.ts`
- Global test APIs disabled (explicit imports from `vitest`)

## Directory Structure

```
src/
  __tests__/
    lib/
      utils.test.ts
    api/
      projects/
        route.test.ts
        [id]/
          route.test.ts
    middleware.test.ts
  __mocks__/
    prisma.ts
```

## Mocking Strategy

### Prisma (`src/__mocks__/prisma.ts`)

Shared mock exporting a `prisma` object with `vi.fn()` stubs for all Prisma methods used in the codebase:
- `project.findMany`
- `project.findUnique`
- `project.create`
- `project.update`
- `project.delete`
- `adminUser.findUnique`

Tests mock `@/lib/prisma` to use this shared mock.

### NextAuth

- Mock `next-auth` → `getServerSession` returns a session object or null
- Mock `next-auth/jwt` → `getToken` returns a token object or null

### NextRequest

Construct real `NextRequest` objects with test URLs and JSON bodies. No HTTP server needed.

## Test Coverage

| Test File | Covers |
|-----------|--------|
| `utils.test.ts` | `cn()` class name merging |
| `projects/route.test.ts` | `GET /api/projects` — list projects, 401 unauthed |
|  | `POST /api/projects` — create with valid name, reject empty name, 401 unauthed |
| `projects/[id]/route.test.ts` | `GET` — find by id, 404 missing, 401 unauthed |
|  | `PATCH` — update fields, 401 unauthed |
|  | `DELETE` — remove project, 401 unauthed |
| `middleware.test.ts` | Redirect to /login without token, pass through with token, only match `/admin/*` |

## package.json Scripts

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

## Implementation Steps

1. Install dependencies (`vitest`, `@vitejs/plugin-react`)
2. Create `vitest.config.ts`
3. Add test scripts to `package.json`
4. Create `src/__mocks__/prisma.ts`
5. Write `src/__tests__/lib/utils.test.ts`
6. Write `src/__tests__/api/projects/route.test.ts`
7. Write `src/__tests__/api/projects/[id]/route.test.ts`
8. Write `src/__tests__/middleware.test.ts`
9. Run all tests and verify passing
