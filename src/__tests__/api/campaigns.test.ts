import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/projects/[id]/campaigns/route";

const mockGetSession = vi.mocked(getServerSession);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/projects/[id]/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/campaigns");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns campaigns with computed response rate", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const mockCampaigns = [
      {
        id: "c1",
        projectId: "p1",
        name: "Q1 Survey",
        status: "Active",
        mode: "Individual",
        taxonomyLevel: 4,
        createdAt: new Date(),
        closedAt: null,
        _count: { assignments: 3 },
        assignments: [
          { status: "Completed" },
          { status: "Completed" },
          { status: "Pending" },
        ],
      },
    ];
    vi.mocked(prisma.surveyCampaign.findMany).mockResolvedValue(mockCampaigns as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/campaigns");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].responseRate).toBe(67); // 2/3 = 67%
    expect(body[0].completedCount).toBe(2);
    expect(body[0].totalAssignments).toBe(3);
  });
});

describe("POST /api/projects/[id]/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when name is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects/p1/campaigns", {
      method: "POST",
      body: JSON.stringify({ mode: "Individual" }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid mode", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects/p1/campaigns", {
      method: "POST",
      body: JSON.stringify({ name: "Test", mode: "InvalidMode" }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("mode must be");
  });

  it("creates campaign with valid data", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const created = {
      id: "c1",
      projectId: "p1",
      name: "Q1 Survey",
      status: "Draft",
      mode: "Individual",
      taxonomyLevel: 4,
      createdAt: new Date(),
      closedAt: null,
    };
    vi.mocked(prisma.surveyCampaign.create).mockResolvedValue(created as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/campaigns", {
      method: "POST",
      body: JSON.stringify({ name: "Q1 Survey", mode: "Individual" }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Q1 Survey");
    expect(body.mode).toBe("Individual");
  });
});
