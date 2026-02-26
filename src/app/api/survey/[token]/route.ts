import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const assignment = await prisma.surveyAssignment.findUnique({
    where: { token },
    include: {
      employee: { select: { name: true, email: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          mode: true,
          taxonomyLevel: true,
          projectId: true,
        },
      },
      responses: {
        select: {
          taxonomyNodeId: true,
          percentTime: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Invalid survey link" },
      { status: 404 }
    );
  }

  if (assignment.campaign.status === "Draft") {
    return NextResponse.json(
      { error: "This survey is not yet active" },
      { status: 403 }
    );
  }

  // Fetch taxonomy activities at the campaign's taxonomy level
  const activities = await prisma.taxonomyNode.findMany({
    where: {
      projectId: assignment.campaign.projectId,
      level: assignment.campaign.taxonomyLevel,
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      parentId: true,
      level: true,
    },
  });

  // Also fetch parent nodes for grouping
  const parentIds = [
    ...new Set(activities.map((a) => a.parentId).filter(Boolean)),
  ];
  const parents = await prisma.taxonomyNode.findMany({
    where: { id: { in: parentIds as string[] } },
    select: { id: true, code: true, name: true, parentId: true },
  });

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      status: assignment.status,
      respondentName:
        assignment.employee?.name || assignment.roleName || "Respondent",
      headcount: assignment.headcount,
    },
    campaign: {
      name: assignment.campaign.name,
      mode: assignment.campaign.mode,
    },
    activities,
    parents,
    existingResponses: assignment.responses.map((r) => ({
      taxonomyNodeId: r.taxonomyNodeId,
      percentTime: Number(r.percentTime),
      submitted: !!r.submittedAt,
    })),
  });
}
