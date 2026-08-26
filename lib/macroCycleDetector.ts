/**
 * tscircuit/eval - Macro Cycle Detector
 */
export function detectMacroCycles(graph: Record<string, string[]>): { hasCycle: boolean; cyclePath?: string[] } {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): boolean {
    visited.add(node);
    recursionStack.add(node);

    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path, neighbor])) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      if (dfs(node, [node])) return { hasCycle: true };
    }
  }

  return { hasCycle: false };
}
