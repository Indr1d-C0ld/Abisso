import type { SimInput } from "@/data/types";

export type HistEvent = {
  id: string;
  date: string;
  boat: string;
  boatId: string;
  klass: string;
  place: string;
  attacker: string;
  result: string;
  recreable: boolean;
  whyNot?: string;
  known: string[];
  assumed: string[];
  sources: string[];
  setup?: Partial<SimInput>;
};

const still: Partial<SimInput> = { speedKn: 2, applyDrift: false, armWindow: 8, heading: 0 };

export const EVENTS: HistEvent[] = [
  {
    id: "u47-1941-03",
    date: "marzo 1941",
    boat: "U-47",
    boatId: "u47",
    klass: "VIIB",
    place: "Atlantico del Nord, posizione non chiusa",
    attacker: "Nessun attacco accertato",
    result: "Scomparso. Causa discussa.",
    recreable: false,
    whyNot:
      "Prien non tornò. Si è parlato di cariche di HMS Wolverine, di una mina, di un’avaria. Non c’è un foglio di lancio da mettere nel modello. Richiamarlo come affondamento da carica sarebbe inventare la causa.",
    known: ["Il battello è un VIIB.", "La perdita è del marzo 1941.", "Le ipotesi in circolazione si contraddicono."],
    assumed: [],
    sources: ["Scheda già in archivio di questo studio; le sintesi aperte non concordano sulla causa."],
  },
  {
    id: "u99-1941-03-17",
    date: "17 marzo 1941",
    boat: "U-99",
    boatId: "u99",
    klass: "VIIB",
    place: "Atlantico, a sud-est dell’Islanda, 61°00′ N, 11°48′ O",
    attacker: "HMS Walker, cacciatorpediniere",
    result: "Danneggiato in immersione, emerso, autoaffondato. 3 morti, 40 superstiti, fra cui Kretschmer.",
    recreable: true,
    known: [
      "uboat.net: autoaffondato alle 03:43 dopo essere stato gravemente danneggiato dalle cariche di Walker, durante l’attacco al convoglio HX 112.",
      "Il battello tornò in superficie. Non implose. L’ufficiale di macchina rientrò a bordo per aprire un portello e affrettare l’affondamento, così da impedire l’abbordaggio.",
      "Walker e Vanoc cacciarono insieme. Quante cariche, e a che quota, i sunti usati qui non lo dicono.",
    ],
    assumed: [
      "Arma: Mark VII Heavy all’amatolo. Il rapporto sintetico non nomina il lotto.",
      "Diamante di passo 42 m, spostato di 60 m a dritta: una carica resta a circa 18 m dal piano di simmetria, le altre escono. È una disposizione del modello, non il foglio di Walker.",
      "Quota 80 m. Con questi numeri il modello si ferma alle falle, non apre compartimenti e non collassa. L’autoaffondamento avvenne con due cacciatorpediniere sopra: il loro cannone non è in questo studio.",
    ],
    sources: [
      "uboat.net, U-99, voce Fate.",
      "Resoconti aperti sull’HX 112 (Walker, capitano Donald Macintyre).",
    ],
    setup: {
      ...still,
      boatId: "u99",
      weaponId: "mk7-heavy-amatol",
      pattern: "diamond5",
      axisDepth: 80,
      burstDepth: 80,
      missX: 0,
      missZ: 60,
      spacing: 42,
      era: "1941",
    },
  },
  {
    id: "u100-1941-03-17",
    date: "17 marzo 1941",
    boat: "U-100",
    boatId: "u100",
    klass: "VIIB",
    place: "Stessa notte di U-99, sud-est dell’Islanda",
    attacker: "HMS Vanoc, speronamento",
    result: "Affondato per speronamento. Schepke ucciso.",
    recreable: false,
    whyNot:
      "Vanoc lo prese in superficie col radar a onde centimetriche e lo speronò. Le cariche, se ci furono, non sono l’arma che chiuse il caso. Lo studio non simula un urto di scafo contro scafo: richiamarlo come carica sarebbe il meccanismo sbagliato.",
    known: [
      "È un VIIB, stessa notte di U-99.",
      "Il contatto decisivo fu in superficie, col radar, non un attacco profondo a botti.",
    ],
    assumed: [],
    sources: ["Scheda U-100 di questo archivio; sintesi dell’azione di Vanoc sull’HX 112."],
  },
  {
    id: "u110-1941-05-09",
    date: "9 maggio 1941",
    boat: "U-110",
    boatId: "u110",
    klass: "IXB",
    place: "Atlantico, a est di Capo Farewell, convoglio OB 318",
    attacker: "HMS Aubrietia, poi Bulldog e Broadway",
    result: "Costretto in superficie, abbandonato, salito da un drappello britannico. Affondò a rimorchio il giorno dopo. Lemp morto. Materiale Enigma catturato.",
    recreable: true,
    known: [
      "Aubrietia, corvetta della classe Flower, lo trovò all’ASDIC dopo che il periscopio era rimasto alto. Il primo contatto è dunque vicino alla quota periscopica, non in profondità.",
      "Broadway rinunciò allo speronamento e lanciò due cariche sotto il battello per far abbandonare l’equipaggio.",
      "Lo scafo resse abbastanza da essere visitato. Quindici morti, trentadue catturati.",
    ],
    assumed: [
      "Mark VII Heavy, diamante di passo 40 m, scarto 14 m a dritta e 4 m verso prua. Aubrietia portava cariche: questo non è il suo foglio.",
      "Asse a 16 m, scoppio a 24 m: un colpo basso, vicino alla quota del periscopio. Il modello, così, dà falle lungo il corpo e non compartimenti aperti. È compatibile con un battello che si può ancora salire. Non è una misura. Lo scarto era 12 m; con gli spessori delle misure di guerra (25/11/2026) a 12 m il modello dava già una perdita, e lo si è portato a 14.",
    ],
    sources: [
      "uboat.net, U-110, «The Secret Capture».",
      "Sintesi dell’operazione Primrose.",
    ],
    setup: {
      ...still,
      boatId: "u110",
      weaponId: "mk7-heavy-amatol",
      pattern: "diamond5",
      axisDepth: 16,
      burstDepth: 24,
      missX: 4,
      missZ: 14,
      spacing: 40,
      era: "1941",
    },
  },
  {
    id: "u570-1941-08-27",
    date: "27 agosto 1941",
    boat: "U-570",
    boatId: "u570",
    klass: "VIIC",
    place: "Atlantico, a sud dell’Islanda",
    attacker: "Hudson del 269 Squadron, Coastal Command",
    result: "Sorpreso in superficie, si arrese. Divenne HMS Graph.",
    recreable: false,
    whyNot:
      "Non ci fu una carica sotto lo scafo. Un aereo lo trovò in superficie e l’equipaggio, ancora verde, alzò le mani. I piani del VIIC che usiamo vengono anche da quel battello: è una cattura, non un affondamento da studiare qui.",
    known: ["Tipo VIIC.", "Resa in superficie il 27 agosto 1941.", "Poi in servizio britannico come HMS Graph."],
    assumed: [],
    sources: ["Scheda U-570 di questo archivio."],
  },
  {
    id: "u175-1943-04-17",
    date: "17 aprile 1943",
    boat: "U-175",
    boatId: "ix-c",
    klass: "IXC",
    place: "Atlantico, a sud-ovest dell’Irlanda, 47°53′ N, 22°04′ O. Convoglio HX 233",
    attacker: "USCGC Spencer, con la Duane",
    result: "Portato in superficie dalle cariche, poi finito dal fuoco e dall’autoaffondamento. 13 morti, fra cui Bruns, 41 superstiti. Un drappello salì a bordo ma il battello affondava di poppa.",
    recreable: true,
    known: [
      "uboat.net: affondato da cariche e dal fuoco dello Spencer.",
      "Il primo lancio di Spencer fu uno schema di 11 cariche. I superstiti le sentirono scoppiare sotto lo scafo. Uno disse che tutto tremava, e che al periscopio la partita era già chiusa.",
      "Lo scafo richiamato è il Tipo IXC di questo archivio, non il piano di U-175.",
    ],
    assumed: [
      "Arma: US Mark 6. Il tipo imbarcato sullo Spencer non è nel sunto usato qui.",
      "Fila da 10, passo 16 m, scarto 8 m, scoppio a 68 m sotto un asse a 50 m. Nel modello questa fila apre falle su tutto il corpo e non allaga un compartimento: verdetto «serio». Le artiglierie e le valvole aperte dall’equipaggio, che chiusero il caso, non sono nel modello.",
    ],
    sources: [
      "uboat.net, U-175, Fate.",
      "Naval History Magazine, USNI, aprile 2024, «A Nautical Knife Fight»: le 11 cariche e lo scoppio sotto lo scafo.",
    ],
    setup: {
      ...still,
      boatId: "ix-c",
      weaponId: "us-mk6",
      pattern: "line10",
      axisDepth: 50,
      burstDepth: 68,
      missX: 0,
      missZ: 8,
      spacing: 16,
      era: "1941",
    },
  },
  {
    id: "u202-1943-06-02",
    date: "1–2 giugno 1943",
    boat: "U-202",
    boatId: "vii-c",
    klass: "VIIC",
    place: "Atlantico, a sud-est di Capo Farewell, 56°12′ N, 39°52′ O",
    attacker: "HMS Starling, del Secondo Gruppo di Supporto di Walker",
    result: "Quindici ore di caccia. Emerso dopo mezzanotte, colpito da cariche basse e dal cannone. Affondò in una quarantina di minuti. 18 morti, 30 superstiti.",
    recreable: true,
    known: [
      "uboat.net: affondato alle 00:30 del 2 giugno da cariche e dal fuoco della Starling.",
      "La caccia cominciò il 1° giugno, dopo un rilevamento HF/DF, e durò circa quindici ore. Non è un solo schema.",
      "A mezzanotte il battello era in superficie. Walker rinunciò allo speronamento e lanciò cariche a quota bassa passando di lato.",
      "Lo scafo richiamato è il Tipo VIIC dell’archivio, non il piano di U-202.",
    ],
    assumed: [
      "Un solo passaggio, non la caccia intera: Mark VII Heavy al Torpex, una carica, asse a 12 m, scoppio a 16 m, 8 m a dritta. Il lotto imbarcato sulla Starling non è nella voce di uboat.net.",
      "Il cannone, che chiuse il caso insieme alle cariche, non è in questo studio.",
    ],
    sources: [
      "uboat.net, U-202, Fate.",
      "Sintesi aperta della caccia della Starling, 1–2 giugno 1943.",
    ],
    setup: {
      ...still,
      boatId: "vii-c",
      weaponId: "mk7-heavy-torpex",
      pattern: "single",
      axisDepth: 12,
      burstDepth: 16,
      missX: 0,
      missZ: 8,
      era: "1941",
    },
  },
  {
    id: "u505-hedgehog",
    date: "4 giugno 1944, 11:16",
    boat: "U-505",
    boatId: "u505",
    klass: "IXC",
    place: "Atlantico, al largo del Rio de Oro. Gruppo della Guadalcanal",
    attacker: "USS Chatelain (DE 149)",
    result: "Hedgehog a vuoto. Nessuna detonazione. Il battello era basso: il contatto si perse a circa 50 iarde.",
    recreable: true,
    known: [
      "Rapporto della Chatelain, archivio U-boat Archive: schema completo di hedgehog, rotta 285, nessun scoppio, nessun dato di profondità all’ecoscandaglio.",
      "Il rilevamento si stava spostando a dritta al momento del fuoco.",
      "È il colpo che non colpì. Quello che portò il battello su arrivò cinque minuti dopo, ed è la scheda seguente.",
    ],
    assumed: [
      "Schema Hedgehog USA, ellisse. Scarto 18 m verso prua e 36 m a dritta: fuori dal tappeto, così il modello non fa detonare nulla. Il rapporto dice solo che mancò, non di quanto.",
      "Quota 20 m, perché il contatto era basso e i caccia lo videro quasi in superficie.",
    ],
    sources: ["U-boat Archive, rapporto della USS Chatelain sull’U-505, 4 giugno 1944."],
    setup: {
      ...still,
      boatId: "u505",
      weaponId: "hedgehog",
      pattern: "hedgehog-us",
      axisDepth: 20,
      burstDepth: 20,
      missX: 18,
      missZ: 36,
      era: "1944",
    },
  },
  {
    id: "u505-cariche",
    date: "4 giugno 1944, 11:21",
    boat: "U-505",
    boatId: "u505",
    klass: "IXC",
    place: "Stesso contatto, cinque minuti dopo il riccio a vuoto",
    attacker: "USS Chatelain",
    result: "Schema basso di 14 cariche. Il battello emerse quasi subito, fu abbandonato e catturato. Lange ferito. Non era stato spaccato: si poté salire a bordo e disarmare le cariche di autoaffondamento.",
    recreable: true,
    known: [
      "Il rapporto elenca 14 cariche Mark 8, tutte esplose, spolette idrostatiche e magnetiche, schema shallow. Una scoppiò molto in alto, con un geyser di una quindicina di metri.",
      "I pennacchi erano ancora in aria quando l’U-505 ruppe la superficie, a circa 800 iarde dalla Chatelain.",
      "Il modello non ha il Mark 8. Usa il Mark 6 e lo dice.",
    ],
    assumed: [
      "Fila da 10 al posto delle 14, passo 22 m. Non è lo stesso schema, e l’arma è un Mark 6 al posto del Mark 8 del rapporto.",
      "Asse a 22 m, scoppio a 18 m, scarto 16 m. Il modello dà falle, non un Druckkörper aperto: è la classe di danno di un battello che si poté rimorchiare. Una carica più vicina, nello stesso schema, lo segnerebbe già come perdita: con gli spessori delle misure di guerra (25/11/2026) a 14 m lo era, e lo scarto è passato a 16 m.",
    ],
    sources: [
      "U-boat Archive, rapporto Chatelain e rapporto del TG 22.3.",
      "Naval History and Heritage Command, resoconto della cattura.",
    ],
    setup: {
      ...still,
      boatId: "u505",
      weaponId: "us-mk6",
      pattern: "line10",
      axisDepth: 22,
      burstDepth: 18,
      missX: 2,
      missZ: 16,
      spacing: 22,
      speedKn: 4,
      era: "1944",
    },
  },
  {
    id: "u736-1944-08-06",
    date: "6 agosto 1944",
    boat: "U-736",
    boatId: "vii-c",
    klass: "VIIC",
    place: "Golfo di Biscaglia, a sud-ovest di Lorient, 47°19′ N, 04°16′ O",
    attacker: "HMS Loch Killin, poi HMS Starling",
    result: "Portato in superficie. Parte dell’equipaggio passò sul ponte della fregata. 28 morti, 19 superstiti. Lo finì la Starling.",
    recreable: true,
    known: [
      "uboat.net registra cariche di profondità della Loch Killin.",
      "La classe Loch portava lo Squid. Una cronaca della Royal Australian Navy descrive il battello incastrato attraverso la poppa della fregata, e l’equipaggio che sale a bordo.",
      "Le due formule — cariche di profondità e Squid — non sono la stessa arma. Il richiamo segue la seconda, e lo dichiara.",
      "Lo scafo è il Tipo VIIC dell’archivio. U-736 aveva lo schnorchel.",
    ],
    assumed: [
      "Squid a tre colpi, non la voce «depth charges» di uboat.net.",
      "Quota 80 m, scarto 36 m a dritta: un vertice del triangolo resta vicino allo scafo, gli altri due no. Il modello allaga la sala diesel e si ferma a «danno grave». La Starling, che finì il battello in superficie, non è in questo richiamo.",
    ],
    sources: [
      "uboat.net, U-736, Fate: «depth charges» della Loch Killin.",
      "Naval Historical Society of Australia, 6 agosto 1944: il battello in superficie contro la poppa, e il colpo di grazia della Starling.",
    ],
    setup: {
      ...still,
      boatId: "vii-c",
      weaponId: "squid",
      pattern: "squid3",
      axisDepth: 80,
      burstDepth: 78,
      missX: 0,
      missZ: 36,
      era: "1944",
    },
  },
  {
    id: "u96-1945-03-30",
    date: "30 marzo 1945",
    boat: "U-96",
    boatId: "u96",
    klass: "VIIC",
    place: "Wilhelmshaven, in porto",
    attacker: "Bombardamento aereo",
    result: "Messo fuori uso in banchina. Non morì in immersione.",
    recreable: false,
    whyNot:
      "Il battello di Das Boot non fu chiuso da una carica di profondità. Finì sotto le bombe, fermo. Richiamarlo come attacco in quota sarebbe un’altra storia.",
    known: ["VIIC di Lehmann-Willenbrock.", "Danni decisivi a Wilhelmshaven, 30 marzo 1945."],
    assumed: [],
    sources: ["Scheda U-96 di questo archivio."],
  },
  {
    id: "u534-1945-05-05",
    date: "5 maggio 1945",
    boat: "U-534",
    boatId: "u534",
    klass: "IXC/40",
    place: "Kattegat, a nord-est di Aarhus",
    attacker: "Liberator del 547 Squadron",
    result: "Affondato da bombe. Recuperato nel 1993, esposto a Birkenhead.",
    recreable: false,
    whyNot:
      "La voce di perdita parla di bombe, non di una carica idrostatica sotto un battello in quota. Lo scafo è in archivio come IXC/40 tardo. Il colpo che lo mandò giù non è un’arma di questo studio.",
    known: ["IXC/40.", "5 maggio 1945, Kattegat.", "Bombe da un Liberator, non uno schema di cariche di scorta."],
    assumed: [],
    sources: ["Scheda U-534 di questo archivio; le sintesi di perdita indicano bombe del 547 Squadron."],
  },
];

export function eventById(id: string | null) {
  return EVENTS.find((e) => e.id === id) ?? null;
}

export function eventIntact(event: HistEvent, input: SimInput) {
  if (!event.setup) return false;
  return (Object.keys(event.setup) as (keyof SimInput)[]).every((k) => input[k] === event.setup![k]);
}
