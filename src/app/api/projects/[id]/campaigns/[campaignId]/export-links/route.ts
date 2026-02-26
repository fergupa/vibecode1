import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, campaignId } = await params;

  const assignments = await prisma.surveyAssignment.findMany({
    where: {
      campaignId,
      campaign: { projectId: id },
    },
    include: {
      employee: { select: { name: true, email: true } },
    },
  });

  const baseUrl = req.nextUrl.origin;

  // Build CSV
  const lines = ["Name,Email,SurveyLink,Status"];
  for (const a of assignments) {
    const name = a.employee?.name || a.roleName || "Unknown";
    const email = a.employee?.email || "";
    const link = `${baseUrl}/survey/${a.token}`;
    lines.push(
      `"${name}","${email}","${link}","${a.status}"`
    );
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="survey-links-${campaignId}.csv"`,
    },
  });
}
