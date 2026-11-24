import * as THREE from "three";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";

/**
 * Infittisce le mesh grandi del rivestimento Thrixel, così che ammaccature e cuscini fra
 * le ordinate (spostamenti per vertice nello shader) abbiano vertici su cui agire.
 * Le mesh generate hanno triangoli lunghi decine di metri sullo scafo.
 *
 * Solo mesh a materiale singolo (il modificatore perde i gruppi) e abbastanza grandi;
 * i colori per vertice glTF (spesso RGBA normalizzati) vengono portati a RGB float, il
 * formato che il modificatore si aspetta.
 */
export const DENSIFY_EDGE_M = 0.7;
const MIN_SIZE_M = 6;
const MAX_TRIANGLES = 400_000;

function rgbFloat(geo: THREE.BufferGeometry) {
  const c = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!c || (c.itemSize === 3 && c.array instanceof Float32Array && !c.normalized)) return geo;
  const out = new Float32Array(c.count * 3);
  for (let i = 0; i < c.count; i++) {
    out[i * 3] = c.getX(i);
    out[i * 3 + 1] = c.getY(i);
    out[i * 3 + 2] = c.getZ(i);
  }
  const g = geo.clone();
  g.setAttribute("color", new THREE.BufferAttribute(out, 3));
  return g;
}

/** Restituisce quante mesh sono state infittite e i triangoli prima/dopo. */
export function densify(root: THREE.Object3D, edge = DENSIFY_EDGE_M) {
  const mod = new TessellateModifier(edge, 6);
  let meshes = 0;
  let before = 0;
  let after = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const geo = mesh.geometry;
    if (geo.groups.length > 1) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    if (Math.max(size.x, size.y, size.z) < MIN_SIZE_M) return;
    const tris = (geo.index ? geo.index.count : geo.getAttribute("position").count) / 3;
    before += tris;
    let g = mod.modify(rgbFloat(geo));
    const n = g.getAttribute("position").count / 3;
    if (n > MAX_TRIANGLES) {
      g.dispose();
      g = geo;
    } else {
      g.computeBoundingSphere();
      meshes++;
    }
    after += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
    mesh.geometry = g;
  });
  return { meshes, before, after };
}
