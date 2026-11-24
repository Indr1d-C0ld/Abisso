import type { Era, Family } from "@/data/types";

/**
 * Modelli 3D degli scafi (Thrixel, progetto "ABISSO"), uno per famiglia e configurazione.
 * Convenzione del GLB: metri, Y in alto, prua verso +Z, chiglia a y = 0.
 * Convenzione della scena: prua verso +X, asse del corpo resistente a y = 0.
 * L'allineamento si fa a runtime (vedi BoatModel): rotazione di 90° attorno a Y,
 * centro longitudinale a x = 0, chiglia sulla chiglia dello scafo parametrico.
 */
const url = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

export type BoatModelDef = { url: string; label: string; config: string; hide: string[] };

type FamilyModels = { base: BoatModelDef; late?: BoatModelDef };

export const BOAT_MODELS: Record<Family, FamilyModels> = {
  II: { base: { url: url("uboat-iib.glb"), label: "Tipo IIB", config: "1939", hide: [] } },
  VII: {
    base: { url: url("uboat-viic.glb"), label: "Tipo VIIC", config: "1941 · cannone", hide: [] },
    late: { url: url("uboat-viic-1944.glb"), label: "Tipo VIIC", config: "1944 · schnorchel", hide: [] },
  },
  IX: {
    base: { url: url("uboat-ixc.glb"), label: "Tipo IXC", config: "1942 · cannone", hide: [] },
    late: { url: url("uboat-ixc-1944.glb"), label: "Tipo IXC", config: "1944 · schnorchel", hide: [] },
  },
  XB: { base: { url: url("uboat-xb.glb"), label: "Tipo XB", config: "1942", hide: [] } },
  XXI: { base: { url: url("uboat-xxi.glb"), label: "Tipo XXI", config: "1945", hide: [] } },
};

/** Il modello per famiglia ed era: la variante 1944 se esiste, altrimenti quello base. */
export function boatModelFor(family: Family, era: Era): BoatModelDef {
  const m = BOAT_MODELS[family];
  return era === "1944" && m.late ? m.late : m.base;
}
