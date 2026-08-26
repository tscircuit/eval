/**
 * tscircuit - led-ballast-resistor
 */
export function calcLedResistor(vSupply: number, vForward: number, iAmps: number = 0.02): number { return Math.max(0, (vSupply - vForward) / iAmps); }
