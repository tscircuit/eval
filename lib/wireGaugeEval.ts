/**
 * tscircuit - wire-gauge-voltage-drop
 */
export function calcWireDrop(current: number, lengthM: number, ohmsPerM: number): number { return current * lengthM * ohmsPerM; }
