import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { boatById } from "@/data/boats";
import { BOAT_MODELS } from "@/components/abisso/boatModels";
import { stationRadii } from "@/sim/shape";

/**
 * Scafo Thrixel allineato al sistema di riferimento del calcolo (prua +X, asse del
 * Druckkörper a y = 0). È solo rivestimento: il danno si calcola sullo scafo parametrico.
 */
export function BoatModel({ boatId }: { boatId: string }) {
  const boat = boatById(boatId);
  const def = BOAT_MODELS[boat.family];
  const { scene } = useGLTF(def.url);
  const object = useMemo(() => {
    const model = scene.clone(true);
    for (const name of def.hide) {
      const o = model.getObjectByName(name);
      if (o) o.visible = false;
    }
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.PI / 2; // +Z del GLB → +X della scena
    pivot.add(model);
    pivot.updateMatrixWorld(true);
    // Altezza chiglia–ponte del modello (scafo e coperta, non torre né periscopi).
    const body = new THREE.Box3();
    for (const name of ["hull", "deck_casing"]) {
      const o = model.getObjectByName(name);
      if (o) body.expandByObject(o);
    }
    // Il generatore tende ad alzare l'opera morta: si porta l'altezza dello scafo su quella
    // dello scafo parametrico, così il rivestimento coincide con la geometria del calcolo.
    const mid = stationRadii(boat, 0.5);
    const calcDepth = mid.deck + mid.ry;
    const scaleY = body.isEmpty() ? 1 : calcDepth / (body.max.y - body.min.y);
    pivot.scale.y = scaleY;
    pivot.updateMatrixWorld(true);
    // Bounding box delle sole parti visibili (le parti nascoste possono essere fuori asse).
    const box = new THREE.Box3();
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && isShown(o)) box.expandByObject(o);
    });
    const keelY = body.isEmpty() ? box.min.y : body.min.y * scaleY;
    const center = box.getCenter(new THREE.Vector3());
    const offset = new THREE.Group();
    offset.position.set(-center.x, -mid.ry - keelY, -center.z);
    offset.add(pivot);
    offset.userData.scaleY = scaleY;
    return offset;
  }, [scene, def, boat]);
  return <primitive object={object} />;
}

function isShown(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
