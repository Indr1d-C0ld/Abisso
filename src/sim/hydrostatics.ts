import type { Boat, Family } from "@/data/types";
import type { FloodRow, SimResult } from "@/sim/model";

/**
 * Fase 4: conseguenze idrostatiche dell'acqua imbarcata. Ricostruzione, non verdetto: il
 * verdetto resta l'indice del modello di danno. Fonti e stato in docs/FONTI-CONSEGUENZE.md.
 *
 *  - Peso: acqua di mare nei locali (curve con aria intrappolata di floodReport), contro
 *    la spinta che l'equipaggio recupera soffiando le zavorre con l'aria compressa.
 *  - Assetto: in immersione non c'è piano di galleggiamento; il momento raddrizzante è
 *    Δ g BG sin θ, quindi tan θ = Σ wᵢ xᵢ / (Δ BG).
 *  - Quota: velocità limite in caduta con resistenza di forma, massa virtuale 2 Δ.
 *  - Collasso: superata la quota di collasso di calcolo, implosione.
 */

export const RHO_SEA = 1025;
export const G = 9.81;

/**
 * Distanza centro di carena–baricentro in immersione, m (in immersione GM = BG).
 * XXI: altezza metacentrica specificata, minimo 320 mm in immersione e 290 mm in
 * superficie (Portsmouth 1946, 2G-21 S29, p. 5). Per le altre classi i manuali tedeschi
 * danno solo rapporti (valori assoluti «nei documenti segreti») e il rapporto sul IXC
 * dichiara il dato non disponibile: si usa lo stesso ordine di grandezza del XXI.
 */
export const BG_M: Record<Family, { m: number; source: string; verified: boolean }> = {
  II: { m: 0.25, source: "stima sull'ordine del XXI", verified: false },
  VII: { m: 0.3, source: "stima sull'ordine del XXI", verified: false },
  IX: { m: 0.3, source: "stima sull'ordine del XXI", verified: false },
  XB: { m: 0.3, source: "stima sull'ordine del XXI", verified: false },
  XXI: { m: 0.32, source: "Portsmouth 1946: minimo di specifica 320 mm", verified: true },
};

/**
 * Aria compressa a bordo ridotta a 1 at, m³. VIIC: 12 bombole da 325 l (3,9 m³) a 205 at
 * (M.Dv. 371,181, Vorläufige U-Boots-Angaben Typ VIIC, 1940, §III.4.c). Le altre classi
 * scalate con il dislocamento in immersione: stima.
 */
const VIIC_AIR_M3 = 3.9 * 205;
export const AIR_FREE_M3: Record<Family, { m3: number; source: string; verified: boolean }> = {
  II: { m3: VIIC_AIR_M3 * (364 / 871), source: "scalata dal VIIC con il dislocamento", verified: false },
  VII: { m3: VIIC_AIR_M3, source: "M.Dv. 371,181 (1940): 12 × 325 l a 205 at", verified: true },
  IX: { m3: VIIC_AIR_M3 * (1232 / 871), source: "scalata dal VIIC con il dislocamento", verified: false },
  XB: { m3: VIIC_AIR_M3 * (2177 / 871), source: "scalata dal VIIC con il dislocamento", verified: false },
  XXI: { m3: VIIC_AIR_M3 * (1819 / 871), source: "scalata dal VIIC con il dislocamento", verified: false },
};

/**
 * Resistenza del cilindro di traverso a Re 10⁶–10⁷ (supercritico): Cd ≈ 0,52–0,54
 * (Jones, Cincotta & Walker, NASA 1969). Di punta: stima, nessuna fonte.
 */
export const CD_SIDE = 0.53;
export const CD_END = 0.3;
/** Tempo prima che l'equipaggio soffi le zavorre, s (ipotesi dichiarata). */
export const BLOW_DELAY_S = 25;
/** Rateo di soffiatura, tonnellate di spinta al secondo (ipotesi dichiarata). */
export const BLOW_RATE_TPS = 2;
/**
 * Durata della compressione del Druckkörper all'implosione: 37 ms per lo Scorpion
 * (Rule 2018, p. 3). Segue la pulsazione della bolla d'aria, 0,224 s per lo stesso caso.
 */
export const IMPLOSION_S = 0.037;
export const IMPLOSION_BUBBLE_S = 0.224;
/** Soglie dell'emersione d'emergenza (ipotesi di condotta). */
export const EMERGENCY_FRACTION = 0.6;
export const EMERGENCY_SINK_M = 15;
/** Assestamento in superficie dopo l'emersione, s (resa). */
export const SETTLE_S = 20;
/** Assetto massimo rappresentato, rad. */
export const PITCH_MAX = (75 * Math.PI) / 180;

