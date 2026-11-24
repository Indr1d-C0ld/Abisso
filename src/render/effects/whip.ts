import { WHIP_DAMPING, type ResponseReport } from "@/sim/response";
import { firstCollapse, type Timeline } from "@/sim/timeline";

/** La frusta reale è di decimetri su 70 m: a schermo la si esagera, e la barra lo dice. */
export const WHIP_VISUAL = 10;
export { WHIP_DAMPING };

/**
 * Spostamento verticale alle estremità dello scafo al tempo reale t, m (già esagerato).
 * Parte dal primo collasso della bolla più vicina (l'impulso di bolla), oscilla alla
 * frequenza del primo modo dello scafo e si smorza.
 */
export function whipAt(report: ResponseReport, tl: Timeline, t: number) {
  if (report.whipAmpM <= 0 || report.hull.hz <= 0) return 0;
  const pulses = tl.tracks.map(firstCollapse).filter((x): x is number => x !== null);
  if (!pulses.length) return 0;
  const tau = t - Math.min(...pulses);
  if (tau <= 0) return 0;
  const w = 2 * Math.PI * report.hull.hz;
  const ramp = Math.min(1, (tau * report.hull.hz) / 0.25);
  return report.whipAmpM * WHIP_VISUAL * ramp * Math.sin(w * tau) * Math.exp(-WHIP_DAMPING * w * tau);
}
