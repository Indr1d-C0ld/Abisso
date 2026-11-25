import { useMemo } from "react";
import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import { n, type SimResult } from "@/sim/model";
import { buildTimeline } from "@/sim/timeline";
import { BULKHEADS, bulkheadPeaks, bulkheadsOf } from "@/sim/bulkheads";
import { dragLength, fragmentsOf, settleSpeed, STEEL, WOOD } from "@/sim/debris";
import {
  AIR_FREE_M3,
  BG_M,
  blowCapacityT,
  IMPLOSION_S,
  OIL_DROPLET_M,
  OIL_RISE_MPS,
  hydroAt,
  oilRiseS,
} from "@/sim/hydrostatics";

/** Fase 4: peso, assetto, quota, cloro, nafta e implosione, con fonti e ipotesi. */
export function ConsequencesRead({ input, result }: { input: SimInput; result: SimResult }) {
  const boat = boatById(input.boatId);
  const tl = useMemo(() => buildTimeline(input, result), [input, result]);
  const h = tl.hydro;
  const end = hydroAt(h, h.t0 + h.span);
  const peak = h.samples.reduce((m, s) => (Math.abs(s.pitch) > Math.abs(m.pitch) ? s : m), h.samples[0]);
  const deg = (peak.pitch * 180) / Math.PI;
  const cap = blowCapacityT(boat, input.axisDepth);
  const air = AIR_FREE_M3[boat.family];
  const bg = BG_M[boat.family];
  const bulk = useMemo(() => bulkheadsOf(boat, result), [boat, result]);
  const peaks = useMemo(() => bulkheadPeaks(bulk, result, h, input.axisDepth), [bulk, result, h, input.axisDepth]);
  const spec = BULKHEADS[boat.family];
  const loaded = bulk.map((b, i) => ({ b, l: peaks[i] })).filter((x) => x.l.headM >= 1);
  const worstBulk = [...loaded].sort((a, b) => b.l.headM - a.l.headM)[0];
  const over = loaded.filter((x) => x.l.state === "oltre");
  const frags = useMemo(() => fragmentsOf(boat, result), [boat, result]);
  const woodN = frags.filter((f) => f.material.id === "legno").length;
  let fate: string;
  if (h.already) fate = `L'asse è già oltre la quota di collasso del modello (${n(boat.collapseM, 0)} m): il Druckkörper cede subito.`;
  else if (result.flood.dry) fate = "Nessuna via d'acqua strutturale: il battello non imbarca acqua e resta in assetto.";
  else if (h.tCollapse !== null)
    fate = `Il peso supera ciò che l'aria può recuperare: il battello scende e passa la quota di collasso (${n(boat.collapseM, 0)} m) dopo ${n(h.tCollapse, 0)} s.`;
  else if (h.tSurface !== null) fate = `L'aria compressa basta: il battello emerge dopo ${n(h.tSurface, 0)} s, appesantito di ${n(end.waterT, 0)} t d'acqua.`;
  else fate = `L'equipaggio compensa con l'aria e resta a quota: ${n(end.waterT, 0)} t d'acqua dopo ${n(h.span / 60, 0)} min.`;
  return (
    <div className="paper">
      <h3>Conseguenze</h3>
      <p>
        <strong>Peso e quota.</strong> {fate} Spinta recuperabile soffiando a {n(input.axisDepth, 0)} m: {n(cap, 0)} t (aria
        di bordo {n(air.m3, 0)} m³ a 1 at, {air.source}; casse {n(boat.dispSub - boat.dispSurf, 0)} t). Con danno contenuto
        l'equipaggio compensa e resta sotto; soffia tutto quando il modello impone l'emersione o quando non tiene più la quota
        (acqua oltre il 60% della spinta recuperabile, o 15 m di discesa: ipotesi di condotta). Velocità di caduta da resistenza
        di forma (Cd 0,53 del cilindro supercritico), massa virtuale due volte il dislocamento.
      </p>
      {!result.flood.dry && (
        <p>
          <strong>Assetto.</strong> In immersione non c'è piano di galleggiamento: Δ·BG·tan θ = w·x per ogni angolo. Massimo
          raggiunto {n(Math.abs(deg), 0)}° {deg < 0 ? "appruato" : "appoppato"}, con BG = {n(bg.m, 2)} m ({bg.source}
          {bg.verified ? "" : "; l'unico valore documentato è il minimo di 320 mm del XXI"}) e l'acqua libera che scorre verso la paratia bassa. L'assetto rappresentato si ferma
          a 75°; in superficie torna il piano di galleggiamento e l'assetto si riduce a pochi gradi.
        </p>
      )}
      {worstBulk && (
        <p>
          <strong>Paratie.</strong> Un locale che si allaga con l'aria intrappolata sale verso la pressione del mare; quello
          accanto resta a un'atmosfera e la paratia porta la differenza. Carico massimo: {n(worstBulk.l.headM, 0)} m d'acqua fra{" "}
          {worstBulk.b.aftName.toLowerCase()} e {worstBulk.b.foreName.toLowerCase()}
          {worstBulk.b.pressure ? " (paratia resistente)" : " (paratia stagna leggera)"}.{" "}
          {over.length > 0
            ? `${over.length === 1 ? "Una paratia supera" : `${over.length} paratie superano`} la quota per cui erano calcolate: l'allagamento potrebbe estendersi oltre ciò che il modello mostra.`
            : loaded.some((x) => x.l.state === "ignota")
              ? "Per alcune paratie la tenuta non è documentata: il carico è mostrato, il giudizio no."
              : "Nessuna supera la quota per cui era calcolata."}{" "}
          Paratie resistenti {spec.ratingM !== null ? `a ${n(spec.ratingM, 0)} m` : "di tenuta non trovata"}, leggere{" "}
          {spec.lightM !== null ? `a ${n(spec.lightM, 0)} m` : "di tenuta non trovata"} ({spec.source}). È una lettura: non entra nel
          verdetto né nelle curve di allagamento.
        </p>
      )}
      {frags.length > 0 && (
        <p>
          <strong>Detriti.</strong> L'acqua frena subito: un pezzo di fasciame da {n(STEEL.h * 1000, 0)} mm ha una lunghezza di
          frenata di {n(dragLength(STEEL) * 100, 0)} cm e si ferma entro un metro o due, poi affonda a{" "}
          {n(-settleSpeed(STEEL), 1)} m/s. {woodN > 0 ? `Il tavolato di coperta (${n(WOOD.h * 1000, 0)} mm, ipotesi) sale invece a ${n(settleSpeed(WOOD), 1)} m/s e arriva in superficie in circa ${n(input.axisDepth / settleSpeed(WOOD) / 60, 1)} min.` : "Lo scoppio non raggiunge il tavolato di coperta: niente legno in risalita."}{" "}
          Formule elementari di resistenza; spessori, densità e numero dei pezzi sono ipotesi e resa.
        </p>
      )}
      {result.chlorine && (
        <p>
          <strong>Cloro.</strong> Acqua di mare sulle celle: nebbia verde-gialla sopra il pelo libero del locale batterie, più
          pesante dell'aria. Nessun tasso di produzione trovato: l'intensità è resa. Testimonianze: sull'U-185 (agosto 1943) il
          gas si formò «quickly» e i Diesel lo aspirarono; sull'U-570, con una quarantina di vasi incrinati, non ce ne fu. Soglia
          IDLH 10 ppm (NIOSH).
        </p>
      )}
      {result.oilSlick && (
        <p>
          <strong>Nafta.</strong> Gocce di {n(OIL_DROPLET_M * 1000, 0)} mm (ipotesi) risalgono a {n(OIL_RISE_MPS * 100, 1)} cm/s:
          la chiazza compare in superficie dopo circa {n(oilRiseS(input.axisDepth) / 60, 0)} min, spesso oltre la ricostruzione.
          Gocce da 1 mm impiegherebbero il doppio, da 5 mm la metà. I rapporti ASW citano chiazze da qualche centinaio di metri,
          e avvertono che da sole non provavano l'affondamento.
        </p>
      )}
      {(h.tCollapse !== null || h.already) && (
        <p>
          <strong>Implosione.</strong> Compressione in {n(IMPLOSION_S * 1000, 0)} ms, poi la pulsazione dell'aria liberata:
          valori misurati per lo Scorpion (collasso a 466 m, 2,2 volte la quota di collaudo). La quota di collasso è quella del
          modello; per il VIIC la fonte primaria dà solo la quota di costruzione, 100 m. La forma del cedimento è resa.
        </p>
      )}
      <p className="note" style={{ color: "inherit" }}>
        Fonti: USNA EN400 (assetto in immersione); M.Dv. 371,181, 1940 (aria del VIIC); Jones, Cincotta & Walker, NASA 1969
        (Cd); Nordam et al. 2020 (risalita delle gocce); Rule 2018 (Scorpion); rapporti ONI su U-185 e U-570; NIOSH. Il verdetto
        resta l'indice del modello di danno: questa è la sua conseguenza ricostruita. Dettagli in docs/FONTI-CONSEGUENZE.md.
      </p>
    </div>
  );
}
