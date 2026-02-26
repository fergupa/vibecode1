"use client";

import { cn } from "@/lib/utils";

type SurveyProgressBarProps = {
  total: number;
};

export function SurveyProgressBar({ total }: SurveyProgressBarProps) {
  const rounded = Math.round(total * 10) / 10;
  const color =
    Math.abs(rounded - 100) < 0.1
      ? "bg-green-500"
      : rounded > 100
        ? "bg-red-500"
        : "bg-yellow-500";
  const textColor =
    Math.abs(rounded - 100) < 0.1
      ? "text-green-700"
      : rounded > 100
        ? "text-red-700"
        : "text-yellow-700";
  const width = Math.min(rounded, 100);

  return (
    <div className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", textColor)}>
          {rounded}% of 100% allocated
        </span>
        <span className="text-gray-500">
          {rounded < 100
            ? `${(100 - rounded).toFixed(1)}% remaining`
            : rounded > 100
              ? `${(rounded - 100).toFixed(1)}% over`
              : "Complete!"}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-gray-200">
        <div
          className={cn("h-2 rounded-full transition-all", color)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
