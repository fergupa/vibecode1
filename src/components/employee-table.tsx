"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  title: string;
  department: string | null;
  location: string;
  businessUnit: string | null;
  fullyLoadedSalary: number | string;
  fte: number | string;
  jobFamily: string | null;
};

type EmployeeTableProps = {
  employees: Employee[];
  onUpdate: (empId: string, data: Partial<Employee>) => Promise<void>;
  onDelete: (empId: string) => Promise<void>;
};

const columns: ColumnDef<Employee>[] = [
  { accessorKey: "employeeId", header: "ID", size: 80 },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "title", header: "Title" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "businessUnit", header: "BU" },
  {
    accessorKey: "fullyLoadedSalary",
    header: "Salary",
    cell: ({ getValue }) => {
      const val = Number(getValue());
      return val ? `$${val.toLocaleString()}` : "—";
    },
  },
  {
    accessorKey: "fte",
    header: "FTE",
    cell: ({ getValue }) => Number(getValue()).toFixed(2),
    size: 60,
  },
  { accessorKey: "jobFamily", header: "Job Family" },
];

export function EmployeeTable({
  employees,
  onUpdate,
  onDelete,
}: EmployeeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    column: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const table = useReactTable({
    data: employees,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function startEdit(rowId: string, column: string, currentValue: string) {
    setEditingCell({ rowId, column });
    setEditValue(currentValue || "");
  }

  async function commitEdit(empId: string, column: string) {
    await onUpdate(empId, { [column]: editValue });
    setEditingCell(null);
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search employees..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{ asc: " ↑", desc: " ↓" }[
                      header.column.getIsSorted() as string
                    ] ?? ""}
                  </TableHead>
                ))}
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center text-gray-500"
                >
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const columnId = cell.column.id;
                    const isEditing =
                      editingCell?.rowId === row.original.id &&
                      editingCell?.column === columnId;

                    return (
                      <TableCell
                        key={cell.id}
                        onDoubleClick={() =>
                          startEdit(
                            row.original.id,
                            columnId,
                            String(cell.getValue() ?? "")
                          )
                        }
                      >
                        {isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() =>
                              commitEdit(row.original.id, columnId)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                commitEdit(row.original.id, columnId);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <button
                      onClick={() => {
                        if (confirm("Delete this employee?"))
                          onDelete(row.original.id);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
