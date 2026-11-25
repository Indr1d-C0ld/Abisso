import { usePlayer } from "@/render/player";

/**
 * Esportazione della vista (Fase 5): immagine PNG e sequenza WebM della ricostruzione.
 * Compone tutte le tele della vista (una, o due nel confronto) in una sola immagine con
 * una didascalia in basso; tutto avviene nel browser, niente viene inviato altrove.
 */

const STRIP = 34;

function canvases() {
  return Array.from(document.querySelectorAll<HTMLCanvasElement>(".viewport canvas"));
}

function compose(target: HTMLCanvasElement, sources: HTMLCanvasElement[], captions: string[]) {
  const h = Math.max(...sources.map((c) => c.height));
  const w = sources.reduce((s, c) => s + c.width, 0);
  const scale = Math.max(1, h / 720);
  const strip = Math.round(STRIP * scale);
  if (target.width !== w || target.height !== h + strip) {
    target.width = w;
    target.height = h + strip;
  }
  const g = target.getContext("2d")!;
  g.fillStyle = "#14181a";
  g.fillRect(0, 0, target.width, target.height);
  let x = 0;
  g.font = `${Math.round(14 * scale)}px "Barlow", system-ui, sans-serif`;
  g.textBaseline = "middle";
  sources.forEach((c, i) => {
    g.drawImage(c, x, 0);
    g.fillStyle = "#e7dcc6";
    g.fillText(captions[i] ?? "", x + 12 * scale, h + strip / 2, c.width - 24 * scale);
    x += c.width;
  });
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function stamp() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Salva la vista corrente come PNG. Restituisce false se non c'è nulla da salvare. */
export async function exportImage(captions: string[]) {
  const src = canvases();
  if (!src.length) return false;
  const out = document.createElement("canvas");
  // Un fotogramma di attesa: la tela WebGL è appena stata disegnata.
  await new Promise((r) => requestAnimationFrame(r));
  compose(out, src, captions);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
  if (!blob) return false;
  download(blob, `abisso-${stamp()}.png`);
  return true;
}

export function canRecord() {
  return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

let stopCurrent: (() => void) | null = null;

/** Ferma la registrazione in corso (il file viene comunque salvato). */
export function stopRecording() {
  stopCurrent?.();
}

/**
 * Registra la ricostruzione dall'inizio alla fine come WebM, a 30 fotogrammi al secondo.
 * `captions` viene richiamata a ogni fotogramma (la didascalia segue la barra del tempo).
 */
export function recordSequence(captions: () => string[]): Promise<boolean> {
  const src = canvases();
  if (!src.length || !canRecord() || stopCurrent) return Promise.resolve(false);
  const out = document.createElement("canvas");
  compose(out, src, captions());
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const rec = new MediaRecorder(out.captureStream(30), { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  return new Promise((resolve) => {
    let raf = 0;
    let done = false;
    let tail = 0;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      stopCurrent = null;
      rec.stop();
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      if (blob.size) download(blob, `abisso-${stamp()}.webm`);
      resolve(blob.size > 0);
    };
    stopCurrent = finish;
    usePlayer.setState({ t: 0, playing: true });
    rec.start(500);
    const loop = () => {
      compose(out, canvases().length ? canvases() : src, captions());
      const p = usePlayer.getState();
      // Mezzo secondo di coda sull'ultimo fotogramma.
      if (!p.playing && p.t >= p.duration - 1e-3) {
        tail += 1;
        if (tail > 30) return finish();
      } else if (!p.playing) {
        // L'utente ha messo in pausa: la registrazione si chiude lì.
        return finish();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });
}
