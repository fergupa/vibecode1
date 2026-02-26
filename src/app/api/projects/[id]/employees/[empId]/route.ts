import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; empId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, empId } = await params;
  const body = await req.json();

  const employee = await prisma.employee.update({
    where: { id: empId, projectId: id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.email !== undefined && { email: body.email?.trim() || null }),
      ...(body.title !== undefined && { title: body.title?.trim() || "" }),
      ...(body.department !== undefined && {
        department: body.department?.trim() || null,
      }),
      ...(body.location !== undefined && {
        location: body.location?.trim() || "",
      }),
      ...(body.businessUnit !== undefined && {
        businessUnit: body.businessUnit?.trim() || null,
      }),
      ...(body.fullyLoadedSalary !== undefined && {
        fullyLoadedSalary: body.fullyLoadedSalary,
      }),
      ...(body.fte !== undefined && { fte: body.fte }),
      ...(body.jobFamily !== undefined && {
        jobFamily: body.jobFamily?.trim() || null,
      }),
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; empId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, empId } = await params;
  await prisma.employee.delete({ where: { id: empId, projectId: id } });
  return NextResponse.json({ ok: true });
}
