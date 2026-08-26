/**
 * tscircuit - thermal-dissipation-eval
 */
export function calcJunctionTemp(pWatts: number, rThetaJA: number, ambient: number = 25): number { return ambient + (pWatts * rThetaJA); }
