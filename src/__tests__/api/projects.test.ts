import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/projects/route";

const mockGetSession = vi.mocked(getServerSession);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns projects list when authenticated", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const mockProjects = [
      {
        id: "p1",
        name: "Test Project",
        description: null,
        createdAt: new Date(),
        _count: { taxonomyNodes: 5, employees: 10, surveyCampaigns: 2 },
      },
    ];
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Test Project");
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Name is required");
  });

  it("creates project with valid data", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const created = {
      id: "p1",
      name: "New Project",
      description: "A test project",
      createdAt: new Date(),
    };
    vi.mocked(prisma.project.create).mockResolvedValue(created as never);

    const req = makeRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "New Project", description: "A test project" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("New Project");
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: "New Project", description: "A test project" },
    });
  });

  it("trims whitespace from name", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: "p2",
      name: "Trimmed",
      description: null,
      createdAt: new Date(),
    } as never);

    const req = makeRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "  Trimmed  " }),
    });
    await POST(req);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: "Trimmed", description: null },
    });
  });
});
