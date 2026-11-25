import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Wound } from "@/render/hullMaterial";
import type { SimResult } from "@/sim/model";
import { displayToReal, type Timeline } from "@/sim/timeline";
import { hydroAt, implosionPhase, oilRiseS, IMPLOSION_BUBBLE_S, IMPLOSION_S } from "@/sim/hydrostatics";
import { usePlayer } from "@/render/player";

let dot: THREE.Texture | null = null;
function dotTexture() {
  if (dot) return dot;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dot = new THREE.CanvasTexture(c);
  dot.colorSpace = THREE.SRGBColorSpace;
  return dot;
}

function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pennacchio di particelle deterministico nel tempo a schermo (si può scorrere la barra):
 * ogni particella nasce da una sorgente, sale lungo la verticale del mondo (espressa nel
 * riferimento del battello inclinato) e svanisce. Velocità e cadenza sono resa.
 */
function Stream({
  sources,
  count,
  color,
  size,
  rise,
  life,
  spread,
  opacity,
  intensity,
  pitch,
}: {
  sources: THREE.Vector3[];
  count: number;
  color: string;
  size: number;
  /** m per secondo a schermo. */
  rise: number;
  /** Vita in secondi a schermo. */
  life: number;
  spread: number;
  opacity: number;
  intensity: () => number;
  pitch: () => number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);
  const mat = useRef<THREE.PointsMaterial>(null);
  const pts = useRef<THREE.Points>(null);
  useFrame(() => {
    const k = intensity();
    if (pts.current) pts.current.visible = k > 0.01 && sources.length > 0;
    if (!pts.current?.visible) return;
    if (mat.current) mat.current.opacity = opacity * Math.min(1, k);
    const t = usePlayer.getState().t;
    const p = pitch();
    const up = new THREE.Vector3(Math.sin(p), Math.cos(p), 0);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const live = Math.max(1, Math.round(count * Math.min(1, k)));
    for (let i = 0; i < count; i++) {
      if (i >= live) {
        pos.setXYZ(i, 0, -1e4, 0);
        continue;
      }
      const src = sources[i % sources.length];
      const phase = (t / life + hash(i)) % 1;
      const age = phase * life;
      const h = age * rise * (0.7 + 0.6 * hash(i + 7));
      const wob = spread * (0.3 + age / life);
      const a = hash(i + 3) * Math.PI * 2 + age * 1.7;
      pos.setXYZ(
        i,
        src.x + up.x * h + Math.cos(a) * wob,
        src.y + up.y * h,
        src.z + Math.sin(a) * wob,
      );
    }
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
  });
  return (
    <points ref={pts} geometry={geo} visible={false} frustumCulled={false}>
      <pointsMaterial
        ref={mat}
        map={dotTexture()}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={opacity}
      />
    </points>
  );
}

/** Punto della ferita appena fuori dal fasciame. */
function outside(w: Wound, d = 0.15) {
  const n = new THREE.Vector3(0, w.iny, w.inz).normalize();
  return new THREE.Vector3(w.x, w.y, w.z).addScaledVector(n, -d);
}

/**
 * Conseguenze nel riferimento del battello (dentro il gruppo che porta l'assetto):
 * aria che sfiata dalle falle alte dei locali che si allagano, nafta dalle casse esterne
 * lesionate, nube di bolle all'implosione.
 */
