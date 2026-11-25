import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { ChargeModel } from "@/components/abisso/ChargeModel";
import { chargeModelFor } from "@/components/abisso/chargeModels";
import { coleMPa, LEVEL_THRESHOLDS, n, SOUND_MPS, uOfEffect, type SimResult } from "@/sim/model";
import type { ResponseReport } from "@/sim/response";
import {
  bubbleRadius,
  bubbleRise,
  chargeState,
  displayToReal,
  realToDisplay,
  type ChargeTrack,
  type Timeline,
} from "@/sim/timeline";
import { usePlayer } from "@/render/player";

/**
 * Effetti della ricostruzione nel tempo. Tutto è guidato dalla linea del tempo
 * (src/sim/timeline.ts) e dall'orologio del lettore: nessuna durata inventata qui, salvo
 * le durate a schermo del lampo (0,45 s) dichiarate sotto.
 */

const YIELD_COLOR = { full: "#b5523a", mechanical: "#c6a15a", none: "#8a8070" } as const;
const FLASH_SCREEN_S = 0.45;

const realNow = (tl: Timeline) => displayToReal(tl, usePlayer.getState().t);

const ISO_COLOR: Record<string, string> = { rottura: "#2a1814", allagamento: "#b5523a", falle: "#d4783a", scossa: "#c6a15a" };
const ISO_OPACITY = [0.2, 0.12, 0.08, 0.05];

/** Cariche in discesa con deriva e rotazione; lo scoppio pieno le consuma. */
export function Charges({
  timeline,
  result,
  weaponId,
  spheres,
}: {
  timeline: Timeline;
  result: SimResult;
  weaponId: string;
  spheres: boolean;
}) {
  const model = chargeModelFor(weaponId);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = realNow(timeline);
    timeline.tracks.forEach((tr, i) => {
      const g = refs.current[i];
      if (!g) return;
      const s = chargeState(tr, t);
      g.position.set(...s.pos);
      g.visible = s.visible;
      // Rotolamento lento durante la discesa (resa).
      g.rotation.set(t * 0.35 + i, t * 0.2, t * 0.27 + i * 0.5);
      const ring = rings.current[i];
      if (ring) ring.visible = s.arrived;
    });
  });
  const drawn = useMemo(() => {
    const live = result.charges.filter((c) => c.yield === "full").sort((a, b) => a.slantPh - b.slantPh);
    return live.length > 6 ? live.slice(0, 4) : live;
  }, [result]);
  return (
    <group>
      {timeline.tracks.map((tr, i) => {
        const sphere = (
          <mesh>
            <sphereGeometry args={[tr.yield === "none" ? 0.28 : 0.55, 12, 10]} />
            <meshStandardMaterial color={YIELD_COLOR[tr.yield]} roughness={0.45} />
          </mesh>
        );
        return (
          <group key={tr.id}>
            <group ref={(g) => void (refs.current[i] = g)}>
              {model ? (
                <Suspense fallback={sphere}>
                  <ChargeModel model={model} chargeId={tr.id} position={[0, 0, 0]} />
                </Suspense>
              ) : (
                sphere
              )}
            </group>
            {/* Anello dell'esito, al punto di scoppio, dopo l'arrivo. */}
            <group ref={(g) => void (rings.current[i] = g)} position={tr.end} visible={false}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.62, 0.035, 8, 40]} />
                <meshBasicMaterial color={YIELD_COLOR[tr.yield]} />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* Isosuperfici del campo di gravità sul Druckkörper: una sfera per soglia, raggio
          u(s) · rSplit, con u inversa della curva degli effetti. */}
      {spheres &&
        drawn.map((c, ci) =>
          LEVEL_THRESHOLDS.map((th, k) => {
            const r = Math.max(0.8, c.rSplit * uOfEffect(th.s));
            return (
              <group key={`${c.id}-${th.level}`} position={[c.x, c.y, c.z]}>
                <mesh renderOrder={5 + k}>
                  <sphereGeometry args={[r, 40, 24]} />
                  <meshBasicMaterial color={ISO_COLOR[th.level]} transparent opacity={ISO_OPACITY[k]} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
                {[
                  [Math.PI / 2, 0, 0],
                  [0, 0, 0],
                ].map((rot, j) => (
                  <mesh key={j} rotation={rot as [number, number, number]}>
                    <torusGeometry args={[r, 0.04, 6, 96]} />
                    <meshBasicMaterial color={ISO_COLOR[th.level]} transparent opacity={0.85} />
                  </mesh>
                ))}
                {ci === 0 && (
                  <Html position={[0, r, 0]} center distanceFactor={60} className="wave-tag" zIndexRange={[5, 0]}>
                    {th.label} · {n(r, 1)} m
                  </Html>
                )}
              </group>
            );
          }),
        )}
    </group>
  );
}