export type HydroSample = {
  /** Secondi reali dall'inizio dell'allagamento. */
  t: number;
  waterT: number;
  blownT: number;
  /** Peso netto, t (positivo = il battello scende). */
  netT: number;
  momentTm: number;
  /** Assetto, rad: prua in su positiva. */
  pitch: number;
  /** Quota dell'asse, m. */
  depth: number;
  /** Velocità verticale, m/s (positiva verso il fondo). */
  vz: number;
};

export type HydroTrack = {
  /** Inizio dell'allagamento, secondi reali dal lancio. */
  t0: number;
  samples: HydroSample[];
  /** Secondi reali dall'inizio dell'allagamento all'implosione, o null. */
  tCollapse: number | null;
  /** Secondi reali all'emersione, o null. */
  tSurface: number | null;
  /** Quota dell'asse a battello emerso. */
  surfacedDepth: number;
  collapseM: number;
  /** Il battello era già oltre il collasso prima dello scoppio. */
  already: boolean;
  /** Durata reale coperta. */
  span: number;
};

/** Riempimento di un locale (frazione del volume libero) a `minutes` dall'inizio. */
export function rowFill(row: FloodRow, minutes: number) {
  const s = row.series;
  if (!s.length || minutes <= 0) return 0;
  if (minutes <= s[0].t) return s[0].trapped;
  for (let i = 1; i < s.length; i++) {
    if (minutes <= s[i].t) {
      const u = (minutes - s[i - 1].t) / Math.max(1e-6, s[i].t - s[i - 1].t);
      return s[i - 1].trapped + u * (s[i].trapped - s[i - 1].trapped);
    }
  }
  return s[s.length - 1].trapped;
}

export function pAbsBar(depth: number) {
  return Math.max(0, depth) * 0.1005 + 1.013;
}

/** Spinta recuperabile soffiando a quota `depth`, t: limitata dalle casse e dall'aria. */
export function blowCapacityT(boat: Boat, depth: number) {
  const tanks = Math.max(0, boat.dispSub - boat.dispSurf);
  const air = (AIR_FREE_M3[boat.family].m3 / pAbsBar(depth)) * (RHO_SEA / 1000);
  return Math.min(tanks, air);
}

/** Resistenza per unità di pressione dinamica (Cd·A), m², con assetto θ. */
export function dragArea(boat: Boat, pitch: number) {
  const d = boat.beam;
  return CD_SIDE * boat.loa * d * Math.abs(Math.cos(pitch)) + CD_END * ((Math.PI * d * d) / 4) * Math.abs(Math.sin(pitch));
}

export function pitchOf(momentTm: number, dispT: number, bg: number) {
  const a = Math.atan(momentTm / Math.max(1, dispT * bg));
  return Math.max(-PITCH_MAX, Math.min(PITCH_MAX, a));
}

/**
 * Assetto di equilibrio [USNA EN400, cap. 10: in immersione Δ·BG·tan θ = w·x per ogni
 * angolo, B fisso nello scafo]. Peso a prua (x > 0) abbassa la prua: assetto negativo.
 * Ricostruito: il peso aggiunto sotto B (braccio z) raddrizza, Δ BG + Σ w z; l'acqua libera
 * scorre verso la paratia bassa (spostamento i_L / v · tan θ, al più un terzo del locale),
 * il che aumenta il momento. Si risolve per punto fisso.
 */
export function trimEquilibrium(parts: { w: number; fill: number; row: FloodRow }[], moment: number, dispT: number, bg: number, r: number) {
  let righting = dispT * bg;
  for (const p of parts) righting += p.w * r * (1 - p.fill) * 0.8;
  let theta = Math.atan(-moment / Math.max(1, righting));
  for (let k = 0; k < 40; k++) {
    let m = moment;
    const tan = Math.tan(theta);
    for (const p of parts) {
      if (p.w <= 0 || p.fill > 0.97) continue;
      const l = p.row.lengthM;
      const a = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * p.fill)));
      const b = 2 * p.row.radiusM * Math.sin(a);
      const v = p.w / (RHO_SEA / 1000);
      // Verso la paratia bassa: se la prua scende (θ < 0) l'acqua va verso +x.
      const shift = Math.min(l / 3, ((b * l * l * l) / 12 / Math.max(0.1, v)) * Math.abs(tan));
      m += p.w * shift * -Math.sign(theta || -moment || 1);
    }
    const next = Math.atan(-m / Math.max(1, righting));
    theta = theta + 0.5 * (next - theta);
  }
  return Math.max(-PITCH_MAX, Math.min(PITCH_MAX, theta));
}

function emptyTrack(boat: Boat, depth: number, t0: number, already: boolean): HydroTrack {
  return {
    t0,
    samples: [{ t: 0, waterT: 0, blownT: 0, netT: 0, momentTm: 0, pitch: 0, depth, vz: 0 }],
    tCollapse: already ? 0 : null,
    tSurface: null,
    surfacedDepth: surfacedDepth(boat),
    collapseM: boat.collapseM,
    already,
    span: 0,
  };
}

