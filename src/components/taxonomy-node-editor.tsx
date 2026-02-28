"use client";

import { useState } from "react";
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

type TaxonomyNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId: string | null;
  description: string | null;
  preferredLocation: string | null;
  sharedServiceLocationId: string | null;
  sortOrder: number;
};

type SSCLocation = {
  id: string;
  name: string;
  salary: number;
  isDefault: boolean;
};

type TaxonomyNodeEditorProps = {
  node: TaxonomyNode;
  parentLocation: string | null;
  sscLocations?: SSCLocation[];
  onSave: (nodeId: string, data: Partial<TaxonomyNode>) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
  onClose: () => void;
};

export function TaxonomyNodeEditor({
  node,
  parentLocation,
  sscLocations,
  onSave,
  onDelete,
  onClose,
}: TaxonomyNodeEditorProps) {
  const [name, setName] = useState(node.name);
  const [code, setCode] = useState(node.code);
  const [description, setDescription] = useState(node.description || "");
  const [preferredLocation, setPreferredLocation] = useState(
    node.preferredLocation || "inherit"
  );
  const [sscLocationId, setSscLocationId] = useState(
    node.sharedServiceLocationId || "default"
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(node.id, {
      name,
      code,
      description: description || null,
      preferredLocation: preferredLocation === "inherit" ? null : preferredLocation,
      sharedServiceLocationId:
        preferredLocation === "SHARED_SERVICES" && sscLocationId !== "default"
          ? sscLocationId
          : null,
    });
    setSaving(false);
  }

  async function handleDelete() {
    if (confirm("Delete this node and all children?")) {
      await onDelete(node.id);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edit Node</h3>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="node-code">Code</Label>
          <Input
            id="node-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="node-name">Name</Label>
          <Input
            id="node-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="node-description">Description</Label>
          <Input
            id="node-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="node-location">Preferred Location</Label>
          <Select value={preferredLocation} onValueChange={setPreferredLocation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">
                Inherit from parent
                {parentLocation ? ` (${parentLocation})` : ""}
              </SelectItem>
              <SelectItem value="CORPORATE">Corporate</SelectItem>
              <SelectItem value="SHARED_SERVICES">Shared Services</SelectItem>
              <SelectItem value="BUSINESS_UNIT">Business Unit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preferredLocation === "SHARED_SERVICES" &&
          sscLocations &&
          sscLocations.length > 0 && (
            <div>
              <Label htmlFor="node-ssc-location">SSC Location</Label>
              <Select value={sscLocationId} onValueChange={setSscLocationId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use Project Default</SelectItem>
                  {sscLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} (${loc.salary.toLocaleString()})
                      {loc.isDefault ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          size="sm"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
