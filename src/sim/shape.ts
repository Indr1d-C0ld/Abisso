import type { Boat, Era } from "@/data/types";

export type Station = {
  t: number;
  x: number;
  rx: number;
  ry: number;
  deck: number;
  phr: number;
};

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function stationRadii(boat: Boat, tRaw: number): Station {
  const t = clamp(tRaw, 0, 1);
  const bow = boat.bowFine;
  const stern = boat.sternFine;
  let k = 1;
  if (t < stern) {
    const u = t / Math.max(0.04, stern);
    k = Math.pow(Math.sin((u * Math.PI) / 2), 0.7);
  } else if (t > 1 - bow) {
    const u = (1 - t) / Math.max(0.04, bow);
    k = Math.pow(Math.sin((u * Math.PI) / 2), boat.family === "XXI" ? 0.82 : 0.52);
  }
  k = Math.max(0.045, k);
  const midRx = boat.beam / 2;
  const midRy = Math.max(boat.phDiameter / 2 + 0.48, boat.draft * 0.58);
  const rx = midRx * k;
  const ry = midRy * (t > stern && t < 1 - bow ? 1 : 0.3 + 0.7 * k);
  const phR = boat.phDiameter / 2;
  const deck = Math.min(ry * 0.98, (phR + 0.42) * (0.45 + 0.55 * Math.min(1, k / 0.55)));
  const x = (t - 0.5) * boat.loa;
  const half = boat.phLength / 2;
  let phr = 0;
  const ax = Math.abs(x);
  if (ax < half) {
    const taper = Math.min(6.5, half * 0.2);
    if (ax <= half - taper) phr = phR;
    else phr = phR * (1 - 0.8 * ((ax - (half - taper)) / taper));
  }
  return { t, x, rx, ry, deck, phr };
}

export function normAngle(a: number) {
  const t = a % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

/** Modula la sezione dentro l'inviluppo (baglio e pescaggio restano il tetto). */
function sectionScale(boat: Boat, t: number, aRaw: number) {
  const a = normAngle(aRaw);
  const c = Math.cos(a);
  const side = Math.abs(Math.sin(a));
  const amid = t > 0.16 && t < 0.86 ? Math.sin(((Math.min(0.86, Math.max(0.16, t)) - 0.16) / 0.7) * Math.PI) : 0;
  if (boat.family === "XXI") {
    const pinch = Math.exp(-(c * c) / 0.045);
    const sy = c > 0.25 ? 0.9 : 1;
    const sz = 1 - 0.2 * pinch * (0.3 + 0.7 * Math.max(amid, 0.2));
    return { sy, sz };
  }
  if (boat.family === "XB") {
    return { sy: 0.9 + 0.1 * (1 - side * 0.35), sz: 0.88 + 0.12 * Math.pow(side, 0.6) };
  }
  if (boat.family === "II") {
    return { sy: 1, sz: 0.97 };
  }
  const saddle = side * (c < 0.22 && c > -0.7 ? 1 : 0.22);
  const tuck = (1 - saddle) * (0.3 + 0.7 * amid);
  return { sy: 1, sz: 1 - 0.08 * tuck };
}

export function outerPoint(boat: Boat, t: number, a: number) {
  const s = stationRadii(boat, t);
  const sc = sectionScale(boat, t, a);
  let y = Math.cos(a) * s.ry * sc.sy;
  let z = Math.sin(a) * s.rx * sc.sz;
  if (y > s.deck) {
    const span = Math.max(0.2, s.ry - s.deck);
    const overflow = clamp((y - s.deck) / span, 0, 1);
    y = s.deck;
    z *= 1 - 0.18 * overflow;
  }
  return { x: s.x, y, z };
}

export function boatTop(boat: Boat) {
  let top = 0;
  for (let i = 0; i <= 24; i++) {
    const s = stationRadii(boat, i / 24);
    top = Math.max(top, s.deck);
  }
  return top + boat.towerH;
}

export function towerBox(boat: Boat) {
  const s = stationRadii(boat, boat.towerAt);
  return {
    x: s.x,
    y0: s.deck,
    y1: s.deck + boat.towerH,
    hl: boat.towerL / 2,
    hw: boat.towerW / 2,
    deck: s.deck,
  };
}

export function inTower(boat: Boat, x: number, y: number, z: number) {
  const b = towerBox(boat);
  return Math.abs(x - b.x) <= b.hl && Math.abs(z) <= b.hw && y >= b.y0 - 0.05 && y <= b.y1;
}

export function inWintergarten(boat: Boat, era: Era, x: number, y: number, z: number) {
  if (era !== "1944" || boat.family === "II" || boat.family === "XXI") return false;
  const b = towerBox(boat);
  const x1 = b.x - b.hl + 0.15;
  const x0 = x1 - Math.max(2.4, boat.towerL * 0.9);
  return x >= x0 && x <= x1 && Math.abs(z) <= b.hw * 1.35 && y >= b.y0 - 0.05 && y <= b.y0 + 1.15;
}

export function insideOuter(boat: Boat, x: number, y: number, z: number) {
  const t = x / boat.loa + 0.5;
  if (t < -0.002 || t > 1.002) return false;
  const s = stationRadii(boat, clamp(t, 0, 1));
  if (s.rx < 0.08 || s.ry < 0.08) return false;
  if (y > s.deck + 0.06) return false;
  const p = outerPoint(boat, clamp(t, 0, 1), Math.atan2(z, y));
  return Math.hypot(y, z) <= Math.hypot(p.y, p.z) + 0.05;
}

export function intersectsHull(boat: Boat, era: Era, x: number, y: number, z: number) {
  return insideOuter(boat, x, y, z) || inTower(boat, x, y, z) || inWintergarten(boat, era, x, y, z);
}

/** Distanza approssimata al fasciame del Druckkörper. Interna → distanza dalla lamiera. */
export function distToPh(boat: Boat, px: number, py: number, pz: number) {
  let best = Infinity;
  for (let i = 0; i <= 72; i++) {
    const s = stationRadii(boat, i / 72);
    if (s.phr < 0.08) continue;
    const rad = Math.hypot(py, pz);
    const scale = rad < 1e-4 ? 0 : s.phr / rad;
    const cy = py * scale;
    const cz = pz * scale;
    const d = Math.hypot(px - s.x, py - cy, pz - cz);
    if (d < best) best = d;
  }
  return best;
}

export function compX(boat: Boat, a: number, b: number) {
  const half = boat.phLength / 2;
  return { x0: -half + a * boat.phLength, x1: -half + b * boat.phLength };
}

/** Punto del Druckkörper più vicino a (px, py, pz), sezione circolare per stazione. */
export function nearestPhPoint(boat: Boat, px: number, py: number, pz: number): [number, number, number] {
  let best = Infinity;
  let out: [number, number, number] = [px, 0, 0];
  for (let i = 0; i <= 72; i++) {
    const s = stationRadii(boat, i / 72);
    if (s.phr < 0.08) continue;
    const rad = Math.hypot(py, pz);
    const k = rad < 1e-4 ? 0 : s.phr / rad;
    const cy = rad < 1e-4 ? -s.phr : py * k;
    const cz = pz * k;
    const d = Math.hypot(px - s.x, py - cy, pz - cz);
    if (d < best) {
      best = d;
      out = [s.x, cy, cz];
    }
  }
  return out;
}
