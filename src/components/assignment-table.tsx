"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Assignment = {
  id: string;
  token: string;
  status: "Pending" | "InProgress" | "Completed";
  roleName: string | null;
  headcount: number;
  employee: { name: string; email: string | null } | null;
};

type AssignmentTableProps = {
  assignments: Assignment[];
};

const statusColors: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-800",
  InProgress: "bg-yellow-100 text-yellow-800",
  Completed: "bg-green-100 text-green-800",
};

export function AssignmentTable({ assignments }: AssignmentTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyLink(token: string, id: string) {
    const link = `${window.location.origin}/survey/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Respondent</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Headcount</TableHead>
            <TableHead className="w-32">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                No assignments generated yet.
              </TableCell>
            </TableRow>
          ) : (
            assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.employee?.name || a.roleName || "Unknown"}
                </TableCell>
                <TableCell className="text-gray-500">
                  {a.employee?.email || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColors[a.status] || ""}
                  >
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell>{a.headcount}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(a.token, a.id)}
                  >
                    {copiedId === a.id ? "Copied!" : "Copy Link"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
