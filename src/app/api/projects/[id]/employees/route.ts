import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = req.nextUrl;
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
  const search = url.searchParams.get("search") || "";
  const department = url.searchParams.get("department") || "";
  const location = url.searchParams.get("location") || "";
  const businessUnit = url.searchParams.get("businessUnit") || "";

  const where: Record<string, unknown> = { projectId: id };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
    ];
  }
  if (department) where.department = department;
  if (location) where.location = location;
  if (businessUnit) where.businessUnit = businessUnit;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({
    employees,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.name || !body.employeeId) {
    return NextResponse.json(
      { error: "name and employeeId are required" },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.create({
    data: {
      projectId: id,
      employeeId: body.employeeId.trim(),
      name: body.name.trim(),
      email: body.email?.trim() || null,
      title: body.title?.trim() || "",
      department: body.department?.trim() || null,
      location: body.location?.trim() || "",
      businessUnit: body.businessUnit?.trim() || null,
      fullyLoadedSalary: body.fullyLoadedSalary ?? 0,
      fte: body.fte ?? 1.0,
      jobFamily: body.jobFamily?.trim() || null,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
