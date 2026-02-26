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
  const campaigns = await prisma.surveyCampaign.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        select: { status: true },
      },
    },
  });

  // Add computed response rate
  const result = campaigns.map((c) => {
    const total = c.assignments.length;
    const completed = c.assignments.filter(
      (a) => a.status === "Completed"
    ).length;
    return {
      ...c,
      assignments: undefined,
      responseRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedCount: completed,
      totalAssignments: total,
    };
  });

  return NextResponse.json(result);
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
  const { name, mode, taxonomyLevel } = body;

  if (!name || !mode) {
    return NextResponse.json(
      { error: "name and mode are required" },
      { status: 400 }
    );
  }

  if (!["Individual", "RoleBased"].includes(mode)) {
    return NextResponse.json(
      { error: "mode must be Individual or RoleBased" },
      { status: 400 }
    );
  }

  const campaign = await prisma.surveyCampaign.create({
    data: {
      projectId: id,
      name: name.trim(),
      mode,
      taxonomyLevel: taxonomyLevel ?? 4,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
