import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Boat } from "@/data/types";
import type { SimResult } from "@/sim/model";
import { stationRadii } from "@/sim/shape";
import { displayToReal, type Timeline } from "@/sim/timeline";
import { chlorineAt, hydroAt, rowFills, type HydroTrack } from "@/sim/hydrostatics";
import { usePlayer } from "@/render/player";
import { createSection, updateSection } from "@/render/effects/floodGeometry";

function phRadius(boat: Boat) {
  return (x: number) => {
    const t = Math.min(1, Math.max(0, x / boat.loa + 0.5));
    const r = stationRadii(boat, t).phr || boat.phDiameter / 2;
    return Math.max(0.3, r * 0.95);
  };
}

/**
 * Acqua nei compartimenti (Fase 4): riempimento di ogni locale dalla sua curva con aria
 * intrappolata (src/sim/model.ts), pelo libero orizzontale nel mondo, e cloro nei locali
 * batterie quando il modello lo segnala. Si vede negli interni, nella vista a raggi X e nel
 * taglio: dall'esterno lo scafo è opaco, come nella realtà.
 */
export function Flooding({
  boat,
  result,
  timeline,
  track,
  planes,
}: {
  boat: Boat;
  result: SimResult;
  timeline: Timeline;
  track: HydroTrack;
  planes: THREE.Plane[];
}) {
  const rows = result.flood.rows;
  const radius = useMemo(() => phRadius(boat), [boat]);
  const water = useMemo(() => rows.map(() => createSection()), [rows]);
  const gas = useMemo(() => rows.map(() => createSection()), [rows]);
  useEffect(
    () => () => {
      water.forEach((g) => g.dispose());
      gas.forEach((g) => g.dispose());
    },
    [water, gas],
  );
  const waterRefs = useRef<(THREE.Mesh | null)[]>([]);
  const gasRefs = useRef<(THREE.Mesh | null)[]>([]);
  const comps = useMemo(() => new Map(result.compartments.map((c) => [c.id, c])), [result]);
  const chlorineBanks = useMemo(
    () => new Set(result.batteries.banks.filter((b) => b.state === "cloro" || b.state === "perso").map((b) => b.id)),
    [result],
  );

  useFrame(() => {
    const tReal = displayToReal(timeline, usePlayer.getState().t);
    const h = hydroAt(track, tReal);
    const fills = rowFills(track, result, tReal);
    rows.forEach((row, i) => {
      const c = comps.get(row.id);
      const mesh = waterRefs.current[i];
      if (!c || !mesh) return;
      mesh.visible = updateSection(water[i], c.x0 + 0.06, c.x1 - 0.06, radius, fills[i], h.pitch);
      const g = gasRefs.current[i];
      if (!g) return;
      const cl = chlorineBanks.has(row.id) ? chlorineAt(row, track, tReal) : 0;
      // Il cloro è più pesante dell'aria: uno strato sopra il pelo libero, che si alza col tempo.
      g.visible = cl > 0.01 && updateSection(gas[i], c.x0 + 0.08, c.x1 - 0.08, radius, Math.min(0.97, fills[i] + 0.06 + 0.22 * cl), h.pitch);
      (g.material as THREE.MeshStandardMaterial).opacity = 0.1 + 0.25 * cl;
    });
  });

  if (!rows.length) return null;
  return (
    <group>
      {rows.map((row, i) => (
        <group key={row.id}>
          <mesh
            ref={(m) => {
              waterRefs.current[i] = m;
            }}
            geometry={water[i]}
            visible={false}
            renderOrder={2}
          >
            <meshStandardMaterial
              color="#2e6c78"
              emissive="#0d2a30"
              metalness={0.1}
              roughness={0.15}
              transparent
              opacity={0.62}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={planes}
            />
          </mesh>
          <mesh
            ref={(m) => {
              gasRefs.current[i] = m;
            }}
            geometry={gas[i]}
            visible={false}
            renderOrder={3}
          >
            <meshStandardMaterial
              color="#b7c95a"
              emissive="#4d5a10"
              transparent
              opacity={0.2}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={planes}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
