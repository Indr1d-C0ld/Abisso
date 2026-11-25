import { useMemo } from "react";
import type { HistEvent } from "@/data/events";
import type { SimInput } from "@/data/types";
import { n, type SimResult } from "@/sim/model";
import { buildTimeline, segmentAt } from "@/sim/timeline";
import { usePlayer } from "@/render/player";

/** Sorte del battello secondo il modello, in una riga. */
function modelFate(input: SimInput, result: SimResult) {
  const h = buildTimeline(input, result).hydro;
  if (h.already) return "oltre la quota di collasso prima dello scoppio";
  if (result.flood.dry) return "nessuna via d'acqua: resta a quota";
  if (h.tCollapse !== null) return `affonda e supera la quota di collasso dopo ${n(h.tCollapse, 0)} s`;
  if (h.tSurface !== null) return `emerge dopo ${n(h.tSurface / 60, 1)} min`;
  return "compensa con l'aria e resta a quota";
}

/**
 * Ricostruzione di un caso storico (Fase 6): per la fase in corso, che cosa dicono le
 * fonti e che cosa è ipotesi del modello, sempre in due righe distinte. Alla fine, la
 * storia accanto all'esito calcolato.
 */
export function EventOverlay({ event, input, result }: { event: HistEvent; input: SimInput; result: SimResult }) {
  const tl = useMemo(() => buildTimeline(input, result), [input, result]);
  const segId = usePlayer((s) => segmentAt(tl, Math.min(s.t, tl.duration)).id);
  const ended = usePlayer((s) => s.t >= s.duration - 0.05);
  const beat = event.beats?.[segId];
  const seg = tl.segments.find((s) => s.id === segId);
  return (
    <div className="event-overlay" role="status">
      <p className="eo-title">
        {event.boat} · {event.date} <span>{seg?.label}</span>
      </p>
      {ended ? (
        <>
          <p data-kind="doc">
            <b>Storia</b> {event.result}
          </p>
          <p data-kind="hyp">
            <b>Modello</b> {result.outcomeLabel}: {modelFate(input, result)}.
          </p>
        </>
      ) : (
        <>
          <p data-kind="doc">
            <b>Documentato</b> {beat?.doc ?? "Nessuna fonte descrive questa fase."}
          </p>
          <p data-kind="hyp">
            <b>Ipotesi</b> {beat?.hyp ?? "Tutto ciò che si vede qui è calcolo del modello."}
          </p>
        </>
      )}
    </div>
  );
}