/** Quota dell'asse del Druckkörper a battello emerso: pescaggio meno mezzo diametro. */
export function surfacedDepth(boat: Boat) {
  return Math.max(1, boat.draft - boat.phDiameter / 2);
}

/**
 * Integra peso, assetto e quota dall'inizio dell'allagamento per `spanS` secondi reali.
 * Il riempimento dei locali segue le curve calcolate alla quota iniziale (non si
 * ricalcola con la discesa: dichiarato).
 */
export function hydroTrack(boat: Boat, result: SimResult, depth0: number, t0: number, spanS: number): HydroTrack {
  if (depth0 > boat.collapseM) return emptyTrack(boat, depth0, t0, true);
  const rows = result.flood.rows;
  if (result.flood.dry || !rows.length || spanS <= 0) return emptyTrack(boat, depth0, t0, false);
  const disp = boat.dispSub;
  const bg = BG_M[boat.family].m;
  const mVirt = 2 * disp * 1000;
  const steps = 800;
  const dt = spanS / steps;
  const out: HydroSample[] = [];
  const top = surfacedDepth(boat);
  let depth = depth0;
  let vz = 0;
  let blown = 0;
  let tCollapse: number | null = null;
  let tSurface: number | null = null;
  let emergency = false;
  for (let k = 0; k <= steps; k++) {
    const t = k * dt;
    let water = 0;
    let moment = 0;
    const parts: { w: number; fill: number; row: FloodRow }[] = [];
    for (const r of rows) {
      const fill = rowFill(r, t / 60);
      const w = fill * r.volumeM3 * (RHO_SEA / 1000);
      water += w;
      moment += w * r.xMid;
      parts.push({ w, fill, row: r });
    }
    // L'equipaggio soffia dopo un ritardo. Con danno contenuto compensa il peso e resta
    // sotto (in caccia non si emerge per scelta). Soffia tutto ciò che casse e aria
    // consentono quando il modello impone l'emersione (grave o perdita) oppure quando non
    // riesce più a tenere la quota: acqua oltre EMERGENCY_FRACTION della spinta
    // recuperabile, o battello sceso di EMERGENCY_SINK_M. Ipotesi di condotta, dichiarata.
    if (t > BLOW_DELAY_S) {
      const cap = blowCapacityT(boat, depth);
      if (water > EMERGENCY_FRACTION * cap || depth > depth0 + EMERGENCY_SINK_M) emergency = true;
      const goal = result.forcedSurface || emergency ? cap : Math.min(cap, water);
      blown = Math.min(goal, Math.max(blown, Math.min(goal, blown + BLOW_RATE_TPS * dt)));
    }
    const net = water - blown;
    const pitch = trimEquilibrium(parts, moment, disp + water, bg, boat.phDiameter / 2);
    out.push({ t, waterT: water, blownT: blown, netT: net, momentTm: moment, pitch, depth, vz });
    // Sottopassi: Eulero esplicito stabile solo con passi brevi rispetto al tempo di
    // rilassamento della velocità (qualche secondo).
    const sub = Math.max(1, Math.ceil(dt / 0.1));
    const h = dt / sub;
    const area = dragArea(boat, pitch);
    for (let j = 0; j < sub; j++) {
      const drag = 0.5 * RHO_SEA * area * vz * Math.abs(vz);
      vz += ((net * 1000 * G - drag) / mVirt) * h;
      depth += vz * h;
      if (depth >= boat.collapseM) {
        depth = boat.collapseM;
        tCollapse = t + (j + 1) * h;
        break;
      }
      if (depth <= top) {
        depth = top;
        vz = 0;
        tSurface = t + (j + 1) * h;
        break;
      }
    }
    // L'evento (collasso o emersione) cade fra due campioni: si registra all'istante esatto.
    const tEvent = tCollapse ?? tSurface;
    if (tEvent !== null) {
      out.push({ t: tEvent, waterT: water, blownT: blown, netT: net, momentTm: moment, pitch, depth, vz });
      break;
    }
  }
  // In superficie torna il piano di galleggiamento: BM_L ≈ I_wp / V, con un piano
  // d'acqua di 0,7 L B (ricostruito, ordine di grandezza). L'assetto si riduce a pochi
  // gradi in una ventina di secondi; il battello resta appesantito.
  if (tSurface !== null) {
    const s0 = out[out.length - 1];
    const bml = (0.7 * boat.beam * boat.loa ** 3) / 12 / (boat.dispSurf / (RHO_SEA / 1000));
    const target = pitchOf(-s0.momentTm, boat.dispSurf + s0.waterT, bml);
    for (let k = 1; k <= 20; k++) {
      const u = k / 20;
      const e = u * u * (3 - 2 * u);
      out.push({ ...s0, t: tSurface + u * SETTLE_S, pitch: s0.pitch + (target - s0.pitch) * e, vz: 0 });
    }
  }
  const last = out[out.length - 1];
  return {
    t0,
    samples: out,
    tCollapse,
    tSurface,
    surfacedDepth: top,
    collapseM: boat.collapseM,
    already: false,
    span: tCollapse ?? (tSurface !== null ? tSurface + SETTLE_S : last.t),
  };
}

