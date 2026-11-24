import type { BatteryReport, BatteryState } from "@/data/batteries";
import { n } from "@/sim/model";

const STATE: Record<BatteryState, string> = {
  integro: "Integro",
  scossa: "Scossa sui vasetti",
  cloro: "Acqua sulle celle",
  perso: "Gruppo perso",
};

export function Batteries({ report }: { report: BatteryReport }) {
  return (
    <div className="batteries">
      <h3 className="meta">Batterie</h3>
      <p>
        {report.groups}. Di catalogo, a 20 ore: {report.catalog}. Carica in uso, per convenzione: {n(report.left * 100, 0)}%.
      </p>
      <span className="bar" aria-hidden>
        <i data-bad={report.chlorine || report.left < 0.5} style={{ width: `${report.left * 100}%` }} />
      </span>
      <p>{report.place}</p>
      {report.banks.map((b) => (
        <div key={b.id} className="comp" data-on={b.state === "cloro" || b.state === "perso"}>
          <strong>
            {b.name} · {STATE[b.state]}
          </strong>
          <small>{b.sentence}</small>
        </div>
      ))}
      <p>{report.summary}</p>
      <p className="note">
        Numero di celle e amperora: produzione AFA 1935–1945, come tabulata da uboat.net. La metà lasciata a un gruppo solo scosso non è un conteggio di vasetti rotti.
      </p>
    </div>
  );
}
