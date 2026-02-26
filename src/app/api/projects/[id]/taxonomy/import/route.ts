import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CsvRow = {
  Code: string;
  Name: string;
  Level: string;
  ParentCode: string;
  Description: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const { data, errors: parseErrors } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0) {
    return NextResponse.json(
      {
        error: "CSV parse errors",
        details: parseErrors.map((e) => ({
          row: e.row,
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  // Validate required columns
  const requiredColumns = ["Code", "Name", "Level"];
  const headers = Object.keys(data[0] || {});
  const missingColumns = requiredColumns.filter((c) => !headers.includes(c));
  if (missingColumns.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missingColumns.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate rows
  const validationErrors: { row: number; message: string }[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row.Code?.trim()) {
      validationErrors.push({ row: i + 2, message: "Missing Code" });
    }
    if (!row.Name?.trim()) {
      validationErrors.push({ row: i + 2, message: "Missing Name" });
    }
    if (!row.Level?.trim() || isNaN(Number(row.Level))) {
      validationErrors.push({ row: i + 2, message: "Invalid Level (must be a number)" });
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Validation errors", details: validationErrors, validCount: data.length - validationErrors.length },
      { status: 400 }
    );
  }

  // Check for confirm flag — if not set, return preview
  const confirm = req.nextUrl.searchParams.get("confirm");
  if (confirm !== "true") {
    return NextResponse.json({
      preview: true,
      rowCount: data.length,
      sample: data.slice(0, 5),
    });
  }

  // Insert nodes
  const codeToId: Record<string, string> = {};

  // First pass: create all without parent links
  for (const row of data) {
    const node = await prisma.taxonomyNode.create({
      data: {
        projectId: id,
        code: row.Code.trim(),
        name: row.Name.trim(),
        level: Number(row.Level),
        description: row.Description?.trim() || null,
        sortOrder: 0,
      },
    });
    codeToId[row.Code.trim()] = node.id;
  }

  // Second pass: set parent links
  for (const row of data) {
    const parentCode = row.ParentCode?.trim();
    if (parentCode && codeToId[parentCode]) {
      await prisma.taxonomyNode.update({
        where: { id: codeToId[row.Code.trim()] },
        data: { parentId: codeToId[parentCode] },
      });
    }
  }

  return NextResponse.json(
    { message: `Imported ${data.length} taxonomy nodes` },
    { status: 201 }
  );
}
