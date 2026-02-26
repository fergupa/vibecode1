"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type EmployeeImportDialogProps = {
  projectId: string;
  onImported: () => void;
};

export function EmployeeImportDialog({
  projectId,
  onImported,
}: EmployeeImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{
    rowCount: number;
    sample: Record<string, string>[];
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setMessage(null);
    setPreview(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/employees/import`,
        { method: "POST", body: formData }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error +
            (data.details
              ? "\n" +
                data.details
                  .slice(0, 10)
                  .map((d: { row: number; message: string }) => `Row ${d.row}: ${d.message}`)
                  .join("\n")
              : "")
        );
      } else if (data.preview) {
        setPreview({ rowCount: data.rowCount, sample: data.sample });
      }
    } catch {
      setError("Network error");
    }
    setUploading(false);
  }

  async function handleConfirmImport() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/employees/import?confirm=true`,
        { method: "POST", body: formData }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setMessage(data.message);
        onImported();
        setTimeout(() => {
          setOpen(false);
          setPreview(null);
          setFile(null);
          setMessage(null);
        }, 1500);
      }
    } catch {
      setError("Network error");
    }
    setUploading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Import Employees</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Employees</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: EmployeeID, Name, Email, Title,
            Department, Location, BusinessUnit, FullyLoadedSalary, FTE,
            JobFamily
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={uploading}
            className="text-sm"
          />

          {uploading && (
            <p className="text-sm text-gray-500">Processing...</p>
          )}

          {preview && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Preview: {preview.rowCount} rows found
              </p>
              <div className="max-h-48 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {Object.keys(preview.sample[0] || {}).map((key) => (
                        <th key={key} className="px-2 py-1 text-left">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, i) => (
                      <tr key={i} className="border-b">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-2 py-1">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={handleConfirmImport} disabled={uploading}>
                {uploading ? "Importing..." : `Import ${preview.rowCount} Employees`}
              </Button>
            </div>
          )}

          {error && (
            <p className="whitespace-pre-wrap text-sm text-red-600">{error}</p>
          )}
          {message && <p className="text-sm text-green-600">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
