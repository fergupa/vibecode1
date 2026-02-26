"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportButtonsProps = {
  projectId: string;
};

export function ExportButtons({ projectId }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(type: "excel" | "pdf") {
    setExporting(type);
    try {
      const endpoint =
        type === "excel"
          ? `/api/projects/${projectId}/analysis/export-excel`
          : `/api/projects/${projectId}/analysis/export-pdf`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          type === "excel" ? "analysis-report.xlsx" : "analysis-report.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silently fail
    }
    setExporting(null);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("excel")}
        disabled={!!exporting}
      >
        {exporting === "excel" ? "Exporting..." : "Export Excel"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("pdf")}
        disabled={!!exporting}
      >
        {exporting === "pdf" ? "Exporting..." : "Export PDF"}
      </Button>
    </div>
  );
}
