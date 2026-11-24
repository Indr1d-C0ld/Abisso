import type { SimInput } from "@/data/types";
import { weaponById } from "@/data/weapons";
import { SOUND_MPS, type SimResult } from "@/sim/model";

/**
 * Linea del tempo della ricostruzione, derivata dal risultato del modello.
 *
 * Tempo reale (secondi dal lancio) e tempo di riproduzione (secondi a schermo) sono
 * legati da segmenti a velocità diversa: la discesa dura decine di secondi, l'onda d'urto
 * millisecondi, la bolla decimi di secondo, l'allagamento minuti. Ogni segmento dichiara
 * il proprio fattore di scala, che la barra del tempo mostra.
 *
 * Dal modello: tempi di discesa (quota / velocità di affondamento dell'arma), deriva,
 * posizione di scoppio, tempo di volo dell'onda (distanza / 1 490 m/s), raggio massimo e
 * primo periodo della bolla, curve di allagamento.
 * Ipotesi di resa (non calcolate dal modello, dichiarate a schermo): smorzamento dei
 * cicli successivi della bolla e sua risalita.
 */

export type SegmentId = "discesa" | "onda" | "bolla" | "allagamento";

export type Segment = {
  id: SegmentId;
  label: string;
  /** Intervallo reale, secondi dal lancio. */
  t0: number;
  t1: number;
  /** Intervallo a schermo, secondi di riproduzione. */
  d0: number;
  d1: number;
};

export type ChargeTrack = {
  id: string;
  yield: "full" | "mechanical" | "none";
  /** Posizione al lancio, in superficie, nel sistema della scena (relativa al battello). */
  start: [number, number, number];
  /** Posizione di scoppio, urto o, per i colpi a vuoto, fine corsa. */
  end: [number, number, number];
  /** Fine discesa (scoppio o urto), secondi reali. */
  tEnd: number;
  /** Arrivo dell'onda sul Druckkörper, secondi reali (solo scoppi pieni). */
  tShock: number | null;
  bubbleR: number;
  periodS: number;
  slantPh: number;
};

export type Timeline = {
  segments: Segment[];
  /** Durata della riproduzione, secondi a schermo. */
  duration: number;
  tracks: ChargeTrack[];
  /** Fine della fase della bolla, secondi reali. */
  tBubbleEnd: number;
  /** Superficie del mare nel sistema della scena. */
  surfaceY: number;
};

/** Ipotesi di resa per i cicli della bolla dopo il primo (dichiarate in barra). */
export const BUBBLE_CYCLES = 3;
export const BUBBLE_AMP_RATIO = 0.6;
export const BUBBLE_PERIOD_RATIO = 0.75;

/** Durate a schermo dei segmenti, secondi. */
const SCREEN = { discesa: 8, onda: 4.5, bolla: 7, allagamento: 8 } as const;

export function buildTimeline(input: SimInput, result: SimResult): Timeline {
  const weapon = weaponById(input.weaponId);
  const sink = Math.max(0.4, weapon.sinkMps);
  const surfaceY = input.axisDepth;
  const tracks: ChargeTrack[] = result.charges.map((c) => {
    const tEnd = Math.max(0.5, c.depthM / sink);
    // Il battello avanza durante la discesa: rispetto al battello la carica arretra.
    const drift = result.sinkTimeS > 0 ? result.driftM * (tEnd / result.sinkTimeS) : 0;
    return {
      id: c.id,
      yield: c.yield,
      start: [c.x + drift, surfaceY, c.z],
      end: [c.x, c.y, c.z],
      tEnd,
      tShock: c.yield === "full" ? tEnd + c.slantPh / SOUND_MPS : null,
      bubbleR: c.bubbleR,
      periodS: c.periodS,
      slantPh: c.slantPh,
    };
  });
  const bursts = tracks.filter((t) => t.yield !== "none");
  const ends = tracks.map((t) => t.tEnd);
  const tFirst = bursts.length ? Math.min(...bursts.map((t) => t.tEnd)) : Math.min(...ends);
  const tLast = bursts.length ? Math.max(...bursts.map((t) => t.tEnd)) : Math.max(...ends);
  const lastShock = Math.max(tFirst, ...tracks.map((t) => t.tShock ?? 0));
  // L'onda: fino a poco dopo l'ultimo arrivo sul cilindro (minimo 20 ms).
  const tWave = Math.max(tFirst + 0.02, lastShock + (lastShock - tFirst) * 0.3 + 0.004);
  const period = Math.max(0, ...bursts.map((t) => t.periodS));
  const cycles = cyclesSpan(period);
  const tBubbleEnd = Math.max(tWave + 0.2, tLast + cycles + 0.15);

  const segments: Segment[] = [];
  let d = 0;
  const push = (id: SegmentId, label: string, t0: number, t1: number, screen: number) => {
    segments.push({ id, label, t0, t1, d0: d, d1: d + screen });
    d += screen;
  };
  push("discesa", "Discesa", 0, tFirst, Math.min(SCREEN.discesa, Math.max(3, tFirst)));
  if (bursts.some((t) => t.yield === "full")) {
    push("onda", "Onda d'urto", tFirst, tWave, SCREEN.onda);
    push("bolla", "Bolla", tWave, tBubbleEnd, SCREEN.bolla);
  } else {
    // Solo urti meccanici o colpi a vuoto: un breve tratto dopo l'ultimo arrivo.
    push("bolla", "Dopo l'urto", tFirst, tLast + 1.5, 3);
  }
  if (!result.flood.dry) {
    const worst = result.flood.rows.reduce((m, r) => Math.max(m, r.minTrapped), 0);
    const last = segments[segments.length - 1];
    push("allagamento", "Allagamento", last.t1, last.t1 + worst * 60, SCREEN.allagamento);
  }
  return { segments, duration: d, tracks, tBubbleEnd, surfaceY };
}

