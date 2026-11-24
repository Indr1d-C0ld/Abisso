import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { BoatModel } from "@/components/abisso/BoatModel";
import { BOAT_MODELS } from "@/components/abisso/boatModels";
import { CHARGE_MODELS, type ChargeModelId } from "@/components/abisso/chargeModels";
import { BOATS } from "@/data/boats";
import type { Family } from "@/data/types";
import { outerPoint } from "@/sim/shape";

type Entry =
  | { kind: "boat"; id: string; family: Family; label: string; size: number }
  | { kind: "charge"; id: ChargeModelId; label: string; size: number };

const BOAT_FOR_FAMILY: Record<Family, string> = { II: "ii-b", VII: "vii-c", IX: "ix-c", XB: "xb", XXI: "xxi" };

const ENTRIES: Entry[] = [
  ...(Object.keys(BOAT_MODELS) as Family[]).map((f) => {
    const boat = BOATS.find((b) => b.id === BOAT_FOR_FAMILY[f])!;
    return { kind: "boat" as const, id: boat.id, family: f, label: `${BOAT_MODELS[f].label} · ${BOAT_MODELS[f].config}`, size: boat.loa };
  }),
  ...(Object.keys(CHARGE_MODELS) as ChargeModelId[]).map((id) => ({
    kind: "charge" as const,
    id,
    label: CHARGE_MODELS[id].label,
    size: id === "mk10" ? 5 : 1.6,
  })),
];

/** Scafo di calcolo in fil di ferro: sezioni ogni 1/24 della lunghezza e quattro linee d'acqua. */
function CalcHull({ boatId }: { boatId: string }) {
  const geo = useMemo(() => {
    const boat = BOATS.find((b) => b.id === boatId)!;
    const pts: number[] = [];
    const push = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (let i = 1; i < 24; i++) {
      const t = i / 24;
      for (let k = 0; k < 32; k++) push(outerPoint(boat, t, (k / 32) * Math.PI * 2), outerPoint(boat, t, ((k + 1) / 32) * Math.PI * 2));
    }
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      for (let i = 0; i < 60; i++) push(outerPoint(boat, i / 60, a), outerPoint(boat, (i + 1) / 60, a));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [boatId]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#c6a15a" transparent opacity={0.75} depthTest={false} />
    </lineSegments>
  );
}

function ChargePreview({ id }: { id: ChargeModelId }) {
  const { scene } = useGLTF(CHARGE_MODELS[id].url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const center = new THREE.Box3().setFromObject(c).getCenter(new THREE.Vector3());
    c.position.sub(center);
    return c;
  }, [scene]);
  return <primitive object={obj} />;
}

function Dimensions({ entry }: { entry: Entry }) {
  if (entry.kind === "charge") return null;
  const boat = BOATS.find((b) => b.id === entry.id)!;
  return (
    <p className="note">
      Catalogo: {boat.loa.toLocaleString("it-IT")} m × {boat.beam.toLocaleString("it-IT")} m, pescaggio{" "}
      {boat.draft.toLocaleString("it-IT")} m. In ottone lo scafo parametrico su cui gira il calcolo del danno.
    </p>
  );
}

/** Riposiziona la camera quando cambia il modello, senza ricreare il Canvas (e il contesto WebGL). */
function FitCamera({ size }: { size: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    camera.position.set(size * 0.55, size * 0.28, size * 0.75);
    camera.near = size / 500;
    camera.far = size * 20;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    } else camera.lookAt(0, 0, 0);
  }, [camera, controls, size]);
  return null;
}

class GlBoundary extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  render() {
    return this.state.bad ? <p className="note">Vista 3D non disponibile in questo browser.</p> : this.props.children;
  }
}

export function ModelGallery() {
  const [key, setKey] = useState(`${ENTRIES[1].kind}:${ENTRIES[1].id}`);
  const [overlay, setOverlay] = useState(true);
  const entry = ENTRIES.find((e) => `${e.kind}:${e.id}` === key) ?? ENTRIES[0];
  const d = entry.size;
  return (
    <section className="gallery">
      <div className="gallery-bar">
        <label className="field">
          <span>Modello</span>
          <select className="select" value={key} onChange={(e) => setKey(e.target.value)}>
            <optgroup label="Battelli">
              {ENTRIES.filter((e) => e.kind === "boat").map((e) => (
                <option key={e.id} value={`boat:${e.id}`}>{e.label}</option>
              ))}
            </optgroup>
            <optgroup label="Ordigni">
              {ENTRIES.filter((e) => e.kind === "charge").map((e) => (
                <option key={e.id} value={`charge:${e.id}`}>{e.label}</option>
              ))}
            </optgroup>
          </select>
        </label>
        {entry.kind === "boat" && (
          <button type="button" className="chip" data-on={overlay} onClick={() => setOverlay(!overlay)}>
            Scafo di calcolo
          </button>
        )}
      </div>
      <div className="gallery-view">
        <GlBoundary>
          <Canvas camera={{ fov: 38 }} dpr={[1, 1.6]}>
            <FitCamera size={d} />
            <color attach="background" args={["#1a2420"]} />
            <hemisphereLight args={["#dfe8e4", "#2a2a24", 1.1]} />
            <directionalLight position={[d, d * 1.5, d * 0.8]} intensity={2.2} />
            <directionalLight position={[-d, d * 0.4, -d]} intensity={0.6} />
            <Suspense fallback={null}>
              {entry.kind === "boat" ? <BoatModel boatId={entry.id} /> : <ChargePreview id={entry.id} />}
            </Suspense>
            {entry.kind === "boat" && overlay && <CalcHull boatId={entry.id} />}
            <OrbitControls makeDefault enableDamping />
          </Canvas>
        </GlBoundary>
      </div>
      <Dimensions entry={entry} />
    </section>
  );
}
