import { ALL_BOATS, boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import { PATTERN_LABEL, patternsFor, weaponById, WEAPONS } from "@/data/weapons";
import { Scene } from "@/components/abisso/Scene";
import { Schematic } from "@/components/abisso/Schematic";
import { Interior } from "@/components/abisso/Interior";
import { Batteries } from "@/components/abisso/Batteries";
import { EventCard, EventLibrary } from "@/components/abisso/Events";
import { Archive, Method } from "@/components/abisso/Dossier";
import { EVENTS, eventById } from "@/data/events";
import { LEVEL_LABEL, bubblePeriod, bubbleRadius, coleBreakdown, coleMPa, describeHit, evaluate, initialShock, levelOf, n, referenceRadius, type ChargeResult, type FloodReport, type SimResult } from "@/sim/model";
import { CAM_LABEL, useAbisso } from "@/state/store";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo } from "react";

const PRESETS: { label: string; patch: Partial<SimInput> }[] = [
  { label: "14 m al traverso", patch: { weaponId: "mk7-heavy-torpex", pattern: "single", missX: 0, missZ: 14, axisDepth: 70, burstDepth: 70, applyDrift: false } },
  { label: "Sotto la chiglia", patch: { weaponId: "mk7-heavy-torpex", pattern: "single", missX: 0, missZ: 4, axisDepth: 70, burstDepth: 84, applyDrift: false } },
  { label: "Spoletta corta", patch: { weaponId: "mk7-heavy-amatol", pattern: "single", missX: 0, missZ: 0, axisDepth: 80, burstDepth: 40, applyDrift: false } },
  { label: "In asse, fermo", patch: { weaponId: "mk7-heavy-torpex", pattern: "single", missX: 0, missZ: 0, axisDepth: 70, burstDepth: 70, applyDrift: false, armWindow: 8 } },
  { label: "Deriva a 4 nodi", patch: { weaponId: "mk7-amatol", pattern: "single", missX: 0, missZ: 0, axisDepth: 80, burstDepth: 80, speedKn: 4, applyDrift: true } },
  { label: "Hedgehog centrato", patch: { weaponId: "hedgehog", pattern: "hedgehog", missX: 0, missZ: 0, axisDepth: 60, burstDepth: 60, applyDrift: false } },
  { label: "Squid centrato", patch: { weaponId: "squid", pattern: "squid3", missX: 0, missZ: 0, axisDepth: 70, burstDepth: 70, applyDrift: false } },
  { label: "Lontano", patch: { weaponId: "mk7-heavy-torpex", pattern: "single", missX: 20, missZ: 55, axisDepth: 70, burstDepth: 70, applyDrift: false } },
];

