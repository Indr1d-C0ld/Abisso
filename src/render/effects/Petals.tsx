import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Wound } from "@/render/hullMaterial";

/**
 * Petali degli squarci: la lamiera dello squarcio non sparisce, si apre in n lembi
 * attaccati al bordo che si arrotolano verso l'interno dello scafo (carico dall'esterno).
 * Numero di petali da src/sim/plate.ts (Wierzbicki 1999); lunghezza ≈ raggio dello
 * squarcio e arricciatura fino a ~140° sono resa, non calcolo.
 */
function petalGeometry(w: Wound) {
  const n = Math.max(3, Math.round(w.petals ?? 4));
  const h = w.hole;
  const nIn = new THREE.Vector3(0, w.iny, w.inz).normalize();
  const t1 = new THREE.Vector3(1, 0, 0);
  const t2 = new THREE.Vector3(0, nIn.z, -nIn.y);
  const c = new THREE.Vector3(w.x, w.y, w.z);
  // Raggio locale della sezione: i petali seguono la curvatura in circonferenza.
  const rLocal = Math.max(1, Math.hypot(w.y, w.z));
  const segS = 8;
  const segW = 4;
  const pos: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (let k = 0; k < n; k++) {
    const th0 = (w.phase ?? 0) + (2 * Math.PI * k) / n;
    const half = (Math.PI / n) * 0.82;
    // Il petalo è materiale dello squarcio: lungo quanto il raggio, piegato verso l'interno.
    const len = h * (0.9 + 0.12 * Math.sin(k * 2.3 + (w.phase ?? 0)));
    const curl = 2.1 + 0.35 * Math.sin(k * 1.7);
    for (let i = 0; i <= segS; i++) {
      const s = i / segS;
      // Lungo il petalo: parte dal bordo, punta verso il centro dello squarcio e si piega
      // dentro lo scafo, come lembi spinti da fuori.
      const a = curl * s;
      const radial = h - (len / curl) * Math.sin(a);
      const depth = (len / curl) * (1 - Math.cos(a));
      const width = (1 - s * 0.92) * half;
      for (let j = 0; j <= segW; j++) {
        const th = th0 + (j / segW - 0.5) * 2 * width;
        const dir = t1.clone().multiplyScalar(Math.cos(th)).add(t2.clone().multiplyScalar(Math.sin(th)));
        const around = radial * Math.sin(th);
        const sag = (around * around) / (2 * rLocal);
        const p = c.clone().add(dir.multiplyScalar(radial)).add(nIn.clone().multiplyScalar(depth + sag));
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let i = 0; i < segS; i++) {
      for (let j = 0; j < segW; j++) {
        const a = base + i * (segW + 1) + j;
        const b = a + segW + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    base += (segS + 1) * (segW + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Petals({ wounds, planes, atlantic }: { wounds: Wound[]; planes: THREE.Plane[]; atlantic: boolean }) {
  const geos = useMemo(() => wounds.filter((w) => w.hole > 0.2).map(petalGeometry), [wounds]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  if (!geos.length) return null;
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color={atlantic ? "#2b2622" : "#3a2c26"}
            metalness={0.55}
            roughness={0.55}
            side={THREE.DoubleSide}
            clippingPlanes={planes}
          />
        </mesh>
      ))}
    </group>
  );
}
