import { boatById } from "@/data/boats";
import { batteryReport, type BatteryReport } from "@/data/batteries";
import type { Boat, PatternId, SimInput, Weapon } from "@/data/types";
import { weaponById, MK7_CHARGE_KG } from "@/data/weapons";
import { boatTop, clamp, compX, distToPh, intersectsHull, stationRadii } from "@/sim/shape";

export const R_STAR = 20 * 0.3048;
export const W_STAR = MK7_CHARGE_KG * 0.85;
/** Porta il Mark VII Torpex/Minol sul +30% di raggio della stima RN, non sulla sola radice cubica. */
export const SERVICE_R = 1.3 / Math.cbrt(1.5 / 0.85);
export const OUTER_FACTOR = 2.15;

export type YieldKind = "full" | "mechanical" | "none";
export type Level = "nullo" | "scossa" | "falle" | "allagamento" | "rottura";
export type Outcome = "nessuno" | "scossa" | "serio" | "grave" | "perdita" | "collasso";

export type ChargeResult = {
  id: string;
  x: number;
  y: number;
  z: number;
  yield: YieldKind;
  reason: string;
  slantPh: number;
  rSplit: number;
  aspect: number;
  underKeel: boolean;
  bubbleTouch: boolean;
  bubbleR: number;
  /** Distanza dal punto di scoppio alla chiglia, nel piano della sezione. */
  keelDist: number;
  /** Primo periodo di Willis, secondi. Zero se non c'è scoppio. */
  periodS: number;
  peakMPa: number;
  impulsePaS: number;
  depthM: number;
};

export type CompResult = {
  id: string;
  name: string;
  x0: number;
  x1: number;
  severity: number;
  level: Level;
  systems: string[];
  battery: boolean;
  note: string;
};

export type ZoneResult = { id: string; name: string; severity: number; level: Level };

export type FloodRow = {
  id: string;
  name: string;
  level: Level;
  volumeM3: number;
  holeCm2: number;
  qM3h: number;
  /** Minuti a sfogo libero, area nominale. */
  minFree: number;
  /** Stessa portata, aria che si comprime: minuti per arrivare al riempimento massimo. */
  minTrapped: number;
  trappedFill: number;
  tonnes: number;
};

export type FloodReport = {
  depthM: number;
  /** Nessuna via d'acqua strutturale. */
  dry: boolean;
  rows: FloodRow[];
  tonnes: number;
  /** Dislocamento in immersione meno quello in superficie, tonnellate. Scala, non una riserva di assetto. */
  ballastT: number;
  /** Curva del locale con l'orifizio più grande. t in minuti, frazioni di quel volume. */
  series: { t: number; free: number; trapped: number }[];
  worstName: string;
};

/** Aree di studio, non misurate. L'orologio scala con l'area: un fattore tre sull'area è un fattore tre sul tempo. */
const HOLE_CM2: Record<Level, number> = {
  nullo: 0,
  scossa: 0,
  falle: 8,
  allagamento: 80,
  rottura: 400,
};

const FLOOD_CD = 0.62;
const FLOOD_FILL = 0.65;

function orificeM3s(areaM2: number, headM: number) {
  const v = Math.sqrt(2 * 9.81 * Math.max(0.3, headM));
  return FLOOD_CD * areaM2 * v;
}

function floodClock(volume: number, areaM2: number, depthM: number) {
  const pOut = Math.max(1.2, depthM) * 0.1005 + 1.013;
  const trappedFill = Math.max(0, 1 - 1.013 / pOut);
  const qFree = orificeM3s(areaM2, Math.max(1, depthM));
  const minFree = volume / qFree / 60;
  const target = trappedFill * volume;
  let vol = 0;
  let t = 0;
  const dt = Math.max(0.2, (volume / qFree) / 100);
  const samples: { t: number; free: number; trapped: number }[] = [{ t: 0, free: 0, trapped: 0 }];
  const tEnd = (volume / qFree) * 1.02;
  let next = tEnd / 10;
  while (t < tEnd && vol < target * 0.99) {
    const pIn = (1.013 * volume) / Math.max(volume - vol, volume * 0.02);
    const head = Math.max(0, (pOut - pIn) / 0.1005);
    const q = head < 0.15 ? 0 : orificeM3s(areaM2, head);
    vol = Math.min(target, vol + q * dt);
    t += dt;
    if (t >= next || vol >= target * 0.99) {
      samples.push({
        t: t / 60,
        free: Math.min(1, (qFree * t) / volume),
        trapped: vol / volume,
      });
      next += tEnd / 10;
    }
    if (q === 0) break;
  }
  if (samples[samples.length - 1].t < minFree) {
    samples.push({ t: minFree, free: 1, trapped: vol / volume });
  }
  return { minFree, minTrapped: t / 60, trappedFill, qM3h: qFree * 3600, series: samples };
}

