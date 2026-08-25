/**
 * tscircuit/eval - Safe Regex Execution Guard
 */
export function safeRegexTest(pattern: RegExp, input: string, timeoutMs: number = 50): boolean {
  const start = Date.now();
  const res = pattern.test(input);
  if (Date.now() - start > timeoutMs) {
    throw new Error('Regex execution exceeded execution time budget');
  }
  return res;
}
