import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { boatById } from "@/data/boats";
import { boatModelFor } from "@/components/abisso/boatModels";
import type { Era } from "@/data/types";
import { stationRadii } from "@/sim/shape";

/**
 * Scafo Thrixel allineato al sistema di riferimento del calcolo (prua +X, asse del
 * Druckkörper a y = 0). È solo rivestimento: il danno si calcola sullo scafo parametrico.
 */
export function BoatModel({ boatId, era = "1941" }: { boatId: string; era?: Era }) {
  const boat = boatById(boatId);
  const def = boatModelFor(boat.family, era);
  const { scene } = useGLTF(def.url);
  const object = useMemo(() => {
    const model = scene.clone(true);
    // Alcuni GLB (es. VIIC 1944) portano sia colori per vertice sia una texture di colore:
    // three.js li moltiplica e lo scafo esce quasi nero. Dove c'è la texture vale quella.
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry.getAttribute("color")) return;
      const fix = (m: THREE.Material) => {
        const sm = m as THREE.MeshStandardMaterial;
        if (!sm.map || !sm.vertexColors) return m;
        const c = sm.clone();
        c.vertexColors = false;
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
    });
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
