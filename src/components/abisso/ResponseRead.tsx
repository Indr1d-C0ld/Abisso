import { useMemo } from "react";
import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import { WHIP_DAMPING, WHIP_VISUAL } from "@/render/effects/whip";
import { n, type SimResult } from "@/sim/model";
import { JET_LABEL, responseReport } from "@/sim/response";
import { plateReport, STEEL_YIELD_PA } from "@/sim/plate";
import { PlateSection } from "@/components/abisso/PlateSection";

/** Bolla, scafo e superficie: le grandezze della Fase 3b, con le fonti e le ipotesi. */
export function ResponseRead({ input, result }: { input: SimInput; result: SimResult }) {
  const boat = boatById(input.boatId);
  const rep = useMemo(() => responseReport(boat, input, result), [boat, input, result]);
  const main = [...rep.charges].sort((a, b) => a.bubble.gammaHull - b.bubble.gammaHull)[0];
  const plate = useMemo(() => plateReport(boat, result), [boat, result]);
  const nearest = [...plate.charges].sort((a, b) => b.phi - a.phi)[0];
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
      {nearest && (
        <p>
          <strong>Lamiera.</strong> Fra due ordinate (passo {n(plate.frame.m * 1000, 0)} mm,{" "}
          {plate.frame.source}) con lamiera di {n(plate.thicknessM * 1000, 1)} mm e
          acciaio St 52 ({n(STEEL_YIELD_PA / 1e6, 0)} MPa): impulso {n(nearest.impulsePaS / 1000, 1)} kPa·s, numero di danno φ ={" "}
          {n(nearest.phi, 1)}, freccia permanente {n(nearest.deflectionM * 1000, 0)} mm ({n(nearest.ratio, 1)} spessori)
          {nearest.beyond ? ", oltre il campo delle prove: solo indicativa" : ""}. È la deformazione di una piastra piana senza
          precarico idrostatico (Nurick e Martin, aggiornamento Yuen et al. 2017), estrapolata da prove su lamiere di pochi
          millimetri, con l'impulso di Cole non corretto per l'interazione acqua–lamiera. Il verdetto resta l'indice del
          modello: a quota il guscio cede per instabilità fra le ordinate, che questa formula non vede.
        </p>
      )}
      {nearest && nearest.deflectionM > 0.001 && (
        <PlateSection frameM={plate.frame.m} thicknessM={plate.thicknessM} deflectionM={nearest.deflectionM} beyond={nearest.beyond} />
      )}
      {s && (
        <p>
          <strong>Superficie.</strong> Profondità / Rmax = {n(s.ratio, 1)}: {s.kind}. Velocità iniziale della cupola{" "}
          {n(s.domeMps, 1)} m/s.
        </p>
      )}
      <p className="note" style={{ color: "inherit" }}>
        Fonti: Supponen et al. 2016 e Subramanian et al. 2024 (getto); Riley 2010 e Brainard 2015 (cicli e risalita; il √W
        è ricostruito confrontando le due); Yin et al. 2014, Stettler 1995, Vernon 1986 (frusta); Mellor 1986 da Young
        1971 (superficie); Yuen et al. 2017, ONI 1941 e rapporti di Portsmouth 1946 (lamiera e ordinate),
        Wierzbicki 1999 (petali). Dettagli in docs/FONTI-RISPOSTA.md e docs/FONTI-LAMIERA.md.
      </p>
    </div>
  );
}
