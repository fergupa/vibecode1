import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/survey/[token]/route";
import { PUT, POST } from "@/app/api/survey/[token]/responses/route";

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("GET /api/survey/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for invalid token", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue(null as never);
    const req = makeRequest("http://localhost:3000/api/survey/bad-token");
    const res = await GET(req, makeParams("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when campaign is in Draft status", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue({
      id: "a1",
      token: "test-token",
      status: "Pending",
      headcount: 1,
      employee: { name: "John", email: "john@test.com" },
      campaign: {
        id: "c1",
        name: "Q1",
        status: "Draft",
        mode: "Individual",
        taxonomyLevel: 4,
        projectId: "p1",
      },
      responses: [],
    } as never);

    const req = makeRequest("http://localhost:3000/api/survey/test-token");
    const res = await GET(req, makeParams("test-token"));
    expect(res.status).toBe(403);
  });

  it("returns survey data for active campaign", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue({
      id: "a1",
      token: "test-token",
      status: "Pending",
      headcount: 1,
      roleName: null,
      employee: { name: "John", email: "john@test.com" },
      campaign: {
        id: "c1",
        name: "Q1",
        status: "Active",
        mode: "Individual",
        taxonomyLevel: 4,
        projectId: "p1",
      },
      responses: [],
    } as never);
    vi.mocked(prisma.taxonomyNode.findMany)
      .mockResolvedValueOnce([
        { id: "act1", code: "1.1.1.1", name: "Activity 1", parentId: "proc1", level: 4 },
      ] as never)
      .mockResolvedValueOnce([
        { id: "proc1", code: "1.1.1", name: "Process 1", parentId: null },
      ] as never);

    const req = makeRequest("http://localhost:3000/api/survey/test-token");
    const res = await GET(req, makeParams("test-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignment.respondentName).toBe("John");
    expect(body.activities).toHaveLength(1);
    expect(body.parents).toHaveLength(1);
  });
});

describe("PUT /api/survey/[token]/responses (draft save)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for invalid token", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue(null as never);
    const req = makeRequest("http://localhost:3000/api/survey/bad/responses", {
      method: "PUT",
      body: JSON.stringify({ responses: [] }),
    });
    const res = await PUT(req, makeParams("bad"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when survey already completed", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue({
      id: "a1",
      status: "Completed",
      campaign: { status: "Active" },
    } as never);
    const req = makeRequest("http://localhost:3000/api/survey/tok/responses", {
      method: "PUT",
      body: JSON.stringify({ responses: [{ taxonomyNodeId: "n1", percentTime: 50 }] }),
    });
    const res = await PUT(req, makeParams("tok"));
    expect(res.status).toBe(400);
  });

  it("saves draft responses and updates status to InProgress", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue({
      id: "a1",
      status: "Pending",
      campaign: { status: "Active" },
    } as never);
    vi.mocked(prisma.surveyResponse.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.surveyAssignment.update).mockResolvedValue({} as never);

    const req = makeRequest("http://localhost:3000/api/survey/tok/responses", {
      method: "PUT",
      body: JSON.stringify({
        responses: [
          { taxonomyNodeId: "n1", percentTime: 30 },
          { taxonomyNodeId: "n2", percentTime: 20 },
        ],
      }),
    });
    const res = await PUT(req, makeParams("tok"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toBe(2);
    expect(prisma.surveyResponse.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.surveyAssignment.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "InProgress" },
    });
  });
});

describe("POST /api/survey/[token]/responses (final submit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when total does not equal 100%", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue({
      id: "a1",
      status: "InProgress",
      campaign: { status: "Active" },
    } as never);
    const req = makeRequest("http://localhost:3000/api/survey/tok/responses", {
      method: "POST",
      body: JSON.stringify({
        responses: [
          { taxonomyNodeId: "n1", percentTime: 30 },
          { taxonomyNodeId: "n2", percentTime: 20 },
        ],
      }),
    });
    const res = await POST(req, makeParams("tok"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("100%");
  });

  it("submits responses and marks assignment as Completed", async () => {
    vi.mocked(prisma.surveyAssignment.findUnique).mockResolvedValue({
      id: "a1",
      status: "InProgress",
      campaign: { status: "Active" },
    } as never);
    vi.mocked(prisma.surveyResponse.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.surveyAssignment.update).mockResolvedValue({} as never);

    const req = makeRequest("http://localhost:3000/api/survey/tok/responses", {
      method: "POST",
      body: JSON.stringify({
        responses: [
          { taxonomyNodeId: "n1", percentTime: 60 },
          { taxonomyNodeId: "n2", percentTime: 40 },
        ],
      }),
    });
    const res = await POST(req, makeParams("tok"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submitted).toBe(true);
    expect(prisma.surveyAssignment.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "Completed" },
    });
  });
});