export function floodReport(boat: Boat, comps: CompResult[], depthM: number): FloodReport {
  const ballastT = Math.max(0, boat.dispSub - boat.dispSurf);
  const open = comps.filter((c) => HOLE_CM2[c.level] > 0);
  if (!open.length) {
    return { depthM, dry: true, rows: [], tonnes: 0, ballastT, series: [], worstName: "" };
  }
  const rows: FloodRow[] = open.map((c) => {
    const length = Math.max(0.4, c.x1 - c.x0);
    const r = boat.phDiameter / 2;
    const volume = Math.PI * r * r * length * FLOOD_FILL;
    const holeCm2 = HOLE_CM2[c.level];
    const clock = floodClock(volume, holeCm2 / 1e4, depthM);
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      volumeM3: volume,
      holeCm2,
      qM3h: clock.qM3h,
      minFree: clock.minFree,
      minTrapped: clock.minTrapped,
      trappedFill: clock.trappedFill,
      tonnes: volume * 1.025,
    };
  });
  const worst = [...rows].sort((a, b) => b.holeCm2 - a.holeCm2)[0];
  const clock = floodClock(
    worst.volumeM3,
    worst.holeCm2 / 1e4,
    depthM,
  );
  return {
    depthM,
    dry: false,
    rows,
    tonnes: rows.reduce((s, r) => s + r.tonnes, 0),
    ballastT,
    series: clock.series,
    worstName: worst.name,
  };
}

export type SimResult = {
  charges: ChargeResult[];
  compartments: CompResult[];
  zones: ZoneResult[];
  outcome: Outcome;
  outcomeLabel: string;
  oilSlick: boolean;
  chlorine: boolean;
  batteries: BatteryReport;
  forcedSurface: boolean;
  hydrostatic: boolean;
  fuzeBeyond: boolean;
  sinkTimeS: number;
  driftM: number;
  weq: number;
  serviceR: number;
  wScale: number;
  hullS: number;
  depthS: number;
  rSplitBeam: number;
  relToViic: number;
  preload: number;
  hydroBar: number;
  hydroPct: number;
  markerR: number | null;
  wave: WaveReport;
  flood: FloodReport;
  effectSeries: { r: number; s: number }[];
  coleSeries: { r: number; p: number }[];
  narrative: string[];
  factors: { k: string; v: string }[];
};

export const SOUND_MPS = 1490;
export const WAVE_SCREEN_S = 2.4;

export type WavePass = {
  id: string;
  slantM: number;
  travelMs: number;
  peakMPa: number;
  thetaMs: number;
  wallMPa: number;
};

export type WaveReport = {
  /** Velocità del suono assunta, m/s. */
  c: number;
  screenS: number;
  reachM: number;
  /** Di quanto il fronte a schermo è più lento del tempo reale. */
  slow: number;
  passes: WavePass[];
};

/** Profilo dell'onda iniziale: salto a Pm, poi Pm·e^{−t/θ}. Non è la pulsazione della bolla. */
export function initialShock(slantM: number, peakMPa: number, thetaMs: number, depthM: number, periodS: number) {
  const theta = Math.max(0.01, thetaMs);
  const staticBar = Math.max(0, depthM) * 0.1005 + 1.013;
  const peakBar = peakMPa * 10;
  const over = peakBar / Math.max(0.1, staticBar);
  const profile: { t: number; p: number }[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = (i / 24) * 5;
    profile.push({ t: u * theta, p: peakMPa * Math.exp(-u) });
  }
  return {
    travelMs: (slantM / SOUND_MPS) * 1000,
    thetaMs: theta,
    lengthM: SOUND_MPS * (theta / 1000),
    impulsePaS: peakMPa * 1e6 * (theta / 1000),
    share1: 1 - Math.exp(-1),
    share3: 1 - Math.exp(-3),
    staticBar,
    over,
    strongMs: theta * Math.log(Math.max(1.01, over)),
    periodS,
    gap: periodS > 0 ? periodS / (theta / 1000) : 0,
    profile,
  };
}

