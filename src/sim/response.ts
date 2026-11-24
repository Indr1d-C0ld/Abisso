import type { Boat, SimInput } from "@/data/types";
import type { SimResult } from "@/sim/model";
import { nearestPhPoint } from "@/sim/shape";

/**
 * Risposta globale dello scafo e interazione bolla–scafo.
 *
 * Primo modo flessionale di una trave libera–libera (Euler–Bernoulli): è la forma della
 * "frusta" (whipping) dello scafo eccitata dalla pulsazione della bolla.
 *   φ(ξ) = cosh(βξ) + cos(βξ) − σ (sinh(βξ) + sin(βξ)),  ξ = x / L ∈ [0, 1]
 *   βL = 4,73004,  σ = (cosh βL − cos βL) / (sinh βL − sin βL) ≈ 0,98250
 * Nodi a ξ ≈ 0,224 e 0,776; normalizzata a |φ| = 1 alle estremità.
 */
export const BETA_L = 4.730040745;
const SIGMA = (Math.cosh(BETA_L) - Math.cos(BETA_L)) / (Math.sinh(BETA_L) - Math.sin(BETA_L));

function rawMode(xi: number) {
  const b = BETA_L * xi;
  return Math.cosh(b) + Math.cos(b) - SIGMA * (Math.sinh(b) + Math.sin(b));
}

const END = rawMode(0);

/** Forma modale normalizzata: +1 alle estremità, ≈ −0,61 al centro. */
export function freeFreeMode(xi: number) {
  return rawMode(Math.min(1, Math.max(0, xi))) / END;
}

/* ------------------------------------------------------------------------------------
 * Fonti (consultate il 24/11/2026; dettagli in docs/FONTI-RISPOSTA.md):
 *  [S16] Supponen et al. 2016, "Scaling laws for jets of single cavitation bubbles",
 *        J. Fluid Mech. 802 — anisotropia ζ, getto, spostamento al collasso.
 *  [S24] Subramanian et al. 2024, arXiv:2408.03479 — regimi vicino a una parete rigida.
 *  [L23] Li et al. 2023, arXiv:2306.14720 — esplosioni sotto la superficie libera.
 *  [R10] Riley 2010, DRDC Atlantic TM 2010-237 — migrazione, costanti per ciclo.
 *  [B15] Brainard 2015, tesi Virginia Tech — migrazione, frusta, costanti grandi cariche.
 *  [Y14] Yin et al. 2014, Brodogradnja 65(3) — frequenza a 2 nodi (forma DNV).
 *  [St95] Stettler 1995, tesi MIT — sottomarino: 1,98 Hz a secco, 1,37 Hz bagnato.
 *  [V86] Vernon 1986, DREA TM 86/225 — condizioni di risonanza della frusta.
 *  [M86] Mellor 1986, CRREL SR 86-16 — cupola di spruzzo, tipi di eruzione (da Young 1971).
 * ------------------------------------------------------------------------------------ */

const RHO = 1025;
const G = 9.81;
const ATM_HEAD = 10.1;

/** Pressione idrostatica assoluta alla quota, Pa (tensione di vapore trascurata). */
export function ambientPa(depthM: number) {
  return RHO * G * (Math.max(0, depthM) + ATM_HEAD);
}

/** Rapporti fra cicli successivi della bolla, TNT (Swift & Decius via [R10]). */
export const CYCLE_PERIOD = [1, 0.744, 0.744 * 0.847] as const;
export const CYCLE_RADIUS = [1, 0.676, 0.676 * 0.775] as const;

/**
 * Risalita della bolla al primo minimo [R10][B15]: Δz₁ ≈ 12,3 √W / (d + 10) m.
 * Il ½ su W è ricostruito: [R10] lo stampa senza, ma con W¹ si avrebbero valori
 * fisicamente implausibili; [B15] e il confronto con [S16] concordano su √W.
 * Fra primo e secondo minimo la bolla sale ancora circa metà di Δz₁ [B15].
 */
