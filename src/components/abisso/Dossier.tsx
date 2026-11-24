import { ALL_BOATS, BIBLIO, boatById } from "@/data/boats";
import { WEAPONS } from "@/data/weapons";
import { n, referenceRadius } from "@/sim/model";
import { outerPoint, stationRadii } from "@/sim/shape";
import { useState } from "react";

const SECTION_IDS = ["ii-b", "vii-c", "ix-c", "xb", "xxi"] as const;

function Sections() {
  const w = 760;
  const h = 210;
  const sc = 11;
  return (
    <figure className="figure">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Sezioni maestre delle cinque famiglie, stessa scala">
        <rect width={w} height={h} fill="#e7dcc6" />
        {SECTION_IDS.map((id, i) => {
          const boat = boatById(id);
          const cx = 78 + i * 148;
          const cy = 104;
          const pts: string[] = [];
          for (let k = 0; k <= 64; k++) {
            const p = outerPoint(boat, 0.5, (k / 64) * Math.PI * 2);
            pts.push(`${(cx + p.z * sc).toFixed(1)},${(cy - p.y * sc).toFixed(1)}`);
          }
          const s = stationRadii(boat, 0.5);
          return (
            <g key={id}>
              <polygon points={pts.join(" ")} fill="#8d9788" stroke="#1c1914" strokeWidth="1.4" />
              <circle cx={cx} cy={cy} r={s.phr * sc} fill="none" stroke="#1c1914" strokeDasharray="3 2" />
              <text x={cx} y={196} textAnchor="middle" fill="#1c1914" fontSize="13">
                {boat.klass}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        Sezioni maestre alla stessa scala, generate dal modello. Il tratteggio è il Druckkörper. Il Tipo XXI è strozzato in vita per suggerire l’otto vero, che in cantiere è un lobo superiore e uno inferiore: l’inviluppo non è quel disegno di lamiera. Il Tipo XB è largo fuori e stretto dentro: i pozzi mina stanno nel fasciame, non nel corpo resistente.
      </figcaption>
    </figure>
  );
}

export function Method() {
  return (
    <article className="dossier">
      <p className="kicker">Come è fatto il numero</p>
      <h2>Metodo</h2>
      <p>
        Non è un codice idrodinamico e non è un’arma. È una ricostruzione proporzionale, ancorata a stime pubblicate, pensata per vedere <em>quali</em> fattori spostano il verdetto. Ogni numero del rapporto esce da questa pagina. Se una fonte tace, il modello lo dice invece di inventare una precisione.
      </p>
      <h3>1. Pressione di picco</h3>
      <p className="formula">P = 52,16 · (W<sup>1/3</sup> / R)<sup>1,13</sup> MPa</p>
      <p>
        W in chilogrammi di TNT equivalente, R in metri. È la similitudine di Cole per un’esplosione subacquea di TNT, nella forma ingegneristica del dopoguerra. Vale nel campo usuale della distanza scalata; sotto il metro è solo un ordine di grandezza. L’impulso mostrato a fianco, P·θ con θ ≈ 0,084 ms · W<sup>1/3</sup> · (R/W<sup>1/3</sup>)<sup>0,23</sup>, è diagnostico: il verdetto non lo usa da solo. Il fronte, nello studio, viaggia a 1 490 m/s: un ordine di grandezza per l’acqua di mare, non un profilo misurato. Sul cilindro trattato come parete rigida la pressione incidente circa raddoppia. Non è la diffrazione intorno a torre e casse, e non è la bolla di gas, che si muove in secondi.
      </p>
      <p>
        Il 52,16 è il picco, in MPa, quando la distanza scalata Z = R / W<sup>1/3</sup> vale 1. La forma di Cole in psi, libbre e piedi, con costante circa 2,16×10<sup>4</sup>, portata al sistema metrico resta intorno a 52 MPa: lo scarto fra costanti pubblicate è di qualche punto, meno dell’incertezza sul punto d’arrivo. L’esponente 1,13 è misurato, non dedotto da una legge. Il dieci per cento di distanza in più toglie circa il dieci per cento di pressione; il dieci per cento di carica in più ne aggiunge circa il quattro, perché W entra solo come W<sup>0,377</sup>. La quota non sta nell’equazione. Due scoppi con lo stesso Z hanno lo stesso picco. Lo studio, a fianco, scompone la formula sulla carica aperta.
      </p>
      <p>
        L’onda iniziale, dopo il salto, è P(t) = P · e<sup>−t/θ</sup>. La salita non è nel modello: è più breve di θ di ordini di grandezza. L’integrale della coda è l’impulso P·θ; in un θ ne passa il 63%, in tre θ il 95%. Lo spessore della pelle è c·θ, di solito meno di un metro. La pulsazione della bolla arriva un periodo di Willis più tardi, e non è questa curva.
      </p>
      <h3>2. L’ancora storica</h3>
      <p>
        La Royal Navy stimò che il Mark VII da 290 lb di amatol fendesse un fasciame da circa 22 mm a 20 piedi (6,1 m) e potesse costringere un battello in superficie a circa 40 piedi. Con Torpex o Minol, a fine 1942, quelle distanze divennero 26 e 52 piedi. Il modello fissa la rottura del Tipo VIIC — 18,5 mm, diametro 4,70 m, quota 75 m, scoppio al traverso — sui 6,1 m dell’amatol. La curva degli effetti è costruita su quei due punti: rottura a 1×, allagamento grave a 2×, scossa oltre, niente oltre circa 7×.
      </p>
      <p>
        Il solo equivalente TNT (amatol 0,85, TNT 1, Torpex e Minol 1,5) alzerebbe il raggio del Mark VII «nuovo» di circa il 21%. La stima RN parla di +30%. Il fattore di servizio sul raggio, {n(1.3 / Math.cbrt(1.5 / 0.85), 2)}, chiude quello scarto per Torpex e Minol e solo per loro. È una calibrazione, ed è dichiarata.
      </p>
      <h3>3. Scafo e quota</h3>
      <p className="formula">R = 6,1 · (W / W*)<sup>1/3</sup> · S<sub>servizio</sub> · S<sub>scafo</sub> · S<sub>quota</sub> · S<sub>aspetto</sub></p>
      <p>
        S<sub>scafo</sub> viene dalla tensione circonferenziale, proporzionale al diametro e inversa allo spessore. Uno scafo più spesso o più stretto ha un raggio letale minore, con esponente 1/1,13 perché la pressione cade così con la distanza.
      </p>
      <p>
        S<sub>quota</sub> è il precarico. La pressione assoluta alla quota dell’asse, rapportata alla pressione di collasso del battello, si confronta con il VIIC a 75 m (collasso di calcolo 250 m). Più il battello è già «consumato» dalla profondità, più la stessa carica morde. La scala è limitata a 2,2: oltre, la calibrazione non ha più dati. Se la quota supera il collasso, il verdetto è il collasso idrostatico, prima della carica.
      </p>
      <h3>4. Sotto la chiglia</h3>
      <p>
        Una carica più bassa della chiglia, entro 8 m dal piano di simmetria e non troppo a prua o a poppa, prende +0,25 sul moltiplicatore: è il colpo che imbarca lo scafo, la frustata, non solo l’urto laterale. Se la bolla massima — R<sub>b</sub> ≈ 3,38 · W<sup>1/3</sup> / (H + 10,1)<sup>1/3</sup> — lambisce la chiglia, si aggiunge 0,12. Il tetto è 1,34. La costante della bolla è un ordine di grandezza di similitudine, non una legge unica. Il 3,38 metro è la trascrizione di una forma in piedi, circa 12,7 · W<sup>1/3</sup> / (Z + 33)<sup>1/3</sup>.
      </p>
      <p>
        Il primo periodo, formula di Willis, è T ≈ 2,11 · W<sup>1/3</sup> / (H + 10,1)<sup>5/6</sup> secondi. È lo stesso ordine del tempo di collasso di Rayleigh per quel raggio: le costanti pubblicate si scostano di decine di percento. Il massimo sta circa a metà periodo. Più fondo, la bolla è più piccola e il periodo cade più in fretta del raggio, perché la pressione assoluta entra alla 5/6. Lo studio non calcola la risalita né il getto del collasso contro la chiglia. Il +0,12 è solo «la sfera del primo massimo arriva al fasciame», con un 15% di margine. Il +0,25 della frustata non dipende da R<sub>b</sub>.
      </p>
      <h3>5. La carica non attraversa il battello</h3>
      <p>
        Il Mark VII e i suoi parenti hanno spoletta idrostatica, non a contatto. Se la traiettoria verticale incontra lo scafo prima della quota impostata, succedono due cose diverse. Dentro la finestra di armamento (di base 8 m: la spoletta è già quasi alla sua pressione) il modello fa esplodere la carica sulla lamiera. Più in alto è un urto meccanico, senza bolla: falle locali possibili, non la rottura da scoppio. La finestra è un’ipotesi di studio, ed è un cursore.
      </p>
      <p>
        L’Hedgehog è l’opposto. Ventiquattro colpi, spoletta a contatto: o urtano, o non esiste esplosione. Per questo non acceca l’ecogoniometro. Lo Squid esplode comunque, a orologeria, sul triangolo di circa 37 m di lato. Il baricentro del triangolo non è il punto letale: su un VII lungo il vertice di prua cade spesso sullo scafo, i due colpi laterali no.
      </p>
      <h3>6. Rivestimento, nafta, batterie</h3>
      <p>
        Il fasciame esterno e le casse non sono il Druckkörper. Il loro raggio efficace è 2,15 volte quello del corpo resistente: cedono prima, e mandano nafta in superficie anche quando l’equipaggio è ancora in quota. È il falso positivo classico delle cacce. Le batterie stanno sotto il pagliolato, nel punto più basso del locale. Una scossa può fessurare i vasetti senza cloro. Una falla, già, bagna le celle: cloruri sull’acido, cloro nel pozzo, e quel gruppo si stacca. L’allagamento lo perde del tutto. Il cloro non ribalta da solo il verdetto dello scafo: nelle cacce lunghe ha fatto venire a galla battelli ancora stagni, e il rapporto lo scrive accanto, non al posto della lamiera. Celle e amperora vengono dalla tabella AFA riportata da uboat.net, non da un collaudo.
      </p>
      <h3>7. Allagamento nel tempo</h3>
      <p>
        Il verdetto è lo stato finale del compartimento. L’orologio è un’altra cosa: Q = 0,62 · A · √(2 g H), con H la quota dell’asse. Il volume è il cilindro del Druckkörper per la lunghezza del locale, ridotto al 65% perché le macchine occupano il resto. Le aree — 8 cm² una falla, 80 uno squarcio da allagamento, 400 una rottura — sono ipotesi di studio, non rilievi. Il tempo è inversamente proporzionale all’area: la fascia è un fattore tre. Se l’aria sfoga, il locale va pieno. Se resta intrappolata, l’ingresso si ferma quando la pressione interna eguaglia quella esterna, a 1 − 1/P. Le tonnellate si confrontano con la differenza tra dislocamento in immersione e in superficie: è una scala, non un calcolo di assetto. Le pompe non sono in cifra, perché una portata in metri cubi l’ora non tiene una falla in metri cubi al minuto.
      </p>
      <h3>8. Il verdetto</h3>
      <ul>
        <li>Rottura di un compartimento, o allagamento di due: perdita probabile.</li>
        <li>Un solo compartimento allagato, fasciame non aperto: danno grave. Qualche battello è tornato con un locale perso. Non è la regola, e non è impossibile.</li>
        <li>Falle contenibili: danno serio.</li>
        <li>Solo scossa: il battello può restare in quota.</li>
      </ul>
      <p>
        La fascia ±20% / +25% sul raggio non entra nel colore dello scafo. Sta scritta perché corrosione, tolleranze di cantiere e resa reale dell’esplosivo non stanno in una cifra sola. Le prove americane del Mark 6 (30 / 60 / 90 piedi) sono mostrate come confronto e non guidano il verdetto: furono ottimistiche.
      </p>
      <h3>Cosa il modello non fa</h3>
      <p>
        Non calcola la frustata modale dello scafo, non distingue saldatura e chiodatura piastra per piastra, non sa se quel giorno il battello aveva già una falla. L’orologio dell’allagamento non è una stabilità: l’area del foro è scelta, non misurata. La geometria tridimensionale è un inviluppo didattico: per il VIIC rispetta lunghezza, baglio, pescaggio e Druckkörper 50,50 × 4,70 m. Il Tipo XXI vero ha sezione a otto; qui si vede l’inviluppo, e il testo lo dice. I compartimenti sono lo schema delle paratie, non un piano di cantiere.
      </p>
    </article>
  );
}

export function Archive() {
  const [id, setId] = useState("u96");
  const [wid, setWid] = useState("mk7-heavy-torpex");
  const boat = boatById(id);
  const weapon = WEAPONS.find((w) => w.id === wid) ?? WEAPONS[0];
  const radius = referenceRadius(weapon);
  return (
    <article className="dossier">
      <p className="kicker">Schede</p>
      <h2>Archivio</h2>
      <p>
        Classi e battelli che il modello sa costruire, e gli ordigni con cui li si può colpire. Le fotografie sono d’epoca e di dominio pubblico. Le tavole degli ordigni sono ricostruzioni fatte per questo studio: non sono reperti, e non vanno citate come fotografie.
      </p>

      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/viic-plan.jpg`} alt="Piano generale di un U-Boot Tipo VIIC, disegno tecnico della Marina statunitense" loading="lazy" />
        <figcaption>
          Piano generale di un Tipo VIIC. David W. Taylor Model Basin, US Navy, rilievo legato all’U-570 catturato nel 1941 (poi HMS Graph). Dominio pubblico statunitense. È il disegno di riferimento dell’archivio: centrale sotto la torre, batterie a prua e a poppa, diesel, elettrici, tubi.
        </figcaption>
      </figure>
      <Sections />
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/xxi-section.jpg`} alt="Sezioni di cantiere di un Tipo XXI, con corpo resistente a otto e fasciame esterno" loading="lazy" />
        <figcaption>
          Sezioni di un Tipo XXI in cantiere, 1944. Si vede l’otto: lobo superiore, interponte, lobo delle batterie, fasciame esterno. Autore anonimo, fotografia di dominio pubblico (collezione US Navy NH 96364, via Wikimedia Commons). È il documento che il modello non pretende di sostituire.
        </figcaption>
      </figure>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/xxi-hamburg.jpg`} alt="Due Tipo XXI pronti al varo ad Amburgo" loading="lazy" />
        <figcaption>
          Due Tipo XXI sullo scalo ad Amburgo. Fotografia ufficiale della Royal Air Force, IWM CL 2747, Crown Copyright scaduto. La torre è una vela lunga, non la torretta a gradino del VII.
        </figcaption>
      </figure>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/u625.jpg`} alt="Esplosioni di cariche di profondità attorno alla poppa dell'U-625, 10 marzo 1944" loading="lazy" />
        <figcaption>
          U-625, 10 marzo 1944. Cariche sganciate da un Sunderland del 422 Squadron RCAF. Il battello si inabissò, riemerse circa novanta minuti dopo e fu abbandonato. Fotografia di equipaggio; public domain (governo britannico). Quello che si vede in superficie è la bolla che sfiata, non «il raggio letale».
        </figcaption>
      </figure>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/u426.jpg`} alt="U-426, Tipo VIIC, che affonda di poppa dopo l'attacco di un Sunderland, 8 gennaio 1944" loading="lazy" />
        <figcaption>
          U-426, Tipo VIIC, 8 gennaio 1944, già a picco di poppa dopo l’attacco di un Sunderland. IWM C 4081, Crown Copyright scaduto. La perdita qui è aerea: bombe di profondità, non il bidone di poppa di un cacciatorpediniere. Il modello di questa piattaforma tratta le armi di nave.
        </figcaption>
      </figure>

      <div className="field">
        <span>Battello o classe</span>
        <select className="select" value={id} onChange={(e) => setId(e.target.value)} aria-label="Scegli la scheda">
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
      </div>

      <h2>{boat.name}</h2>
      <p>{boat.blurb}</p>
      {boat.fate && <p><strong>Esito storico. </strong>{boat.fate}</p>}
      <table className="factors">
        <tbody>
          <tr><th>Classe</th><td>{boat.klass}</td></tr>
          <tr><th>Dimensioni</th><td>{n(boat.loa, 2)} × {n(boat.beam, 2)} × {n(boat.draft, 2)} m</td></tr>
          <tr><th>Dislocamento</th><td>{boat.dispSurf} / {boat.dispSub} t</td></tr>
          <tr><th>Velocità</th><td>{n(boat.speedSurf, 1)} / {n(boat.speedSub, 1)} nodi</td></tr>
          <tr><th>Autonomia</th><td>{boat.rangeNm.toLocaleString("it-IT")} nm a {boat.rangeKn} nodi; {boat.rangeSubNm} nm in immersione</td></tr>
          <tr><th>Druckkörper</th><td>{boat.phKnown ? "" : "circa "}{n(boat.phLength, 1)} × ⌀ {n(boat.phDiameter, 2)} m, lamiera {n(boat.plateMm, 1)} mm</td></tr>
          <tr><th>Quote</th><td>progetto {boat.constructionM} m · prova {boat.testM} m · collasso di modello {boat.collapseM} m</td></tr>
          <tr><th>Armamento</th><td>{boat.tubes}</td></tr>
          <tr><th>Apparato</th><td>{boat.power}</td></tr>
          <tr><th>Equipaggio</th><td>{boat.crew}</td></tr>
        </tbody>
      </table>
      <p>{boat.plateNote}</p>
      <p>{boat.depthNote}</p>
      <h3>Locali, da poppa a prua</h3>
      <ul>
        {boat.compartments.map((c) => (
          <li key={c.id}>
            <strong>{c.name}.</strong> {c.systems.join(", ")}
            {c.battery ? " — locale batterie." : ""}
          </li>
        ))}
      </ul>

      <h2>Ordigni</h2>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/mk7-dianthus.jpg`} alt="Carica di profondità Mark VII issata sul lanciatore della corvetta HMS Dianthus, 1942" loading="lazy" />
        <figcaption>
          Mark VII sul lanciatore Mark IV della corvetta HMS Dianthus, 14 agosto 1942. Fotografia ufficiale della Royal Navy (H. W. J. Tomlin, IWM A 11948), dominio pubblico. Il bidone, la testa della spoletta e la culla si vedono meglio qui che in qualsiasi schema.
        </figcaption>
      </figure>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/mk7.jpg`} alt="Ricostruzione di studio di una carica di profondità Mark VII sul ponte di un molo" loading="lazy" />
        <figcaption>
          Mark VII, ricostruzione di studio: bidone, spoletta idrostatica in testa, zavorra. Non è una fotografia d’epoca e non è un rilievo metrologico.
        </figcaption>
      </figure>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/mortars.jpg`} alt="Ricostruzione di un proietto Hedgehog e di una bomba Squid" loading="lazy" />
        <figcaption>
          A sinistra un proietto Hedgehog, a destra la bomba dello Squid, in scala approssimata. Ricostruzione di studio, senza marche di fabbrica.
        </figcaption>
      </figure>
      <figure className="figure">
        <img src={`${import.meta.env.BASE_URL}archive/mk9.jpg`} alt="Ricostruzione di una carica americana Mark 9 a goccia con pinne" loading="lazy" />
        <figcaption>
          Mark 9 americano, forma a goccia e pinne, pensata per scendere in fretta dentro le stesse rotaie del Mark 6. Ricostruzione di studio.
        </figcaption>
      </figure>

      <div className="field">
        <span>Ordigno</span>
        <select className="select" value={weapon.id} onChange={(e) => setWid(e.target.value)} aria-label="Scegli l'ordigno">
          {WEAPONS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <h3>{weapon.name}</h3>
      <p>{weapon.summary}</p>
      <table className="factors">
        <tbody>
          <tr><th>Servizio</th><td>{weapon.service}</td></tr>
          <tr><th>Carica</th><td>{n(weapon.chargeKg, 1)} kg di {weapon.explosive}</td></tr>
          <tr><th>Peso dell’arma</th><td>{n(weapon.totalKg, 0)} kg</td></tr>
          <tr><th>Discesa</th><td>{n(weapon.sinkMps, 2)} m/s</td></tr>
          <tr><th>Spoletta fino a</th><td>{weapon.kind === "contact" ? "solo contatto" : `${n(weapon.maxSetM, 0)} m`}</td></tr>
          <tr><th>Raggio di rottura di modello</th><td>{n(radius, 1)} m su un VIIC a 75 m, al traverso</td></tr>
          {weapon.eraRadiusLabel && (
            <tr><th>Fonte d’epoca</th><td>{weapon.eraRadiusLabel}{weapon.eraRadiusM ? ` (${n(weapon.eraRadiusM, 1)} m)` : ""}</td></tr>
          )}
        </tbody>
      </table>
      <ul>
        {weapon.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <h2>Fonti</h2>
      <ul>
        {BIBLIO.map((b) => (
          <li key={b.title}>
            <strong>{b.title}. </strong>
            {b.detail}
          </li>
        ))}
        {boat.sources.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </article>
  );
}
