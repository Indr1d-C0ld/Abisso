import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Boat } from "@/data/types";
import type { SimResult } from "@/sim/model";
import { fragmentAt, fragmentsOf, type Fragment } from "@/sim/debris";
import { hydroAt } from "@/sim/hydrostatics";
import { displayToReal, type Timeline } from "@/sim/timeline";
import { usePlayer } from "@/render/player";

/**
 * Detriti in acqua: lamiera del fasciame esterno che affonda e tavolato di coperta che
 * sale fino alla superficie. Posizioni da src/sim/debris.ts, funzione del solo tempo reale
 * dallo scoppio: scorrere la barra le ripercorre. Stanno nel mondo, non nel riferimento
 * del battello: se il battello scende o sale, loro restano dove l'acqua li porta.
 */
function Layer({
  frags,
  timeline,
  depth0,
  color,
  box,
  metalness,
}: {
  frags: Fragment[];
  timeline: Timeline;
  depth0: number;
  color: string;
  box: [number, number, number];
  metalness: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shock = useMemo(() => new Map(timeline.tracks.map((t) => [t.id, t.tShock ?? t.tEnd])), [timeline]);
  const geo = useMemo(() => new THREE.BoxGeometry(...box), [box]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = usePlayer.getState().t;
    const tReal = displayToReal(timeline, d);
    // Il battello resta al centro della scena: se cambia quota, l'acqua (e i detriti) si spostano.
    const shift = hydroAt(timeline.hydro, tReal).depth - depth0;
    frags.forEach((f, i) => {
      const tau = tReal - (shock.get(f.chargeId) ?? Infinity);
      if (tau < 0) {
        dummy.scale.setScalar(0);
      } else {
        const p = fragmentAt(f, tau, timeline.surfaceY);
        dummy.position.set(p[0], p[1] + shift, p[2]);
        dummy.scale.setScalar(f.size);
        // Rotolamento legato al tempo a schermo, così non impazzisce nelle fasi accelerate.
        dummy.rotation.set(f.seed * 1.3 + d * (0.4 + (f.seed % 5) * 0.12), f.seed * 0.7 + d * 0.3, f.seed * 2.1 + d * 0.22);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (!frags.length) return null;
  return (
    <instancedMesh ref={ref} args={[geo, undefined, frags.length]} frustumCulled={false}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={0.7} />
    </instancedMesh>
  );
}

const STEEL_BOX: [number, number, number] = [0.45, 0.02, 0.3];
const WOOD_BOX: [number, number, number] = [0.9, 0.05, 0.14];

export function Debris({ boat, result, timeline, depth0 }: { boat: Boat; result: SimResult; timeline: Timeline; depth0: number }) {
  const frags = useMemo(() => fragmentsOf(boat, result), [boat, result]);
  const steel = useMemo(() => frags.filter((f) => f.material.id === "acciaio"), [frags]);
  const wood = useMemo(() => frags.filter((f) => f.material.id === "legno"), [frags]);
  return (
    <group>
      <Layer frags={steel} timeline={timeline} depth0={depth0} color="#3a3d3c" box={STEEL_BOX} metalness={0.6} />
      <Layer frags={wood} timeline={timeline} depth0={depth0} color="#8a6a44" box={WOOD_BOX} metalness={0} />
    </group>
  );
}
