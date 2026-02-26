import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apqcTemplate from "@/data/apqc-template.json";

type ApqcEntry = {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  description: string | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check if project already has taxonomy nodes
  const existingCount = await prisma.taxonomyNode.count({
    where: { projectId: id },
  });
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Project already has taxonomy nodes. Delete existing nodes first." },
      { status: 400 }
    );
  }

  const entries = apqcTemplate as ApqcEntry[];

  // First pass: create all nodes without parent links
  const codeToId: Record<string, string> = {};

  for (const entry of entries) {
    const node = await prisma.taxonomyNode.create({
      data: {
        projectId: id,
        code: entry.code,
        name: entry.name,
        level: entry.level,
        description: entry.description,
        sortOrder: 0,
      },
    });
    codeToId[entry.code] = node.id;
  }

  // Second pass: set parent links
  for (const entry of entries) {
    if (entry.parentCode && codeToId[entry.parentCode]) {
      await prisma.taxonomyNode.update({
        where: { id: codeToId[entry.code] },
        data: { parentId: codeToId[entry.parentCode] },
      });
    }
  }

  return NextResponse.json(
    { message: `Seeded ${entries.length} APQC taxonomy nodes` },
    { status: 201 }
  );
}
