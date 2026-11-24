/**
 * Modelli 3D degli ordigni, in scala reale (unità glTF = metri, Y in alto).
 * `nose`: asse della punta per i corpi che scendono di punta (null per i tamburi, che rotolano).
 * Generati con Thrixel, progetto "ABISSO": origine e misure in public/models/README.md.
 */
const url = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

export const CHARGE_MODELS = {
  mk7: { url: url("mk7.glb"), nose: null, label: "Mark VII" },
  "mk7-heavy": { url: url("mk7-heavy.glb"), nose: null, label: "Mark VII Heavy" },
  "us-mk6": { url: url("us-mk6.glb"), nose: null, label: "US Mark 6" },
  "us-mk7": { url: url("us-mk7.glb"), nose: null, label: "US Mark 7" },
  "us-mk9": { url: url("us-mk9.glb"), nose: "+y", label: "US Mark 9" },
  mk10: { url: url("mk10.glb"), nose: "+z", label: "Mark X" },
  hedgehog: { url: url("hedgehog.glb"), nose: "+z", label: "Hedgehog" },
  squid: { url: url("squid.glb"), nose: "+z", label: "Squid" },
} as const satisfies Record<string, { url: string; nose: "+y" | "+z" | null; label: string }>;

export type ChargeModelId = keyof typeof CHARGE_MODELS;

const BY_WEAPON: Record<string, ChargeModelId> = {
  "mk7-amatol": "mk7",
  "mk7-heavy-amatol": "mk7-heavy",
  "mk7-heavy-torpex": "mk7-heavy",
  "us-mk6": "us-mk6",
  "us-mk7": "us-mk7",
  "us-mk9": "us-mk9",
  mk10: "mk10",
  hedgehog: "hedgehog",
  squid: "squid",
};

/** Quale modello usare per un ordigno del catalogo, se esiste. */
export function chargeModelFor(weaponId: string): ChargeModelId | null {
  return BY_WEAPON[weaponId] ?? null;
}
