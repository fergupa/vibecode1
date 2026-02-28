import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, locationId } = await params;
  const body = await req.json();

  const location = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) {
      await tx.sharedServiceLocation.updateMany({
        where: { projectId: id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.sharedServiceLocation.update({
      where: { id: locationId, projectId: id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.salary !== undefined && { salary: body.salary }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });
  });

  return NextResponse.json(location);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, locationId } = await params;

  // Check if this is the only location
  const allLocations = await prisma.sharedServiceLocation.findMany({
    where: { projectId: id },
    select: { id: true },
  });

  if (allLocations.length <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the only SSC location" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Nullify references on taxonomy nodes
    await tx.taxonomyNode.updateMany({
      where: { sharedServiceLocationId: locationId },
      data: { sharedServiceLocationId: null },
    });
    await tx.sharedServiceLocation.delete({
      where: { id: locationId, projectId: id },
    });
  });

  return NextResponse.json({ ok: true });
}
