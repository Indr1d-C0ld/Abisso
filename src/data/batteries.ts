import type { Family } from "@/data/types";

/**
 * Celle e capacità: tabella AFA 1935–1945 come riportata da uboat.net
 * (technical/batteries.htm). Non è un collaudo di questo studio.
 * Il VIIC tardo del manuale US Navy è la 33 MAL 800 W, 2×62, 9 160 Ah
 * a 20 ore; i battelli di metà guerra portavano ancora le 27 MAK.
 */
export const BATTERY_BOOK: Record<
  Family,
  { cells: number; groups: string; catalog: string; place: string }
> = {
  II: {
    cells: 62,
    groups: "un solo gruppo da 62 celle",
    catalog: "7 160 Ah (36 MAK 580) o 8 380 Ah (44 MAL 570)",
    place: "Un solo banco, a prua della centrale. Non esiste un secondo gruppo da cui attingere.",
  },
  VII: {
    cells: 124,
    groups: "due gruppi da 62 celle",
    catalog: "da 6 940 Ah (27 MAK 740) a 9 160 Ah (33 MAL 800 W)",
    place:
      "Un gruppo sotto gli alloggi di poppa, uno sotto quelli di prua. Nel manuale del VIIC la batteria 1 è dei sottufficiali, la 2 degli ufficiali. Stanno su cavalletti di ferro, sotto il pagliolato, con un condotto di aspirazione su ogni cella.",
  },
  IX: {
    cells: 124,
    groups: "due gruppi da 62 celle",
    catalog: "fino a 11 300 Ah con la 44 MAL 740 sui IXC",
    place: "Come sul VII: due banchi sotto gli alloggi. Sui IXC tardi la cella è più grande, non il numero.",
  },
  XB: {
    cells: 248,
    groups: "248 celle, il doppio di un VII",
    catalog: "18 220 Ah, cella 33 MAL 800",
    place:
      "Il catalogo è del battello. In questo modello l’unico tratto marcato come batterie è la centrale: se cede, il conto le perde tutte. I pozzi mina non sono accumulatori.",
  },
  XXI: {
    cells: 372,
    groups: "372 celle, il triplo di un VII",
    catalog: "33 900 Ah, cella 44 MAL 740",
    place:
      "Nel lobo inferiore dell’otto, non sotto le cuccette di un VII. Il modello le divide nei due tratti di prua e di poppa. È questa riserva, più della lamiera, che fa il battello da immersione.",
  },
};

export type BatteryState = "integro" | "scossa" | "cloro" | "perso";

export type BatteryBank = {
  id: string;
  name: string;
  state: BatteryState;
  /** Frazione di questo gruppo ancora contata in uso. */
  left: number;
  sentence: string;
};

export type BatteryReport = {
  cells: number;
  groups: string;
  catalog: string;
  place: string;
  /** Frazione della capacità di catalogo ancora in uso, per convenzione. */
  left: number;
  chlorine: boolean;
  summary: string;
  banks: BatteryBank[];
};

const SENTENCE: Record<BatteryState, string> = {
  integro: "Vasetti in piedi, acido dentro. Questo gruppo non entra nel conto.",
  scossa:
    "La scossa può fessurare i vasetti e allentare le sbarre senza aprire la lamiera. Acido in sentina, possibili corti. Niente cloro finché non arriva acqua di mare. Convenzione: metà del gruppo ancora usabile, dopo aver isolato le celle rotte. Non è una misura.",
  cloro:
    "Acqua nel locale, compartimento non ancora perso. Le celle sono il punto più basso: il pozzo si bagna prima del volume abitato. I cloruri dell’acqua di mare sull’acido solforico liberano cloro. Il gruppo si stacca.",
  perso: "Locale allagato o rotto. Il gruppo è perso. Il cloro non è più un rischio a parte: è già nel volume.",
};

function stateOf(level: string): BatteryState {
  if (level === "rottura" || level === "allagamento") return "perso";
  if (level === "falle") return "cloro";
  if (level === "scossa") return "scossa";
  return "integro";
}

function leftOf(state: BatteryState) {
  if (state === "integro") return 1;
  if (state === "scossa") return 0.5;
  return 0;
}

export function batteryReport(
  family: Family,
  compartments: { id: string; name: string; level: string; battery: boolean }[],
): BatteryReport {
  const book = BATTERY_BOOK[family];
  const flagged = compartments.filter((c) => c.battery);
  const banks: BatteryBank[] = flagged.map((c) => {
    const state = stateOf(c.level);
    return { id: c.id, name: c.name, state, left: leftOf(state), sentence: SENTENCE[state] };
  });
  const left = banks.length ? banks.reduce((s, b) => s + b.left, 0) / banks.length : 1;
  const chlorine = banks.some((b) => b.state === "cloro" || b.state === "perso");
  const shocked = banks.some((b) => b.state === "scossa");
  const summary = summaryOf(left, chlorine, shocked, banks.length);
  return {
    cells: book.cells,
    groups: book.groups,
    catalog: book.catalog,
    place: book.place,
    left,
    chlorine,
    summary,
    banks,
  };
}

function summaryOf(left: number, chlorine: boolean, shocked: boolean, nBanks: number) {
  if (!chlorine && !shocked) {
    return "Nessun gruppo è stato toccato. L’autonomia elettrica di catalogo resta intera.";
  }
  if (chlorine && left <= 0.05) {
    return nBanks > 1
      ? "Non resta un gruppo isolabile. Niente propulsione in immersione, e le pompe elettriche si fermano. L’emersione d’emergenza è aria compressa: non passa dalle batterie. Se il battello è appesantito dall’acqua, l’aria da sola può non bastare. Il cloro, più pesante dell’aria, sta nel pozzo e poi nel locale. Nelle cacce lunghe ha fatto venire a galla scafi che tenevano ancora. Qui non cambia da solo il verdetto: sta accanto."
      : "L’unico gruppo è da staccare. Non resta propulsione elettrica e non c’è un secondo banco. L’aria compressa può ancora soffiare le zavorre. Il cloro non ribalta da solo il verdetto dello scafo: lo affianca.";
  }
  if (chlorine && left >= 0.4) {
    return "Un gruppo va isolato, per il cloro. L’altro tiene: l’autonomia in immersione si dimezza circa, e le pompe possono ancora attingere al banco sano. Il gas resta nel pozzo del gruppo perso. Non è, da solo, la perdita del battello.";
  }
  if (chlorine) {
    return "Acqua sulle celle, e una parte della capacità ancora in piedi. Si isola ciò che bagna. Il cloro è più pesante dell’aria. Il verdetto qui sopra resta quello dello scafo.";
  }
  return "Scossa sui vasetti, locali ancora asciutti. Niente cloro. Si perde una parte di capacità, non la barca. La metà residua è una convenzione, non un conteggio di celle rotte.";
}
