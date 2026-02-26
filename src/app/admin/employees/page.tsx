"use client";

import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/lib/project-context";
import { EmployeeTable } from "@/components/employee-table";
import { EmployeeImportDialog } from "@/components/employee-import-dialog";

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

type Stats = {
  total: number;
  totalSalary: number;
  avgFte: number;
  locations: Record<string, number>;
};

function computeStats(employees: Employee[]): Stats {
  const totalSalary = employees.reduce(
    (sum, e) => sum + Number(e.fullyLoadedSalary || 0),
    0
  );
  const avgFte =
    employees.length > 0
      ? employees.reduce((sum, e) => sum + Number(e.fte || 0), 0) /
        employees.length
      : 0;
  const locations: Record<string, number> = {};
  for (const e of employees) {
    const loc = e.location || "Unknown";
    locations[loc] = (locations[loc] || 0) + 1;
  }
  return { total: employees.length, totalSalary, avgFte, locations };
}

export default function EmployeesPage() {
  const { selectedProject } = useProject();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const res = await fetch(
      `/api/projects/${selectedProject.id}/employees?limit=200`
    );
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees);
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function handleUpdate(empId: string, data: Partial<Employee>) {
    if (!selectedProject) return;
    await fetch(
      `/api/projects/${selectedProject.id}/employees/${empId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    await loadEmployees();
  }

  async function handleDelete(empId: string) {
    if (!selectedProject) return;
    await fetch(
      `/api/projects/${selectedProject.id}/employees/${empId}`,
      { method: "DELETE" }
    );
    await loadEmployees();
  }

  if (!selectedProject) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="mt-2 text-gray-500">
          Select a project from the Dashboard first.
        </p>
      </div>
    );
  }

  const stats = computeStats(employees);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-gray-500">{selectedProject.name}</p>
        </div>
        <EmployeeImportDialog
          projectId={selectedProject.id}
          onImported={loadEmployees}
        />
      </div>

      {!loading && employees.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-gray-500">Total Employees</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-gray-500">Total Salary</p>
            <p className="text-xl font-bold">
              ${stats.totalSalary.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-gray-500">Avg FTE</p>
            <p className="text-xl font-bold">{stats.avgFte.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-gray-500">Locations</p>
            <p className="text-xl font-bold">
              {Object.keys(stats.locations).length}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading employees...</p>
      ) : (
        <EmployeeTable
          employees={employees}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
