import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, nodeId } = await params;
  const body = await req.json();

  const node = await prisma.taxonomyNode.update({
    where: { id: nodeId, projectId: id },
    data: {
      ...(body.code !== undefined && { code: body.code.trim() }),
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.level !== undefined && { level: Number(body.level) }),
      ...(body.parentId !== undefined && { parentId: body.parentId || null }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.preferredLocation !== undefined && {
        preferredLocation: body.preferredLocation || null,
      }),
    },
  });

  return NextResponse.json(node);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, nodeId } = await params;

  // Delete node and all children (cascade via Prisma schema)
  await prisma.taxonomyNode.delete({
    where: { id: nodeId, projectId: id },
  });

  return NextResponse.json({ ok: true });
}
