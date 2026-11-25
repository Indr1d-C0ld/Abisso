import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Ambiente "Atlantico": acqua alla quota reale del caso.
 *
 * Sistema della scena: y = 0 è l'asse del corpo resistente, a `depth` metri sotto la
 * superficie; la superficie sta quindi a y = +depth. Colore e luce cambiano con la quota
 * secondo un'attenuazione esponenziale di studio (Atlantico del Nord, acqua d'altura):
 * è una resa, non un modello ottico calibrato.
 */

const SHALLOW = new THREE.Color(0.11, 0.38, 0.44);
const DEEP = new THREE.Color(0.006, 0.035, 0.05);

/** Colore dell'acqua a una profondità, con lunghezza di attenuazione di 45 m. */
function waterColor(depthM: number) {
  return DEEP.clone().lerp(SHALLOW, Math.exp(-Math.max(0, depthM) / 45));
}

export function Atlantic({
  depth,
  loa,
  sea,
  quality,
}: {
  depth: number;
  loa: number;
  sea: boolean;
  quality: "alta" | "media";
}) {
  const { scene } = useThree();
  const water = useMemo(() => waterColor(depth), [depth]);
  const light = Math.max(0.22, Math.exp(-depth / 70));
  const baseDensity = quality === "alta" ? 0.0105 : 0.012;
  useLayoutEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = water;
    scene.fog = new THREE.FogExp2(water, baseDensity);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene, water, baseDensity]);
  // Nebbia adattiva: a camera lontana si dirada, così il battello resta leggibile a ogni
  // distanza e lo sfondo conserva la profondità. È una scelta di lettura, non ottica.
  useFrame(({ camera, controls }) => {
    const fog = scene.fog as THREE.FogExp2 | null;
    if (!fog) return;
    const target = (controls as unknown as { target?: THREE.Vector3 } | null)?.target;
    // Senza controlli (seconda vista del confronto) la distanza è quella dall'origine.
    const dist = target ? camera.position.distanceTo(target) : camera.position.length();
    fog.density = baseDensity * THREE.MathUtils.clamp(70 / Math.max(1, dist), 0.25, 1);
  });
  return (
    <>
      <hemisphereLight args={[SHALLOW.clone().multiplyScalar(2.2), new THREE.Color(0.02, 0.04, 0.05), 0.55 + light * 0.9]} />
      <directionalLight position={[10, 80, 25]} intensity={0.5 + light * 2.4} color={new THREE.Color(0.75, 0.92, 0.95)} />
      {/* Luce di lettura dal lato camera: è un'aula di studio, non una ripresa notturna. */}
      <directionalLight position={[-30, 10, 60]} intensity={0.35} color={new THREE.Color(0.7, 0.8, 0.85)} />
      <Particles loa={loa} count={quality === "alta" ? 5000 : 1800} />
      {depth < 160 && <GodRays depth={depth} loa={loa} strength={Math.exp(-depth / 90)} />}
      {sea && <SeaSurface depth={depth} />}
    </>
  );
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sedimento e plancton in sospensione: danno profondità e senso di corrente. */
function Particles({ loa, count }: { loa: number; count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, seeds, size } = useMemo(() => {
    const size = new THREE.Vector3(loa * 1.8, 46, 70);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let s = 1234567;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * size.x;
      pos[i * 3 + 1] = (rnd() - 0.5) * size.y;
      pos[i * 3 + 2] = (rnd() - 0.5) * size.z;
      seeds[i] = rnd() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geo, seeds, size };
  }, [loa, count]);
  const map = useMemo(() => dotTexture(), []);
  useFrame((_, dt) => {
    const p = ref.current;
    if (!p) return;
    const a = p.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    const t = performance.now() / 1000;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      arr[k] += dt * 0.35; // corrente lenta verso poppa→prua
      arr[k + 1] += Math.sin(t * 0.3 + seeds[i]) * dt * 0.05;
      if (arr[k] > size.x / 2) arr[k] -= size.x;
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={map}
        size={0.16}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        color={new THREE.Color(0.75, 0.85, 0.82)}
      />
    </points>
  );
}

