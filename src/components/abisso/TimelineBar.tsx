import { useMemo } from "react";
import type { SimInput } from "@/data/types";
import { n, type SimResult } from "@/sim/model";
import { buildTimeline, displayToReal, floodFraction, segmentAt, segmentRate, type Segment } from "@/sim/timeline";
import { usePlayer } from "@/render/player";
import { WHIP_VISUAL } from "@/render/effects/whip";
import { boatById } from "@/data/boats";
import { JET_LABEL, responseReport } from "@/sim/response";
import { hydroAt, oilRiseS, IMPLOSION_S } from "@/sim/hydrostatics";


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
  if (s.id === "implosione") return `+${n((tReal - s.t0) * 1000, 0)} ms dal cedimento`;
  const m = (tReal - s.t0) / 60;
  return m < 2 ? `${n(tReal - s.t0, 0)} s dalla falla` : `${n(m, 1)} min dalla falla`;
}

export function TimelineBar({ input, result }: { input: SimInput; result: SimResult }) {
  const tl = useMemo(() => buildTimeline(input, result), [input, result]);
  const report = useMemo(() => responseReport(boatById(input.boatId), input, result), [input, result]);
  const main = [...report.charges].sort((a, b) => a.bubble.gammaHull - b.bubble.gammaHull)[0];
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
  const h = hydroAt(tl.hydro, tReal);
  const deg = (h.pitch * 180) / Math.PI;
  const trim = Math.abs(deg) < 0.5 ? "in assetto" : `${n(Math.abs(deg), 0)}° ${deg < 0 ? "appruato" : "appoppato"}`;
  const vz = Math.abs(h.vz) < 0.05 ? "" : h.vz > 0 ? `, scende a ${n(h.vz, 1)} m/s` : `, sale a ${n(-h.vz, 1)} m/s`;
  const surfaced = tl.hydro.tSurface !== null && tReal - tl.hydro.t0 >= tl.hydro.tSurface;
  const firstShock = tl.tracks.find((x) => x.tShock !== null)?.tShock ?? null;
  const oilIn = firstShock === null ? null : firstShock + oilRiseS(input.axisDepth) - tReal;
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
          {seg.id === "bolla" && main && ` · ${JET_LABEL[main.bubble.regime]} (γ ${n(main.bubble.gammaHull, 1)})`}
          {seg.id === "bolla" &&
            report.whipAmpM > 0.005 &&
            ` · frusta: scafo ${n(report.hull.hz, 1)} Hz, bolla ${n(report.bubbleHz, 1)} Hz · ampiezza illustrativa ×${WHIP_VISUAL}`}
          {flood !== null && ` · ${worst}: ${n(flood * 100, 0)}% del volume (aria intrappolata)`}
          {seg.id === "allagamento" &&
            ` · acqua ${n(h.waterT, 0)} t, aria soffiata ${n(h.blownT, 0)} t · ${trim} · ${surfaced ? "in superficie" : `quota ${n(h.depth, 0)} m${vz}`}`}
          {seg.id === "allagamento" && result.chlorine && " · cloro nel locale batterie"}
          {seg.id === "allagamento" &&
            result.oilSlick &&
            oilIn !== null &&
            (oilIn > 0 ? ` · nafta in superficie fra ${n(oilIn / 60, 0)} min` : " · nafta in superficie")}
          {seg.id === "implosione" &&
            ` · ${tl.hydro.already ? "già oltre" : "a"} ${n(tl.hydro.collapseM, 0)} m, quota di collasso del modello · compressione ${n(IMPLOSION_S * 1000, 0)} ms come misurato per lo Scorpion, poi la bolla d'aria`}
        </p>
      </div>
    </div>
  );
}
