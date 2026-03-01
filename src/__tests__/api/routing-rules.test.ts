import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/projects/[id]/routing-rules/route";
import { DELETE } from "@/app/api/projects/[id]/routing-rules/[ruleId]/route";

const mockGetSession = vi.mocked(getServerSession);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRuleParams(id: string, ruleId: string) {
  return { params: Promise.resolve({ id, ruleId }) };
}

describe("GET /api/projects/[id]/routing-rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns routing rules with SSC location details", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const mockRules = [
      {
        id: "r1",
        projectId: "p1",
        regionMatch: "Americas",
        categoryMatch: "8.0",
        sscLocationId: "loc1",
        sscLocation: { id: "loc1", name: "Mexico SSC", salary: 45000 },
      },
    ];
    vi.mocked(prisma.routingRule.findMany).mockResolvedValue(mockRules as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].regionMatch).toBe("Americas");
    expect(body[0].sscLocation.name).toBe("Mexico SSC");
  });
});

describe("POST /api/projects/[id]/routing-rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when both regionMatch and categoryMatch are null", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules", {
      method: "POST",
      body: JSON.stringify({ sscLocationId: "loc1" }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("creates routing rule with valid data", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    vi.mocked(prisma.sharedServiceLocation.findUnique).mockResolvedValue({
      id: "loc1",
      projectId: "p1",
      name: "Mexico",
      salary: 45000,
      isDefault: false,
    } as never);
    const created = {
      id: "r1",
      projectId: "p1",
      regionMatch: "Americas",
      categoryMatch: "8.0",
      sscLocationId: "loc1",
    };
    vi.mocked(prisma.routingRule.create).mockResolvedValue(created as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules", {
      method: "POST",
      body: JSON.stringify({
        regionMatch: "Americas",
        categoryMatch: "8.0",
        sscLocationId: "loc1",
      }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.regionMatch).toBe("Americas");
  });
});

describe("DELETE /api/projects/[id]/routing-rules/[ruleId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules/r1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeRuleParams("p1", "r1"));
    expect(res.status).toBe(401);
  });

  it("deletes routing rule", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    vi.mocked(prisma.routingRule.findUnique).mockResolvedValue({
      id: "r1",
      projectId: "p1",
    } as never);
    vi.mocked(prisma.routingRule.delete).mockResolvedValue({} as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/routing-rules/r1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeRuleParams("p1", "r1"));
    expect(res.status).toBe(200);
  });
});
