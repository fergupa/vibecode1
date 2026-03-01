import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runGapAnalysis } from "@/lib/analysis/gap-analysis";
import { computeCostModel } from "@/lib/analysis/cost-model";
import { aggregateResults } from "@/lib/analysis/aggregation";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PdfReport } from "@/lib/export/pdf-report";

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
    select: {
      name: true,
      sharedServicesSalary: true,
      sharedServiceLocations: true,
      routingRules: {
        select: { regionMatch: true, categoryMatch: true, sscLocationId: true },
      },
    },
  });

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const sscSalaryMap = new Map<string | null, number>();
  if (project.sharedServiceLocations.length > 0) {
    for (const loc of project.sharedServiceLocations) {
      sscSalaryMap.set(loc.id, Number(loc.salary));
      if (loc.isDefault) sscSalaryMap.set(null, Number(loc.salary));
    }
  } else {
    sscSalaryMap.set(null, Number(project.sharedServicesSalary ?? 75000));
  }

  // Run analysis
  const gapAnalysis = await runGapAnalysis(id);
  const costModel = computeCostModel(gapAnalysis, sscSalaryMap, project.routingRules);
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
  const responseRate = totalA > 0 ? Math.round((completedA / totalA) * 100) : 0;

  const topSavings = nodes
    .filter((n) => n.savings > 0)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 10);

  const date = new Date().toISOString().split("T")[0];

  const element = React.createElement(PdfReport, {
    projectName: project.name,
    date,
    totals: { ...totals, responseRate },
    topSavings,
  });
  // renderToBuffer expects a Document element; our component returns one
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analysis-${project.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