export function migrationFirst(wKg: number, depthM: number) {
  return (12.3 * Math.sqrt(Math.max(0, wKg))) / (Math.max(0, depthM) + 10);
}

/** Profilo nel primo periodo [R10, eq. 6]: z(t) = Δz₁ (1 − cos(π t / 2T))^0,40. */
export function migrationProfile(u: number) {
  const x = Math.min(1, Math.max(0, u));
  return Math.pow(1 - Math.cos((Math.PI * x) / 2), 0.4);
}

export type JetRegime = "scafo-attaccata" | "scafo" | "alto" | "basso" | "debole";

export const JET_LABEL: Record<JetRegime, string> = {
  "scafo-attaccata": "la bolla collassa sulla lamiera",
  scafo: "getto contro lo scafo",
  alto: "getto verso l'alto (galleggiamento)",
  basso: "getto verso il basso (superficie vicina)",
  debole: "bolla quasi sferica",
};

export type BubbleHull = {
  /** Distanza adimensionale dallo scafo, γ = d / Rmax. */
  gammaHull: number;
  /** Distanza adimensionale dalla superficie. */
  gammaSurface: number;
  zetaBuoyancy: number;
  zetaHull: number;
  zetaSurface: number;
  /** Vettore di anisotropia totale (direzione del getto). */
  zeta: [number, number, number];
  zetaMag: number;
  regime: JetRegime;
  /** Velocità del getto [S16], m/s; null fuori dal campo delle leggi (ζ < 1e-3 o > 0,1). */
  jetMps: number | null;
  /** Spostamento del baricentro al collasso [S16], m. */
  shiftM: number;
};

/**
 * Anisotropia della bolla [S16]: i contributi si sommano come vettori.
 *  - galleggiamento: ζ_g = ρ g Rmax / Δp, getto verso l'alto;
 *  - parete rigida (scafo): 0,195 γ⁻², getto verso la parete;
 *  - superficie libera: 0,195 γ⁻², getto in verso opposto alla superficie (in basso).
 * Regimi (parete rigida, [S24]): γ < ~1,1 collasso attaccato alla lamiera; γ < ~1,5
 * getto che colpisce la lamiera; oltre ~3,5 interazione trascurabile ai fini del danno.
 */
export function bubbleHull(opts: {
  rMax: number;
  depthM: number;
  /** Distanza dal centro della bolla allo scafo, m. */
  standoffM: number;
  /** Versore dalla bolla verso lo scafo. */
  toHull: [number, number, number];
}): BubbleHull {
  const R = Math.max(1e-3, opts.rMax);
  const dp = ambientPa(opts.depthM);
  const zg = (RHO * G * R) / dp;
  const gh = Math.max(0.05, opts.standoffM / R);
  const gs = Math.max(0.05, Math.max(0, opts.depthM) / R);
  const zh = 0.195 / (gh * gh);
  const zs = 0.195 / (gs * gs);
  const z: [number, number, number] = [
    opts.toHull[0] * zh,
    zg + opts.toHull[1] * zh - zs,
    opts.toHull[2] * zh,
  ];
  const mag = Math.hypot(z[0], z[1], z[2]);
  const towardHull = mag > 0 ? (z[0] * opts.toHull[0] + z[1] * opts.toHull[1] + z[2] * opts.toHull[2]) / mag : 0;
  let regime: JetRegime = "debole";
  if (gh < 1.1) regime = "scafo-attaccata";
  else if (gh < 1.5 && towardHull > 0.5) regime = "scafo";
  else if (mag >= 1e-3) regime = z[1] >= 0 ? "alto" : "basso";
  const jetMps = mag >= 1e-3 && mag <= 0.1 ? Math.min(1490, (0.9 / mag) * Math.sqrt(dp / RHO)) : null;
  return {
    gammaHull: gh,
    gammaSurface: gs,
    zetaBuoyancy: zg,
    zetaHull: zh,
    zetaSurface: zs,
    zeta: z,
    zetaMag: mag,
    regime,
    jetMps,
    shiftM: 2.5 * Math.pow(Math.min(mag, 0.1), 0.6) * R,
  };
}

