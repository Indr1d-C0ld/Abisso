import { create } from "zustand";

/**
 * Orologio della ricostruzione, separato dallo stato dell'app: la barra del tempo si
 * aggiorna a ogni fotogramma senza ridisegnare i pannelli. Gli effetti 3D leggono
 * `usePlayer.getState()` dentro useFrame.
 *
 * `?t=12.5` nell'URL ferma la riproduzione a quel secondo a schermo (screenshot di verifica).
 */
type PlayerState = {
  /** Secondi a schermo dall'inizio della ricostruzione. */
  t: number;
  duration: number;
  playing: boolean;
  /** Valore di ?t= se presente: la riproduzione non parte da sola. */
  pinned: number | null;
  restart: (duration: number) => void;
  setDuration: (duration: number) => void;
  seek: (t: number) => void;
  toggle: () => void;
  tick: (dt: number) => void;
};

function pinnedFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("t");
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  t: 0,
  duration: 1,
  playing: false,
  pinned: pinnedFromUrl(),
  restart: (duration) => {
    const pinned = get().pinned;
    if (pinned !== null) {
      set({ duration, t: Math.min(pinned, duration), playing: false });
      return;
    }
    // Con il movimento ridotto si mostra direttamente lo stato finale.
    if (reducedMotion()) {
      set({ duration, t: duration, playing: false });
      return;
    }
    set({ duration, t: 0, playing: true });
  },
  setDuration: (duration) => set({ duration, t: Math.min(get().t, duration) }),
  seek: (t) => set({ t: Math.min(Math.max(0, t), get().duration), playing: false }),
  toggle: () => {
    const { playing, t, duration } = get();
    if (!playing && t >= duration - 1e-3) set({ t: 0, playing: true });
    else set({ playing: !playing });
  },
  tick: (dt) => {
    const { playing, t, duration } = get();
    if (!playing) return;
    const next = t + dt;
    if (next >= duration) set({ t: duration, playing: false });
    else set({ t: next });
  },
}));
