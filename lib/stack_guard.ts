export function checkCallStackDepth(currentDepth: number, maxDepth: number = 250): void {
  if (currentDepth > maxDepth) {
    throw new Error(`Maximum schematic expansion depth of ${maxDepth} exceeded`);
  }
}
