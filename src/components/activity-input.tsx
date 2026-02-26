"use client";

import { cn } from "@/lib/utils";

type ActivityInputProps = {
  code: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
};

export function ActivityInput({
  code,
  name,
  value,
  onChange,
}: ActivityInputProps) {
  const isDimmed = value === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 transition-opacity",
        isDimmed && "opacity-50"
      )}
    >
      <span className="w-16 flex-shrink-0 font-mono text-xs text-gray-400">
        {code}
      </span>
      <span className="flex-1 text-sm">{name}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          className="h-8 w-16 rounded border px-2 text-center text-sm"
        />
        <span className="text-xs text-gray-400">%</span>
        <button
          type="button"
          onClick={() => onChange(0)}
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            isDimmed
              ? "bg-gray-200 text-gray-600"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          )}
          title="I don't do this"
        >
          N/A
        </button>
      </div>
    </div>
  );
}
