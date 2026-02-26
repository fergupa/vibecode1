import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/projects/[id]/taxonomy/route";

const mockGetSession = vi.mocked(getServerSession);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/projects/[id]/taxonomy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/taxonomy");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns taxonomy nodes ordered by level and sort order", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const mockNodes = [
      { id: "n1", code: "1.0", name: "Category 1", level: 1, parentId: null, projectId: "p1" },
      { id: "n2", code: "1.1", name: "Process 1.1", level: 2, parentId: "n1", projectId: "p1" },
    ];
    vi.mocked(prisma.taxonomyNode.findMany).mockResolvedValue(mockNodes as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/taxonomy");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].code).toBe("1.0");
    expect(prisma.taxonomyNode.findMany).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
    });
  });
});

describe("POST /api/projects/[id]/taxonomy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects/p1/taxonomy", {
      method: "POST",
      body: JSON.stringify({ code: "1.0" }), // missing name and level
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("creates taxonomy node with valid data", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const created = {
      id: "n1",
      projectId: "p1",
      code: "1.0",
      name: "Finance",
      level: 1,
      parentId: null,
      description: null,
      sortOrder: 0,
    };
    vi.mocked(prisma.taxonomyNode.create).mockResolvedValue(created as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/taxonomy", {
      method: "POST",
      body: JSON.stringify({ code: "1.0", name: "Finance", level: 1 }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("1.0");
    expect(body.name).toBe("Finance");
  });
});