/** Stato idrostatico a un tempo reale dal lancio (interpolato, costante fuori dall'intervallo). */
export function hydroAt(track: HydroTrack, tReal: number): HydroSample {
  const s = track.samples;
  const t = tReal - track.t0;
  if (t <= s[0].t) return { ...s[0], pitch: 0, waterT: 0, netT: 0, blownT: 0, vz: 0 };
  for (let i = 1; i < s.length; i++) {
    if (t <= s[i].t) {
      const u = (t - s[i - 1].t) / Math.max(1e-9, s[i].t - s[i - 1].t);
      const a = s[i - 1];
      const b = s[i];
      const l = (x: number, y: number) => x + u * (y - x);
      return {
        t,
        waterT: l(a.waterT, b.waterT),
        blownT: l(a.blownT, b.blownT),
        netT: l(a.netT, b.netT),
        momentTm: l(a.momentTm, b.momentTm),
        pitch: l(a.pitch, b.pitch),
        depth: l(a.depth, b.depth),
        vz: l(a.vz, b.vz),
      };
    }
  }
  return s[s.length - 1];
}

/** Riempimenti dei locali a un tempo reale dal lancio. Dopo l'implosione, tutto pieno. */
export function rowFills(track: HydroTrack, result: SimResult, tReal: number) {
  const t = tReal - track.t0;
  const crushed = track.tCollapse !== null && t >= track.tCollapse;
  return result.flood.rows.map((r) => (crushed ? 0.97 : rowFill(r, Math.min(t, track.span) / 60)));
}

/**
 * Cloro nel locale batterie, 0–1 (intensità di resa): compare quando l'acqua di mare
 * raggiunge le celle sotto il pagliolo e cresce nei minuti successivi.
 */
export const CELLS_WET_FILL = 0.12;
export const CHLORINE_RAMP_S = 120;
export function chlorineAt(row: FloodRow, track: HydroTrack, tReal: number) {
  const t = Math.max(0, Math.min(tReal - track.t0, track.span));
  if (rowFill(row, t / 60) < CELLS_WET_FILL) return 0;
  // Istante in cui l'acqua ha raggiunto le celle.
  let lo = 0;
  let hi = t;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (rowFill(row, m / 60) < CELLS_WET_FILL) lo = m;
    else hi = m;
  }
  return Math.min(1, 0.25 + (t - hi) / CHLORINE_RAMP_S);
}

/** Fase dell'implosione: (t − t_collasso) / durata, oppure −1 se non c'è (o non ancora). */
export function implosionPhase(track: HydroTrack, tReal: number) {
  if (track.tCollapse === null) return -1;
  const u = (tReal - (track.t0 + track.tCollapse)) / IMPLOSION_S;
  return u < 0 ? -1 : u;
}

/** Cedimento del Druckkörper, 0–1 (forma di resa nello shader). */
export function crushAt(track: HydroTrack, tReal: number) {
  const u = implosionPhase(track, tReal);
  if (u < 0) return 0;
  const x = Math.min(1, u);
  return x * x * (3 - 2 * x);
}

/**
 * Risalita delle gocce di nafta (peso specifico 0,842, U-570 British Report): legge di
 * Johansen fra Stokes e Cd = 0,44 (Nordam et al. 2020, §4.1). Gocce di 2 mm: 7,6 cm/s.
 * Il diametro è un'ipotesi: 1 mm darebbe 3,6 cm/s, 5 mm 15 cm/s.
 */
export function dropletRiseMps(dM: number, rhoOil = 842, rhoSea = RHO_SEA, nu = 1.35e-6) {
  const gp = (G * (rhoSea - rhoOil)) / rhoSea;
  const v1 = (gp * dM * dM) / (18 * nu);
  const v2 = Math.sqrt((8 * gp * (dM / 2)) / (3 * 0.44));
  return 1 / (1 / v1 + 1 / v2);
}
export const OIL_DROPLET_M = 0.002;
export const OIL_RISE_MPS = dropletRiseMps(OIL_DROPLET_M);
/** Secondi perché la nafta arrivi in superficie da `depth` metri. */
export function oilRiseS(depth: number) {
  return Math.max(0, depth) / OIL_RISE_MPS;
}
