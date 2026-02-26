import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runGapAnalysis } from "@/lib/analysis/gap-analysis";
import { computeCostModel } from "@/lib/analysis/cost-model";
import { aggregateResults } from "@/lib/analysis/aggregation";
import { buildExcelBuffer } from "@/lib/export/excel-export";

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
    select: { name: true, sharedServicesSalary: true },
  });

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const sharedServicesSalary = Number(project.sharedServicesSalary ?? 75000);

  // Run analysis
  const gapAnalysis = await runGapAnalysis(id);
  const costModel = computeCostModel(gapAnalysis, sharedServicesSalary);
  const { nodes, totals } = aggregateResults(gapAnalysis, costModel);

  // Get response rate
  const campaigns = await prisma.surveyCampaign.findMany({
    where: { projectId: id },
    include: { assignments: { select: { status: true } } },
  });
  let totalA = 0, completedA = 0;
  for (const c of campaigns) {
    totalA += c.assignments.length;
    completedA += c.assignments.filter((a) => a.status === "Completed").length;
  }

  const buffer = buildExcelBuffer(project.name, {
    ...totals,
    responseRate: totalA > 0 ? Math.round((completedA / totalA) * 100) : 0,
  }, nodes);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analysis-${project.name.replace(/\s+/g, "-")}.xlsx"`,
    },
  });
}
