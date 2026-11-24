import type { Boat, Family } from "@/data/types";
import type { ChargeResult, SimResult } from "@/sim/model";

/**
 * Lamiera del corpo resistente sotto carico impulsivo: deformazione permanente fra le
 * ordinate e petali degli squarci. Fonti (consultate il 24/11/2026, dettagli in
 * docs/FONTI-LAMIERA.md):
 *  [Y17]  Yuen, Nurick, Langdon et al. 2017, "Deformation of thin plates subjected to
 *         impulsive load: Part III – an update 25 years on", Int. J. Impact Eng. 107.
 *  [ONI41] ONI, rapporto sull'U-570, 28/9/1941 (uboatarchive.net) — ordinate del VIIC.
 *  [P46]  Portsmouth Naval Shipyard 1946, rapporti 2G-9C S11 (IXC/40) e 2G-21 S11 (XXI).
 *  [XB43] Navy Instruction 371/184, Type XB (uboatarchive.net).
 *  [W99]  Wierzbicki 1999, IJIE 22, tramite la rassegna di Nam et al. 2015 — petali.
 *  [K07]  Kazemahvazi et al. 2007, J. Mech. Mater. Struct. 2(10) — 4 petali sotto onda
 *         d'urto in acqua.
 */

/** Passo delle ordinate del Druckkörper, m. */
export const FRAME_SPACING: Record<Family, { m: number; source: string; verified: boolean }> = {
  II: { m: 0.5, source: "stima di studio: nessuna fonte trovata per il IIB", verified: false },
  VII: { m: 0.6, source: "ONI 1941 (U-570): 23½ in, ≈ 600 mm", verified: true },
  IX: { m: 0.7, source: "Portsmouth 1946, IXC/40: 700 mm", verified: true },
  XB: { m: 0.8, source: "Navy Instruction 371/184: circa 800 mm", verified: true },
  XXI: { m: 0.8, source: "Portsmouth 1946, XXI: 800 mm (400 mm alle estremità)", verified: true },
};

/** Acciaio St 52 del corpo resistente: snervamento 51 300 psi [P46, IXC/40]. */
export const STEEL_YIELD_PA = 354e6;
export const STEEL_RHO = 7850;

/**
 * Numero di danno per piastra quadrangolare incastrata [Y17, eq. 7]:
 *   φq = I / (2 H² √(B L ρ σ)), I impulso totale (N·s) sul pannello.
 * Con impulso specifico i (Pa·s) uniforme sul pannello B × L: I = i B L.
 */
export function damageNumber(iPaS: number, H: number, B: number, L: number, rho = STEEL_RHO, sigma = STEEL_YIELD_PA) {
  return (iPaS * B * L) / (2 * H * H * Math.sqrt(B * L * rho * sigma));
}

/**
 * Freccia permanente al centro del pannello, aggiornamento 2017 [Y17, fig. 9]:
 *   δ/H = 0,506 φq − 0,158 (356 prove, R² = 0,94). Solo modo I (senza strappo).
 */
export function permanentDeflection(phi: number, H: number) {
  return Math.max(0, 0.506 * phi - 0.158) * H;
}

/**
 * Numero di petali: il minimo dell'energia di Wierzbicki è a ~50° di semiangolo, cioè
 * circa 4 petali, ma è debole, e 5–6 sono frequenti [W99]; 4 osservati sotto onda d'urto
 * in acqua [K07]. Qui: 4, 5 o 6 secondo un seme deterministico della ferita (resa).
 */
export function petalCount(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const r = (h >>> 0) % 100;
  return r < 55 ? 4 : r < 85 ? 5 : 6;
}

export type PlateResponse = {
  id: string;
  /** Impulso specifico di Cole al Druckkörper, Pa·s. */
  impulsePaS: number;
  phi: number;
  /** Freccia permanente fra le ordinate, m. */
  deflectionM: number;
  ratio: number;
  /** Oltre il campo delle prove (φ > 50) o vicino allo strappo: lettura qualitativa. */
  beyond: boolean;
};

export type PlateReport = {
  frame: (typeof FRAME_SPACING)[Family];
  thicknessM: number;
  charges: PlateResponse[];
};

/** Pannello di riferimento: un passo d'ordinata per un passo (quadrato). */
export function plateResponse(boat: Boat, c: ChargeResult): PlateResponse {
  const s = FRAME_SPACING[boat.family].m;
  const H = boat.plateMm / 1000;
  const phi = damageNumber(c.impulsePaS, H, s, s);
  const deflectionM = permanentDeflection(phi, H);
  return { id: c.id, impulsePaS: c.impulsePaS, phi, deflectionM, ratio: deflectionM / H, beyond: phi > 50 };
}

export function plateReport(boat: Boat, result: SimResult): PlateReport {
  return {
    frame: FRAME_SPACING[boat.family],
    thicknessM: boat.plateMm / 1000,
    charges: result.charges.filter((c) => c.yield === "full").map((c) => plateResponse(boat, c)),
  };
}