/** Raggi di luce dalla superficie: coni additivi che svaniscono con la quota. */
function GodRays({ depth, loa, strength }: { depth: number; loa: number; strength: number }) {
  const group = useRef<THREE.Group>(null);
  const rays = useMemo(() => {
    let s = 987;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 9 }, () => ({
      x: (rnd() - 0.5) * loa * 1.4,
      z: (rnd() - 0.5) * 60,
      w: 3 + rnd() * 6,
      tilt: (rnd() - 0.5) * 0.25,
      phase: rnd() * 10,
    }));
  }, [loa]);
  const length = depth + 40;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uStrength: { value: strength }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uStrength;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float along = pow(vUv.y, 1.6);
            float across = sin(vUv.x * 3.14159);
            float flicker = 0.75 + 0.25 * sin(uTime * 0.7 + vUv.x * 6.0);
            gl_FragColor = vec4(vec3(0.55, 0.8, 0.85) * along * across * flicker * uStrength * 0.16, 1.0);
          }`,
      }),
    [strength],
  );
  useFrame(({ clock, camera }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    // Fuori dall'acqua i raggi non si vedono come coni: si attenuano.
    material.uniforms.uStrength.value = strength * (camera.position.y < depth ? 1 : 0.12);
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.rotation.z = rays[i].tilt + Math.sin(clock.elapsedTime * 0.15 + rays[i].phase) * 0.03;
    });
  });
  return (
    <group ref={group}>
      {rays.map((r, i) => (
        <mesh key={i} position={[r.x, depth - length / 2, r.z]} material={material}>
          <cylinderGeometry args={[r.w * 1.3, r.w * 0.35, length, 12, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Superficie vista da sotto: dentro la finestra di Snell (~48,6° dalla verticale) si vede
 * il cielo, fuori c'è la riflessione totale dell'acqua. Increspature animate.
 */
function SeaSurface({ depth }: { depth: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          { uTime: { value: 0 }, uWater: { value: SHALLOW.clone() } },
        ]),
        vertexShader: /* glsl */ `
          #include <fog_pars_vertex>
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            vec4 mvPosition = viewMatrix * w;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */ `
          #include <fog_pars_fragment>
          uniform float uTime;
          uniform vec3 uWater;
          varying vec3 vWorld;
          float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n2(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
          }
          void main() {
            vec2 p = vWorld.xz * 0.06;
            float r = n2(p + uTime * 0.05) * 0.6 + n2(p * 2.7 - uTime * 0.08) * 0.4;
            vec3 dir = normalize(vWorld - cameraPosition);
            if (cameraPosition.y > vWorld.y) {
              // Camera sopra la superficie: acqua traslucida, riflesso che cresce radente.
              float fres = pow(1.0 - clamp(-dir.y, 0.0, 1.0), 4.0);
              vec3 col = mix(uWater * 0.8, vec3(0.75, 0.85, 0.88), fres * 0.7) * (0.85 + 0.3 * r);
              gl_FragColor = vec4(col, 0.28 + 0.6 * fres);
            } else {
              float up = clamp(dir.y + (r - 0.5) * 0.12, 0.0, 1.0);
              // cos(48,6°) ≈ 0,66: dentro la finestra il cielo, fuori la riflessione totale.
              float window = smoothstep(0.6, 0.72, up);
              vec3 sky = vec3(0.78, 0.9, 0.92) * (0.75 + 0.25 * r);
              vec3 mirror = uWater * (0.55 + 0.35 * r);
              gl_FragColor = vec4(mix(mirror, sky, window), 1.0);
            }
            #include <fog_fragment>
          }`,
      }),
    [],
  );
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh position={[0, depth, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[3000, 3000, 1, 1]} />
    </mesh>
  );
}
