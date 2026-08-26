/**
 * tscircuit - rc-time-constant
 */
export function calcRcCutoff(r: number, c: number): number { return 1 / (2 * Math.PI * r * c); }
