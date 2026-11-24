import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { CHARGE_MODELS, type ChargeModelId } from "@/components/abisso/chargeModels";

/** Inclinazione stabile per carica: le cariche rotolano e cadono, non arrivano allineate. */
function tumble(id: string, nose: "+y" | "+z" | null): [number, number, number] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const r = (k: number) => (((h >>> (k * 8)) & 0xff) / 255 - 0.5) * 2;
  // I corpi affusolati scendono di punta: +Z ruotato di 90° attorno a X va verso il basso,
  // +Y ruotato di 180°.
  if (nose === "+z") return [Math.PI / 2 + r(0) * 0.15, r(1) * Math.PI, r(2) * 0.15];
  if (nose === "+y") return [Math.PI + r(0) * 0.15, r(1) * Math.PI, r(2) * 0.15];
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
  const def = CHARGE_MODELS[model];
  const { scene } = useGLTF(def.url);
  // Un clone per carica, centrato sul proprio volume: il punto di scoppio è il baricentro.
  const clone = useMemo(() => {
    const c = scene.clone(true);
    const center = new THREE.Box3().setFromObject(c).getCenter(new THREE.Vector3());
    c.position.sub(center);
    return c;
  }, [scene]);
  return (
    <group position={position} rotation={tumble(chargeId, def.nose)}>
      <primitive object={clone} />
    </group>
  );
}

for (const m of Object.values(CHARGE_MODELS)) useGLTF.preload(m.url);