/** Lampo di scoppio: dura 0,45 s a schermo, qualunque sia il rallentamento. */
export function Flashes({ timeline }: { timeline: Timeline }) {
  const live = timeline.tracks.filter((t) => t.yield === "full");
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const at = useMemo(() => live.map((t) => realToDisplay(timeline, t.tEnd)), [live, timeline]);
  useFrame(() => {
    const d = usePlayer.getState().t;
    live.forEach((tr, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = (d - at[i]) / FLASH_SCREEN_S;
      m.visible = k >= 0 && k < 1;
      if (!m.visible) return;
      m.scale.setScalar(0.4 + Math.max(0.6, tr.bubbleR * 0.5) * Math.sqrt(k));
      (m.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - k, 1.5);
    });
  });
  return (
    <group>
      {live.map((tr, i) => (
        <mesh key={tr.id} ref={(m) => void (refs.current[i] = m)} position={tr.end} visible={false}>
          <sphereGeometry args={[1, 24, 16]} />
          {/* Colore fuori scala per il bloom. */}
          <meshBasicMaterial color={new THREE.Color(6, 4.2, 2.4)} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Fronti d'urto: raggio = 1 490 m/s × tempo dallo scoppio, nel tempo reale. Il segmento
 * "onda" della linea del tempo li rallenta di centinaia di volte.
 */
export function ShockFronts({
  timeline,
  result,
  subtle,
  hit,
}: {
  timeline: Timeline;
  result: SimResult;
  subtle: boolean;
  /** Punto del Druckkörper più vicino allo scoppio principale, per l'etichetta. */
  hit: [number, number, number] | null;
}) {
  const live = timeline.tracks.filter((t) => t.yield === "full").slice(0, 8);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const tag = useRef<HTMLDivElement>(null);
  const reach = result.wave.reachM;
  const primary = useMemo(() => [...live].sort((a, b) => a.slantPh - b.slantPh)[0] ?? null, [live]);
  useFrame(() => {
    const t = realNow(timeline);
    live.forEach((tr, i) => {
      const m = refs.current[i];
      if (!m) return;
      const r = (t - tr.tEnd) * SOUND_MPS;
      m.visible = r > 0 && r < reach;
      if (!m.visible) return;
      m.scale.setScalar(Math.max(0.3, r));
      const u = r / reach;
      (m.material as THREE.MeshBasicMaterial).opacity = subtle ? 0.18 * Math.pow(1 - u, 0.8) : 0.45 * Math.pow(1 - u, 0.55);
    });
    if (tag.current && primary) {
      const r = (t - primary.tEnd) * SOUND_MPS;
      const show = r > 0 && r < reach;
      tag.current.style.opacity = show ? "1" : "0";
      if (show) {
        const ms = (r / SOUND_MPS) * 1000;
        const p = coleMPa(result.weq, r);
        tag.current.textContent =
          r < 1
            ? "Campo vicino: Cole non vale sotto il metro"
            : `${ms.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ms · ${p.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MPa${r >= primary.slantPh ? " · sul cilindro" : ""}`;
      }
    }
  });
  return (
    <group>
      {live.map((tr, i) => (
        <mesh key={tr.id} ref={(m) => void (refs.current[i] = m)} position={tr.end} visible={false}>
          <sphereGeometry args={[1, subtle ? 48 : 28, subtle ? 32 : 18]} />
          <meshBasicMaterial
            color={subtle ? "#cfe6e2" : "#c6a15a"}
            wireframe={!subtle}
            transparent
            depthWrite={false}
            blending={subtle ? THREE.AdditiveBlending : THREE.NormalBlending}
            side={subtle ? THREE.BackSide : THREE.FrontSide}
          />
        </mesh>
      ))}
      {hit && primary && (
        <Html position={[hit[0], hit[1] + 1.2, hit[2]]} center sprite distanceFactor={55} style={{ pointerEvents: "none" }}>
          <div className="wave-tag" ref={tag} style={{ opacity: 0 }} />
        </Html>
      )}
    </group>
  );
}

const bubbleMaterial = (subtle: boolean) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSubtle: { value: subtle ? 1 : 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        // Superficie della bolla che trema: piccole onde, non una sfera da manuale.
        vec3 p = position * (1.0 + 0.035 * sin(position.x * 7.0 + uTime * 9.0) * sin(position.y * 6.0 - uTime * 7.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSubtle;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float rim = pow(1.0 - abs(dot(vN, vV)), 2.5);
        vec3 gas = mix(vec3(0.55, 0.66, 0.64), vec3(0.85, 0.95, 0.95), rim);
        float a = mix(0.14, 0.08, uSubtle) + rim * mix(0.35, 0.6, uSubtle);
        gl_FragColor = vec4(gas, a);
      }`,
  });

/**
 * Bolle di gas: raggio massimo e primo periodo dal modello; cicli successivi smorzati e
 * risalita come ipotesi di resa (src/sim/timeline.ts).
 */
export function Bubbles({ timeline, subtle }: { timeline: Timeline; subtle: boolean }) {
  const live = timeline.tracks.filter((t) => t.yield === "full" && t.bubbleR > 0).slice(0, 8);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const material = useMemo(() => bubbleMaterial(subtle), [subtle]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    const t = realNow(timeline);
    live.forEach((tr: ChargeTrack, i) => {
      const m = refs.current[i];
      if (!m) return;
      const tau = t - tr.tEnd;
      const r = bubbleRadius(tr, tau);
      m.visible = r > 0;
      if (!m.visible) return;
      m.scale.setScalar(r);
      m.position.set(tr.end[0], tr.end[1] + bubbleRise(tr, tau), tr.end[2]);
    });
  });
  return (
    <group>
      {live.map((tr, i) => (
        <mesh key={tr.id} ref={(m) => void (refs.current[i] = m)} material={material} visible={false}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Getto della bolla al primo collasso, nella direzione del vettore di anisotropia
 * (galleggiamento + scafo + superficie, Supponen et al. 2016). Verso lo scafo arriva fino
 * alla lamiera; verso l'alto o il basso si allunga di un raggio e mezzo.
 */
export function Jets({ timeline, report }: { timeline: Timeline; report: ResponseReport }) {
  const items = useMemo(
    () =>
      report.charges
        .filter((r) => r.bubble.zetaMag >= 1e-3 || r.bubble.regime.startsWith("scafo"))
        .map((r) => {
          const tr = timeline.tracks.find((t) => t.id === r.id)!;
          const z = r.bubble.zeta;
          const m = Math.hypot(...z) || 1;
          const dir = new THREE.Vector3(z[0] / m, z[1] / m, z[2] / m);
          const toHull = r.bubble.regime.startsWith("scafo");
          return { r, tr, dir, toHull };
        }),
    [timeline, report],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = realNow(timeline);
    items.forEach(({ r, tr, dir, toHull }, i) => {
      const g = refs.current[i];
      if (!g) return;
      const tc = tr.tEnd + tr.periodS;
      const span = 0.18 * tr.periodS;
      const k = (t - (tc - 0.05 * tr.periodS)) / span;
      g.visible = k > 0 && k < 1.6;
      if (!g.visible) return;
      const origin = new THREE.Vector3(tr.end[0], tr.end[1] + bubbleRise(tr, t - tr.tEnd), tr.end[2]);
      const full = toHull ? origin.distanceTo(new THREE.Vector3(...r.hullPoint)) : 1.5 * tr.bubbleR;
      const len = Math.max(0.2, full * Math.min(1, k));
      g.position.copy(origin);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.scale.set(1, len, 1);
      const mesh = g.children[0] as THREE.Mesh;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.max(0, 1 - Math.max(0, k - 1) / 0.6);
    });
  });
  return (
    <group>
      {items.map(({ r, tr }, i) => (
        <group key={r.id} ref={(g) => void (refs.current[i] = g)} visible={false}>
          {/* Cono lungo 1 sull'asse +Y, base nell'origine: la scala Y è la lunghezza. */}
          <mesh position={[0, 0.5, 0]}>
            <coneGeometry args={[Math.max(0.12, tr.bubbleR * 0.12), 1, 16, 1, true]} />
            <meshBasicMaterial color={new THREE.Color(2.2, 2.4, 2.4)} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Cupola di spruzzo in superficie (Mellor 1986, eq. 15): velocità iniziale 2 P_m / (ρ c)
 * sulla verticale, profilo radiale (1 + (r/d)²)^−1,07, poi caduta balistica. Parte quando
 * l'onda d'urto raggiunge la superficie. Solo se il tipo di eruzione è visibile.
 */
export function SurfaceDome({ timeline, report, surfaceY }: { timeline: Timeline; report: ResponseReport; surfaceY: number }) {
  const s = report.surface;
  const track = useMemo(() => {
    const live = timeline.tracks.filter((t) => t.yield === "full");
    return live.length ? live.reduce((a, b) => (a.end[1] > b.end[1] ? a : b)) : null;
  }, [timeline]);
  const depth = track ? surfaceY - track.end[1] : 0;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uH: { value: 0 }, uD: { value: Math.max(1, depth) } },
        vertexShader: /* glsl */ `
          uniform float uH;
          uniform float uD;
          varying float vP;
          void main() {
            float r = length(position.xy);
            float prof = pow(1.0 + (r / uD) * (r / uD), -1.07);
            vP = prof;
            vec3 p = vec3(position.xy, uH * prof);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uH;
          varying float vP;
          void main() {
            // Acqua sbiancata solo dove il sollevamento locale supera ~0,8 m (centro della cupola);
            // opacità contenuta: la vista resta di studio.
            float lift = uH * vP;
            float foam = smoothstep(0.8, 2.0, lift);
            gl_FragColor = vec4(vec3(0.9, 0.95, 0.95), foam * 0.4);
          }`,
      }),
    [depth],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!s || !track || !ref.current) return;
    const tau = realNow(timeline) - (track.tEnd + depth / SOUND_MPS);
    const h = tau > 0 ? Math.max(0, s.domeMps * tau - 4.905 * tau * tau) : 0;
    material.uniforms.uH.value = h;
    ref.current.visible = h > 0.01;
  });
  if (!s || !s.visible || !track) return null;
  const R = Math.min(160, Math.max(10, depth * 2));
  return (
    <mesh ref={ref} position={[track.end[0], surfaceY + 0.05, track.end[2]]} rotation={[-Math.PI / 2, 0, 0]} material={material} visible={false}>
      <circleGeometry args={[R, 96]} />
    </mesh>
  );
}
