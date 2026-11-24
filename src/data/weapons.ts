import type { PatternId, Weapon } from "@/data/types";

/** 290 lb × 0,45359237. Ancora del Mark VII. */
export const MK7_CHARGE_KG = 290 * 0.45359237;

export const WEAPONS: Weapon[] = [
  {
    id: "mk7-amatol",
    name: "Depth Charge Mark VII, Amatol",
    short: "Mk VII Amatol",
    service: "Royal Navy, 1939–1940",
    kind: "dc",
    chargeKg: MK7_CHARGE_KG,
    explosive: "amatol",
    re: 0.85,
    sinkMps: 2.55,
    totalKg: 191,
    maxSetM: 150,
    year: "1939",
    summary:
      "La carica standard di inizio guerra: bidone con circa 290 lb (132 kg) di amatol e spoletta idrostatica. Lenta. Un battello a pochi nodi esce dal raggio mentre la carica sta ancora scendendo.",
    notes: [
      "Velocità di discesa iniziale circa 2,1 m/s, circa 3,0 m/s a 76 m. Il modello usa 2,55 m/s come media.",
      "Stima RN, poi molto citata: fendeva un fasciame da 22 mm a circa 20 ft (6,1 m) e poteva costringere all'emersione a circa 40 ft (12,2 m).",
      "Quota massima di spoletta, nelle prime pistole, ben sotto i 150–180 m poi resi necessari dai battelli tedeschi.",
    ],
    sources: [
      "Sintesi aperta della voce Depth charge (Mark VII), che riporta le stime RN di 20 e 40 ft.",
      "NavWeaps, ASW weapons of the United Kingdom.",
    ],
    eraRadiusM: 6.1,
    eraRadiusLabel: "rottura stimata RN, 20 ft, fasciame ~22 mm",
  },
  {
    id: "mk7-heavy-amatol",
    name: "Mark VII Heavy, Amatol",
    short: "Mk VII Heavy",
    service: "Royal Navy, dal tardo 1940",
    kind: "dc",
    chargeKg: MK7_CHARGE_KG,
    explosive: "amatol",
    re: 0.85,
    sinkMps: 5.1,
    totalKg: 259,
    maxSetM: 274,
    year: "1940",
    summary:
      "Stessa carica, zavorra di ghisa da circa 150 lb. La discesa sale a circa 16,8 ft/s (5,1 m/s). Non è più potente: arriva prima, e le spolette nuove scendono verso i 270 m.",
    notes: [
      "Il guadagno tattico è cinematico, non energetico. A 80 m il tempo di discesa passa da circa mezzo minuto a un quarto di minuto.",
      "Pistole profonde fino a circa 900 ft (274 m) nelle versioni tarde.",
    ],
    sources: ["Stesse fonti del Mark VII; zavorra e 16,8 ft/s sono i dati correnti delle sintesi tecniche."],
  },
  {
    id: "mk7-heavy-torpex",
    name: "Mark VII Heavy, Torpex o Minol",
    short: "Mk VII Torpex",
    service: "Royal Navy, dalla fine del 1942",
    kind: "dc",
    chargeKg: MK7_CHARGE_KG,
    explosive: "torpex",
    re: 1.5,
    sinkMps: 5.1,
    totalKg: 259,
    maxSetM: 274,
    year: "1942",
    summary:
      "Sostituzione dell'amatol con Torpex o Minol, a parità di massa nominale. La Royal Navy stimò il raggio di fenditura a circa 26 ft (7,9 m) e quello di emersione forzata a circa 52 ft (15,8 m).",
    notes: [
      "Il modello applica un fattore di servizio sul raggio, 1,30 rispetto all'amatol di pari massa, così da cadere sulla stima RN dei 26 ft. La sola radice cubica dell'equivalente TNT darebbe circa +21%, non +30%.",
      "La differenza fra le due letture è la fascia di incertezza del modello, non un dettaglio da nascondere.",
    ],
    sources: ["Stima RN di fine 1942, come riportata nelle sintesi aperte sul Mark VII."],
    eraRadiusM: 7.92,
    eraRadiusLabel: "rottura stimata RN con Torpex/Minol, 26 ft",
  },
  {
    id: "mk10",
    name: "Mark X da tubo lanciasiluri",
    short: "Mk X",
    service: "Royal Navy, cacciatorpediniere anziani",
    kind: "dc",
    chargeKg: 2000 * 0.45359237,
    explosive: "minol",
    re: 1.5,
    sinkMps: 6.4,
    totalKg: 3000 * 0.45359237,
    maxSetM: 274,
    year: "1942",
    summary:
      "Arma da circa 3 000 lb complessivi, lanciata dai tubi da 21 pollici. La carica esplosiva è qui posta a circa 2 000 lb di Minol: le sintesi divergono sulla ripartizione del peso e il rapporto lo segnala.",
    notes: [
      "Discesa circa 21 ft/s (6,4 m/s).",
      "Non è un'arma «più precisa»: è una bolla enorme. Il raggio cresce con la radice cubica, non con la massa.",
    ],
    sources: ["Peso totale 3 000 lb e discesa 21 ft/s: sintesi aperte (Wikipedia Depth charge; letteratura NavWeaps). Carica 2 000 lb: ipotesi esplicita di questo studio."],
  },
  {
    id: "us-mk6",
    name: "US Navy Mark 6",
    short: "US Mk 6",
    service: "US Navy",
    kind: "dc",
    chargeKg: 300 * 0.45359237,
    explosive: "tnt",
    re: 1,
    sinkMps: 2.4,
    totalKg: 190,
    maxSetM: 183,
    year: "1942",
    summary:
      "Il bidone americano più prodotto, circa 300 lb di TNT. Le prove USN del periodo furono ottimistiche: danno fatale entro 30 ft, serio entro 60, sensibile entro 90. Il modello non usa quelle prove: resta ancorato al Mark VII britannico.",
    notes: [
      "Discesa lenta, dello stesso ordine dei primi Mark VII. Zavorre successive portarono alcuni lotti verso i 12 ft/s.",
      "Prodotte oltre duecentomila cariche Mark 6.",
    ],
    sources: ["NavWeaps, ASW weapons of the United States; Pacific War Online Encyclopedia per le prove a 30/60/90 ft."],
    eraRadiusM: 9.1,
    eraRadiusLabel: "raggio «fatale» delle prove USN, 30 ft — stima ottimistica, non usata dal verdetto",
  },
  {
    id: "us-mk7",
    name: "US Navy Mark 7",
    short: "US Mk 7",
    service: "US Navy",
    kind: "dc",
    chargeKg: 600 * 0.45359237,
    explosive: "tnt",
    re: 1,
    sinkMps: 2.7,
    totalKg: 745 * 0.45359237,
    maxSetM: 183,
    year: "1938",
    summary:
      "600 lb di TNT in un corpo da circa 745 lb. Più energia del Mark 6, discesa ancora lenta (circa 9 ft/s). Sulle rotte atlantiche arrivò spesso «in ritardo» rispetto alla quota vera del battello.",
    notes: ["Regolazioni tipiche 50–300 ft, poi estese verso i 600 ft quando i Tipo VII scesero più a fondo."],
    sources: ["NavWeaps, tabella Mark 7."],
  },
  {
    id: "us-mk9",
    name: "US Navy Mark 9",
    short: "US Mk 9",
    service: "US Navy, dal 1943",
    kind: "dc",
    chargeKg: 200 * 0.45359237,
    explosive: "torpex",
    re: 1.5,
    sinkMps: 6.9,
    totalKg: 160,
    maxSetM: 305,
    year: "1943",
    summary:
      "Goccia con pinne, circa 200 lb di Torpex, discesa 22,7 ft/s (6,9 m/s). Meno esplosivo di un Mark VII pesante: il vantaggio è il tempo, non il raggio. Sta nelle stesse rotaie del Mark 6.",
    notes: [
      "Peso totale non tabellato in modo univoco: 160 kg è un ordine di grandezza del corpo affusolato, non una pesata.",
      "Quote poi portate fino a circa 1 000 ft.",
    ],
    sources: ["NavWeaps, Mark 9: 200 lb Torpex, 22,7 ft/s."],
  },
  {
    id: "hedgehog",
    name: "Hedgehog, proietto da 65 lb",
    short: "Hedgehog",
    service: "Royal Navy e US Navy, dal 1942",
    kind: "contact",
    chargeKg: 35 * 0.45359237,
    explosive: "torpex",
    re: 1.5,
    sinkMps: 7.0,
    totalKg: 65 * 0.45359237,
    maxSetM: 0,
    year: "1942",
    summary:
      "Mortaio a spina, 24 colpi, spoletta a contatto. Se manca l'acqua non esplode: l'ASDIC non viene accecato e si può rilanciare subito. Un solo colpo sul corpo resistente, con circa 35 lb di Torpex, basta di solito a perdere il battello.",
    notes: [
      "Schema RN: cerchio di circa 40 yard (37 m) di diametro, circa 200 yard a prua della nave ferma. Discesa 22–23,5 ft/s.",
      "Schema US Mark 10: ellisse circa 59 × 51 m, gittata diversa. È la seconda opzione di pattern.",
      "Non ha quota di scoppio. O urta, o è un colpo a vuoto.",
    ],
    sources: ["NavWeaps, Hedgehog e variante USA."],
  },
  {
    id: "squid",
    name: "Squid, bomba da 390 lb",
    short: "Squid",
    service: "Royal Navy, dal 1943",
    kind: "mortar",
    chargeKg: 207 * 0.45359237,
    explosive: "minol",
    re: 1.5,
    sinkMps: 13.3,
    totalKg: 390 * 0.45359237,
    maxSetM: 274,
    year: "1943",
    summary:
      "Tre canne da 12 pollici, circa 207 lb di Minol l'una, spoletta a orologeria calata sull'eco. Schema a triangolo di circa 40 yard di lato. La coppia di mortai mette un secondo triangolo 60 ft più sotto. Discesa 43,5 ft/s: il bersaglio si sposta poco.",
    notes: [
      "Il baricentro del triangolo non è il punto letale. A errore zero un Tipo VII lungo intercetta spesso il vertice di prua; i due colpi laterali restano fuori dal baglio.",
      "Prima unità: HMS Ambuscade, 1943. Quota massima circa 900 ft.",
    ],
    sources: ["NavWeaps, Squid; Campbell, Naval Weapons of World War Two, per pesi e schema."],
  },
];

export function weaponById(id: string) {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[2];
}

export function patternsFor(kind: Weapon["kind"]): PatternId[] {
  if (kind === "contact") return ["hedgehog", "hedgehog-us"];
  if (kind === "mortar") return ["squid3", "squid6"];
  return ["single", "diamond5", "line5", "line10"];
}

export const PATTERN_LABEL: Record<PatternId, string> = {
  single: "Carica singola",
  diamond5: "Diamante, 5 cariche",
  line5: "Fila di poppa, 5",
  line10: "Fila di poppa, 10",
  hedgehog: "Hedgehog RN, 24 colpi",
  "hedgehog-us": "Hedgehog USA, ellisse",
  squid3: "Squid, un triangolo",
  squid6: "Squid doppio, Δ 18 m",
};
