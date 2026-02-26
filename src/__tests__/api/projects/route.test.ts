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
