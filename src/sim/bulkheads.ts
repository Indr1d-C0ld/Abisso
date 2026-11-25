import type { Boat, Family } from "@/data/types";
import type { SimResult } from "@/sim/model";
import { pAbsBar, rowFill, type HydroTrack } from "@/sim/hydrostatics";

/**
 * Stato delle paratie (Fase 2, completata il 25/11/2026). Il modello di danno non le
 * calcola; qui si legge il carico che ricevono dopo: un locale che si allaga con l'aria
 * intrappolata sale di pressione verso quella del mare, il locale accanto resta a
 * un'atmosfera, e la paratia in mezzo porta la differenza.
 *
 *   p_locale = 1,013 / (1 − f) bar (isoterma, f = frazione allagata), al più p_mare
 *   Δp = |p_A − p_B|, espresso anche in metri d'acqua (Δp / 0,1005)
 *
 * È una lettura, non entra nel verdetto né nelle curve di allagamento: una paratia
 * «oltre il collaudo» dice che l'allagamento potrebbe estendersi, non che lo fa.
 * Quali paratie fossero resistenti e a quanto: docs/FONTI-LAMIERA.md.
 */

export type BulkheadSpec = {
  /** Locali chiusi da paratie resistenti alla pressione (Druckschotten). */
  pressureRooms: string[];
  /** Quota per cui le paratie resistenti erano calcolate, m; null se non trovata. */
  ratingM: number | null;
  /** Tenuta delle paratie stagne leggere, m; null se non trovata. */
  lightM: number | null;
  source: string;
  verified: boolean;
};

/**
 * Fonti (lette il 25/11/2026 su uboatarchive.net):
 *  VIIC  M.Dv. 371/181 (1940): due paratie sferiche resistenti ai lati della centrale,
 *        provate dal lato concavo a 30 m; le tre piane, solo stagne, a 1 m.
 *  XB    M.Dv. 371/184: quattro paratie sferiche resistenti (30 m), piane a 2 m.
 *  IXC   Portsmouth 1946, 2G-9C S11: quattro paratie bombate da 22 mm, pressione di
 *        progetto non trovata; due leggere calcolate per 3 psi (circa 2 m).
 *  XXI   Portsmouth 1946, 2G-21 S11: cinque paratie resistenti provate a 50 m (fattore
 *        1,5); una leggera fra locale motori e manovra.
 *  II    non trovato.
 * L'attribuzione ai locali del modello è ricostruita dove la fonte non dà le ordinate
 * (IXC, XXI) o dove i locali del modello non coincidono con quelli veri (XB).
 */
export const BULKHEADS: Record<Family, BulkheadSpec> = {
  II: { pressureRooms: ["centrale"], ratingM: null, lightM: null, source: "nessuna fonte per il Tipo II", verified: false },
  VII: { pressureRooms: ["centrale"], ratingM: 30, lightM: 1, source: "M.Dv. 371/181, 1940", verified: true },
  IX: { pressureRooms: ["poppa", "centrale", "prua"], ratingM: null, lightM: 2, source: "Portsmouth 1946: posizioni ricostruite, pressione di progetto non trovata", verified: false },
  XB: { pressureRooms: ["poppa", "centrale", "prua"], ratingM: 30, lightM: 2, source: "M.Dv. 371/184", verified: true },
  XXI: { pressureRooms: ["diesel", "centrale", "prua"], ratingM: 50, lightM: null, source: "Portsmouth 1946: prova a 50 m, posizioni ricostruite", verified: true },
};

export type BulkheadState = "scarica" | "carica" | "oltre" | "ignota";

export type Bulkhead = {
  /** Posizione lungo l'asse, m. */
  x: number;
  aft: string;
  fore: string;
  aftName: string;
  foreName: string;
  pressure: boolean;
  /** Quota di riferimento della paratia, m; null se non trovata. */
  ratingM: number | null;
};

export function bulkheadsOf(boat: Boat, result: SimResult): Bulkhead[] {
  const spec = BULKHEADS[boat.family];
  const c = result.compartments;
  const out: Bulkhead[] = [];
  for (let i = 0; i + 1 < c.length; i++) {
    const pressure = spec.pressureRooms.includes(c[i].id) || spec.pressureRooms.includes(c[i + 1].id);
    out.push({
      x: c[i].x1,
      aft: c[i].id,
      fore: c[i + 1].id,
      aftName: c[i].name,
      foreName: c[i + 1].name,
      pressure,
      ratingM: pressure ? spec.ratingM : spec.lightM,
    });
  }
  return out;
}

/** Pressione assoluta in un locale, bar, dato il riempimento con aria intrappolata. */
export function roomPressureBar(fill: number, depthM: number) {
  const pOut = pAbsBar(depthM);
  if (fill <= 0) return 1.013;
  return Math.min(pOut, 1.013 / Math.max(1e-3, 1 - Math.min(0.999, fill)));
}

export type BulkheadLoad = { headM: number; state: BulkheadState };

export function stateOf(headM: number, ratingM: number | null): BulkheadState {
  if (headM < 1) return "scarica";
  if (ratingM === null) return "ignota";
  return headM > ratingM ? "oltre" : "carica";
}

/** Carico su ogni paratia a `t` secondi dall'inizio dell'allagamento, alla quota `depthM`. */
export function bulkheadLoads(bulkheads: Bulkhead[], result: SimResult, t: number, depthM: number): BulkheadLoad[] {
  const fill = new Map(result.flood.rows.map((r) => [r.id, rowFill(r, Math.max(0, t) / 60)]));
  return bulkheads.map((b) => {
    const pa = roomPressureBar(fill.get(b.aft) ?? 0, depthM);
    const pf = roomPressureBar(fill.get(b.fore) ?? 0, depthM);
    const headM = Math.abs(pa - pf) / 0.1005;
    return { headM, state: stateOf(headM, b.ratingM) };
  });
}

/** Carico massimo raggiunto da ogni paratia lungo la ricostruzione. */
export function bulkheadPeaks(bulkheads: Bulkhead[], result: SimResult, track: HydroTrack, depth0: number): BulkheadLoad[] {
  const peaks = bulkheads.map(() => 0);
  const n = 60;
  for (let k = 0; k <= n; k++) {
    const t = (track.span * k) / n;
    const s = track.samples.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a), track.samples[0]);
    bulkheadLoads(bulkheads, result, t, track.span > 0 ? s.depth : depth0).forEach((l, i) => {
      peaks[i] = Math.max(peaks[i], l.headM);
    });
  }
  return peaks.map((headM, i) => ({ headM, state: stateOf(headM, bulkheads[i].ratingM) }));
}
