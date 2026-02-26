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

type TaxonomyImportDialogProps = {
  projectId: string;
  onImported: () => void;
};

export function TaxonomyImportDialog({
  projectId,
  onImported,
}: TaxonomyImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSeedApqc() {
    setSeeding(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/taxonomy/seed-apqc`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to seed");
      } else {
        setMessage(data.message);
        onImported();
        setTimeout(() => setOpen(false), 1500);
      }
    } catch {
      setError("Network error");
    }
    setSeeding(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Preview first
      const previewRes = await fetch(
        `/api/projects/${projectId}/taxonomy/import`,
        { method: "POST", body: formData }
      );
      const previewData = await previewRes.json();

      if (!previewRes.ok) {
        setError(
          previewData.error +
            (previewData.details
              ? "\n" + previewData.details.map((d: { row: number; message: string }) => `Row ${d.row}: ${d.message}`).join("\n")
              : "")
        );
        setUploading(false);
        return;
      }

      // Confirm import
      const confirmFormData = new FormData();
      confirmFormData.append("file", file);
      const confirmRes = await fetch(
        `/api/projects/${projectId}/taxonomy/import?confirm=true`,
        { method: "POST", body: confirmFormData }
      );
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        setError(confirmData.error || "Import failed");
      } else {
        setMessage(confirmData.message);
        onImported();
        setTimeout(() => setOpen(false), 1500);
      }
    } catch {
      setError("Network error");
    }
    setUploading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Import Taxonomy</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Taxonomy</DialogTitle>
          <DialogDescription>
            Seed the APQC template or upload a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">APQC Template</h4>
            <p className="mb-3 text-sm text-gray-500">
              Seed a standard APQC Process Classification Framework with 13
              categories and representative processes.
            </p>
            <Button onClick={handleSeedApqc} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed APQC Template"}
            </Button>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Upload CSV</h4>
            <p className="mb-3 text-sm text-gray-500">
              CSV columns: Code, Name, Level, ParentCode, Description
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && (
              <p className="mt-2 text-sm text-gray-500">Importing...</p>
            )}
          </div>

          {error && (
            <p className="whitespace-pre-wrap text-sm text-red-600">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-600">{message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
