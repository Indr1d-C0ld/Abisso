import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import type { SimResult } from "@/sim/model";
import { stationRadii } from "@/sim/shape";

export function Schematic({ input, result }: { input: SimInput; result: SimResult }) {
  const boat = boatById(input.boatId);
  const w = 640;
  const h = 250;
  const pad = 28;
  const depths = [input.axisDepth, input.burstDepth, boat.collapseM, ...result.charges.map((c) => c.depthM), 20];
  const maxD = Math.max(...depths) + 12;
  const x0 = -boat.loa / 2 - 24;
  const x1 = boat.loa / 2 + 24;
  const X = (x: number) => pad + ((x - x0) / (x1 - x0)) * (w - pad * 2);
  const Y = (d: number) => pad + (d / maxD) * (h - pad * 2);
  const upper: string[] = [];
  const lower: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const s = stationRadii(boat, i / 40);
    upper.push(`${X(s.x).toFixed(1)},${Y(input.axisDepth - s.deck).toFixed(1)}`);
    lower.push(`${X(s.x).toFixed(1)},${Y(input.axisDepth + s.ry).toFixed(1)}`);
  }
  const profile = [...upper, ...lower.reverse()].join(" ");
  const zMax = Math.max(30, boat.beam, ...result.charges.map((c) => Math.abs(c.z))) + 6;
  const Z = (z: number) => pad + ((z + zMax) / (2 * zMax)) * (w - pad * 2);
  const plan: string[] = [];
  for (let i = 0; i <= 36; i++) {
    const s = stationRadii(boat, i / 36);
    plan.push(`${X(s.x).toFixed(1)},${Z(s.rx * 0.92).toFixed(1)}`);
  }
  for (let i = 36; i >= 0; i--) {
    const s = stationRadii(boat, i / 36);
    plan.push(`${X(s.x).toFixed(1)},${Z(-s.rx * 0.92).toFixed(1)}`);
  }
  return (
    <div className="paper">
      <h3>Geometria dell’attacco</h3>
      <p className="note" style={{ color: "inherit" }}>
        Profilo: la profondità cresce verso il basso. La sagoma è l’inviluppo del modello, messa alla quota dell’asse. Pianta: prua a destra, dritta in basso.
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Profilo di profondità del battello e delle cariche">
        <rect width={w} height={h} fill="#efe6d2" />
        <line x1={pad} y1={Y(0)} x2={w - pad} y2={Y(0)} stroke="#1c1914" strokeWidth="1" />
        <text x={pad} y={Y(0) - 4} fill="#1c1914" fontSize="11">
          superficie
        </text>
        <line x1={pad} y1={Y(boat.collapseM)} x2={w - pad} y2={Y(boat.collapseM)} stroke="#b5523a" strokeDasharray="4 3" />
        <text x={pad} y={Y(boat.collapseM) - 4} fill="#b5523a" fontSize="11">
          collasso di calcolo
        </text>
        <polygon points={profile} fill="#1c1914" opacity="0.88" />
        {result.charges.map((c) => (
          <g key={c.id}>
            <circle cx={X(c.x)} cy={Y(c.depthM)} r={c.yield === "full" ? 5 : 3} fill={c.yield === "full" ? "#b5523a" : "#8c7040"} />
          </g>
        ))}
      </svg>
      <svg viewBox={`0 0 ${w} 180`} role="img" aria-label="Pianta dello schema">
        <rect width={w} height="180" fill="#efe6d2" />
        <polygon points={plan.join(" ")} fill="none" stroke="#1c1914" strokeWidth="1.4" />
        {result.charges.map((c) => (
          <circle key={c.id} cx={X(c.x)} cy={Z(c.z)} r={c.yield === "none" ? 3 : 4.5} fill={c.yield === "full" ? "#b5523a" : "#8c7040"} />
        ))}
        <text x={w - pad - 70} y="18" fill="#1c1914" fontSize="11">
          prua →
        </text>
      </svg>
    </div>
  );
}
