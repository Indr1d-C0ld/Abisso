// Stampa nodi, traslazioni e bounding box (spazio locale) delle mesh di un GLB.
// Uso: node scripts/glb-info.mjs file.glb [nome-nodo...]
import { readFileSync } from "node:fs";
const [file, ...want] = process.argv.slice(2);
const b = readFileSync(file);
const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
// Traslazione cumulata dai genitori (le rotazioni dei gruppi Thrixel sono nulle).
const parent = new Map();
j.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parent.set(c, i)));
const world = (i) => {
  const t = [...(j.nodes[i].translation ?? [0, 0, 0])];
  for (let p = parent.get(i); p != null; p = parent.get(p)) {
    const pt = j.nodes[p].translation ?? [0, 0, 0];
    for (let k = 0; k < 3; k++) t[k] += pt[k];
  }
  return t.map((v) => +v.toFixed(3));
};
for (const [idx, n] of j.nodes.entries()) {
  if (want.length && !want.some((w) => n.name?.includes(w))) continue;
  let box = "";
  if (n.mesh != null) {
    const acc = j.meshes[n.mesh].primitives.map((p) => j.accessors[p.attributes.POSITION]);
    const mn = [0, 1, 2].map((i) => Math.min(...acc.map((a) => a.min[i])).toFixed(3));
    const mx = [0, 1, 2].map((i) => Math.max(...acc.map((a) => a.max[i])).toFixed(3));
    box = ` min(${mn}) max(${mx})`;
  }
  console.log(`${n.name} world=${JSON.stringify(world(idx))}${n.rotation ? " r=" + JSON.stringify(n.rotation) : ""}${box}`);
}
