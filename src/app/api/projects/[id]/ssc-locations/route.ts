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
  const locations = await prisma.sharedServiceLocation.findMany({
    where: { projectId: id },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(locations);
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
  const { name, salary, isDefault } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (salary === undefined || typeof salary !== "number" || salary <= 0) {
    return NextResponse.json(
      { error: "Salary must be a positive number" },
      { status: 400 }
    );
  }

  // Check if this is the first location for the project
  const existingCount = await prisma.sharedServiceLocation.findMany({
    where: { projectId: id },
    select: { id: true },
  });
  const forceDefault = existingCount.length === 0;

  const shouldBeDefault = forceDefault || isDefault === true;

  const location = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.sharedServiceLocation.updateMany({
        where: { projectId: id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.sharedServiceLocation.create({
      data: {
        projectId: id,
        name: name.trim(),
        salary,
        isDefault: shouldBeDefault,
      },
    });
  });

  return NextResponse.json(location, { status: 201 });
}
