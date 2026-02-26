import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const nodes = await prisma.taxonomyNode.findMany({
    where: { projectId: id },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
  });

  return NextResponse.json(nodes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { code, name, level, parentId, description, sortOrder } = body;

  if (!code || !name || level === undefined) {
    return NextResponse.json(
      { error: "code, name, and level are required" },
      { status: 400 }
    );
  }

  const node = await prisma.taxonomyNode.create({
    data: {
      projectId: id,
      code: code.trim(),
      name: name.trim(),
      level: Number(level),
      parentId: parentId || null,
      description: description?.trim() || null,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json(node, { status: 201 });
}