/**
 * Frequenza del primo modo flessionale verticale (2 nodi) dello scafo, Hz.
 * Trave libera–libera: f₁ = (4,730² / 2π) √(E I / (m_v L³)), che con E = 2,06e11 Pa è
 * la forma DNV/Kumai f = 1,616e6 √(I / (Δ_v L³)) [Y14].
 *  - I: solo il corpo resistente, guscio sottile I = π r³ t (casse esterne e fasciame
 *    allagabile esclusi; le ordinate lo aumentano: stima per difetto).
 *  - m_v: massa virtuale in immersione ≈ 2 × dislocamento in immersione (massa d'acqua
 *    trascinata ≈ massa spostata). Inferenza dal rapporto secco/bagnato di [St95].
 */
export function hullFrequencyHz(opts: { lengthM: number; phDiameterM: number; plateMm: number; dispSubT: number }) {
  const r = opts.phDiameterM / 2;
  const t = opts.plateMm / 1000;
  const I = Math.PI * r * r * r * t;
  const mv = 2 * opts.dispSubT * 1000;
  return { hz: 1.616e6 * Math.sqrt(I / (mv * Math.pow(opts.lengthM, 3))), inertiaM4: I, virtualMassKg: mv };
}

/**
 * Tipo di eruzione in superficie in funzione di profondità / Rmax, con Rmax al primo
 * massimo e costante 3,50 [M86, tabella da Young 1971].
 */
export function surfaceEffect(wKg: number, depthM: number) {
  const d = Math.max(0.1, depthM);
  const rmax = (3.5 * Math.cbrt(Math.max(0, wKg))) / Math.cbrt(d + 10);
  const ratio = d / rmax;
  let kind: string;
  if (ratio > 40) kind = "nessun effetto visibile";
  else if (ratio > 25) kind = "risalita d'acqua (upwelling)";
  else if (ratio > 7) kind = "cupola e mammellone d'acqua";
  else if (ratio > 4) kind = "mammellone che diventa pennacchio";
  else if (ratio > 1) kind = "anello di pennacchi";
  else if (ratio > 0.2) kind = "colonna con getto centrale";
  else kind = "colonna con fumo (sfiato)";
  // Velocità iniziale della cupola sulla verticale [M86, eq. 15]: u = 2 P_m / (ρ c),
  // con il picco di Cole alla profondità di scoppio.
  const pm = 52.16e6 * Math.pow(Math.cbrt(Math.max(0, wKg)) / d, 1.13);
  const domeMps = (2 * pm) / (RHO * 1500);
  return { ratio, rmax, kind, domeMps, visible: ratio <= 40 };
}

/* ---------------------------------- Rapporto per un caso ---------------------------------- */


export type ChargeResponse = {
  id: string;
  bubble: BubbleHull;
  /** Risalita al primo minimo, m. */
  rise1: number;
  /** Periodi dei tre cicli, s. */
  periods: [number, number, number];
  radii: [number, number, number];
  /** Punto dello scafo più vicino (per il getto). */
  hullPoint: [number, number, number];
  /** Posizione lungo lo scafo, 0 = poppa, 1 = prua. */
  xi: number;
  /** Forma modale al punto di carico: quanto quella carica eccita la frusta. */
  modal: number;
};

export type ResponseReport = {
  hull: ReturnType<typeof hullFrequencyHz>;
  /** Frequenza della bolla principale e rapporto con lo scafo (1 = risonanza). */
  bubbleHz: number;
  ratio: number;
  /** Ampiezza illustrativa della frusta al centro scafo, m (non calcolata: vedi nota). */
  whipAmpM: number;
  charges: ChargeResponse[];
  surface: ReturnType<typeof surfaceEffect> | null;
};

