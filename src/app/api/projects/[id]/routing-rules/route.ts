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
  const rules = await prisma.routingRule.findMany({
    where: { projectId: id },
    include: {
      sscLocation: {
        select: { id: true, name: true, salary: true },
      },
    },
    orderBy: [{ regionMatch: "asc" }, { categoryMatch: "asc" }],
  });

  return NextResponse.json(rules);
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
  const { regionMatch, categoryMatch, sscLocationId } = body;

  if (!regionMatch && !categoryMatch) {
    return NextResponse.json(
      { error: "At least one of regionMatch or categoryMatch is required" },
      { status: 400 }
    );
  }

  if (!sscLocationId) {
    return NextResponse.json(
      { error: "sscLocationId is required" },
      { status: 400 }
    );
  }

  // Validate SSC location belongs to this project
  const sscLocation = await prisma.sharedServiceLocation.findUnique({
    where: { id: sscLocationId },
  });
  if (!sscLocation || sscLocation.projectId !== id) {
    return NextResponse.json(
      { error: "SSC location not found in this project" },
      { status: 400 }
    );
  }

  const rule = await prisma.routingRule.create({
    data: {
      projectId: id,
      regionMatch: regionMatch?.trim() || null,
      categoryMatch: categoryMatch?.trim() || null,
      sscLocationId,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
