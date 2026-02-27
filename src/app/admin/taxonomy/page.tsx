"use client";

import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/lib/project-context";
import { TaxonomyTree } from "@/components/taxonomy-tree";
import type { TaxonomyNode } from "@/components/taxonomy-tree";
import { TaxonomyNodeEditor } from "@/components/taxonomy-node-editor";
import { TaxonomyImportDialog } from "@/components/taxonomy-import-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function TaxonomyPage() {
  const { selectedProject } = useProject();
  const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<TaxonomyNode | null>(null);
  const [loading, setLoading] = useState(false);

  const loadNodes = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${selectedProject.id}/taxonomy`);
    if (res.ok) {
      setNodes(await res.json());
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  async function handleSaveNode(nodeId: string, data: Partial<TaxonomyNode>) {
    if (!selectedProject) return;
    await fetch(
      `/api/projects/${selectedProject.id}/taxonomy/${nodeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    await loadNodes();
  }

  async function handleDeleteNode(nodeId: string) {
    if (!selectedProject) return;
    await fetch(
      `/api/projects/${selectedProject.id}/taxonomy/${nodeId}`,
      { method: "DELETE" }
    );
    setSelectedNode(null);
    await loadNodes();
  }

  async function handleAddChild(parentId: string) {
    if (!selectedProject) return;
    const parent = nodes.find((n) => n.id === parentId);
    const childCount = nodes.filter((n) => n.parentId === parentId).length;
    const newCode = parent
      ? `${parent.code}.${childCount + 1}`
      : `${childCount + 1}.0`;

    await fetch(`/api/projects/${selectedProject.id}/taxonomy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        name: "New Node",
        level: parent ? parent.level + 1 : 1,
        parentId,
        sortOrder: childCount,
      }),
    });
    await loadNodes();
  }

  async function handleAddRoot() {
    if (!selectedProject) return;
    const rootCount = nodes.filter((n) => !n.parentId).length;
    await fetch(`/api/projects/${selectedProject.id}/taxonomy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: `${rootCount + 1}.0`,
        name: "New Category",
        level: 1,
        sortOrder: rootCount,
      }),
    });
    await loadNodes();
  }

  // Find the effective parent location for the selected node
  function getParentLocation(node: TaxonomyNode): string | null {
    if (!node.parentId) return null;
    let current = nodes.find((n) => n.id === node.parentId);
    while (current) {
      if (current.preferredLocation) return current.preferredLocation;
      current = current.parentId
        ? nodes.find((n) => n.id === current!.parentId)
        : undefined;
    }
    return null;
  }

  if (!selectedProject) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Taxonomy</h1>
        <p className="mt-2 text-gray-500">
          Select a project from the Projects page first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Taxonomy</h1>
          <p className="text-sm text-gray-500">
            {selectedProject.name} &mdash; {nodes.length} nodes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddRoot}>
            + Add Category
          </Button>
          <TaxonomyImportDialog
            projectId={selectedProject.id}
            onImported={loadNodes}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading taxonomy...</p>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden">
          <ScrollArea className="flex-1 rounded-lg border">
            <div className="p-2">
              <TaxonomyTree
                nodes={nodes}
                selectedNodeId={selectedNode?.id ?? null}
                onSelect={setSelectedNode}
                onAddChild={handleAddChild}
              />
            </div>
          </ScrollArea>

          {selectedNode && (
            <div className="w-80 flex-shrink-0">
              <TaxonomyNodeEditor
                key={selectedNode.id}
                node={selectedNode}
                parentLocation={getParentLocation(selectedNode)}
                onSave={handleSaveNode}
                onDelete={handleDeleteNode}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
