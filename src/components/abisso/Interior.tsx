import { boatById } from "@/data/boats";
import { compartmentNote, FAMILY_STRUCTURE } from "@/data/interior";
import type { SimInput } from "@/data/types";
import { LEVEL_LABEL, n, type SimResult } from "@/sim/model";

export function Interior({
  input,
  result,
  selected,
  onSelect,
}: {
  input: SimInput;
  result: SimResult;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const boat = boatById(input.boatId);
  const structure = FAMILY_STRUCTURE[boat.family];
  const focus = result.compartments.find((c) => c.id === selected) ?? result.compartments.slice().sort((a, b) => b.severity - a.severity)[0];
  const w = 680;
  const h = 168;
  const pad = 16;
  const half = boat.phLength / 2;
  const X = (x: number) => pad + ((x + half) / boat.phLength) * (w - pad * 2);
  const r = 46;
  const cy = 78;

  return (
    <div className="interior">
      <p className="meta">Struttura interna</p>
      <h3>
        {structure.title}
      </h3>
      {structure.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <table className="factors">
        <tbody>
          <tr>
            <th>Druckkörper</th>
            <td>
              {boat.phKnown ? "" : "circa "}
              {n(boat.phLength, 1)} × ⌀ {n(boat.phDiameter, 2)} m
            </td>
          </tr>
          <tr>
            <th>Lamiera</th>
            <td>{n(boat.plateMm, 1)} mm</td>
          </tr>
          <tr>
            <th>Fuori, non stagno</th>
            <td>
              baglio {n(boat.beam, 2)} m
            </td>
          </tr>
        </tbody>
      </table>
      <svg className="section-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Sezione longitudinale del corpo resistente, da poppa a prua">
        <rect width={w} height={h} fill="#e7dcc6" />
        {result.compartments.map((c) => (
          <rect
            key={c.id}
            x={X(c.x0)}
            y={cy - r}
            width={Math.max(2, X(c.x1) - X(c.x0))}
            height={r * 2}
            data-level={c.level}
            data-on={focus?.id === c.id}
            onClick={() => onSelect(c.id)}
          />
        ))}
        <rect x={X(-half)} y={cy - r} width={w - pad * 2} height={r * 2} fill="none" stroke="#1c1914" strokeWidth="1.6" />
        <text x={pad} y={22} fill="#1c1914" fontSize="12">
          poppa
        </text>
        <text x={w - pad} y={22} fill="#1c1914" fontSize="12" textAnchor="end">
          prua
        </text>
        <text x={pad} y={h - 8} fill="#1c1914" fontSize="11">
          {boat.phKnown ? "" : "lunghezza stimata · "}
          {n(boat.phLength, 1)} m di corpo resistente
        </text>
      </svg>
      <p className="note">Il colore è il danno sul Druckkörper, non sul fasciame. Tocca un tratto o un locale nell’elenco.</p>
      {focus && (
        <div className="focus">
          <strong>
            {focus.name} · {LEVEL_LABEL[focus.level]}
          </strong>
          <p>
            Da {n(focus.x0 + half, 1)} a {n(focus.x1 + half, 1)} m dalla paratia poppiera del corpo resistente (
            {n(focus.x1 - focus.x0, 1)} m). Indice {n(focus.severity, 2)}.
          </p>
          <p>{compartmentNote(boat.family, focus.id)}</p>
          <p>{focus.note}</p>
          <p>Dentro: {focus.systems.join(", ")}.</p>
        </div>
      )}
      <p className="note">
        Schema di paratie per la famiglia {boat.family}, non il piano di {boat.name}. {boat.plateNote}
      </p>
    </div>
  );
}
