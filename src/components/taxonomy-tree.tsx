"use client";

import { useState } from "react";
import { LocationTagBadge } from "./location-tag-badge";
import { Button } from "@/components/ui/button";

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

type TreeNode = TaxonomyNode & {
  children: TreeNode[];
  effectiveLocation: string | null;
};

type TaxonomyTreeProps = {
  nodes: TaxonomyNode[];
  selectedNodeId: string | null;
  onSelect: (node: TaxonomyNode) => void;
  onAddChild: (parentId: string) => void;
};

/**
 * Compare two dotted-numeric code strings numerically.
 * e.g. "2.0" < "10.0", "1.1.2" < "1.1.10"
 */
function naturalCodeCompare(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

function buildTree(flatNodes: TaxonomyNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create tree nodes
  for (const node of flatNodes) {
    map.set(node.id, { ...node, children: [], effectiveLocation: null });
  }

  // Build hierarchy
  for (const node of flatNodes) {
    const treeNode = map.get(node.id)!;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  // Sort children numerically by code
  for (const node of map.values()) {
    node.children.sort((a, b) => naturalCodeCompare(a.code, b.code));
  }
  roots.sort((a, b) => naturalCodeCompare(a.code, b.code));

  // Compute effective locations
  function computeLocations(nodes: TreeNode[], parentLocation: string | null) {
    for (const node of nodes) {
      node.effectiveLocation = node.preferredLocation || parentLocation;
      computeLocations(node.children, node.effectiveLocation);
    }
  }
  computeLocations(roots, null);

  return roots;
}

function TreeNodeRow({
  node,
  depth,
  selectedNodeId,
  onSelect,
  onAddChild,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (node: TaxonomyNode) => void;
  onAddChild: (parentId: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const isInherited = !node.preferredLocation && !!node.effectiveLocation;

  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-100 ${
        selectedNodeId === node.id ? "bg-blue-50 ring-1 ring-blue-200" : ""
      }`}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
      onClick={() => onSelect(node)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-gray-400"
      >
        {hasChildren ? (expanded ? "▾" : "▸") : "·"}
      </button>
      <span className="font-mono text-xs text-gray-400">{node.code}</span>
      <span className="flex-1 truncate">{node.name}</span>
      {node.effectiveLocation && (
        <LocationTagBadge
          location={node.effectiveLocation}
          inherited={isInherited}
        />
      )}
      <Button
        variant="outline"
        size="sm"
        className="hidden h-6 px-2 text-xs group-hover:inline-flex"
        onClick={(e) => {
          e.stopPropagation();
          onAddChild(node.id);
        }}
      >
        + Child
      </Button>
    </div>
  );
}

function TreeBranch({
  nodes,
  depth,
  selectedNodeId,
  onSelect,
  onAddChild,
  expandedIds,
  toggleExpanded,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedNodeId: string | null;
  onSelect: (node: TaxonomyNode) => void;
  onAddChild: (parentId: string) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <TreeNodeRow
            node={node}
            depth={depth}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            expanded={expandedIds.has(node.id)}
            onToggle={() => toggleExpanded(node.id)}
          />
          {expandedIds.has(node.id) && node.children.length > 0 && (
            <TreeBranch
              nodes={node.children}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          )}
        </div>
      ))}
    </>
  );
}

export function TaxonomyTree({
  nodes,
  selectedNodeId,
  onSelect,
  onAddChild,
}: TaxonomyTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Expand level 1 by default
    return new Set(nodes.filter((n) => n.level === 1).map((n) => n.id));
  });

  const tree = buildTree(nodes);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400">
        No taxonomy nodes. Import a taxonomy to get started.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <TreeBranch
        nodes={tree}
        depth={0}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        onAddChild={onAddChild}
        expandedIds={expandedIds}
        toggleExpanded={toggleExpanded}
      />
    </div>
  );
}

export { buildTree };
export type { TaxonomyNode, TreeNode };