export function n(x: number, d = 1) {
  return x.toLocaleString("it-IT", { maximumFractionDigits: d, minimumFractionDigits: d });
}

export function coleMPa(wKg: number, rM: number) {
  const R = Math.max(0.35, rM);
  const Z = Math.cbrt(wKg) / R;
  return 52.16 * Math.pow(Z, 1.13);
}

/** Scomposizione di P = 52,16 · (W^1/3 / R)^1,13. Z = R / W^1/3 è la distanza scalata. */
export function coleBreakdown(wKg: number, rM: number) {
  const W = Math.max(0.1, wKg);
  const R = Math.max(0.35, rM);
  const w13 = Math.cbrt(W);
  const Z = R / w13;
  const sigma = w13 / R;
  const p = 52.16 * Math.pow(sigma, 1.13);
  return { W, R, w13, Z, sigma, p, near: rM < 1, pUnit: 52.16 };
}

/**
 * Primo raggio massimo della bolla, m: Rmax = 3,50 W^(1/3) / (d + 10)^(1/3), TNT.
 * Swisdak (a cura di) 1978, NSWC/WOL TR 76-116, Explosion Effects and Properties II;
 * lo stesso valore in Brainard 2015 per le cariche grandi (3,36 per le piccole, Swift &
 * Decius via Riley 2010). Prima di questa versione il modello usava 3,38 senza fonte.
 */
export const BUBBLE_J = 3.5;

export function bubbleRadius(wKg: number, depthM: number) {
  return (BUBBLE_J * Math.cbrt(Math.max(0.1, wKg))) / Math.cbrt(Math.max(0.5, depthM) + 10);
}

/** Primo periodo di Willis, secondi. Costante metrica usuale, stesso ordine del collasso di Rayleigh. */
export function bubblePeriod(wKg: number, depthM: number) {
  const head = Math.max(0.5, depthM) + 10.1;
  return (2.11 * Math.cbrt(Math.max(0.1, wKg))) / Math.pow(head, 5 / 6);
}

export function impulsePaS(wKg: number, rM: number, pMPa: number) {
  const R = Math.max(0.35, rM);
  const theta = 0.000084 * Math.cbrt(wKg) * Math.pow(R / Math.cbrt(wKg), 0.23);
  return pMPa * 1e6 * theta;
}

export function effectFromU(u: number) {
  if (u <= 0) return 1;
  if (u < 1) return 1 - 0.08 * u;
  if (u < 2) return 0.92 - 0.34 * (u - 1);
  if (u < 4) return 0.58 - 0.19 * (u - 2);
  if (u < 7) return 0.2 * (1 - (u - 4) / 3);
  return 0;
}

export function levelOf(s: number): Level {
  if (s >= 0.85) return "rottura";
  if (s >= 0.55) return "allagamento";
  if (s >= 0.28) return "falle";
  if (s >= 0.1) return "scossa";
  return "nullo";
}

export function hullScale(boat: Boat) {
  const s = boat.plateMm / boat.phDiameter;
  const sRef = 18.5 / 4.7;
  return Math.pow(sRef / s, 1 / 1.13);
}

export function depthScale(depth: number, collapse: number) {
  const pref = (75 + 10.1) / (250 + 10.1);
  const marginRef = 1 - pref;
  const p = (depth + 10.1) / (collapse + 10.1);
  const margin = Math.max(0.12, 1 - p);
  return Math.min(2.2, Math.pow(marginRef / margin, 1 / 1.13));
}

export function chargeEnergy(weapon: Weapon) {
  const weq = weapon.chargeKg * weapon.re;
  const serviceR = weapon.explosive === "torpex" || weapon.explosive === "minol" ? SERVICE_R : 1;
  const wScale = Math.cbrt(weq / W_STAR);
  return { weq, serviceR, wScale };
}

