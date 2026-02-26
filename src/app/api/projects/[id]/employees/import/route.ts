import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CsvRow = {
  EmployeeID: string;
  Name: string;
  Email: string;
  Title: string;
  Department: string;
  Location: string;
  BusinessUnit: string;
  FullyLoadedSalary: string;
  FTE: string;
  JobFamily: string;
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
        details: parseErrors.map((e) => ({ row: e.row, message: e.message })),
      },
      { status: 400 }
    );
  }

  // Validate required columns
  const requiredColumns = ["EmployeeID", "Name"];
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
    if (!row.EmployeeID?.trim()) {
      validationErrors.push({ row: i + 2, message: "Missing EmployeeID" });
    }
    if (!row.Name?.trim()) {
      validationErrors.push({ row: i + 2, message: "Missing Name" });
    }
    if (
      row.FullyLoadedSalary?.trim() &&
      isNaN(Number(row.FullyLoadedSalary))
    ) {
      validationErrors.push({
        row: i + 2,
        message: "Invalid FullyLoadedSalary (must be a number)",
      });
    }
    if (row.FTE?.trim() && isNaN(Number(row.FTE))) {
      validationErrors.push({
        row: i + 2,
        message: "Invalid FTE (must be a number)",
      });
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        error: "Validation errors",
        details: validationErrors,
        validCount: data.length - validationErrors.length,
      },
      { status: 400 }
    );
  }

  // Preview mode
  const confirm = req.nextUrl.searchParams.get("confirm");
  if (confirm !== "true") {
    return NextResponse.json({
      preview: true,
      rowCount: data.length,
      sample: data.slice(0, 5),
    });
  }

  // Import employees
  let imported = 0;
  for (const row of data) {
    await prisma.employee.create({
      data: {
        projectId: id,
        employeeId: row.EmployeeID.trim(),
        name: row.Name.trim(),
        email: row.Email?.trim() || null,
        title: row.Title?.trim() || "",
        department: row.Department?.trim() || null,
        location: row.Location?.trim() || "",
        businessUnit: row.BusinessUnit?.trim() || null,
        fullyLoadedSalary: row.FullyLoadedSalary?.trim()
          ? Number(row.FullyLoadedSalary)
          : 0,
        fte: row.FTE?.trim() ? Number(row.FTE) : 1.0,
        jobFamily: row.JobFamily?.trim() || null,
      },
    });
    imported++;
  }

  return NextResponse.json(
    { message: `Imported ${imported} employees` },
    { status: 201 }
  );
}