export function HullConsequences({
  result,
  timeline,
  wounds,
  loa,
}: {
  result: SimResult;
  timeline: Timeline;
  wounds: Wound[];
  loa: number;
}) {
  const hydro = timeline.hydro;
  const flood = timeline.segments.find((s) => s.id === "allagamento");
  const tReal = () => displayToReal(timeline, usePlayer.getState().t);
  const pitch = () => hydroAt(hydro, tReal()).pitch;
  // Sfiati: falle nella metà alta, solo se c'è acqua che entra.
  const vents = useMemo(() => wounds.filter((w) => w.hole > 0 && w.y > 0.2).slice(0, 6).map((w) => outside(w)), [wounds]);
  const oil = useMemo(
    () => (result.oilSlick ? [...wounds].sort((a, b) => b.amp - a.amp).slice(0, 4).map((w) => outside(w, 0.3)) : []),
    [wounds, result.oilSlick],
  );
  const burst = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) out.push(new THREE.Vector3((hash(i) - 0.5) * 0.7 * loa, (hash(i + 5) - 0.3) * 2.5, (hash(i + 9) - 0.5) * 3));
    return out;
  }, [loa]);
  const ventK = () => {
    if (!flood) return 0;
    const t = tReal();
    if (t < flood.t0 || t > flood.t1) return 0;
    // L'aria esce finché il locale si riempie: forte all'inizio, poi cala.
    const u = (t - flood.t0) / Math.max(1, flood.t1 - flood.t0);
    return 1 - 0.75 * u;
  };
  const oilK = () => {
    const first = timeline.tracks.find((t) => t.tShock !== null)?.tShock ?? null;
    if (first === null) return 0;
    const t = tReal();
    return t > first + 0.5 ? Math.min(1, (t - first) / 4) : 0;
  };
  // Aria liberata dal cedimento: piena per la durata del collasso, poi cala.
  const burstK = () => {
    const u = implosionPhase(hydro, tReal());
    return u < 0 ? 0 : Math.max(0, 1 - Math.max(0, u - 1) / (IMPLOSION_BUBBLE_S / IMPLOSION_S + 2));
  };
  return (
    <group>
      <Stream sources={vents} count={260} color="#dfeeee" size={0.32} rise={2.4} life={2.2} spread={0.35} opacity={0.75} intensity={ventK} pitch={pitch} />
      <Stream sources={oil} count={220} color="#1a1410" size={0.42} rise={0.6} life={4} spread={0.6} opacity={0.85} intensity={oilK} pitch={pitch} />
      <Stream sources={burst} count={700} color="#e6f2f2" size={0.9} rise={5} life={1.6} spread={2.4} opacity={0.9} intensity={burstK} pitch={pitch} />
    </group>
  );
}

/**
 * Chiazza di nafta sulla superficie (nel mondo, fuori dal gruppo del battello): compare
 * quando le gocce hanno avuto il tempo di risalire dalla quota dello scafo.
 */
export function OilSlick({ result, timeline, surfaceY }: { result: SimResult; timeline: Timeline; surfaceY: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uGrow: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uGrow;
          uniform float uTime;
          float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            p.x *= 0.6;
            float r = length(p) + (n(p * 3.0 + uTime * 0.02) - 0.5) * 0.35;
            float edge = 1.0 - smoothstep(uGrow * 0.75, uGrow, r);
            if (edge <= 0.01) discard;
            // Iridescenza del velo sottile sul bordo, nero al centro.
            float film = n(p * 9.0) * 0.6 + r * 2.0;
            vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (film + vec3(0.0, 0.33, 0.67)));
            vec3 col = mix(vec3(0.03, 0.025, 0.02), rainbow * 0.35, smoothstep(0.2, 0.9, r / max(0.01, uGrow)));
            gl_FragColor = vec4(col, 0.78 * edge);
          }`,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const rise = oilRiseS(timeline.surfaceY);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const first = timeline.tracks.find((t) => t.tShock !== null)?.tShock ?? null;
    const t = displayToReal(timeline, usePlayer.getState().t);
    const since = first === null ? -1 : t - first - rise;
    m.visible = result.oilSlick && since > 0;
    if (!m.visible) return;
    material.uniforms.uGrow.value = Math.min(1, 0.25 + since / 600);
    material.uniforms.uTime.value = clock.elapsedTime;
    m.position.y = surfaceY + 0.08;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={material} visible={false} renderOrder={4}>
      {/* Rapporti ASW: chiazze da 200 × 100 m fino a oltre un chilometro. */}
      <planeGeometry args={[200, 110]} />
    </mesh>
  );
}
