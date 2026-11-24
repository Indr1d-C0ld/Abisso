import { ALL_BOATS } from "@/data/boats";
import { EVENTS } from "@/data/events";
import type { Era, PatternId, SimInput } from "@/data/types";
import { PATTERN_LABEL, patternsFor, WEAPONS } from "@/data/weapons";
import type { HullProbe } from "@/sim/model";
import { create } from "zustand";

export const DEFAULT_INPUT: SimInput = {
  boatId: "u96",
  weaponId: "mk7-heavy-torpex",
  pattern: "single",
  axisDepth: 70,
  burstDepth: 70,
  missX: 0,
  missZ: 14,
  spacing: 28,
  heading: 0,
  speedKn: 4,
  applyDrift: false,
  armWindow: 8,
  era: "1941",
};

export type SavedCase = {
  id: string;
  title: string;
  at: number;
  input: SimInput;
  outcome: string;
};

type Tab = "studio" | "casi" | "archivio" | "metodo";
type Mobile = "model" | "data" | "result";
type Cam = "quarter" | "beam" | "bow" | "stern" | "top" | "keel";
export type Finish = "controllo" | "atlantico";
export type Quality = "alta" | "media";

type View = { skin: boolean; sea: boolean; quality: Quality };
const VIEW_KEY = "abisso.view.v1";
const DEFAULT_VIEW: View = { skin: true, sea: true, quality: "alta" };

function loadView(): View {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  try {
    const o = JSON.parse(localStorage.getItem(VIEW_KEY) || "null") as Partial<View> | null;
    if (!o) return DEFAULT_VIEW;
    return {
      skin: o.skin !== false,
      sea: o.sea !== false,
      quality: o.quality === "media" ? "media" : "alta",
    };
  } catch {
    return DEFAULT_VIEW;
  }
}

function saveView(v: View) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function sanitize(raw: unknown): SimInput {
  const d = DEFAULT_INPUT;
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<SimInput>;
  const boat = ALL_BOATS.find((b) => b.id === o.boatId) ?? ALL_BOATS.find((b) => b.id === d.boatId)!;
  const weapon = WEAPONS.find((w) => w.id === o.weaponId) ?? WEAPONS.find((w) => w.id === d.weaponId)!;
  const allowed = patternsFor(weapon.kind);
  const pattern = allowed.includes(o.pattern as PatternId) ? (o.pattern as PatternId) : allowed[0];
  const era: Era = o.era === "1944" ? "1944" : "1941";
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
    return Math.min(max, Math.max(min, n));
  };
  return {
    boatId: boat.id,
    weaponId: weapon.id,
    pattern,
    axisDepth: num(o.axisDepth, d.axisDepth, 8, 340),
    burstDepth: num(o.burstDepth, d.burstDepth, 5, 360),
    missX: num(o.missX, d.missX, -80, 80),
    missZ: num(o.missZ, d.missZ, -80, 80),
    spacing: num(o.spacing, d.spacing, 8, 80),
    heading: num(o.heading, d.heading, -180, 180),
    speedKn: num(o.speedKn, d.speedKn, 0, 18),
    applyDrift: Boolean(o.applyDrift),
    armWindow: num(o.armWindow, d.armWindow, 0, 30),
    era,
  };
}

function loadInput(): SimInput {
  if (typeof window === "undefined") return DEFAULT_INPUT;
  try {
    return sanitize(JSON.parse(localStorage.getItem("abisso.input.v1") || "null"));
  } catch {
    return DEFAULT_INPUT;
  }
}

function loadCases(): SavedCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem("abisso.cases.v1") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 16).map((c) => ({
      id: String(c.id),
      title: String(c.title),
      at: Number(c.at) || Date.now(),
      input: sanitize(c.input),
      outcome: String(c.outcome || ""),
    }));
  } catch {
    return [];
  }
}

type State = {
  tab: Tab;
  mobile: Mobile;
  input: SimInput;
  shot: number;
  xray: boolean;
  cut: boolean;
  interior: boolean;
  spheres: boolean;
  cam: Cam;
  finish: Finish;
  /** Rivestimento Thrixel al posto del fasciame parametrico. */
  skin: boolean;
  /** Superficie del mare nella resa Atlantico. */
  sea: boolean;
  quality: Quality;
  probe: HullProbe | null;
  selected: string | null;
  cases: SavedCase[];
  eventId: string | null;
  setTab: (t: Tab) => void;
  hydrate: () => void;
  setMobile: (m: Mobile) => void;
  patch: (p: Partial<SimInput>) => void;
  boom: () => void;
  setCam: (c: Cam) => void;
  setFinish: (f: Finish) => void;
  setProbe: (p: HullProbe | null) => void;
  toggle: (k: "xray" | "cut" | "spheres" | "interior" | "skin" | "sea") => void;
  setQuality: (q: Quality) => void;
  select: (id: string | null) => void;
  saveCase: (title: string, outcome: string) => void;
  deleteCase: (id: string) => void;
  loadCase: (id: string) => void;
  loadEvent: (id: string) => void;
};