/** Smorzamento della frusta (frazione del critico): ipotesi, nessuna fonte consultata lo dà. */
export const WHIP_DAMPING = 0.05;

/**
 * Amplificazione dinamica di un oscillatore smorzato al rapporto di frequenze r,
 * normalizzata a 1 in risonanza: 2ζ / √((1 − r²)² + (2ζr)²).
 */
export function whipAmplification(r: number, zeta = WHIP_DAMPING) {
  return (2 * zeta) / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
}

/**
 * Ampiezza della frusta: nessuna fonte consultata dà un modello semplice. È quindi una
 * scala di lettura dichiarata: 0,3 m in risonanza × amplificazione dinamica (sopra) ×
 * forma modale al punto di carico × vicinanza della bolla (Rmax / distanza, massimo 1) ×
 * quanto la carica sta sotto lo scafo [V86: caso peggiore sotto la chiglia, a centro
 * nave, in risonanza].
 */
function whipScale(ratio: number, modal: number, rMax: number, standoff: number, below: number) {
  const near = Math.min(1, rMax / Math.max(rMax, standoff));
  return 0.3 * whipAmplification(ratio) * Math.abs(modal) * near * (0.4 + 0.6 * Math.max(0, below));
}

export function responseReport(boat: Boat, input: SimInput, result: SimResult): ResponseReport {
  const hull = hullFrequencyHz({
    lengthM: boat.loa,
    phDiameterM: boat.phDiameter,
    plateMm: boat.plateMm,
    dispSubT: boat.dispSub,
  });
  const live = result.charges.filter((c) => c.yield === "full");
  const charges: ChargeResponse[] = live.map((c) => {
    const hp = nearestPhPoint(boat, c.x, c.y, c.z);
    const v: [number, number, number] = [hp[0] - c.x, hp[1] - c.y, hp[2] - c.z];
    const dist = Math.hypot(...v) || 1;
    const toHull: [number, number, number] = [v[0] / dist, v[1] / dist, v[2] / dist];
    const bubble = bubbleHull({ rMax: c.bubbleR, depthM: c.depthM, standoffM: dist, toHull });
    const xi = Math.min(1, Math.max(0, c.x / boat.loa + 0.5));
    return {
      id: c.id,
      bubble,
      rise1: migrationFirst(result.weq, c.depthM),
      periods: [c.periodS, c.periodS * CYCLE_PERIOD[1], c.periodS * CYCLE_PERIOD[2]],
      radii: [c.bubbleR, c.bubbleR * CYCLE_RADIUS[1], c.bubbleR * CYCLE_RADIUS[2]],
      hullPoint: hp,
      xi,
      modal: freeFreeMode(xi),
    };
  });
  const primary = [...charges].sort((a, b) => a.bubble.gammaHull - b.bubble.gammaHull)[0];
  const c0 = primary ? live.find((c) => c.id === primary.id)! : null;
  const bubbleHz = c0 && c0.periodS > 0 ? 1 / c0.periodS : 0;
  const ratio = hull.hz > 0 ? bubbleHz / hull.hz : 0;
  const whipAmpM = charges.reduce((m, r) => {
    const c = live.find((x) => x.id === r.id)!;
    const below = -(r.hullPoint[1] - c.y) / (Math.hypot(r.hullPoint[0] - c.x, r.hullPoint[1] - c.y, r.hullPoint[2] - c.z) || 1);
    const rr = c.periodS > 0 ? 1 / c.periodS / hull.hz : 0;
    return Math.max(m, whipScale(rr, r.modal, c.bubbleR, r.bubble.gammaHull * c.bubbleR, -below));
  }, 0);
  const shallowest = live.length ? live.reduce((a, b) => (a.depthM < b.depthM ? a : b)) : null;
  return {
    hull,
    bubbleHz,
    ratio,
    whipAmpM,
    charges,
    surface: shallowest ? surfaceEffect(result.weq, shallowest.depthM) : null,
  };
}
