import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { taxonomyNodes: true, employees: true, surveyCampaigns: true },
      },
      surveyCampaigns: {
        select: {
          status: true,
          _count: { select: { assignments: true } },
          assignments: { select: { status: true } },
        },
      },
      sharedServiceLocations: {
        orderBy: [{ isDefault: "desc" as const }, { name: "asc" as const }],
      },
    },
  });

  const result = projects.map((p) => {
    const campaignStats = {
      total: p.surveyCampaigns.length,
      draft: p.surveyCampaigns.filter((c) => c.status === "Draft").length,
      active: p.surveyCampaigns.filter((c) => c.status === "Active").length,
      closed: p.surveyCampaigns.filter((c) => c.status === "Closed").length,
      totalAssignments: p.surveyCampaigns.reduce(
        (sum, c) => sum + c._count.assignments,
        0
      ),
      completedAssignments: p.surveyCampaigns.reduce(
        (sum, c) =>
          sum + c.assignments.filter((a) => a.status === "Completed").length,
        0
      ),
    };
    const { surveyCampaigns: _, ...project } = p;
    return { ...project, campaignStats };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, sscLocations } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ...(sscLocations &&
        Array.isArray(sscLocations) &&
        sscLocations.length > 0 && {
          sharedServiceLocations: {
            create: sscLocations.map(
              (
                loc: { name: string; salary: number; isDefault?: boolean },
                i: number
              ) => ({
                name: loc.name.trim(),
                salary: loc.salary,
                isDefault: loc.isDefault ?? i === 0,
              })
            ),
          },
        }),
    },
    include: { sharedServiceLocations: true },
  });

  return NextResponse.json(project, { status: 201 });
}
