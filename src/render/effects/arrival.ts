import * as THREE from "three";
import { usePlayer } from "@/render/player";
import { realToDisplay, type Timeline } from "@/sim/timeline";

/**
 * Comparsa del danno: 0 finché l'onda non arriva sul Druckkörper, poi sale a 1 in 0,35 s
 * a schermo. Per gli urti senza bolla vale l'istante dell'urto.
 */
export function arrivalFn(timeline: Timeline) {
  const at = new Map<string, number>();
  for (const tr of timeline.tracks) {
    if (tr.yield === "none") continue;
    at.set(tr.id, realToDisplay(timeline, tr.tShock ?? tr.tEnd));
  }
  return (chargeId: string) => {
    const d0 = at.get(chargeId);
    if (d0 === undefined) return 0;
    return THREE.MathUtils.clamp((usePlayer.getState().t - d0) / 0.35, 0, 1);
  };
}