function ColeRead({ weq, r, hasHit }: { weq: number; r: number; hasHit: boolean }) {
  const b = coleBreakdown(weq, r);
  const farther = coleMPa(weq, b.R * 1.1);
  const heavier = coleMPa(weq * 1.1, b.R);
  const doubled = coleMPa(weq, b.R * 2);
  const drop = (1 - farther / b.p) * 100;
  const rise = (heavier / b.p - 1) * 100;
  const left = (doubled / b.p) * 100;
  const sameR = b.w13;
  const rows = [0.5, 1, 2, 4, 8];
  return (
    <div className="cole">
      <h3>Equazione di Cole, scomposta</h3>
      <p className="formula">P = 52,16 · (W<sup>1/3</sup> / R)<sup>1,13</sup> MPa</p>
      <p>
        {hasHit ? "Sulla carica più vicina." : "Nessun arrivo: i numeri sono alla distanza di rottura al traverso, non a un punto d’urto."} W è l’equivalente TNT di questa carica, {n(b.W, 0)} kg. Non è la massa scritta sull’ordigno se l’esplosivo non è TNT.
      </p>
      <table className="factors">
        <tbody>
          <tr>
            <th>W<sup>1/3</sup></th>
            <td>{n(b.w13, 2)} kg<sup>1/3</sup></td>
          </tr>
          <tr>
            <th>R</th>
            <td>{n(b.R, 2)} m{b.near ? " · sotto il metro, ordine di grandezza" : ""}</td>
          </tr>
          <tr>
            <th>Z = R / W<sup>1/3</sup></th>
            <td>{n(b.Z, 2)}</td>
          </tr>
          <tr>
            <th>W<sup>1/3</sup> / R</th>
            <td>{n(b.sigma, 3)}</td>
          </tr>
          <tr>
            <th>Picco</th>
            <td>{n(b.p, 2)} MPa</td>
          </tr>
          <tr>
            <th>Stesso picco a Z = 1</th>
            <td>{n(b.pUnit, 2)} MPa, a {n(sameR, 2)} m</td>
          </tr>
        </tbody>
      </table>
      <p>
        Il 52,16 è quel picco a Z = 1, non una pressione di scoppio. L’esponente 1,13 è un dato di misura: il dieci per cento di distanza in più, qui, porta il picco a {n(farther, 2)} MPa ({n(drop, 1)}% in meno). Il dieci per cento di carica in più lo porta a {n(heavier, 2)} MPa ({n(rise, 1)}% in più). Il doppio della distanza ne lascia il {n(left, 0)}%. La distanza pesa più della massa, perché W entra solo alla potenza 0,377.
      </p>
      <p>Stesso Z, stesso picco, per qualunque carica. La tabella non dipende da questo ordigno.</p>
      <table className="factors">
        <tbody>
          {rows.map((z) => (
            <tr key={z}>
              <th>Z = {n(z, 1)}</th>
              <td>{n(52.16 * Math.pow(1 / z, 1.13), 1)} MPa</td>
            </tr>
          ))}
          <tr>
            <th>Questo Z</th>
            <td>
              {n(b.Z, 2)} · {n(b.p, 1)} MPa
            </td>
          </tr>
        </tbody>
      </table>
      <p className="note">
        La quota non entra. Il precarico dello scafo è un altro fattore, dopo. Torpex e Minol cambiano W e, a parte, il raggio di rottura: non cambiano il 52,16. Cole è il picco in acqua libera. Non è l’impulso, non è la bolla, non è il danno.
      </p>
    </div>
  );
}

function FloodRead({ flood }: { flood: FloodReport }) {
  if (flood.dry) {
    return (
      <div className="paper">
        <h3>Allagamento nel tempo</h3>
        <p>Nessuna via d’acqua nel Druckkörper. La scossa non apre un orifizio: senza area non c’è portata, e senza portata non c’è orologio.</p>
      </div>
    );
  }
  const worst = flood.rows.find((r) => r.name === flood.worstName) ?? flood.rows[0];
  return (
    <div className="paper">
      <h3>Allagamento nel tempo</h3>
      <p className="formula">Q = 0,62 · A · √(2 g H)</p>
      <p>
        Il verdetto è lo stato finale. Qui il locale si riempie. H è la quota dell’asse, {n(flood.depthM, 0)} m. Il volume è il cilindro del Druckkörper per la lunghezza del compartimento, al 65%: le macchine occupano il resto, e il 65% è un’ipotesi. L’area anche: falle 8 cm², allagamento 80, rottura 400. Un fattore tre sull’area sposta il tempo di altrettanto.
      </p>
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={flood.series}>
            <XAxis dataKey="t" stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} unit=" min" tickFormatter={(v: number) => n(v, 1)} />
            <YAxis stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} domain={[0, 1]} width={36} tickFormatter={(v: number) => n(v, 1)} />
            <Tooltip formatter={(v) => n(Number(v), 2)} labelFormatter={(v) => `${n(Number(v), 1)} min`} />
            <Line type="monotone" dataKey="free" name="Sfogo" stroke="#b5523a" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="trapped" name="Aria intrappolata" stroke="#8c7040" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="note">
        {flood.worstName}. Rosso: l’aria sfoga, il locale va pieno. Ottone: l’aria si comprime e l’ingresso si ferma al {n(worst.trappedFill * 100, 0)}% del volume.
      </p>
      <table className="factors">
        <tbody>
          {flood.rows.map((r) => (
            <tr key={r.id}>
              <th>{r.name}</th>
              <td>
                {n(r.holeCm2, 0)} cm² · {n(r.qM3h, 0)} m³/h · {n(r.minFree, 1)} min
              </td>
            </tr>
          ))}
          <tr>
            <th>Tonnellate, se vanno pieni</th>
            <td>{n(flood.tonnes, 0)} t</td>
          </tr>
          <tr>
            <th>Immersione meno superficie</th>
            <td>{n(flood.ballastT, 0)} t</td>
          </tr>
          <tr>
            <th>Fascia sul tempo</th>
            <td>
              {n(worst.minFree / 3, 1)}–{n(worst.minFree * 3, 1)} min
            </td>
          </tr>
        </tbody>
      </table>
      <p className="note">
        {n(flood.tonnes, 0)} t contro {n(flood.ballastT, 0)} t non è un calcolo di assetto: è la scala. Quelle tonnellate sono l’acqua dei doppifondi già imbarcata per stare in quota, non una riserva che tenga un locale aperto. Le pompe di sentina, in metri cubi l’ora, non stanno in questa tabella: una falla da decine di metri cubi l’ora le supera.
      </p>
    </div>
  );
}

