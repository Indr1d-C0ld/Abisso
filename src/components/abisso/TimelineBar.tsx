import { useMemo } from "react";
import type { SimInput } from "@/data/types";
import { n, type SimResult } from "@/sim/model";
import { buildTimeline, displayToReal, floodFraction, segmentAt, segmentRate, type Segment } from "@/sim/timeline";
import { usePlayer } from "@/render/player";

/** Fattore di scala del segmento, scritto come lo legge chi guarda. */
function rateLabel(s: Segment) {
  const r = segmentRate(s);
  if (r > 0.9 && r < 1.1) return "tempo reale";
  if (r < 1) return `rallentata ${n(1 / r, 1 / r >= 10 ? 0 : 1)}×`;
  return `accelerata ${n(r, r >= 10 ? 0 : 1)}×`;
}

/** Tempo reale nel riferimento più utile per la fase. */
function clockLabel(s: Segment, tReal: number, tFirst: number) {
  if (s.id === "discesa") return `${n(tReal, 1)} s dal lancio`;
  if (s.id === "onda") return `+${n((tReal - tFirst) * 1000, 1)} ms dallo scoppio`;
  if (s.id === "bolla") return `+${n(tReal - tFirst, 2)} s dallo scoppio`;
  return `${n((tReal - s.t0) / 60, 1)} min dalla falla`;
}

export function TimelineBar({ input, result }: { input: SimInput; result: SimResult }) {
  const tl = useMemo(() => buildTimeline(input, result), [input, result]);
  const t = usePlayer((s) => s.t);
  const playing = usePlayer((s) => s.playing);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const toggle = usePlayer((s) => s.toggle);
  const seg = segmentAt(tl, t);
  const tReal = displayToReal(tl, t);
  const tFirst = tl.segments.find((s) => s.id === "onda" || s.id === "bolla")?.t0 ?? 0;
  const flood = seg.id === "allagamento" ? floodFraction(result, tl, tReal) : null;
  const worst = result.flood.worstName;
  return (
    <div className="timeline" role="group" aria-label="Ricostruzione nel tempo">
      <button type="button" className="timeline-play" onClick={toggle} aria-label={playing ? "Pausa" : "Riproduci"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="timeline-track">
        <div className="timeline-segs" aria-hidden>
          {tl.segments.map((s) => (
            <span
              key={s.id}
              data-on={s.id === seg.id}
              style={{ width: `${((s.d1 - s.d0) / tl.duration) * 100}%` }}
            >
              {s.label}
            </span>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={Math.min(t, duration)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Posizione nella ricostruzione"
        />
        <p className="timeline-read">
          <strong>{seg.label}</strong> · {clockLabel(seg, tReal, tFirst)} · {rateLabel(seg)}
          {seg.id === "bolla" && " · cicli dopo il primo e risalita: resa, non calcolo"}
          {flood !== null && ` · ${worst}: ${n(flood * 100, 0)}% del volume (aria intrappolata)`}
        </p>
      </div>
    </div>
  );
}
