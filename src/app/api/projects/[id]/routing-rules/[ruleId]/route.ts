import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ruleId } = await params;

  const rule = await prisma.routingRule.findUnique({
    where: { id: ruleId },
  });
  if (!rule || rule.projectId !== id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.routingRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ message: "Deleted" });
}