function InitialRead({ result }: { result: SimResult }) {
  const pass = result.wave.passes[0];
  if (!pass) return null;
  const charge = result.charges.find((c) => c.id === pass.id);
  const s = initialShock(pass.slantM, pass.peakMPa, pass.thetaMs, charge?.depthM ?? 0, charge?.periodS ?? 0);
  return (
    <>
      <h3>Onda iniziale</h3>
      <p className="formula">
        P(t) = P · e<sup>−t/θ</sup>
      </p>
      <p>
        {pass.id}. Il salto arriva a {n(s.travelMs, 2)} ms. La salita non è disegnata: è più breve di θ. Poi la coda, con θ = {n(s.thetaMs, 2)} ms. In un θ passa il {n(s.share1 * 100, 0)}% dell’impulso, in tre θ il {n(s.share3 * 100, 0)}%.
      </p>
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={s.profile}>
            <XAxis dataKey="t" stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} unit=" ms" tickFormatter={(v: number) => n(v, 2)} />
            <YAxis stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} unit=" MPa" width={64} tickFormatter={(v: number) => n(v, 0)} />
            <Tooltip formatter={(v) => `${n(Number(v), 2)} MPa`} labelFormatter={(v) => `${n(Number(v), 2)} ms dopo l’arrivo`} />
            <Line type="monotone" dataKey="p" name="Coda" stroke="#b5523a" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="factors">
        <tbody>
          <tr>
            <th>Impulso P·θ</th>
            <td>{n(s.impulsePaS / 1000, 1)} kPa·s</td>
          </tr>
          <tr>
            <th>Spessore c·θ</th>
            <td>{n(s.lengthM, 2)} m</td>
          </tr>
          <tr>
            <th>Picco / idrostatica</th>
            <td>
              {n(s.over, 0)}× · ambiente {n(s.staticBar, 1)} bar
            </td>
          </tr>
          <tr>
            <th>Coda sopra l’ambiente</th>
            <td>{n(s.strongMs, 2)} ms</td>
          </tr>
          <tr>
            <th>Periodo della bolla / θ</th>
            <td>{s.gap > 0 ? `${n(s.gap, 0)}×` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="note">
        Il picco è molte volte la pressione dell’acqua: all’arrivo è un urto, non un suono. La coda scende al livello dell’ambiente in θ·ln(quel rapporto). La pulsazione della bolla, se arriva, è un altro fronte, un periodo dopo. Non è in questa curva, e il verdetto non la usa.
      </p>
    </>
  );
}