/** Durata dei cicli della bolla rappresentati, secondi. */
export function cyclesSpan(period: number) {
  let s = 0;
  for (let k = 0; k < BUBBLE_CYCLES; k++) s += period * Math.pow(BUBBLE_PERIOD_RATIO, k);
  return s;
}

/** Da tempo a schermo a tempo reale (interpolazione lineare nel segmento). */
export function displayToReal(tl: Timeline, d: number) {
  const seg = segmentAt(tl, d);
  const u = seg.d1 > seg.d0 ? (Math.min(Math.max(d, seg.d0), seg.d1) - seg.d0) / (seg.d1 - seg.d0) : 0;
  return seg.t0 + u * (seg.t1 - seg.t0);
}

/** Da tempo reale a tempo a schermo. */
export function realToDisplay(tl: Timeline, t: number) {
  for (const s of tl.segments) {
    if (t <= s.t1 || s === tl.segments[tl.segments.length - 1]) {
      const u = s.t1 > s.t0 ? (Math.min(Math.max(t, s.t0), s.t1) - s.t0) / (s.t1 - s.t0) : 1;
      return s.d0 + u * (s.d1 - s.d0);
    }
  }
  return tl.duration;
}

export function segmentAt(tl: Timeline, d: number): Segment {
  for (const s of tl.segments) if (d < s.d1) return s;
  return tl.segments[tl.segments.length - 1];
}

/** Rapporto fra tempo reale e tempo a schermo nel segmento (>1 accelerato, <1 rallentato). */
export function segmentRate(s: Segment) {
  const screen = s.d1 - s.d0;
  return screen > 0 ? (s.t1 - s.t0) / screen : 1;
}

/** Posizione della carica al tempo reale t, e se è ancora visibile. */
export function chargeState(track: ChargeTrack, t: number) {
  const u = Math.min(1, Math.max(0, t / track.tEnd));
  const pos: [number, number, number] = [
    track.start[0] + (track.end[0] - track.start[0]) * u,
    track.start[1] + (track.end[1] - track.start[1]) * u,
    track.start[2] + (track.end[2] - track.start[2]) * u,
  ];
  // Lo scoppio pieno consuma la carica; l'urto senza bolla la lascia sullo scafo;
  // il colpo a vuoto continua a scendere e sparisce.
  const visible = track.yield === "full" ? t < track.tEnd : track.yield === "mechanical" ? true : t < track.tEnd * 1.15;
  return { pos, visible, arrived: t >= track.tEnd };
}

/**
 * Raggio della bolla al tempo dallo scoppio τ (s). Primo ciclo dal modello (raggio
 * massimo e periodo); i cicli successivi con ampiezza ×0,6 e periodo ×0,75 (ipotesi di
 * resa). Profilo: espansione rapida, collasso brusco, minimo al 12% del massimo.
 */
export function bubbleRadius(track: ChargeTrack, tau: number) {
  if (track.yield !== "full" || tau < 0 || track.periodS <= 0) return 0;
  let t = tau;
  let amp = track.bubbleR;
  let T = track.periodS;
  for (let k = 0; k < BUBBLE_CYCLES; k++) {
    if (t < T) {
      const u = t / T;
      return Math.max(0.12 * amp, amp * Math.pow(Math.sin(Math.PI * u), 0.55));
    }
    t -= T;
    amp *= BUBBLE_AMP_RATIO;
    T *= BUBBLE_PERIOD_RATIO;
  }
  return 0;
}

/** Risalita della bolla (resa): cresce col quadrato del tempo, fino a ~1,2 raggi massimi. */
export function bubbleRise(track: ChargeTrack, tau: number) {
  const span = cyclesSpan(track.periodS);
  if (span <= 0 || tau <= 0) return 0;
  const u = Math.min(1, tau / span);
  return 1.2 * track.bubbleR * u * u;
}

/** Frazione del locale peggiore allagata al tempo reale t (curva con aria intrappolata). */
export function floodFraction(result: SimResult, tl: Timeline, t: number) {
  const seg = tl.segments.find((s) => s.id === "allagamento");
  if (!seg || result.flood.dry || !result.flood.series.length) return 0;
  const minutes = Math.max(0, (t - seg.t0) / 60);
  const s = result.flood.series;
  if (minutes <= s[0].t) return s[0].trapped;
  for (let i = 1; i < s.length; i++) {
    if (minutes <= s[i].t) {
      const u = (minutes - s[i - 1].t) / Math.max(1e-6, s[i].t - s[i - 1].t);
      return s[i - 1].trapped + u * (s[i].trapped - s[i - 1].trapped);
    }
  }
  return s[s.length - 1].trapped;
}
