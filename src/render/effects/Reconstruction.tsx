import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { ChargeModel } from "@/components/abisso/ChargeModel";
import { chargeModelFor } from "@/components/abisso/chargeModels";
import { coleMPa, SOUND_MPS, type SimResult } from "@/sim/model";
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
    const live = result.charges.filter((c) => c.yield === "full");
    return live.length > 6 ? [...live].sort((a, b) => a.slantPh - b.slantPh).slice(0, 4) : live;
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
      {spheres &&
        drawn.map((c) => (
          <mesh key={`${c.id}-r`} position={[c.x, c.y, c.z]}>
            <sphereGeometry args={[Math.max(0.8, c.rSplit), 24, 16]} />
            <meshBasicMaterial color="#b5523a" wireframe transparent opacity={0.2} />
          </mesh>
        ))}
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
