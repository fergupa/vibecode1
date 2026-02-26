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
