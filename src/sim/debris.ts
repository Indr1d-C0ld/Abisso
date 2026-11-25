import type { Boat } from "@/data/types";
import { OUTER_FACTOR, effectFromU, type SimResult } from "@/sim/model";
import { nearestPhPoint, stationRadii } from "@/sim/shape";

/**
 * Detriti in acqua (Fase 2, completata il 25/11/2026). L'acqua frena subito: un pezzo di
 * lamiera lanciato a cento metri al secondo percorre meno di un metro. Dopo, ciò che pesa
 * più dell'acqua affonda e il legno del tavolato di coperta sale: è il «relitto
 * galleggiante» che i cacciatori cercavano in superficie.
 *
 * Fisica (ricostruita, formule elementari):
 *  - velocità di lancio di una lamiera libera investita dall'impulso i: v₀ = i / (ρ h)
 *    (limite senza interazione fluido–struttura, quindi per eccesso; qui limitata);
 *  - frenata con resistenza quadratica: lunghezza caratteristica ℓ = 2 ρ_s h / (ρ C_d),
 *    percorso s(t) = ℓ ln(1 + v₀ t / ℓ);
 *  - velocità limite di affondamento o risalita: v_t = √(2 |ρ_s − ρ| g h / (ρ C_d)).
 * Spessori, densità e C_d sono ipotesi dichiarate (docs/FONTI-LAMIERA.md).
 */

export const RHO = 1025;
const G = 9.81;
/** Piastra che ruota di piatto e di taglio: valore medio. */
export const CD_PLATE = 1.2;
export const V0_MAX = 150;

export type Material = { id: "acciaio" | "legno"; rho: number; h: number };
/**
 * Fasciame delle casse esterne: 6 mm sul IXC, 5–8 mm sul XXI (Portsmouth 1946, S11).
 * Tavolato di coperta in legno: confermato per VIIC, IXC e XB (manuali M.Dv. 371, ONI
 * 1941); sul XXI solo in plancia. Essenza e spessore non trovati: 40 mm è un'ipotesi.
 */
export const STEEL: Material = { id: "acciaio", rho: 7850, h: 0.006 };
export const WOOD: Material = { id: "legno", rho: 600, h: 0.04 };

export function launchSpeed(impulsePaS: number, m: Material) {
  return Math.min(V0_MAX, impulsePaS / (m.rho * m.h));
}

export function dragLength(m: Material) {
  return (2 * m.rho * m.h) / (RHO * CD_PLATE);
}

/** Percorso lungo la direzione di lancio dopo t secondi, m. */
export function throwDistance(v0: number, m: Material, t: number) {
  const l = dragLength(m);
  return t <= 0 ? 0 : l * Math.log(1 + (v0 * t) / l);
}

/** Velocità verticale limite, m/s: negativa se affonda, positiva se sale. */
export function settleSpeed(m: Material) {
  const v = Math.sqrt((2 * Math.abs(m.rho - RHO) * G * m.h) / (RHO * CD_PLATE));
  return m.rho > RHO ? -v : v;
}

export type Fragment = {
  chargeId: string;
  material: Material;
  /** Origine sul fasciame, nel sistema della scena all'istante dello scoppio. */
  origin: [number, number, number];
  /** Direzione di lancio (unitaria). */
  dir: [number, number, number];
  v0: number;
  /** Scala del pezzo, 0,5–1,5. */
  size: number;
  /** Moltiplicatore della velocità limite (i pezzi non sono tutti uguali). */
  drift: number;
  seed: number;
};

function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const MAX_FRAGMENTS = 240;

/** Gravità sul fasciame esterno oltre la quale la lamiera si strappa e si stacca. */
export const TEAR_SEVERITY = 0.55;

/**
 * Frammenti per ogni scoppio pieno che lacera il fasciame esterno (gravità sopra la soglia
 * nel punto più vicino). Acciaio dal fasciame; legno solo se il punto colpito è alto, dove
 * c'è il tavolato di coperta. Quantità e dispersione sono resa.
 */
export function fragmentsOf(boat: Boat, result: SimResult): Fragment[] {
  const out: Fragment[] = [];
  let n = 0;
  for (const c of result.charges) {
    if (c.yield !== "full") continue;
    const ph = nearestPhPoint(boat, c.x, c.y, c.z);
    const t = Math.min(1, Math.max(0, ph[0] / boat.loa + 0.5));
    const st = stationRadii(boat, t);
    const rad = Math.hypot(ph[1], ph[2]) || 1;
    // Punto sul fasciame esterno lungo lo stesso raggio.
    const ny = ph[1] / rad;
    const nz = ph[2] / rad;
    const ro = Math.hypot(st.ry * ny, st.rx * nz) || rad;
    const origin: [number, number, number] = [ph[0], ny * ro, nz * ro];
    const dist = Math.hypot(c.x - origin[0], c.y - origin[1], c.z - origin[2]);
    const sev = effectFromU(dist / Math.max(0.45, c.rSplit * OUTER_FACTOR));
    if (sev < TEAR_SEVERITY) continue;
    const count = Math.round(14 + 40 * sev);
    // Sul XXI il ponte è lamiera: niente legno.
    const high = ny > 0.35 && boat.family !== "XXI";
    for (let k = 0; k < count && out.length < MAX_FRAGMENTS; k++, n++) {
      const material = high && k % 3 === 0 ? WOOD : STEEL;
      // Via dallo scoppio non si va (c'è la bolla): i pezzi partono a ventaglio lungo il
      // fasciame e verso l'esterno.
      const a = hash(n) * Math.PI * 2;
      const tilt = 0.25 + 0.6 * hash(n + 17);
      const tx = Math.cos(a);
      const ty = -nz * Math.sin(a);
      const tz = ny * Math.sin(a);
      const d: [number, number, number] = [tx * (1 - tilt), ty * (1 - tilt) + ny * tilt, tz * (1 - tilt) + nz * tilt];
      const len = Math.hypot(...d) || 1;
      const spread = 0.4 + 1.6 * hash(n + 5);
      out.push({
        chargeId: c.id,
        material,
        origin: [origin[0] + tx * spread, origin[1] + ty * spread, origin[2] + tz * spread],
        dir: [d[0] / len, d[1] / len, d[2] / len],
        v0: launchSpeed(c.impulsePaS, material) * (0.3 + 0.7 * hash(n + 29)),
        size: 0.5 + hash(n + 41),
        drift: 0.6 + 0.8 * hash(n + 53),
        seed: n,
      });
    }
  }
  return out;
}

/**
 * Posizione di un frammento tau secondi dopo il suo scoppio, nel sistema della scena
 * all'istante dello scoppio (il chiamante aggiunge lo spostamento di quota del battello).
 * `ceiling` è la quota della superficie nello stesso sistema: il legno si ferma lì.
 */
export function fragmentAt(f: Fragment, tau: number, ceiling: number): [number, number, number] {
  const s = throwDistance(f.v0, f.material, tau);
  const vt = settleSpeed(f.material) * f.drift;
  // La velocità limite si raggiunge in una frazione di secondo.
  const settle = vt * Math.max(0, tau - 0.2);
  const y = Math.min(ceiling, f.origin[1] + f.dir[1] * s + settle);
  return [f.origin[0] + f.dir[0] * s, y, f.origin[2] + f.dir[2] * s];
}
