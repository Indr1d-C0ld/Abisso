export type Family = "II" | "VII" | "IX" | "XB" | "XXI";

export type CompDef = {
  id: string;
  name: string;
  /** 0 = poppa del Druckkörper, 1 = prua. */
  a: number;
  b: number;
  systems: string[];
  battery?: boolean;
};

export type Boat = {
  id: string;
  name: string;
  klass: string;
  family: Family;
  historical: boolean;
  loa: number;
  beam: number;
  draft: number;
  phLength: number;
  phKnown: boolean;
  phDiameter: number;
  plateMm: number;
  /** Profondità di collasso usata dal modello, in metri. */
  collapseM: number;
  constructionM: number;
  testM: number;
  dispSurf: number;
  dispSub: number;
  speedSurf: number;
  speedSub: number;
  rangeNm: number;
  rangeKn: number;
  rangeSubNm: number;
  crew: string;
  tubes: string;
  power: string;
  bowFine: number;
  sternFine: number;
  /** Frazione di lunghezza da poppa a prua. */
  towerAt: number;
  towerL: number;
  towerW: number;
  towerH: number;
  twin: boolean;
  deckGun: boolean;
  plateNote: string;
  depthNote: string;
  blurb: string;
  fate?: string;
  sources: string[];
  compartments: CompDef[];
};

export type Explosive = "amatol" | "tnt" | "minol" | "torpex";

export type WeaponKind = "dc" | "contact" | "mortar";

export type Weapon = {
  id: string;
  name: string;
  short: string;
  service: string;
  kind: WeaponKind;
  chargeKg: number;
  explosive: Explosive;
  /** Rendimento relativo al TNT in peso, prima del fattore di servizio sul raggio. */
  re: number;
  sinkMps: number;
  totalKg: number;
  maxSetM: number;
  year: string;
  summary: string;
  notes: string[];
  sources: string[];
  /** Raggio letale citato dalle fonti d'epoca, se esiste, solo come confronto. */
  eraRadiusM?: number;
  eraRadiusLabel?: string;
};

export type PatternId =
  | "single"
  | "diamond5"
  | "line5"
  | "line10"
  | "hedgehog"
  | "hedgehog-us"
  | "squid3"
  | "squid6";

export type Era = "1941" | "1944";

export type SimInput = {
  boatId: string;
  weaponId: string;
  pattern: PatternId;
  axisDepth: number;
  burstDepth: number;
  missX: number;
  missZ: number;
  spacing: number;
  heading: number;
  speedKn: number;
  applyDrift: boolean;
  armWindow: number;
  era: Era;
};
