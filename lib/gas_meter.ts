export function calculateCircuitEvalGas(opCount: number, memoryBytes: number): number {
  const baseGas = 100;
  return baseGas + opCount * 2 + Math.floor(memoryBytes / 1024);
}
