import type { Family } from "@/data/types";

/**
 * Modelli 3D degli scafi (Thrixel, progetto "ABISSO"), uno per famiglia.
 * Convenzione del GLB: metri, Y in alto, prua verso +Z, chiglia a y = 0.
 * Convenzione della scena: prua verso +X, asse del corpo resistente a y = 0.
 * L'allineamento si fa a runtime (vedi BoatModel): rotazione di 90° attorno a Y,
 * centro longitudinale a x = 0, chiglia sulla chiglia dello scafo parametrico.
 */
const url = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

export const BOAT_MODELS: Record<Family, { url: string; label: string; config: string; hide: string[] }> = {
  II: { url: url("uboat-iib.glb"), label: "Tipo IIB", config: "1939", hide: ["jumping_wire"] },
  VII: { url: url("uboat-viic.glb"), label: "Tipo VIIC", config: "1941", hide: [] },
  IX: { url: url("uboat-ixc.glb"), label: "Tipo IXC", config: "1942", hide: [] },
  XB: { url: url("uboat-xb.glb"), label: "Tipo XB", config: "1942", hide: [] },
  XXI: { url: url("uboat-xxi.glb"), label: "Tipo XXI", config: "1945", hide: [] },
};
