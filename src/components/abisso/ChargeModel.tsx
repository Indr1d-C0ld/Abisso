import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";

/**
 * Modelli 3D degli ordigni, in scala reale (unità glTF = metri).
 * Generati con Thrixel, progetto "ABISSO"; la sorgente di ciascuno è in public/models/README.md.
 */
const MODELS = {
  mk7: {
    url: `${import.meta.env.BASE_URL}models/mk7.glb`,
    /** Il GLB poggia su y = 0 con l'asse del tamburo lungo z: lo si centra sull'origine. */
    offset: [0, -0.225, 0] as const,
  },
} as const;

export type ChargeModelId = keyof typeof MODELS;

/** Quale modello usare per un ordigno del catalogo, se esiste. */
export function chargeModelFor(weaponId: string): ChargeModelId | null {
  if (weaponId.startsWith("mk7")) return "mk7";
  return null;
}

/** Inclinazione stabile per carica: le cariche rotolano e cadono, non arrivano allineate. */
function tumble(id: string): [number, number, number] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const r = (k: number) => (((h >>> (k * 8)) & 0xff) / 255 - 0.5) * 2;
  return [r(0) * 0.6, r(1) * Math.PI, r(2) * 0.6];
}

export function ChargeModel({
  model,
  chargeId,
  position,
}: {
  model: ChargeModelId;
  chargeId: string;
  position: [number, number, number];
}) {
  const def = MODELS[model];
  const { scene } = useGLTF(def.url);
  // Un clone per carica: lo stesso Object3D non può stare in due punti della scena.
  const clone = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={position} rotation={tumble(chargeId)}>
      <primitive object={clone} position={def.offset} />
    </group>
  );
}

for (const m of Object.values(MODELS)) useGLTF.preload(m.url);
