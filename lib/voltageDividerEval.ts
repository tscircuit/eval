/**
 * tscircuit - resistor-divider-calc
 */
export function calcDivider(vin: number, r1: number, r2: number): number { return vin * (r2 / (r1 + r2)); }
