import * as THREE from "three";

/**
 * Quota del pelo libero in un cerchio di raggio 1 dato il riempimento (frazione d'area).
 * Area sotto la quota y: A = α − sin α cos α con cos α = −y (A = π a cerchio pieno).
 * Restituisce α, l'apertura dell'arco bagnato (0 = vuoto, π = pieno).
 */
export function wetAngle(fill: number) {
  const f = Math.min(1, Math.max(0, fill));
  if (f <= 0) return 0;
  if (f >= 1) return Math.PI;
  let lo = 0;
  let hi = Math.PI;
  for (let i = 0; i < 40; i++) {
    const a = (lo + hi) / 2;
    if ((a - Math.sin(a) * Math.cos(a)) / Math.PI < f) lo = a;
    else hi = a;
  }
  return (lo + hi) / 2;
}

/** Quota adimensionale (−1 fondo, +1 cielo) del pelo libero per un riempimento. */
export function levelOfFill(fill: number) {
  return -Math.cos(wetAngle(fill));
}

export const SECTION_X = 10;
export const SECTION_ARC = 18;

/**
 * Volume d'acqua in un tratto di cilindro, nel riferimento del battello (asse lungo x).
 * Il pelo libero resta orizzontale nel mondo: con il battello inclinato di `pitch` (rad,
 * prua in su positiva) nel riferimento del battello ha pendenza −tan(pitch). Topologia
 * fissa, così la geometria si aggiorna in posto a ogni fotogramma.
 *
 * A forte assetto l'acqua si sposterebbe verso la paratia bassa più di quanto mostri il
 * piano che passa per la quota media: il volume è conservato solo in modo approssimato.
 */
export function createSection() {
  const nx = SECTION_X + 1;
  const na = SECTION_ARC + 1;
  const pos = new Float32Array(nx * na * 3);
  const idx: number[] = [];
  const at = (i: number, j: number) => i * na + j;
  for (let i = 0; i < SECTION_X; i++) {
    for (let j = 0; j < SECTION_ARC; j++) {
      idx.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
    }
    // Pelo libero: fra i due estremi dell'arco.
    idx.push(at(i, 0), at(i, SECTION_ARC), at(i + 1, 0), at(i + 1, 0), at(i, SECTION_ARC), at(i + 1, SECTION_ARC));
  }
  // Paratie: ventaglio dell'arco.
  for (const i of [0, SECTION_X]) {
    for (let j = 1; j < SECTION_ARC - 1; j++) idx.push(at(i, 0), at(i, j), at(i, j + 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/**
 * Aggiorna la sezione: da x0 a x1, raggio r(x), riempimento medio `fill`, assetto `pitch`.
 * Restituisce false se il tratto è asciutto (niente da disegnare).
 */
export function updateSection(
  g: THREE.BufferGeometry,
  x0: number,
  x1: number,
  radius: (x: number) => number,
  fill: number,
  pitch: number,
) {
  if (fill <= 0.002) return false;
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const xm = (x0 + x1) / 2;
  const slope = -Math.tan(pitch);
  for (let i = 0; i <= SECTION_X; i++) {
    const x = x0 + ((x1 - x0) * i) / SECTION_X;
    const r = radius(x);
    // Quota media fissata dal riempimento, poi inclinata; limitata al cilindro.
    const yl = Math.min(0.999, Math.max(-0.999, levelOfFill(fill) + (slope * (x - xm)) / Math.max(0.3, r)));
    const a = Math.acos(-yl);
    for (let j = 0; j <= SECTION_ARC; j++) {
      const b = -a + (2 * a * j) / SECTION_ARC;
      pos.setXYZ(i * (SECTION_ARC + 1) + j, x, -r * Math.cos(b), r * Math.sin(b));
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return true;
}
