import { useMemo } from "react";
import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import { WHIP_DAMPING, WHIP_VISUAL } from "@/render/effects/whip";
import { n, type SimResult } from "@/sim/model";
import { JET_LABEL, responseReport } from "@/sim/response";

/** Bolla, scafo e superficie: le grandezze della Fase 3b, con le fonti e le ipotesi. */
export function ResponseRead({ input, result }: { input: SimInput; result: SimResult }) {
  const boat = boatById(input.boatId);
  const rep = useMemo(() => responseReport(boat, input, result), [boat, input, result]);
  const main = [...rep.charges].sort((a, b) => a.bubble.gammaHull - b.bubble.gammaHull)[0];
  if (!main) {
    return (
      <div className="paper">
        <h3>Bolla, scafo e superficie</h3>
        <p>Nessuno scoppio pieno: niente bolla, niente getto, niente frusta.</p>
      </div>
    );
  }
  const b = main.bubble;
  const s = rep.surface;
  return (
    <div className="paper">
      <h3>Bolla, scafo e superficie</h3>
      <p>
        <strong>Getto.</strong> {JET_LABEL[b.regime]}. Distanza adimensionale dallo scafo γ = {n(b.gammaHull, 2)}; anisotropia
        ζ = {n(b.zetaMag, 3)} (galleggiamento {n(b.zetaBuoyancy, 3)}, scafo {n(b.zetaHull, 3)}, superficie {n(b.zetaSurface, 4)}).
        {b.jetMps !== null ? ` Velocità del getto dell'ordine di ${n(b.jetMps, 0)} m/s.` : " Fuori dal campo delle leggi di velocità."} Il
        getto non entra nell'indice di danno: è un carico concentrato in più, non calcolato.
      </p>
      <p>
        <strong>Cicli e risalita.</strong> Periodi {main.periods.map((p) => n(p, 2)).join(" · ")} s, raggi massimi{" "}
        {main.radii.map((r) => n(r, 1)).join(" · ")} m. Risalita al primo minimo {n(main.rise1, 1)} m.
      </p>
      <p>
        <strong>Frusta.</strong> Primo modo dello scafo {n(rep.hull.hz, 2)} Hz (I = {n(rep.hull.inertiaM4, 2)} m⁴ del solo
        Druckkörper, massa virtuale {n(rep.hull.virtualMassKg / 1000, 0)} t); bolla {n(rep.bubbleHz, 2)} Hz, rapporto{" "}
        {n(rep.ratio, 2)} (1 = risonanza). Carica a {n(main.xi * 100, 0)}% della lunghezza da poppa, forma modale{" "}
        {n(main.modal, 2)} (0 ai nodi). Ampiezza: {rep.whipAmpM > 0.005 ? `${n(rep.whipAmpM * 100, 0)} cm al centro` : "trascurabile"},
        scala illustrativa, mostrata ×{WHIP_VISUAL} con smorzamento {n(WHIP_DAMPING * 100, 0)}% ipotizzato.
      </p>
      {s && (
        <p>
          <strong>Superficie.</strong> Profondità / Rmax = {n(s.ratio, 1)}: {s.kind}. Velocità iniziale della cupola{" "}
          {n(s.domeMps, 1)} m/s.
        </p>
      )}
      <p className="note" style={{ color: "inherit" }}>
        Fonti: Supponen et al. 2016 e Subramanian et al. 2024 (getto); Riley 2010 e Brainard 2015 (cicli e risalita; il √W
        è ricostruito confrontando le due); Yin et al. 2014, Stettler 1995, Vernon 1986 (frusta); Mellor 1986 da Young
        1971 (superficie). Dettagli in docs/FONTI-RISPOSTA.md.
      </p>
    </div>
  );
}
