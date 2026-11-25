import type { Family } from "@/data/types";

export const FAMILY_STRUCTURE: Record<Family, { title: string; body: string[] }> = {
  II: {
    title: "Scafo unico, costiero",
    body: [
      "Un solo corpo resistente, più stretto di un VII, un solo asse, tre tubi a prua. Non ci sono casse a sella da battello oceanico: il fasciame esterno è una carenatura corta, e quasi tutto il volume che conta è già Druckkörper.",
      "La batteria è una sola, a prua della centrale. Un allagamento lì non ha un secondo locale che tenga la propulsione elettrica: o si isola, o si viene a galla.",
    ],
  },
  VII: {
    title: "Cilindro e casse a sella",
    body: [
      "Il corpo resistente del VIIC è un cilindro di 4,70 m, lamiera 22 mm a centro scafo (misura sull'U-570; 24,5 mm ricostruiti sul /41), lungo 50,50 m, con estremità coniche. Il baglio di 6,20 m non è quel cilindro: è il fasciame esterno e le Satteltanks, allagabili, dove sta la nafta.",
      "Da poppa a prua le paratie stagne separano camera di lancio poppiera, sala elettrica, sala diesel, alloggi con batteria poppiera, centrale sotto la torre, alloggi con batteria prodiera, camera di lancio prodiera. La centrale è corta e sta dove la carica al traverso arriva più spesso.",
      "Le ordinate sono interne e il modello non le numera. Il cedimento che si legge è della lamiera del compartimento, non di un’ordinata di cantiere.",
    ],
  },
  IX: {
    title: "Lo stesso schema, più lungo",
    body: [
      "Due tubi a poppa, più nafta nelle casse esterne, Druckkörper di 4,40 m con lamiera di 18 mm (rapporto di Portsmouth 1946 sul IXC/40). La disposizione è quella del VII: macchine a poppa della centrale, batterie sotto gli alloggi, tubi a prua. In proporzione al diametro la lamiera è più sottile di quella del VIIC (22 mm su 4,70 m), ed è per questo che il raggio letale cresce.",
      "La lunghezza del corpo resistente, per il IX, è una stima di questo studio. Le paratie sono lo schema, non il piano di un cantiere.",
    ],
  },
  XB: {
    title: "Posamine: largo fuori, stretto dentro",
    body: [
      "Il baglio di 9,2 m è pozzi e casse, non un corpo resistente di nove metri. Il Druckkörper resta nell’ordine dei cinque metri. I pozzi SMA sono verticali, nel fasciame: una carica li apre, e con loro la nafta, prima di fendere la lamiera stagna.",
      "Non c’è camera di lancio prodiera. A prua stanno assetto e mine. I due tubi sono a poppa.",
    ],
  },
  XXI: {
    title: "Otto: lobo alto e lobo delle batterie",
    body: [
      "Il Tipo XXI vero ha sezione a otto. Il lobo superiore è il cilindro abitato; le batterie, circa il triplo di un VII, stanno nel lobo inferiore. Il modello tridimensionale è un inviluppo con la vita stretta: non è quel disegno di lamiera. La fotografia di cantiere, in Archivio, sì.",
      "Niente tubo di poppa. Sei tubi a prua, con la ricarica rapida. Due motori di silenzio oltre ai principali. Lo schnorchel è di progetto, non un’aggiunta del 1944.",
    ],
  },
};

const NOTE: Record<string, string> = {
  poppa:
    "Poppa del corpo resistente: tubi se ci sono, premistoppa degli assi, barra del timone. La via d’acqua classica è il passaggio dell’asse. Finché il premistoppa tiene è una falla; se non tiene il compartimento si conta perso.",
  elettrici:
    "Unica propulsione in immersione. I quadri e i collettori cedono alla scossa anche con la lamiera intera: si può perdere un asse senza avere una falla.",
  diesel:
    "In immersione i diesel sono fermi, ma occupano il volume insieme a frizioni e compressore. Allagarli toglie la ricarica e la macchina per tornare in superficie.",
  "batt-pp":
    "Batteria sotto il pagliolato, cuccette sopra. Acqua di mare sull’acido libera cloro. È il rischio della caccia lunga, separato dalla rottura della lamiera.",
  centrale:
    "Zentrale: pompe di sentina, collettori di zavorra, timoni di profondità, periscopio. Se si perde, le macchine possono ancora girare e il battello non si governa più.",
  "batt-pr":
    "Seconda batteria, a prua della centrale. Stesso cloro della poppiera. Sul VII qui stanno le cuccette degli ufficiali.",
  prua:
    "I tubi attraversano la paratia di collisione: il corpo resistente è già forato di progetto. I siluri di riserva sono peso, non struttura.",
  "mine-c":
    "Pozzi verticali nel fasciame, non nel cilindro stagno. Il colore di questo locale dice se la carica ha aperto casse e mine, prima ancora del Druckkörper.",
  "mine-pr": "Pozzi di prua. Nessun tubo. La prua del XB è zavorra e mine.",
};

const FAMILY_NOTE: Partial<Record<Family, Record<string, string>>> = {
  II: {
    elettrici:
      "Sul Tipo II la sala elettrica e la poppa sono lo stesso volume: un asse solo. Perderlo vuol dire fermarsi.",
    "batt-pr": "Batteria unica. Non c’è un secondo accumulo a poppa che tenga le luci e l’asse.",
    prua: "Tre tubi, non quattro. La camera di lancio è corta, come tutto il battello.",
  },
  XXI: {
    poppa: "Nessun tubo di poppa. Restano i due assi, i timoni e i premistoppa: la via d’acqua, se arriva, arriva da lì.",
    elettrici:
      "Motori principali e, sullo stesso schema, i due motori di silenzio. Sono loro che permettono la corsa lenta senza il rumore dei principali.",
    "batt-pp":
      "Nel XXI vero queste celle stanno nel lobo inferiore dell’otto, sotto il pagliolato del cilindro abitato. Il modello le segna nel tratto di lunghezza, non in quel lobo.",
    "batt-pr":
      "Stesso lobo inferiore, metà prodiera. La capacità è dell’ordine del triplo di un VII: è questo, più dello spessore, che fa il battello da immersione.",
    centrale:
      "Centrale del XXI: assetto, schnorchel, idrofono a schiera. L’idrofono sta fuori, a prua, sotto il fasciame; qui c’è solo il suo locale di ascolto.",
    prua: "Sei tubi e il dispositivo di ricarica rapida. La paratia di collisione è forata sei volte, non quattro.",
  },
  IX: {
    poppa: "Due tubi di poppa, non uno. Due premistoppa, due vie d’acqua possibili.",
    prua: "Quattro tubi e una riserva più grande di quella di un VII: il volume è di un battello oceanico.",
  },
};

export function compartmentNote(family: Family, id: string) {
  return FAMILY_NOTE[family]?.[id] ?? NOTE[id] ?? "Locale dello schema di paratie. Non è un piano di cantiere.";
}
