"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CampaignCreateDialogProps = {
  projectId: string;
  onCreated: () => void;
};

export function CampaignCreateDialog({
  projectId,
  onCreated,
}: CampaignCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("Individual");
  const [taxonomyLevel, setTaxonomyLevel] = useState("");
  const [availableLevels, setAvailableLevels] = useState<{ level: number; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/projects/${projectId}/taxonomy`)
      .then((res) => res.json())
      .then((nodes: { level: number }[]) => {
        const levelCounts = new Map<number, number>();
        for (const n of nodes) {
          levelCounts.set(n.level, (levelCounts.get(n.level) || 0) + 1);
        }
        const levels = [...levelCounts.entries()]
          .sort(([a], [b]) => a - b)
          .map(([level, count]) => ({ level, count }));
        setAvailableLevels(levels);
        if (levels.length > 0) {
          setTaxonomyLevel(String(levels[levels.length - 1].level));
        }
      });
  }, [open, projectId]);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mode,
          taxonomyLevel: Number(taxonomyLevel),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create campaign");
      } else {
        onCreated();
        setOpen(false);
        setName("");
        setMode("Individual");
      }
    } catch {
      setError("Network error");
    }
    setCreating(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Campaign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Survey Campaign</DialogTitle>
          <DialogDescription>
            Set up a new survey campaign to assess time allocation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 2026 Activity Assessment"
            />
          </div>

          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">
                  Individual — one survey per employee
                </SelectItem>
                <SelectItem value="RoleBased">
                  Role-Based — one survey per job family
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Taxonomy Level</Label>
            {availableLevels.length === 0 ? (
              <p className="text-sm text-amber-600">
                No taxonomy nodes found. Import a taxonomy first.
              </p>
            ) : (
              <Select value={taxonomyLevel} onValueChange={setTaxonomyLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLevels.map(({ level, count }) => (
                    <SelectItem key={level} value={String(level)}>
                      Level {level} ({count} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleCreate}
            disabled={creating || availableLevels.length === 0}
            className="w-full"
          >
            {creating ? "Creating..." : "Create Campaign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
