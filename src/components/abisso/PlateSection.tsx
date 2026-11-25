import { n } from "@/sim/model";

/**
 * Sezione longitudinale di tre campate del Druckkörper: ordinate ferme, lamiera che
 * rientra fra l'una e l'altra con il profilo sin² usato nello shader. Al vero: stessa
 * scala in orizzontale e in verticale, così la freccia si confronta con lo spessore.
 */
export function PlateSection({ frameM, thicknessM, deflectionM, beyond }: { frameM: number; thicknessM: number; deflectionM: number; beyond: boolean }) {
  const bays = 3;
  const W = 360;
  const pad = 14;
  const k = (W - 2 * pad) / (bays * frameM); // px per metro
  const t = thicknessM * k;
  const d = Math.min(deflectionM, frameM * 0.45) * k;
  const webH = 0.2 * k; // ordinata a bulbo, circa 200 mm
  const y0 = 34;
  const H = y0 + t + Math.max(d, 0) + webH + 46;
  const pts = (off: number) => {
    const out: string[] = [];
    for (let i = 0; i <= bays * 40; i++) {
      const x = (i / 40) * frameM;
      const s = Math.sin((Math.PI * x) / frameM);
      out.push(`${(pad + x * k).toFixed(1)},${(y0 + off + d * s * s).toFixed(1)}`);
    }
    return out;
  };
  const top = pts(0);
  const bot = pts(t).reverse();
  return (
    <figure className="plate-section">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sezione della lamiera fra le ordinate">
        <text x={pad} y={14} className="ps-label">
          mare (carico)
        </text>
        {[0.5, 1.5, 2.5].map((b) => (
          <path key={b} d={`M ${pad + b * frameM * k} 18 v 10 m -3 -5 l 3 5 l 3 -5`} className="ps-arrow" />
        ))}
        {/* Lamiera indeformata, tratteggiata. */}
        <line x1={pad} x2={W - pad} y1={y0} y2={y0} className="ps-ghost" />
        <polygon points={[...top, ...bot].join(" ")} className="ps-plate" />
        {Array.from({ length: bays + 1 }, (_, i) => {
          const x = pad + i * frameM * k;
          return (
            <g key={i}>
              <rect x={x - 2} y={y0 + t} width={4} height={webH} className="ps-frame" />
              <circle cx={x} cy={y0 + t + webH} r={5} className="ps-frame" />
            </g>
          );
        })}
        {/* Quote: passo e freccia. */}
        <path d={`M ${pad} ${H - 14} H ${pad + frameM * k} M ${pad} ${H - 19} v 10 M ${pad + frameM * k} ${H - 19} v 10`} className="ps-dim" />
        <text x={pad + (frameM * k) / 2} y={H - 20} textAnchor="middle" className="ps-label">
          passo {n(frameM * 1000, 0)} mm
        </text>
        <path d={`M ${pad + 1.5 * frameM * k} ${y0} v ${d}`} className="ps-dim" />
        <text x={pad + 1.5 * frameM * k + 6} y={y0 + t + d + 14} className="ps-label">
          freccia {n(deflectionM * 1000, 0)} mm
        </text>
        <text x={W - pad} y={H - 20} textAnchor="end" className="ps-label">
          interno · lamiera {n(thicknessM * 1000, 1)} mm
        </text>
      </svg>
      <figcaption>
        Sezione lungo lo scafo, al vero: tre campate, ordinate ferme, lamiera che rientra (profilo sin², lo stesso del modello
        3D).{beyond ? " Oltre il campo delle prove: forma indicativa, la lamiera reale si strapperebbe." : ""}
      </figcaption>
    </figure>
  );
}
