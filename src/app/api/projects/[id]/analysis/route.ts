import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runGapAnalysis } from "@/lib/analysis/gap-analysis";
import { computeCostModel } from "@/lib/analysis/cost-model";
import { aggregateResults } from "@/lib/analysis/aggregation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { sharedServicesSalary: true },
  });

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const sharedServicesSalary = Number(project.sharedServicesSalary ?? 75000);

  // Get response rate
  const campaigns = await prisma.surveyCampaign.findMany({
    where: { projectId: id },
    include: {
      assignments: { select: { status: true } },
    },
  });

  let totalAssignments = 0;
  let completedAssignments = 0;
  for (const c of campaigns) {
    totalAssignments += c.assignments.length;
    completedAssignments += c.assignments.filter(
      (a) => a.status === "Completed"
    ).length;
  }

  const responseRate =
    totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

  // Run analysis pipeline
  const gapAnalysis = await runGapAnalysis(id);
  const costModel = computeCostModel(gapAnalysis, sharedServicesSalary);
  const { nodes, totals } = aggregateResults(gapAnalysis, costModel);

  return NextResponse.json({
    totals: {
      ...totals,
      responseRate,
      totalAssignments,
      completedAssignments,
      sharedServicesSalary,
    },
    nodes,
  });
}
