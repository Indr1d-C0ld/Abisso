import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import { weaponById } from "@/data/weapons";
import { n, type SimResult } from "@/sim/model";
import { buildTimeline } from "@/sim/timeline";

function fate(input: SimInput, result: SimResult) {
  const h = buildTimeline(input, result).hydro;
  const peak = h.samples.reduce((m, s) => Math.max(m, Math.abs(s.pitch)), 0);
  const end = h.samples[h.samples.length - 1];
  let text = "resta a quota";
  if (h.already) text = "già oltre il collasso";
  else if (result.flood.dry) text = "asciutto";
  else if (h.tCollapse !== null) text = `implode dopo ${n(h.tCollapse, 0)} s`;
  else if (h.tSurface !== null) text = `emerge dopo ${n(h.tSurface, 0)} s`;
  return { text, peakDeg: (peak * 180) / Math.PI, waterT: end.waterT };
}

/** Confronto di due casi (Fase 5): le stesse grandezze, una colonna per caso. */
export function CompareRead({ a, b }: { a: { title: string; input: SimInput; result: SimResult }; b: { title: string; input: SimInput; result: SimResult } }) {
  const col = (c: typeof a) => {
    const boat = boatById(c.input.boatId);
    const weapon = weaponById(c.input.weaponId);
    const near = [...c.result.charges].filter((x) => x.yield !== "none").sort((x, y) => x.slantPh - y.slantPh)[0];
    const f = fate(c.input, c.result);
    const open = c.result.compartments.filter((x) => x.level === "allagamento" || x.level === "rottura").length;
    return [
      boat.name,
      weapon.short,
      `${n(c.input.axisDepth, 0)} m`,
      near ? `${n(near.slantPh, 1)} m` : "nessuno scoppio",
      `${n(c.result.rSplitBeam, 1)} m`,
      c.result.outcomeLabel,
      `${open} di ${c.result.compartments.length}`,
      `${n(f.waterT, 0)} t`,
      `${n(f.peakDeg, 0)}°`,
      f.text,
    ];
  };
  const rows = ["Battello", "Arma", "Quota dell'asse", "Carica più vicina al corpo resistente", "Raggio di rottura al traverso", "Esito", "Locali allagati o rotti", "Acqua imbarcata", "Assetto massimo", "Sorte"];
  const ca = col(a);
  const cb = col(b);
  return (
    <div className="paper">
      <h3>Confronto</h3>
      <table className="compare">
        <thead>
          <tr>
            <th />
            <th>{a.title}</th>
            <th>{b.title}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r} data-diff={ca[i] !== cb[i]}>
              <th>{r}</th>
              <td>{ca[i]}</td>
              <td>{cb[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note" style={{ color: "inherit" }}>
        Le due viste condividono camera e barra del tempo. Le fasi hanno la stessa durata a schermo ma tempi reali diversi: ogni
        caso segue la propria ricostruzione. Le righe che differiscono sono evidenziate.
      </p>
    </div>
  );
}