export function rSplitOf(boat: Boat, weapon: Weapon, depth: number, aspect: number) {
  const { wScale, serviceR } = chargeEnergy(weapon);
  return R_STAR * wScale * serviceR * hullScale(boat) * depthScale(depth, boat.collapseM) * aspect;
}

export function referenceRadius(weapon: Weapon, depth = 75) {
  return rSplitOf(boatById("vii-c"), weapon, depth, 1);
}

function rotate(x: number, z: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - z * s, x * s + z * c] as const;
}

export function patternPoints(id: PatternId, spacing: number) {
  if (id === "single") return [{ x: 0, z: 0, depthAdd: 0 }];
  if (id === "diamond5") {
    return [
      { x: 0, z: 0, depthAdd: 0 },
      { x: spacing, z: 0, depthAdd: 0 },
      { x: -spacing, z: 0, depthAdd: 0 },
      { x: 0, z: spacing, depthAdd: 0 },
      { x: 0, z: -spacing, depthAdd: 0 },
    ];
  }
  if (id === "line5") return Array.from({ length: 5 }, (_, i) => ({ x: (i - 2) * spacing, z: 0, depthAdd: 0 }));
  if (id === "line10") return Array.from({ length: 10 }, (_, i) => ({ x: (i - 4.5) * spacing, z: 0, depthAdd: 0 }));
  if (id === "hedgehog") {
    const r = 18.5;
    return Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, depthAdd: 0 };
    });
  }
  if (id === "hedgehog-us") {
    return Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return { x: Math.cos(a) * 29.5, z: Math.sin(a) * 25.5, depthAdd: 0 };
    });
  }
  const side = 37;
  const h = (Math.sqrt(3) / 2) * side;
  const tri = [
    { x: (2 / 3) * h, z: 0, depthAdd: 0 },
    { x: -h / 3, z: side / 2, depthAdd: 0 },
    { x: -h / 3, z: -side / 2, depthAdd: 0 },
  ];
  if (id === "squid3") return tri;
  return [...tri, ...tri.map((p) => ({ ...p, depthAdd: 18 }))];
}

function aspectFor(boat: Boat, weapon: Weapon, x: number, y: number, z: number, depthM: number) {
  const t = clamp(x / boat.loa + 0.5, 0, 1);
  const s = stationRadii(boat, t);
  const keelY = -s.ry;
  const under = y < keelY - 0.5 && Math.abs(z) < 8 && Math.abs(x) < boat.loa * 0.62;
  const { weq } = chargeEnergy(weapon);
  const bubbleR = bubbleRadius(weq, depthM);
  const keelDist = Math.hypot(y - keelY, z);
  const bubble = keelDist < bubbleR * 1.15 && y < -s.phr * 0.15;
  let aspect = 1;
  if (under) aspect += 0.25;
  if (bubble) aspect += 0.12;
  return { aspect: Math.min(1.34, aspect), under, bubble, bubbleR, keelDist };
}

export function severityAtPoint(
  charges: ChargeResult[],
  x: number,
  y: number,
  z: number,
  layer: "ph" | "outer",
) {
  let m = 0;
  for (const c of charges) {
    if (c.yield === "none") continue;
    const dist = Math.hypot(x - c.x, y - c.y, z - c.z);
    const radius = Math.max(0.45, layer === "outer" ? c.rSplit * OUTER_FACTOR : c.rSplit);
    let s = effectFromU(dist / radius);
    if (c.yield === "mechanical") s *= 0.35;
    if (s > m) m = s;
  }
  return m;
}

export function describeHit(input: SimInput, result: SimResult, x: number, y: number, z: number) {
  const boat = boatById(input.boatId);
  const sev = severityAtPoint(result.charges, x, y, z, "outer");
  const fromBow = boat.loa / 2 - x;
  const t = clamp(x / boat.loa + 0.5, 0, 1);
  const s = stationRadii(boat, t);
  let zone = "Fasciame di murata";
  if (y > s.deck - 0.28) zone = "Ponte";
  else if (y < -s.ry * 0.72) zone = "Chiglia";
  else if (t > 0.84) zone = "Prua esterna";
  else if (t < 0.16) zone = "Poppa esterna";
  else if (z > 0.35) zone = "Cassa di dritta";
  else if (z < -0.35) zone = "Cassa di sinistra";
  const comp = result.compartments.find((c) => x >= c.x0 - 0.15 && x <= c.x1 + 0.15) ?? null;
  let nearest = Infinity;
  for (const c of result.charges) {
    if (c.yield === "none") continue;
    nearest = Math.min(nearest, Math.hypot(x - c.x, y - c.y, z - c.z));
  }
  const side = z > 0.35 ? "dritta" : z < -0.35 ? "sinistra" : "in piano";
  return {
    x,
    y,
    z,
    sev,
    level: levelOf(sev),
    fromBow,
    side,
    zone,
    compId: comp?.id ?? null,
    compName: comp?.name ?? null,
    nearestM: Number.isFinite(nearest) ? nearest : null,
  };
}