function BubbleRead({ charges, weq }: { charges: ChargeResult[]; weq: number }) {
  const full = charges.filter((c) => c.yield === "full").sort((a, b) => a.slantPh - b.slantPh);
  const p = full[0];
  if (!p) {
    return (
      <div className="paper">
        <h3>Effetto della bolla</h3>
        <p>Nessuno scoppio. Senza gas non c’è bolla: l’urto meccanico e il colpo a vuoto non pulsano.</p>
      </div>
    );
  }
  const clearance = p.keelDist - p.bubbleR;
  const whip = p.underKeel ? 0.25 : 0;
  const touch = p.bubbleTouch ? 0.12 : 0;
  const raw = 1 + whip + touch;
  const deeper = p.depthM + 50;
  const rDeep = bubbleRadius(weq, deeper);
  const tDeep = bubblePeriod(weq, deeper);
  return (
    <div className="paper">
      <h3>Effetto della bolla</h3>
      <p className="formula">
        R = 3,38 · W<sup>1/3</sup> / (H + 10,1)<sup>1/3</sup>
      </p>
      <p>
        {p.id}, quota di scoppio {n(p.depthM, 0)} m. Primo massimo {n(p.bubbleR, 1)} m. Periodo di Willis {n(p.periodS, 2)} s, massimo circa a {n(p.periodS / 2, 2)} s. Non è l’onda: quella è già passata in millisecondi.
      </p>
      <table className="factors">
        <tbody>
          <tr>
            <th>Distanza dalla chiglia</th>
            <td>{n(p.keelDist, 1)} m</td>
          </tr>
          <tr>
            <th>Gioco, chiglia meno raggio</th>
            <td>{clearance >= 0 ? `${n(clearance, 1)} m, non arriva` : `${n(Math.abs(clearance), 1)} m dentro il fasciame`}</td>
          </tr>
          <tr>
            <th>Lambisce (raggio + 15%)</th>
            <td>{p.bubbleTouch ? "sì, +0,12 sull’aspetto" : "no"}</td>
          </tr>
          <tr>
            <th>Sotto la chiglia</th>
            <td>{p.underKeel ? "sì, frustata +0,25" : "no, niente frustata"}</td>
          </tr>
          <tr>
            <th>Aspetto</th>
            <td>
              {n(Math.min(1.34, raw), 2)}
              {raw > 1.34 ? `, il tetto taglia ${n(raw - 1.34, 2)}` : ""}
            </td>
          </tr>
          <tr>
            <th>Stessa carica, {n(deeper, 0)} m</th>
            <td>
              {n(rDeep, 1)} m · {n(tDeep, 2)} s
            </td>
          </tr>
        </tbody>
      </table>
      {full.length > 1 && (
        <p>
          {full.slice(0, 4).map((c) => `${c.id} ${n(c.bubbleR, 1)} m`).join(" · ")}
          {full.length > 4 ? ` · altre ${full.length - 4}` : ""}
        </p>
      )}
      <p className="note">
        Più fondo, la bolla si restringe e il periodo cade più del raggio: la pressione assoluta sta alla 5/6 nel tempo e alla 1/3 nel raggio. Il +0,25 della frustata non dipende da R. Il getto del collasso contro la chiglia non è calcolato. A schermo la sfera fa un respiro solo: il tempo vero è il periodo.
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>
        {label} · <strong>{n(value, step < 1 ? 1 : 0)} {unit}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function App() {
  const tab = useAbisso((s) => s.tab);
  const setTab = useAbisso((s) => s.setTab);
  const mobile = useAbisso((s) => s.mobile);
  const setMobile = useAbisso((s) => s.setMobile);
  const input = useAbisso((s) => s.input);
  const patch = useAbisso((s) => s.patch);
  const shot = useAbisso((s) => s.shot);
  const boom = useAbisso((s) => s.boom);
  const xray = useAbisso((s) => s.xray);
  const cut = useAbisso((s) => s.cut);
  const interior = useAbisso((s) => s.interior);
  const spheres = useAbisso((s) => s.spheres);
  const toggle = useAbisso((s) => s.toggle);
  const cam = useAbisso((s) => s.cam);
  const setCam = useAbisso((s) => s.setCam);
  const finish = useAbisso((s) => s.finish);
  const setFinish = useAbisso((s) => s.setFinish);
  const probe = useAbisso((s) => s.probe);
  const setProbe = useAbisso((s) => s.setProbe);
  const selected = useAbisso((s) => s.selected);
  const select = useAbisso((s) => s.select);
  const cases = useAbisso((s) => s.cases);
  const eventId = useAbisso((s) => s.eventId);
  const loadEvent = useAbisso((s) => s.loadEvent);
  const saveCase = useAbisso((s) => s.saveCase);
  const deleteCase = useAbisso((s) => s.deleteCase);
  const hydrate = useAbisso((s) => s.hydrate);
  const loadCase = useAbisso((s) => s.loadCase);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const computed = useMemo(() => {
    try {
      return { ok: true as const, data: evaluate(input) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Errore di calcolo" };
    }
  }, [input]);

  const boat = boatById(input.boatId);
  const event = eventById(eventId);
  const weapon = weaponById(input.weaponId);
  const allowed = patternsFor(weapon.kind);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="kicker">Atlantico settentrionale · 1939–1945</p>
          <h1 className="wordmark">ABISSO</h1>
        </div>
        <nav className="nav" aria-label="Sezioni">
          <button type="button" data-on={tab === "studio"} onClick={() => setTab("studio")}>
            Studio
          </button>
          <button type="button" data-on={tab === "casi"} onClick={() => setTab("casi")}>
            Casi
          </button>
          <button type="button" data-on={tab === "archivio"} onClick={() => setTab("archivio")}>
            Archivio
          </button>
          <button type="button" data-on={tab === "metodo"} onClick={() => setTab("metodo")}>
            Metodo
          </button>
        </nav>
      </header>

      {tab === "casi" && <EventLibrary events={EVENTS} onLoad={loadEvent} />}
      {tab === "archivio" && (
        <div className="workspace">
          <Archive />
        </div>
      )}
      {tab === "metodo" && (
        <div className="workspace">
          <Method />
        </div>
      )}
      {/* Lo studio resta montato anche sulle altre schede: smontare il Canvas WebGL
          (e i portali Html di drei) a ogni cambio scheda costava un contesto GL nuovo
          e generava errori removeChild. Nascosto, il render loop viene sospeso. */}
      {computed.ok && (
        <div style={{ display: tab === "studio" ? "contents" : "none" }}>
          <div className="mobile-panes">
            {(["model", "data", "result"] as const).map((m) => (
              <button key={m} type="button" className="chip" data-on={mobile === m} onClick={() => setMobile(m)}>
                {m === "model" ? "Scafo" : m === "data" ? "Colpo" : "Esito"}
              </button>
            ))}
          </div>
          <div className="workspace studio">
            <section className={`scroll-col left ${mobile === "data" ? "" : "pane-hide"}`}>
              <p className="meta">Battello</p>
              <label className="field">
                <span>Classe o unità</span>
                <select className="select" value={input.boatId} onChange={(e) => patch({ boatId: e.target.value })}>
                  <optgroup label="Classi">
                    {ALL_BOATS.filter((b) => !b.historical).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Battelli">
                    {ALL_BOATS.filter((b) => b.historical).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} · {b.klass}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <div className="chips">
                <button type="button" className="chip" data-on={input.era === "1941"} onClick={() => patch({ era: "1941" })}>
                  1941 · cannone
                </button>
                <button type="button" className="chip" data-on={input.era === "1944"} onClick={() => patch({ era: "1944" })}>
                  1944 · schnorchel
                </button>
              </div>
              <div className="chips">
                <button type="button" className="chip" data-on={finish === "controllo"} onClick={() => setFinish("controllo")}>
                  Fasciame chiaro
                </button>
                <button type="button" className="chip" data-on={finish === "atlantico"} onClick={() => setFinish("atlantico")}>
                  Grigio atlantico
                </button>
              </div>
              <p className="note">Il grigio chiaro è da sala di controllo: le cuciture e il danno si leggono. L’atlantico è il tono di mare. L’anno cambia torre e volume colpibile, non lo spessore del Druckkörper.</p>

              <p className="meta">Ordigno</p>
              <label className="field">
                <span>Arma</span>
                <select className="select" value={input.weaponId} onChange={(e) => patch({ weaponId: e.target.value })}>
                  {WEAPONS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.short}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Schema</span>
                <select className="select" value={input.pattern} onChange={(e) => patch({ pattern: e.target.value as SimInput["pattern"] })}>
                  {allowed.map((p) => (
                    <option key={p} value={p}>
                      {PATTERN_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="presets">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" className="preset" onClick={() => patch(p.patch)}>
                    {p.label}
                  </button>
                ))}
              </div>

              <Slider label="Quota dell’asse" value={input.axisDepth} min={10} max={300} step={1} unit="m" onChange={(axisDepth) => patch({ axisDepth })} />
              {weapon.kind !== "contact" && (
                <Slider label="Quota di scoppio" value={input.burstDepth} min={5} max={320} step={1} unit="m" onChange={(burstDepth) => patch({ burstDepth })} />
              )}
              <Slider label="Errore longitudinale, prua +" value={input.missX} min={-60} max={60} step={1} unit="m" onChange={(missX) => patch({ missX })} />
              <Slider label="Errore laterale, dritta +" value={input.missZ} min={-60} max={60} step={1} unit="m" onChange={(missZ) => patch({ missZ })} />

              <details className="adv">
                <summary>Cinematica e spoletta</summary>
                {weapon.kind !== "contact" && input.pattern !== "single" && (
                  <Slider label="Passo dello schema" value={input.spacing} min={10} max={70} step={1} unit="m" onChange={(spacing) => patch({ spacing })} />
                )}
                <Slider label="Orientamento dello schema" value={input.heading} min={-180} max={180} step={5} unit="°" onChange={(heading) => patch({ heading })} />
                <Slider label="Velocità del bersaglio" value={input.speedKn} min={0} max={17} step={0.5} unit="nodi" onChange={(speedKn) => patch({ speedKn })} />
                <div className="chips">
                  <button type="button" className="chip" data-on={input.applyDrift} onClick={() => patch({ applyDrift: !input.applyDrift })}>
                    {input.applyDrift ? "Deriva inclusa" : "Deriva esclusa"}
                  </button>
                </div>
                <p className="note">
                  In {n(computed.data.sinkTimeS, 0)} s di discesa un battello a {n(input.speedKn, 1)} nodi percorre {n(input.speedKn * 0.514444 * computed.data.sinkTimeS, 0)} m. La deriva sposta il bersaglio verso prua rispetto al punto mirato.
                </p>
                {weapon.kind !== "contact" && (
                  <Slider label="Finestra di armamento all’urto" value={input.armWindow} min={0} max={25} step={1} unit="m" onChange={(armWindow) => patch({ armWindow })} />
                )}
              </details>

              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  data-on={interior}
                  onClick={() => {
                    toggle("interior");
                    if (!interior) setMobile("model");
                  }}
                >
                  Struttura interna
                </button>
                <button type="button" className="chip" data-on={xray} onClick={() => toggle("xray")}>
                  Corpo resistente
                </button>
                <button type="button" className="chip" data-on={cut} onClick={() => toggle("cut")}>
                  Sezione
                </button>
                <button type="button" className="chip" data-on={spheres} onClick={() => toggle("spheres")}>
                  Raggio di rottura
                </button>
              </div>
              <button type="button" className="preset" onClick={() => boom()}>
                Ripeti lo scoppio
              </button>

              <p className="meta">Casi conservati su questo dispositivo</p>
              <button
                type="button"
                className="ghost"
                onClick={() => saveCase(`${boat.name} · ${weapon.short}`, computed.data.outcomeLabel)}
              >
                Conserva questo caso
              </button>
              {cases.map((c) => (
                <div className="case" key={c.id}>
                  <button type="button" onClick={() => loadCase(c.id)}>
                    {c.title}
                    <small>{c.outcome}</small>
                  </button>
                  <button type="button" className="ghost" onClick={() => deleteCase(c.id)} aria-label="Elimina caso">
                    Elimina
                  </button>
                </div>
              ))}
            </section>

            <section className={`viewport ${mobile === "model" ? "" : "pane-hide"}`}>
              <Scene
                active={tab === "studio"}
                input={input}
                result={computed.data}
                xray={xray}
                cut={cut}
                spheres={spheres}
                interior={interior}
                cam={cam}
                shot={shot}
                finish={finish}
                probe={probe}
                selected={selected}
                onHit={(x, y, z) => setProbe(describeHit(input, computed.data, x, y, z))}
                onMiss={() => setProbe(null)}
              />
              <div className="hud">
                <div className="legend">
                  <span>{interior ? "Druckkörper" : "Fasciame"}</span>
                  <ul>
                    <li><i className="swatch" data-l="nullo" /> Integro</li>
                    <li><i className="swatch" data-l="scossa" /> Scossa</li>
                    <li><i className="swatch" data-l="falle" /> Falle</li>
                    <li><i className="swatch" data-l="allagamento" /> Allagato</li>
                    <li><i className="swatch" data-l="rottura" /> Rottura, lamiera tolta</li>
                  </ul>
                </div>
                {probe && (
                  <div className="probe-card">
                    <strong>
                      {probe.zone} · {LEVEL_LABEL[probe.level]}
                    </strong>
                    <span>
                      {n(probe.fromBow, 1)} m dalla prua, {probe.side}. Indice {n(probe.sev, 2)}.
                      {probe.compName ? ` ${probe.compName}.` : " Fuori dal corpo resistente."}
                      {probe.nearestM != null ? ` Carica a ${n(probe.nearestM, 1)} m.` : ""}
                    </span>
                  </div>
                )}
              </div>
              <div className="overlay">
                <div className="tag">
                  {boat.name}
                  <br />
                  {computed.data.outcomeLabel}
                  <br />
                  {event ? `${event.boat} · ${event.recreable ? "ipotesi" : "non ricostruibile"}` : "prua → · dritta a destra in pianta"}
                </div>
                <div className="presets">
                  {(Object.keys(CAM_LABEL) as (keyof typeof CAM_LABEL)[]).map((k) => (
                    <button key={k} type="button" className="preset" data-on={cam === k} onClick={() => setCam(k)}>
                      {CAM_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={`scroll-col ${mobile === "result" ? "" : "pane-hide"}`}>
              {event && <EventCard event={event} input={input} />}
              <p className="verdict" data-o={computed.data.outcome}>
                {computed.data.outcomeLabel}
              </p>
              <p className="lede">
                Rottura al traverso {n(computed.data.rSplitBeam, 1)} m · {n(computed.data.rSplitBeam / 0.3048, 0)} ft. Tocca il fasciame per leggere il punto.
              </p>
              {probe && (
                <p className="note">
                  Punto ispezionato: {probe.zone}, {LEVEL_LABEL[probe.level].toLowerCase()}, {n(probe.fromBow, 1)} m dalla prua
                  {probe.compName ? `, in corrispondenza di ${probe.compName}` : ""}.
                </p>
              )}
              <div className="flags">
                <span className="flag" data-hot={computed.data.oilSlick}>
                  {computed.data.oilSlick ? "Nafta in superficie" : "Casse ancora integre"}
                </span>
                <span className="flag" data-hot={computed.data.chlorine}>
                  {computed.data.chlorine
                    ? "Cloro dalle batterie"
                    : computed.data.batteries.left < 0.99
                      ? "Batterie scosse"
                      : "Batterie integre"}
                </span>
                <span className="flag" data-hot={computed.data.forcedSurface}>
                  {computed.data.forcedSurface ? "Emersione spesso forzata" : "Può tentare di restare sotto"}
                </span>
                {computed.data.fuzeBeyond && <span className="flag" data-hot="true">Oltre la spoletta tabulabile</span>}
              </div>
              <Batteries report={computed.data.batteries} />
              <div className="narrative">
                {computed.data.narrative.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              {weapon.eraRadiusLabel && (
                <p className="note">
                  Fonte d’epoca: {weapon.eraRadiusLabel}. Il modello, sul VIIC a 75 m e al traverso, dà {n(referenceRadius(weapon), 1)} m.
                </p>
              )}

              <Schematic input={input} result={computed.data} />

              <Interior input={input} result={computed.data} selected={selected} onSelect={select} />

              <h3 className="meta">Druckkörper</h3>
              {computed.data.compartments.map((c) => (
                <button key={c.id} type="button" className="comp" data-on={selected === c.id} onClick={() => select(c.id)}>
                  <strong>
                    {c.name} · {LEVEL_LABEL[c.level]}
                  </strong>
                  <span className="bar" aria-hidden>
                    <i data-bad={c.level === "rottura" || c.level === "allagamento"} style={{ width: `${Math.min(100, c.severity * 100)}%` }} />
                  </span>
                  <small>
                    {c.note} {c.systems.join(", ")}.
                  </small>
                </button>
              ))}

              <FloodRead flood={computed.data.flood} />

              <h3 className="meta">Fasciame esterno</h3>
              {computed.data.zones.map((z) => (
                <div key={z.id} className="comp">
                  <strong>
                    {z.name} · {LEVEL_LABEL[z.level]}
                  </strong>
                  <span className="bar" aria-hidden>
                    <i data-bad={levelOf(z.severity) === "rottura" || levelOf(z.severity) === "allagamento"} style={{ width: `${Math.min(100, z.severity * 100)}%` }} />
                  </span>
                </div>
              ))}

              <div className="paper">
                <h3>Onda d’urto</h3>
                {computed.data.wave.passes.length === 0 ? (
                  <p>Nessuno scoppio in acqua. Senza bolla non c’è fronte: un urto meccanico o un colpo a vuoto non propagano questa onda.</p>
                ) : (
                  <>
                    <p>
                      Fronte a {n(computed.data.wave.c, 0)} m/s. A schermo è rallentato di circa {n(computed.data.wave.slow, 0)} volte, altrimenti i{" "}
                      {n(computed.data.wave.passes[0].travelMs, 1)} ms fino al cilindro non si vedono. Sotto il metro Cole è solo un ordine di grandezza.
                    </p>
                    {computed.data.wave.passes.slice(0, 4).map((p) => (
                      <p key={p.id}>
                        {p.id}: {n(p.slantM, 1)} m dal Druckkörper, arrivo in {n(p.travelMs, 2)} ms, picco {n(p.peakMPa, 1)} MPa, coda {n(p.thetaMs, 2)} ms.
                        Sulla parete rigida, circa {n(p.wallMPa, 1)} MPa.
                      </p>
                    ))}
                    <p className="note">
                      Il raddoppio è il limite acustico di una parete rigida, non la diffrazione su torre e casse.
                    </p>
                    <InitialRead result={computed.data} />
                  </>
                )}
              </div>

              <BubbleRead charges={computed.data.charges} weq={computed.data.weq} />

              <div className="paper">
                <h3>Pressione di picco e effetto</h3>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computed.data.coleSeries}>
                      <XAxis dataKey="r" stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} unit=" m" />
                      <YAxis stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} unit=" MPa" width={56} />
                      <Tooltip />
                      <Line type="monotone" dataKey="p" name="Cole" stroke="#b5523a" dot={false} strokeWidth={2} />
                      {computed.data.markerR != null && <ReferenceLine x={Math.round(computed.data.markerR)} stroke="#8c7040" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computed.data.effectSeries}>
                      <XAxis dataKey="r" stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} unit=" m" />
                      <YAxis stroke="#1c1914" tick={{ fill: "#1c1914", fontSize: 11 }} domain={[0, 1]} width={32} />
                      <Tooltip />
                      <Line type="monotone" dataKey="s" name="Effetto" stroke="#8c7040" dot={false} strokeWidth={2} />
                      <ReferenceLine x={Math.round(computed.data.rSplitBeam)} stroke="#b5523a" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="note" style={{ color: "inherit" }}>
                  In alto la pressione di Cole per questa carica. In basso l’effetto sul Druckkörper alla scala di questo scafo e di questa quota. La riga verticale è il raggio di rottura al traverso
                  {computed.data.markerR != null ? `, e sul primo grafico la distanza reale della carica più vicina (${n(computed.data.markerR, 1)} m)` : ""}.
                </p>
                <ColeRead weq={computed.data.weq} r={computed.data.markerR ?? computed.data.rSplitBeam} hasHit={computed.data.markerR != null} />
              </div>

              <table className="factors">
                <tbody>
                  {computed.data.factors.map((f) => (
                    <tr key={f.k}>
                      <th>{f.k}</th>
                      <td>{f.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="adv">
                <summary>
                  Singole cariche ({computed.data.charges.length})
                </summary>
                <ol>
                  {computed.data.charges.map((c) => (
                    <li key={c.id}>
                      {c.id} · {c.yield === "full" ? "scoppio" : c.yield === "mechanical" ? "urto" : "a vuoto"} · {n(c.depthM, 0)} m · {n(c.slantPh, 1)} m dal Druckkörper. {c.reason}
                    </li>
                  ))}
                </ol>
              </details>
              <p className="note">
                Modello di studio da letteratura aperta. Non è uno strumento operativo e non descrive battelli successivi al 1945. Trascina lo scafo per girargli attorno; tocca il fasciame per scegliere un locale.
              </p>
            </section>
          </div>
        </div>
      )}
      {tab === "studio" && !computed.ok && <p className="lede">{computed.error}</p>}
    </div>
  );
}
