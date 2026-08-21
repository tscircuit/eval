export function trackScriptExecutionGas(opCount: number, gasLimit = 100000): boolean {
  if (opCount > gasLimit) throw new Error('Gas limit exceeded');
  return true;
}