export type HullProbe = ReturnType<typeof describeHit>;

const NOTES: Record<Level, string> = {
  nullo: "Paratia e fasciame senza danno strutturale da questo colpo.",
  scossa: "Quadri, lampade, manometri. Lo scafo tiene. L'equipaggio è scosso, non il Druckkörper.",
  falle: "Vie d'acqua da premistoppa, valvole o fessure. Potrebbero essere contenibili con le pompe.",
  allagamento: "Il compartimento va considerato perso. Reggono o no le paratie vicine.",
  rottura: "Cedimento locale del corpo resistente. Non è un premistoppa: è la lamiera.",
};

const OUTCOME_LABEL: Record<Outcome, string> = {
  nessuno: "Nessun effetto tattico",
  scossa: "Scossa — il battello può restare in quota",
  serio: "Danno serio — falle, assetto da riprendere",
  grave: "Danno grave — compartimento allagato",
  perdita: "Perdita probabile",
  collasso: "Collasso idrostatico",
};

function outcomeOf(hydro: boolean, comps: CompResult[]): Outcome {
  if (hydro) return "collasso";
  const ruptured = comps.some((c) => c.level === "rottura");
  const flooded = comps.filter((c) => c.level === "allagamento" || c.level === "rottura").length;
  const leaks = comps.some((c) => c.level === "falle" || c.level === "allagamento" || c.level === "rottura");
  const shaken = comps.some((c) => c.level !== "nullo");
  if (ruptured || flooded >= 2) return "perdita";
  if (flooded === 1) return "grave";
  if (leaks) return "serio";
  if (shaken) return "scossa";
  return "nessuno";
}

const ZONES: { id: string; name: string; t0: number; t1: number; kind: "port" | "stbd" | "deck" | "keel" | "any" | "tower" }[] = [
  { id: "prua", name: "Prua esterna", t0: 0.78, t1: 1, kind: "any" },
  { id: "sella-d", name: "Cassa di dritta", t0: 0.28, t1: 0.74, kind: "stbd" },
  { id: "sella-s", name: "Cassa di sinistra", t0: 0.28, t1: 0.74, kind: "port" },
  { id: "ponte", name: "Ponte", t0: 0.32, t1: 0.72, kind: "deck" },
  { id: "torre", name: "Torre", t0: 0.5, t1: 0.7, kind: "tower" },
  { id: "poppa", name: "Poppa, timoni, eliche", t0: 0, t1: 0.22, kind: "any" },
  { id: "chiglia", name: "Chiglia", t0: 0.22, t1: 0.78, kind: "keel" },
];

function zonePoint(boat: Boat, t: number, kind: (typeof ZONES)[number]["kind"]) {
  const s = stationRadii(boat, t);
  if (kind === "tower") {
    const tw = stationRadii(boat, boat.towerAt);
    return { x: tw.x, y: tw.deck + boat.towerH * 0.6, z: 0 };
  }
  if (kind === "deck") return { x: s.x, y: s.deck, z: 0 };
  if (kind === "keel") return { x: s.x, y: -s.ry + 0.05, z: 0 };
  if (kind === "stbd") return { x: s.x, y: -s.ry * 0.15, z: s.rx * 0.92 };
  if (kind === "port") return { x: s.x, y: -s.ry * 0.15, z: -s.rx * 0.92 };
  return { x: s.x, y: 0, z: 0 };
}

