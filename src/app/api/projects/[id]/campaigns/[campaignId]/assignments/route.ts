import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, campaignId } = await params;

  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId, projectId: id },
  });

  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Check if assignments already exist
  const existingCount = await prisma.surveyAssignment.count({
    where: { campaignId },
  });
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Assignments already generated. Delete campaign to regenerate." },
      { status: 400 }
    );
  }

  let created = 0;

  if (campaign.mode === "Individual") {
    // Get filters from request body
    const body = await req.json().catch(() => ({}));
    const where: Record<string, unknown> = { projectId: id };
    if (body.department) where.department = body.department;
    if (body.location) where.location = body.location;
    if (body.businessUnit) where.businessUnit = body.businessUnit;

    const employees = await prisma.employee.findMany({ where });

    for (const emp of employees) {
      await prisma.surveyAssignment.create({
        data: {
          campaignId,
          employeeId: emp.id,
          token: randomUUID(),
        },
      });
      created++;
    }
  } else {
    // RoleBased mode — one assignment per unique jobFamily
    const employees = await prisma.employee.findMany({
      where: { projectId: id },
    });

    const roleMap = new Map<string, number>();
    for (const emp of employees) {
      const role = emp.jobFamily || "General";
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    }

    for (const [roleName, headcount] of roleMap) {
      await prisma.surveyAssignment.create({
        data: {
          campaignId,
          roleName,
          headcount,
          token: randomUUID(),
        },
      });
      created++;
    }
  }

  return NextResponse.json(
    { message: `Created ${created} assignments`, count: created },
    { status: 201 }
  );
}
