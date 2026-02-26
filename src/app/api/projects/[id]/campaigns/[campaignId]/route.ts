import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, campaignId } = await params;
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId, projectId: id },
    include: {
      assignments: {
        include: {
          employee: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!campaign)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(campaign);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, campaignId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name.trim();
  if (body.status) {
    if (!["Draft", "Active", "Closed"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }
    data.status = body.status;
    if (body.status === "Closed") data.closedAt = new Date();
  }

  const campaign = await prisma.surveyCampaign.update({
    where: { id: campaignId, projectId: id },
    data,
  });

  return NextResponse.json(campaign);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, campaignId } = await params;
  await prisma.surveyCampaign.delete({
    where: { id: campaignId, projectId: id },
  });
  return NextResponse.json({ ok: true });
}