export function evaluate(input: SimInput): SimResult {
  const boat = boatById(input.boatId);
  const weapon = weaponById(input.weaponId);
  const energy = chargeEnergy(weapon);
  const contact = weapon.kind === "contact";
  const sinkDepth = contact ? input.axisDepth : input.burstDepth;
  const sinkTimeS = sinkDepth / Math.max(0.4, weapon.sinkMps);
  const driftM = input.applyDrift ? input.speedKn * 0.514444 * sinkTimeS : 0;
  const top = boatTop(boat);
  const fuzeBeyond = !contact && input.burstDepth > weapon.maxSetM + 0.1;

  const raw = patternPoints(input.pattern, input.spacing).map((p, i) => {
    const [rx, rz] = rotate(p.x, p.z, input.heading);
    const x = rx + input.missX - driftM;
    const z = rz + input.missZ;
    const setDepth = input.burstDepth + p.depthAdd;
    const yFuze = input.axisDepth - setDepth;
    let y = yFuze;
    let yieldKind: YieldKind = contact ? "none" : "full";
    let reason = contact
      ? "Nessun urto: l'Hedgehog non esplode in acqua."
      : "Scoppio in acqua libera alla quota di spoletta.";

    if (contact) {
      const yStart = top + 0.4;
      const yEnd = -stationRadii(boat, 0.5).ry - 1;
      for (let yy = yStart; yy >= yEnd; yy -= 0.25) {
        if (intersectsHull(boat, input.era, x, yy, z)) {
          y = yy;
          yieldKind = "full";
          reason = "Urto sullo scafo. Spoletta a contatto: scoppio sulla lamiera.";
          break;
        }
      }
    } else if (yFuze < top + 0.3) {
      const yStart = top + 0.4;
      for (let yy = yStart; yy >= yFuze; yy -= 0.25) {
        if (intersectsHull(boat, input.era, x, yy, z)) {
          const impactDepth = input.axisDepth - yy;
          const early = setDepth - impactDepth;
          y = yy;
          if (early <= input.armWindow) {
            yieldKind = "full";
            reason = `Urto ${n(early, 1)} m prima della quota di spoletta, dentro la finestra di armamento (${n(input.armWindow, 0)} m): scoppio sulla lamiera.`;
          } else {
            yieldKind = "mechanical";
            reason = `Urto ${n(early, 1)} m prima della spoletta, fuori finestra: danno meccanico, senza bolla di scoppio.`;
          }
          break;
        }
      }
    }

    const depthM = input.axisDepth - y;
    const asp = aspectFor(boat, weapon, x, y, z, Math.max(1, depthM));
    const rSplit = rSplitOf(boat, weapon, input.axisDepth, yieldKind === "none" ? 1 : asp.aspect);
    const slantPh = distToPh(boat, x, y, z);
    const peakMPa = yieldKind === "full" ? coleMPa(energy.weq, Math.max(0.4, slantPh)) : 0;
    const impulse = yieldKind === "full" ? impulsePaS(energy.weq, Math.max(0.4, slantPh), peakMPa) : 0;
    return {
      id: `c${i + 1}`,
      x,
      y,
      z,
      yield: yieldKind,
      reason,
      slantPh,
      rSplit,
      aspect: asp.aspect,
      underKeel: asp.under && yieldKind === "full",
      bubbleTouch: asp.bubble && yieldKind === "full",
      bubbleR: yieldKind === "full" ? asp.bubbleR : 0,
      keelDist: asp.keelDist,
      periodS: yieldKind === "full" ? bubblePeriod(energy.weq, Math.max(1, depthM)) : 0,
      peakMPa,
      impulsePaS: impulse,
      depthM,
    } satisfies ChargeResult;
  });

  const compartments: CompResult[] = boat.compartments.map((c) => {
    const { x0, x1 } = compX(boat, c.a, c.b);
    let severity = 0;
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const s = stationRadii(boat, clamp(x / boat.loa + 0.5, 0, 1));
      const r = Math.max(0.25, s.phr || boat.phDiameter / 2);
      const pts: [number, number, number][] = [
        [x, r, 0],
        [x, -r, 0],
        [x, 0, r],
        [x, 0, -r],
      ];
      for (const p of pts) severity = Math.max(severity, severityAtPoint(raw, p[0], p[1], p[2], "ph"));
    }
    const level = levelOf(severity);
    return {
      id: c.id,
      name: c.name,
      x0,
      x1,
      severity,
      level,
      systems: c.systems,
      battery: Boolean(c.battery),
      note: NOTES[level],
    };
  });

  const zones: ZoneResult[] = ZONES.map((z) => {
    let severity = 0;
    for (let i = 0; i <= 4; i++) {
      const t = z.t0 + ((z.t1 - z.t0) * i) / 4;
      const p = zonePoint(boat, t, z.kind);
      severity = Math.max(severity, severityAtPoint(raw, p.x, p.y, p.z, "outer"));
    }
    return { id: z.id, name: z.name, severity, level: levelOf(severity) };
  });

  const hydrostatic = input.axisDepth > boat.collapseM;
  const outcome = outcomeOf(hydrostatic, compartments);
  const oilSlick = zones.some((z) => ["sella-d", "sella-s", "prua", "chiglia", "poppa"].includes(z.id) && z.severity >= 0.35);
  const batteries = batteryReport(boat.family, compartments);
  const chlorine = batteries.chlorine;
  const forcedSurface = outcome === "grave" || outcome === "perdita" || outcome === "collasso";
  const hullS = hullScale(boat);
  const depthS = depthScale(input.axisDepth, boat.collapseM);
  const rSplitBeam = rSplitOf(boat, weapon, input.axisDepth, 1);
  const viic = boatById("vii-c");
  const relToViic =
    (hullS * depthS) / (hullScale(viic) * depthScale(input.axisDepth, viic.collapseM));
  const preload = (input.axisDepth + 10.1) / (boat.collapseM + 10.1);
  const hydroBar = input.axisDepth * 0.1005 + 1.013;
  const collapseBar = boat.collapseM * 0.1005 + 1.013;
  const hydroPct = (hydroBar / collapseBar) * 100;

  const live = raw.filter((c) => c.yield === "full");
  const primary = [...live].sort((a, b) => a.slantPh - b.slantPh)[0] ?? null;
  const markerR = primary ? primary.slantPh : null;
  const wave = waveReport(raw);
  const flood = floodReport(boat, compartments, input.axisDepth);

  const effectSeries = Array.from({ length: 41 }, (_, r) => ({
    r,
    s: Math.round(effectFromU(r / Math.max(0.4, rSplitBeam)) * 100) / 100,
  }));
  const coleSeries = Array.from({ length: 39 }, (_, i) => {
    const r = i + 2;
    return { r, p: Math.round(coleMPa(energy.weq, r) * 100) / 100 };
  });

  const nFull = raw.filter((c) => c.yield === "full").length;
  const nMech = raw.filter((c) => c.yield === "mechanical").length;
  const nNone = raw.filter((c) => c.yield === "none").length;
  const worst = [...compartments].sort((a, b) => b.severity - a.severity)[0];

  const narrative = [
    `${boat.name}, ${weapon.short}. Asse del corpo resistente a ${n(input.axisDepth, 0)} m: ${n(hydroBar, 2)} bar assoluti, ${n(hydroPct, 0)}% della pressione di collasso usata dal modello (${n(boat.collapseM, 0)} m).`,
    hydrostatic
      ? "Questa quota supera il collasso di calcolo. Il battello è già perso per pressione ambiente: la carica, se arriva, lavora su uno scafo che non ha più riserva."
      : `Precarico ${n(preload * 100, 0)}% del collasso. La scala di quota vale ${n(depthS, 2)} rispetto al VIIC di riferimento a 75 m; la scala di scafo (lamiera / diametro) vale ${n(hullS, 2)}.`,
    `Discesa ${n(sinkTimeS, 0)} s a ${n(weapon.sinkMps, 1)} m/s. Il bersaglio, se la deriva è attiva, percorre ${n(driftM, 0)} m verso prua nel frattempo. Scoppi pieni: ${nFull}. Urti senza bolla: ${nMech}. Colpi a vuoto: ${nNone}.`,
    worst
      ? `Compartimento più esposto: ${worst.name}, indice ${n(worst.severity, 2)} (${worst.level}). ${worst.note}`
      : "",
    flood.dry
      ? "Nessuna via d'acqua nel Druckkörper. Senza orifizio non c'è un orologio: la scossa non riempie un locale."
      : `Allagamento nel tempo, non nel verdetto. ${flood.worstName}: orifizio di studio ${n(flood.rows.find((r) => r.name === flood.worstName)?.holeCm2 ?? 0, 0)} cm², ${n(flood.rows.find((r) => r.name === flood.worstName)?.minFree ?? 0, 1)} min a sfogo libero. L'area è un'ipotesi: il triplo o un terzo sposta il tempo di altrettanto.`,
    `Raggio di rottura in acqua, al traverso, in queste condizioni: ${n(rSplitBeam, 1)} m. Fascia di incertezza, non calcolata a parte ma dichiarata: ${n(rSplitBeam * 0.8, 1)}–${n(rSplitBeam * 1.25, 1)} m (corrosione, tolleranze, resa reale). Rispetto a un VIIC alla stessa quota il raggio letale di questa carica è ${n(relToViic, 2)}×.`,
    oilSlick
      ? "Il fasciame esterno o le casse superano la soglia. In mare si vedrebbe nafta anche con il Druckkörper ancora stagno: è l'indizio classico, e spesso ingannevole."
      : "Le casse esterne restano sotto la soglia di slick. L'assenza di nafta non prova che la carica fosse lontana: prova solo che il rivestimento ha tenuto.",
    fuzeBeyond
      ? `La quota impostata supera la spoletta tabulabile di questa variante (${n(weapon.maxSetM, 0)} m). Il colpo è calcolato lo stesso, ma un'arma reale di quel lotto non sarebbe arrivata armata fin lì.`
      : "",
  ].filter(Boolean);

  const factors = [
    { k: "Equivalente TNT", v: `${n(energy.weq, 0)} kg` },
    { k: "Scala di peso", v: n(energy.wScale, 2) },
    { k: "Fattore di servizio sul raggio", v: n(energy.serviceR, 2) },
    { k: "Scala di scafo", v: n(hullS, 2) },
    { k: "Scala di quota", v: n(depthS, 2) },
    { k: "Rottura al traverso", v: `${n(rSplitBeam, 1)} m` },
    { k: "Aspetto della carica più vicina", v: primary ? n(primary.aspect, 2) : "—" },
    { k: "Distanza inclinata al Druckkörper", v: primary ? `${n(primary.slantPh, 1)} m` : "—" },
    { k: "Pressione di picco (Cole)", v: primary ? `${n(primary.peakMPa, 2)} MPa` : "—" },
    { k: "Rispetto al VIIC, stessa quota", v: `${n(relToViic, 2)}×` },
  ];

  return {
    charges: raw,
    compartments,
    zones,
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    oilSlick,
    chlorine,
    batteries,
    forcedSurface,
    hydrostatic,
    fuzeBeyond,
    sinkTimeS,
    driftM,
    weq: energy.weq,
    serviceR: energy.serviceR,
    wScale: energy.wScale,
    hullS,
    depthS,
    rSplitBeam,
    relToViic,
    preload,
    hydroBar,
    hydroPct,
    markerR,
    wave,
    flood,
    effectSeries,
    coleSeries,
    narrative,
    factors,
  };
}

function waveReport(raw: ChargeResult[]): WaveReport {
  const passes: WavePass[] = raw
    .filter((c) => c.yield === "full")
    .map((c) => {
      const thetaS = c.peakMPa > 0 ? c.impulsePaS / (c.peakMPa * 1e6) : 0;
      return {
        id: c.id,
        slantM: c.slantPh,
        travelMs: (c.slantPh / SOUND_MPS) * 1000,
        peakMPa: c.peakMPa,
        thetaMs: thetaS * 1000,
        wallMPa: c.peakMPa * 2,
      };
    })
    .sort((a, b) => a.slantM - b.slantM);
  const far = passes.reduce((m, p) => Math.max(m, p.slantM * 1.7), 14);
  const reachM = Math.min(70, Math.max(14, far));
  const slow = WAVE_SCREEN_S / (reachM / SOUND_MPS);
  return { c: SOUND_MPS, screenS: WAVE_SCREEN_S, reachM, slow, passes };
}

export const LEVEL_LABEL: Record<Level, string> = {
  nullo: "Integro",
  scossa: "Scossa",
  falle: "Falle",
  allagamento: "Allagato",
  rottura: "Rottura",
};