export const useAbisso = create<State>((set, get) => ({
  tab: "studio",
  mobile: "model",
  input: DEFAULT_INPUT,
  shot: 1,
  xray: false,
  cut: false,
  interior: false,
  spheres: false,
  cam: "quarter",
  finish: "controllo",
  ...DEFAULT_VIEW,
  probe: null,
  selected: null,
  cases: [],
  eventId: null,
  setTab: (tab) => set({ tab }),
  setMobile: (mobile) => set({ mobile }),
  hydrate: () => set({ input: loadInput(), cases: loadCases(), ...loadView() }),
  patch: (p) => {
    const input = sanitize({ ...get().input, ...p });
    try {
      localStorage.setItem("abisso.input.v1", JSON.stringify(input));
    } catch {
      /* ignore quota */
    }
    set({ input, shot: get().shot + 1, probe: null });
  },
  boom: () => set({ shot: get().shot + 1 }),
  setCam: (cam) => set({ cam }),
  setFinish: (finish) => set({ finish }),
  setProbe: (probe) => set({ probe, selected: probe ? probe.compId : null }),
  toggle: (k) => {
    if (k === "xray") set({ xray: !get().xray });
    if (k === "cut") set({ cut: !get().cut });
    if (k === "spheres") set({ spheres: !get().spheres });
    if (k === "skin" || k === "sea") {
      set({ [k]: !get()[k] } as Pick<State, typeof k>);
      const { skin, sea, quality } = get();
      saveView({ skin, sea, quality });
    }
    if (k === "interior") {
      const interior = !get().interior;
      set(interior ? { interior, cut: true, xray: true } : { interior });
    }
  },
  setQuality: (quality) => {
    set({ quality });
    const { skin, sea } = get();
    saveView({ skin, sea, quality });
  },
  select: (selected) => set({ selected }),
  saveCase: (title, outcome) => {
    const next: SavedCase = {
      id: `${Date.now()}`,
      title,
      at: Date.now(),
      input: get().input,
      outcome,
    };
    const cases = [next, ...get().cases].slice(0, 12);
    try {
      localStorage.setItem("abisso.cases.v1", JSON.stringify(cases));
    } catch {
      /* ignore */
    }
    set({ cases });
  },
  deleteCase: (id) => {
    const cases = get().cases.filter((c) => c.id !== id);
    try {
      localStorage.setItem("abisso.cases.v1", JSON.stringify(cases));
    } catch {
      /* ignore */
    }
    set({ cases });
  },
  loadCase: (id) => {
    const found = get().cases.find((c) => c.id === id);
    if (!found) return;
    const input = sanitize(found.input);
    try {
      localStorage.setItem("abisso.input.v1", JSON.stringify(input));
    } catch {
      /* ignore */
    }
    set({ input, tab: "studio", shot: get().shot + 1, probe: null, eventId: null });
  },
  loadEvent: (id) => {
    const found = EVENTS.find((e) => e.id === id);
    if (!found) return;
    if (!found.setup) {
      const input = sanitize({
        ...get().input,
        boatId: found.boatId,
        pattern: "single",
        weaponId: "mk7-heavy-torpex",
        missX: 0,
        missZ: 55,
        applyDrift: false,
      });
      try {
        localStorage.setItem("abisso.input.v1", JSON.stringify(input));
      } catch {
        /* ignore quota */
      }
      set({ input, eventId: id, tab: "studio", shot: get().shot + 1, probe: null, mobile: "model" });
      return;
    }
    const input = sanitize({ ...DEFAULT_INPUT, ...found.setup });
    try {
      localStorage.setItem("abisso.input.v1", JSON.stringify(input));
    } catch {
      /* ignore quota */
    }
    set({ input, eventId: id, tab: "studio", shot: get().shot + 1, probe: null, mobile: "model" });
  },
}));

export const CAM_LABEL: Record<Cam, string> = {
  quarter: "Tre quarti",
  beam: "Traverso",
  bow: "Prua",
  stern: "Poppa",
  top: "Alto",
  keel: "Chiglia",
};

export { PATTERN_LABEL };
