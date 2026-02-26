import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/projects/[id]/employees/route";

const mockGetSession = vi.mocked(getServerSession);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/projects/[id]/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/projects/p1/employees");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns paginated employee list", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const mockEmployees = [
      {
        id: "e1",
        projectId: "p1",
        employeeId: "EMP001",
        name: "John Doe",
        email: "john@test.com",
        title: "Analyst",
        location: "New York",
        department: "Finance",
        businessUnit: null,
        fullyLoadedSalary: 100000,
        fte: 1.0,
        jobFamily: "Finance",
      },
    ];
    vi.mocked(prisma.employee.findMany).mockResolvedValue(mockEmployees as never);
    vi.mocked(prisma.employee.count).mockResolvedValue(1 as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/employees?page=1&limit=50");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.employees).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  it("respects search filter", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    vi.mocked(prisma.employee.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.employee.count).mockResolvedValue(0 as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/employees?search=john");
    await GET(req, makeParams("p1"));

    const findManyCall = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(findManyCall?.where).toHaveProperty("OR");
  });
});

describe("POST /api/projects/[id]/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const req = makeRequest("http://localhost:3000/api/projects/p1/employees", {
      method: "POST",
      body: JSON.stringify({ name: "John" }), // missing employeeId
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("creates employee with valid data and defaults", async () => {
    mockGetSession.mockResolvedValue({ user: { name: "admin" } });
    const created = {
      id: "e1",
      projectId: "p1",
      employeeId: "EMP001",
      name: "Jane Doe",
      email: null,
      title: "",
      location: "",
      department: null,
      businessUnit: null,
      fullyLoadedSalary: 0,
      fte: 1.0,
      jobFamily: null,
    };
    vi.mocked(prisma.employee.create).mockResolvedValue(created as never);

    const req = makeRequest("http://localhost:3000/api/projects/p1/employees", {
      method: "POST",
      body: JSON.stringify({ name: "Jane Doe", employeeId: "EMP001" }),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(201);

    const createCall = vi.mocked(prisma.employee.create).mock.calls[0][0];
    expect(createCall.data.name).toBe("Jane Doe");
    expect(createCall.data.title).toBe(""); // defaults to empty string
    expect(createCall.data.fullyLoadedSalary).toBe(0); // defaults to 0
  });
});
