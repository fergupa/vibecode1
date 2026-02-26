import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ResponseEntry = {
  taxonomyNodeId: string;
  percentTime: number;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const assignment = await prisma.surveyAssignment.findUnique({
    where: { token },
    include: { campaign: { select: { status: true } } },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (assignment.status === "Completed") {
    return NextResponse.json(
      { error: "Survey already submitted" },
      { status: 400 }
    );
  }

  if (assignment.campaign.status !== "Active") {
    return NextResponse.json(
      { error: "Campaign is not active" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const responses: ResponseEntry[] = body.responses;

  if (!Array.isArray(responses)) {
    return NextResponse.json(
      { error: "responses must be an array" },
      { status: 400 }
    );
  }

  // Upsert each response (draft save — no sum validation)
  for (const r of responses) {
    await prisma.surveyResponse.upsert({
      where: {
        assignmentId_taxonomyNodeId: {
          assignmentId: assignment.id,
          taxonomyNodeId: r.taxonomyNodeId,
        },
      },
      update: { percentTime: r.percentTime },
      create: {
        assignmentId: assignment.id,
        taxonomyNodeId: r.taxonomyNodeId,
        percentTime: r.percentTime,
      },
    });
  }

  // Update status to InProgress
  if (assignment.status === "Pending") {
    await prisma.surveyAssignment.update({
      where: { id: assignment.id },
      data: { status: "InProgress" },
    });
  }

  return NextResponse.json({ saved: responses.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const assignment = await prisma.surveyAssignment.findUnique({
    where: { token },
    include: { campaign: { select: { status: true } } },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (assignment.status === "Completed") {
    return NextResponse.json(
      { error: "Survey already submitted" },
      { status: 400 }
    );
  }

  if (assignment.campaign.status !== "Active") {
    return NextResponse.json(
      { error: "Campaign is not active" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const responses: ResponseEntry[] = body.responses;

  if (!Array.isArray(responses)) {
    return NextResponse.json(
      { error: "responses must be an array" },
      { status: 400 }
    );
  }

  // Validate sum = 100
  const sum = responses.reduce((acc, r) => acc + r.percentTime, 0);
  if (Math.abs(sum - 100) > 0.01) {
    return NextResponse.json(
      { error: `Total must equal 100%. Current total: ${sum}%` },
      { status: 400 }
    );
  }

  const now = new Date();

  // Upsert responses with submittedAt
  for (const r of responses) {
    await prisma.surveyResponse.upsert({
      where: {
        assignmentId_taxonomyNodeId: {
          assignmentId: assignment.id,
          taxonomyNodeId: r.taxonomyNodeId,
        },
      },
      update: { percentTime: r.percentTime, submittedAt: now },
      create: {
        assignmentId: assignment.id,
        taxonomyNodeId: r.taxonomyNodeId,
        percentTime: r.percentTime,
        submittedAt: now,
      },
    });
  }

  // Mark assignment as Completed
  await prisma.surveyAssignment.update({
    where: { id: assignment.id },
    data: { status: "Completed" },
  });

  return NextResponse.json({ submitted: true });
}
