import type { Edge, Node } from "@xyflow/react";

/**
 * Builds a map: nodeId → array of upstream node IDs (nodes that must run before this one).
 * For each edge (source, target), target depends on source, so source is upstream of target.
 */
export function buildDependencyMap(
  nodes: Node[],
  edges: Edge[],
): Map<string, string[]> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const map = new Map<string, string[]>();

  for (const id of nodeIds) {
    map.set(id, []);
  }

  for (const edge of edges) {
    const { source, target } = edge;
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
      continue;
    }
    const upstream = map.get(target) ?? [];
    if (!upstream.includes(source)) {
      upstream.push(source);
    }
    map.set(target, upstream);
  }

  return map;
}

/**
 * Builds a map: nodeId → array of downstream node IDs (nodes that depend on this one).
 * Used for cycle detection (follow outgoing edges).
 */
function buildOutgoingMap(
  nodes: Node[],
  edges: Edge[],
): Map<string, string[]> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const map = new Map<string, string[]>();

  for (const id of nodeIds) {
    map.set(id, []);
  }

  for (const edge of edges) {
    const { source, target } = edge;
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
      continue;
    }
    const outgoing = map.get(source) ?? [];
    if (!outgoing.includes(target)) {
      outgoing.push(target);
    }
    map.set(source, outgoing);
  }

  return map;
}

/**
 * DFS-based cycle detection. Returns true if the graph contains a cycle.
 */
export function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  const outgoing = buildOutgoingMap(nodes, edges);
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function visit(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    const neighbors = outgoing.get(nodeId) ?? [];
    for (const next of neighbors) {
      if (visit(next)) return true;
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && visit(node.id)) return true;
  }

  return false;
}

export type DAGValidationResult =
  | { valid: true }
  | { valid: false; reason: "cycle" };

/**
 * Validates that the workflow graph is a DAG (no cycles).
 * Reject run if cycle exists.
 */
export function validateDAG(nodes: Node[], edges: Edge[]): DAGValidationResult {
  if (hasCycle(nodes, edges)) {
    return { valid: false, reason: "cycle" };
  }
  return { valid: true };
}

/**
 * Given selected node IDs, returns the set of node IDs that must run:
 * selected nodes plus all their upstream dependencies (transitive).
 * If selectedIds is empty, returns all node IDs (full run).
 */
export function getRunnableNodeIds(
  selectedIds: string[],
  nodes: Node[],
  edges: Edge[],
): Set<string> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (selectedIds.length === 0) return nodeIds;

  const upstream = buildDependencyMap(nodes, edges);
  const runnable = new Set<string>();

  function addWithUpstream(id: string): void {
    if (runnable.has(id)) return;
    runnable.add(id);
    const up = upstream.get(id) ?? [];
    for (const u of up) addWithUpstream(u);
  }

  for (const id of selectedIds) {
    if (nodeIds.has(id)) addWithUpstream(id);
  }
  return runnable;
}
