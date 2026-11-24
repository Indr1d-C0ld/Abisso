import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import type { ChargeResult, HullProbe, Level, SimResult } from "@/sim/model";
import { coleMPa, severityAtPoint, SOUND_MPS } from "@/sim/model";
import { outerPoint, stationRadii, towerBox } from "@/sim/shape";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { ChargeModel } from "@/components/abisso/ChargeModel";
import { BoatModel } from "@/components/abisso/BoatModel";
import { boatModelFor } from "@/components/abisso/boatModels";
import { applyBreachMask, createDamageUniforms, updateDamageUniforms } from "@/render/hullMaterial";
import { Atlantic } from "@/render/water/Atlantic";
import { PostFX } from "@/render/PostFX";
import { chargeModelFor } from "@/components/abisso/chargeModels";

function buildOuter(boatId: string) {
  const boat = boatById(boatId);
  const rings = 84;
  const segs = 40;
  const row = segs + 1;
  const pos = new Float32Array((rings + 1) * row * 3);
  const uv = new Float32Array((rings + 1) * row * 2);
  const idx: number[] = [];
  let p = 0;
  let u = 0;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const v = outerPoint(boat, t, a);
      pos[p++] = v.x;
      pos[p++] = v.y;
      pos[p++] = v.z;
      uv[u++] = j / segs;
      uv[u++] = t;
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.length), 3));
  geo.setAttribute("rest", new THREE.BufferAttribute(Float32Array.from(pos), 3));
  geo.userData.baseIndex = idx.slice();
  return geo;
}

function buildPh(boatId: string) {
  const boat = boatById(boatId);
  const rings = 56;
  const segs = 28;
  const row = segs + 1;
  const t0 = 0.5 - boat.phLength / boat.loa / 2;
  const t1 = 0.5 + boat.phLength / boat.loa / 2;
  const pos = new Float32Array((rings + 1) * row * 3);
  const idx: number[] = [];
  let p = 0;
  for (let i = 0; i <= rings; i++) {
    const s = stationRadii(boat, t0 + ((t1 - t0) * i) / rings);
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const r = Math.max(0.05, s.phr);
      pos[p++] = s.x;
      pos[p++] = Math.cos(a) * r;
      pos[p++] = Math.sin(a) * r;
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.length), 3));
  geo.setAttribute("rest", new THREE.BufferAttribute(Float32Array.from(pos), 3));
  geo.userData.baseIndex = idx.slice();
  return geo;
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function damageTint(sev: number): [number, number, number] {
  if (sev < 0.1) return [1, 1, 1];
  if (sev < 0.28) {
    const u = (sev - 0.1) / 0.18;
    return [1, mix(1, 0.82, u), mix(1, 0.28, u)];
  }
  if (sev < 0.55) {
    const u = (sev - 0.28) / 0.27;
    return [1, mix(0.82, 0.42, u), mix(0.28, 0.1, u)];
  }
  if (sev < 0.85) {
    const u = (sev - 0.55) / 0.3;
    return [1, mix(0.42, 0.16, u), mix(0.1, 0.08, u)];
  }
  const u = Math.min(1, (sev - 0.85) / 0.15);
  return [mix(1, 0.2, u), mix(0.16, 0.04, u), mix(0.08, 0.03, u)];
}

type Wound = {
  x: number;
  y: number;
  z: number;
  hole: number;
  /** Verso fuori scafo, per i pezzi staccati. */
  ox: number;
  oy: number;
  oz: number;
  dentR: number;
  amp: number;
  inx: number;
  iny: number;
  inz: number;
};

function ampOf(sev: number, mechanical: boolean) {
  let a = 0;
  if (sev >= 0.85) a = 0.72;
  else if (sev >= 0.55) a = 0.38 + (sev - 0.55) * 0.9;
  else if (sev >= 0.28) a = 0.16 + (sev - 0.28) * 0.7;
  else if (sev >= 0.1) a = (sev - 0.1) * 0.6;
  if (mechanical) a *= 0.35;
  return a;
}

/** Piega la lamiera e, sopra la soglia di rottura, toglie i triangoli dello squarcio. Il colore resta l’indice. */
function stamp(geo: THREE.BufferGeometry, charges: ChargeResult[], layer: "outer" | "ph") {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const rest = geo.getAttribute("rest") as THREE.BufferAttribute;
  const col = geo.getAttribute("color") as THREE.BufferAttribute;
  const base = geo.userData.baseIndex as number[];
  const wounds: Wound[] = [];
  for (const c of charges) {
    if (c.yield === "none") continue;
    let best = Infinity;
    let bx = 0;
    let by = 0;
    let bz = 0;
    for (let i = 0; i < rest.count; i++) {
      const d = Math.hypot(rest.getX(i) - c.x, rest.getY(i) - c.y, rest.getZ(i) - c.z);
      if (d < best) {
        best = d;
        bx = rest.getX(i);
        by = rest.getY(i);
        bz = rest.getZ(i);
      }
    }
    const sev = severityAtPoint([c], bx, by, bz, layer);
    if (sev < 0.1) continue;
    const hole =
      c.yield === "full" && sev >= 0.85
        ? Math.min(layer === "outer" ? 1.75 : 0.95, Math.max(layer === "outer" ? 0.42 : 0.24, c.rSplit * (layer === "outer" ? 0.2 : 0.13)))
        : 0;
    const dentR = Math.min(layer === "outer" ? 6.5 : 3.4, Math.max(hole * 2.4, 1.1, c.rSplit * (layer === "outer" ? 0.5 : 0.36)));
    const il = Math.hypot(by, bz) || 1;
    const inx = 0;
    const iny = -by / il;
    const inz = -bz / il;
    wounds.push({
      x: bx,
      y: by,
      z: bz,
      hole,
      ox: -inx,
      oy: -iny,
      oz: -inz,
      dentR,
      amp: ampOf(sev, c.yield === "mechanical"),
      inx,
      iny,
      inz,
    });
  }
  for (let i = 0; i < rest.count; i++) {
    const x = rest.getX(i);
    const y = rest.getY(i);
    const z = rest.getZ(i);
    let nx = x;
    let ny = y;
    let nz = z;
    for (const w of wounds) {
      const d = Math.hypot(x - w.x, y - w.y, z - w.z);
      if (d >= w.dentR) continue;
      const u = 1 - d / w.dentR;
      nx += w.inx * w.amp * u * u;
      ny += w.iny * w.amp * u * u;
      nz += w.inz * w.amp * u * u;
      if (w.hole > 0 && d > w.hole && d < w.hole * 1.5) {
        const lip = Math.max(0, 1 - Math.abs(d - w.hole * 1.2) / (w.hole * 0.35)) * 0.18;
        nx -= w.inx * lip;
        ny -= w.iny * lip;
        nz -= w.inz * lip;
      }
    }
    pos.setXYZ(i, nx, ny, nz);
    const sev = severityAtPoint(charges, x, y, z, layer);
    const [r, g, b] = damageTint(sev);
    col.setXYZ(i, r, g, b);
  }
  const next: number[] = [];
  for (let t = 0; t < base.length; t += 3) {
    const ia = base[t];
    const ib = base[t + 1];
    const ic = base[t + 2];
    const cx = (rest.getX(ia) + rest.getX(ib) + rest.getX(ic)) / 3;
    const cy = (rest.getY(ia) + rest.getY(ib) + rest.getY(ic)) / 3;
    const cz = (rest.getZ(ia) + rest.getZ(ib) + rest.getZ(ic)) / 3;
    let open = false;
    for (const w of wounds) {
      if (w.hole > 0 && Math.hypot(cx - w.x, cy - w.y, cz - w.z) < w.hole) {
        open = true;
        break;
      }
    }
    if (!open) next.push(ia, ib, ic);
  }
  geo.setIndex(next);
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeVertexNormals();
  geo.userData.wounds = wounds;
  return wounds;
}

function paint(geo: THREE.BufferGeometry, charges: ChargeResult[], layer: "outer" | "ph") {
  return stamp(geo, charges, layer);
}

function plateTexture(mode: "controllo" | "atlantico") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  if (!g) return null;
  const light = mode === "controllo";
  const base: [number, number, number] = light ? [196, 204, 184] : [92, 102, 94];
  const boot: [number, number, number] = light ? [122, 132, 116] : [48, 54, 50];
  const seam: [number, number, number] = light ? [78, 86, 74] : [28, 32, 30];
  const slot: [number, number, number] = light ? [36, 40, 36] : [16, 18, 16];
  const img = g.createImageData(1024, 512);
  const data = img.data;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 1024; x++) {
      const a = (x / 1024) * Math.PI * 2;
      const cy = Math.cos(a);
      const i = (y * 1024 + x) * 4;
      let r = base[0];
      let gv = base[1];
      let b = base[2];
      if (cy < 0.08) {
        const u = Math.min(1, (0.08 - cy) / 0.95);
        r = mix(r, boot[0], u);
        gv = mix(gv, boot[1], u);
        b = mix(b, boot[2], u);
      }
      const frame = y % 64 < 3;
      const strake = x % 128 < 2;
      if (frame || strake) {
        r = seam[0];
        gv = seam[1];
        b = seam[2];
      }
      const shoulder = cy > 0.42 && cy < 0.78;
      if (shoulder && y % 40 > 6 && y % 40 < 16 && !frame) {
        r = slot[0];
        gv = slot[1];
        b = slot[2];
      }
      data[i] = r;
      data[i + 1] = gv;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function pose(cam: string, loa: number): [number, number, number] {
  const L = Math.max(32, loa);
  const table: Record<string, [number, number, number]> = {
    quarter: [L * 0.78, L * 0.34, L * 1.08],
    beam: [0, L * 0.16, L * 1.75],
    bow: [L * 1.35, L * 0.22, L * 0.42],
    stern: [-L * 1.35, L * 0.24, L * 0.48],
    top: [L * 0.05, L * 1.9, L * 0.62],
    keel: [L * 0.4, -L * 0.7, L * 0.9],
  };
  return table[cam] ?? table.quarter;
}

function CameraRig({ cam, loa }: { cam: string; loa: number }) {
  const camera = useThree((s) => s.camera);
  const get = useThree((s) => s.get);
  const armed = useRef(0);
  useLayoutEffect(() => {
    armed.current = 0;
  }, [cam, loa]);
  useFrame(() => {
    if (armed.current > 8) return;
    const p = pose(cam, loa);
    const target = new THREE.Vector3(0, 0.4, 0);
    camera.position.set(p[0], p[1], p[2]);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 46;
      camera.near = 0.2;
      camera.far = 900;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target);
    const controls = get().controls as { target: THREE.Vector3; update: () => void } | null;
    if (controls) {
      controls.target.copy(target);
      controls.update();
      armed.current += 1;
    }
  });
  return null;
}

function contactOnPh(boatId: string, x: number, y: number, z: number) {
  const boat = boatById(boatId);
  let best = Infinity;
  let px = x;
  let py = 0;
  let pz = 0;
  for (let i = 0; i <= 28; i++) {
    const s = stationRadii(boat, i / 28);
    const r = Math.max(0.15, s.phr);
    const L = Math.hypot(y, z) || 1;
    const hy = (y / L) * r;
    const hz = (z / L) * r;
    const d = Math.hypot(x - s.x, y - hy, z - hz);
    if (d < best) {
      best = d;
      px = s.x;
      py = hy;
      pz = hz;
    }
  }
  return [px, py, pz] as const;
}

function Shocks({ shot, boatId, result }: { shot: number; boatId: string; result: SimResult }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef(0);
  const clock = useThree((s) => s.clock);
  const tag = useRef<HTMLDivElement>(null);
  const live = result.charges.filter((c) => c.yield === "full").slice(0, 8);
  const nearest = result.wave.passes[0];
  const hit = useMemo(() => (live[0] ? contactOnPh(boatId, live[0].x, live[0].y, live[0].z) : null), [boatId, live]);
  useEffect(() => {
    start.current = clock.elapsedTime;
  }, [shot, clock]);
  useFrame(() => {
    const g = ref.current;
    if (!g || !nearest) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = clock.elapsedTime - start.current;
    const u = reduce ? Math.min(1, nearest.slantM / result.wave.reachM) : Math.min(1, elapsed / result.wave.screenS);
    const radius = Math.max(0.7, u * result.wave.reachM);
    g.children.forEach((child, i) => {
      if (i >= live.length) return;
      const front = child as THREE.Mesh;
      front.scale.setScalar(radius);
      const mat = front.material as THREE.MeshBasicMaterial;
      mat.opacity = reduce ? 0.22 : Math.max(0.05, 0.42 * Math.pow(1 - u, 0.55));
    });
    const flash = g.getObjectByName("flash") as THREE.Mesh | undefined;
    if (flash) {
      const over = radius - nearest.slantM;
      const mat = flash.material as THREE.MeshBasicMaterial;
      mat.opacity = over < 0 ? 0 : Math.max(0, 0.75 * (1 - over / 8));
    }
    if (tag.current) {
      const ms = (radius / SOUND_MPS) * 1000;
      const p = coleMPa(result.weq, radius);
      const arrived = radius >= nearest.slantM;
      tag.current.textContent =
        radius < 1
          ? "Campo vicino: Cole non vale sotto il metro"
          : `${ms.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ms · ${p.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MPa${arrived ? " · sul cilindro" : ""}`;
    }
  });
  if (!live.length || !nearest || !hit) return null;
  return (
    <group ref={ref}>
      {live.map((c) => (
        <mesh key={c.id} position={[c.x, c.y, c.z]}>
          <sphereGeometry args={[1, 28, 18]} />
          <meshBasicMaterial color="#c6a15a" wireframe transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
      <mesh name="flash" position={hit}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshBasicMaterial color="#b5523a" transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[hit[0], hit[1] + 1.2, hit[2]]} center sprite distanceFactor={22} style={{ pointerEvents: "none" }}>
        <div className="wave-tag" ref={tag} />
      </Html>
    </group>
  );
}

function Bubbles({ shot, result }: { shot: number; result: SimResult }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef(0);
  const clock = useThree((s) => s.clock);
  const live = result.charges.filter((c) => c.yield === "full" && c.bubbleR > 0).slice(0, 4);
  const longest = Math.max(0.3, ...live.map((c) => c.periodS));
  useEffect(() => {
    start.current = clock.elapsedTime;
  }, [shot, clock, result]);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = clock.elapsedTime - start.current;
    g.children.forEach((child, i) => {
      const c = live[i];
      if (!c) return;
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (reduce) {
        mesh.scale.setScalar(Math.max(0.2, c.bubbleR));
        mat.opacity = 0.1;
        return;
      }
      const span = 3.2 * (c.periodS / longest);
      const u = Math.min(1, elapsed / span);
      mesh.scale.setScalar(Math.max(0.15, Math.sin(Math.PI * u) * c.bubbleR));
      mat.opacity = 0.04 + 0.14 * Math.sin(Math.PI * u);
    });
  });
  if (!live.length) return null;
  return (
    <group ref={ref}>
      {live.map((c) => (
        <mesh key={c.id} position={[c.x, c.y, c.z]}>
          <sphereGeometry args={[1, 32, 20]} />
          <meshBasicMaterial color="#6d8a86" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function levelColor(level: Level) {
  if (level === "rottura") return "#2a1814";
  if (level === "allagamento") return "#b5523a";
  if (level === "falle") return "#d4783a";
  if (level === "scossa") return "#c6a15a";
  return "#7d877c";
}

function InteriorFit({ boatId, result, planes }: { boatId: string; result: SimResult; planes: THREE.Plane[] }) {
  const boat = boatById(boatId);
  const steel = { metalness: 0.35, roughness: 0.5, clippingPlanes: planes };
  return (
    <group>
      {result.compartments.map((c) => {
        const mid = (c.x0 + c.x1) / 2;
        const len = Math.max(0.4, c.x1 - c.x0);
        const s = stationRadii(boat, clampT(mid, boat.loa));
        const phr = Math.max(0.35, s.phr || boat.phDiameter / 2);
        const color = levelColor(c.level);
        const tubes = c.systems.some((s) => s.includes("tub"));
        const plant = c.id === "diesel" || c.id === "elettrici";
        const battery = c.id.startsWith("batt");
        const mines = c.id.startsWith("mine");
        return (
          <group key={c.id}>
            <mesh position={[c.x0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[phr * 0.96, phr * 0.96, 0.08, 28]} />
              <meshStandardMaterial color="#c6a15a" {...steel} />
            </mesh>
            {c.id === result.compartments[result.compartments.length - 1]?.id && (
              <mesh position={[c.x1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[phr * 0.9, phr * 0.9, 0.08, 28]} />
                <meshStandardMaterial color="#c6a15a" {...steel} />
              </mesh>
            )}
            {plant &&
              [-0.28, 0.28].map((z) => (
                <mesh key={z} position={[mid, -phr * 0.15, z * phr]}>
                  <boxGeometry args={[len * 0.62, phr * 0.38, phr * 0.32]} />
                  <meshStandardMaterial color={color} {...steel} />
                </mesh>
              ))}
            {battery && (
              <mesh position={[mid, -phr * 0.48, 0]}>
                <boxGeometry args={[len * 0.8, phr * 0.28, phr * 1.15]} />
                <meshStandardMaterial color={color} {...steel} />
              </mesh>
            )}
            {tubes &&
              [-0.34, 0.34].map((z) => (
                <mesh key={z} position={[mid, phr * 0.05, z * phr]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.16, 0.16, len * 0.78, 10]} />
                  <meshStandardMaterial color={color} {...steel} />
                </mesh>
              ))}
            {c.id === "centrale" && (
              <mesh position={[mid, phr * 0.35, 0]}>
                <cylinderGeometry args={[0.12, 0.12, phr * 0.9, 10]} />
                <meshStandardMaterial color={color} {...steel} />
              </mesh>
            )}
            {mines &&
              [-0.4, 0, 0.4].map((z) => (
                <mesh key={z} position={[mid, s.deck * 0.35, z * Math.min(1.2, phr)]}>
                  <cylinderGeometry args={[0.28, 0.28, phr * 1.15, 12]} />
                  <meshStandardMaterial color={color} {...steel} />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

function Hull({
  boatId,
  era,
  finish,
  result,
  xray,
  cut,
  interior,
  skin,
  onHit,
}: {
  boatId: string;
  era: SimInput["era"];
  finish: "controllo" | "atlantico";
  result: SimResult;
  xray: boolean;
  cut: boolean;
  interior: boolean;
  /** Rivestimento Thrixel al posto del fasciame parametrico (che resta per il clic). */
  skin: boolean;
  onHit: (x: number, y: number, z: number) => void;
}) {
  const outer = useMemo(() => buildOuter(boatId), [boatId]);
  const ph = useMemo(() => buildPh(boatId), [boatId]);
  const plate = useMemo(() => plateTexture(finish), [finish]);
  const damage = useMemo(() => createDamageUniforms(), []);
  const [wounds, setWounds] = useState<Wound[]>([]);
  useEffect(() => {
    return () => {
      outer.dispose();
      ph.dispose();
      plate?.dispose();
    };
  }, [outer, ph, plate]);
  useLayoutEffect(() => {
    const w = paint(outer, result.charges, "outer");
    paint(ph, result.charges, "ph");
    setWounds(w);
    updateDamageUniforms(damage, result.charges, w, finish);
  }, [outer, ph, result, damage, finish]);
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.05)], []);
  const none = useMemo<THREE.Plane[]>(() => [], []);
  const planes = cut ? clip : none;
  const boat = boatById(boatId);
  const ghost = xray || interior;
  const open = wounds.some((w) => w.hole > 0);
  const modelUrl = boatModelFor(boat.family, era).url;
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const onReady = useCallback(() => setReadyUrl(modelUrl), [modelUrl]);
  const wantSkin = skin && !ghost;
  // Il fasciame parametrico si nasconde solo quando il modello è davvero caricato.
  const showSkin = wantSkin && readyUrl === modelUrl;
  const phBreach = useMemo(
    () =>
      applyBreachMask(
        new THREE.MeshStandardMaterial({ color: "#c5ccc6", vertexColors: true, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }),
        damage,
      ),
    [damage],
  );
  useEffect(() => () => phBreach.dispose(), [phBreach]);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onHit(e.point.x, e.point.y, e.point.z);
      }}
    >
      <mesh geometry={outer} dispose={null}>
        <meshStandardMaterial
          map={plate}
          vertexColors
          metalness={0.16}
          roughness={0.68}
          transparent={ghost}
          opacity={ghost ? (interior ? 0.12 : 0.28) : 1}
          depthWrite={!ghost}
          side={THREE.DoubleSide}
          clippingPlanes={planes}
          visible={!showSkin}
        />
      </mesh>
      {(ghost || cut || (open && !showSkin)) && (
        <mesh geometry={ph} dispose={null}>
          <meshStandardMaterial
            color="#c5ccc6"
            vertexColors
            metalness={0.4}
            roughness={0.5}
            side={THREE.DoubleSide}
            clippingPlanes={planes}
          />
        </mesh>
      )}
      {/* Con il rivestimento il Druckkörper si vede solo dietro gli squarci. */}
      {open && showSkin && !cut && <mesh geometry={ph} dispose={null} material={phBreach} />}
      {wantSkin && (
        <Suspense fallback={null}>
          <BoatModel boatId={boat.id} era={era} damage={damage} planes={planes} onReady={onReady} />
        </Suspense>
      )}
      <Shards wounds={wounds} planes={planes} />
      {interior && <InteriorFit boatId={boat.id} result={result} planes={planes} />}
      {!showSkin && <Casing boatId={boat.id} finish={finish} planes={planes} />}
      {!showSkin && <Fittings boatId={boat.id} era={era} charges={result.charges} eraCut={planes} />}
    </group>
  );
}

function Shards({ wounds, planes }: { wounds: Wound[]; planes: THREE.Plane[] }) {
  const torn = wounds.filter((w) => w.hole > 0.2);
  if (!torn.length) return null;
  return (
    <group>
      {torn.map((w, i) => (
        <group key={i}>
          {[0, 1, 2].map((k) => (
            <mesh
              key={k}
              position={[w.x + w.ox * (0.28 + k * 0.22), w.y + w.oy * (0.28 + k * 0.22) + (k - 1) * 0.14, w.z + w.oz * (0.28 + k * 0.22)]}
              rotation={[0.35 * k, 0.9 * k, 0.25 * k]}
            >
              <boxGeometry args={[w.hole * 0.95, 0.05, w.hole * 0.4]} />
              <meshStandardMaterial color="#3a2c26" metalness={0.42} roughness={0.68} side={THREE.DoubleSide} clippingPlanes={planes} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Casing({
  boatId,
  finish,
  planes,
}: {
  boatId: string;
  finish: "controllo" | "atlantico";
  planes: THREE.Plane[];
}) {
  const boat = boatById(boatId);
  const wood = finish === "controllo" ? "#6e5844" : "#3e342c";
  const plates = [];
  for (let i = 0; i < 16; i++) {
    const t = 0.16 + (i / 15) * 0.7;
    const s = stationRadii(boat, t);
    const span = Math.max(0.8, s.rx * (boat.family === "XXI" ? 0.42 : 0.5));
    plates.push({ x: s.x, y: s.deck + 0.04, z: 0, w: span, len: boat.loa * 0.045 });
  }
  const slots = [];
  if (boat.family !== "II") {
    for (let i = 0; i < 9; i++) {
      const t = 0.28 + i * 0.05;
      for (const side of [1, -1]) {
        const p = outerPoint(boat, t, side > 0 ? 0.85 : Math.PI * 2 - 0.85);
        slots.push({ x: p.x, y: p.y, z: p.z, side });
      }
    }
  }
  const steel = { metalness: 0.35, roughness: 0.6, clippingPlanes: planes };
  return (
    <group>
      {plates.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <boxGeometry args={[p.len, 0.05, p.w]} />
          <meshStandardMaterial color={wood} roughness={0.9} metalness={0.02} clippingPlanes={planes} />
        </mesh>
      ))}
      {slots.map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, s.y, s.z]}>
          <boxGeometry args={[0.55, 0.08, 0.16]} />
          <meshStandardMaterial color="#1a1c18" {...steel} />
        </mesh>
      ))}
    </group>
  );
}

function Fittings({ boatId, era, charges, eraCut }: { boatId: string; era: SimInput["era"]; charges: ChargeResult[]; eraCut: THREE.Plane[] }) {
  const boat = boatById(boatId);
  const tw = towerBox(boat);
  const stern = stationRadii(boat, 0.035);
  const bow = stationRadii(boat, 0.72);
  const steel = { metalness: 0.5, roughness: 0.45, clippingPlanes: eraCut };
  const snort = boat.family === "XXI" || (era === "1944" && boat.family !== "II");
  const gun = boat.deckGun && era === "1941" && boat.family !== "XXI";
  const winter = era === "1944" && boat.family !== "II" && boat.family !== "XXI";
  const screws = boat.twin ? [-1, 1] : [0];
  const streamlined = boat.family === "XXI";
  const twY = (tw.y0 + tw.y1) / 2;
  const towerSev = severityAtPoint(charges, tw.x, twY, 0, "outer");
  let lean = 0;
  if (towerSev > 0.28) {
    let side = 1;
    let best = Infinity;
    for (const c of charges) {
      if (c.yield === "none") continue;
      const d = Math.hypot(c.x - tw.x, c.y - twY, c.z);
      if (d < best) {
        best = d;
        side = c.z >= 0 ? -1 : 1;
      }
    }
    lean = side * Math.min(0.4, (towerSev - 0.28) * 0.7);
  }
  const hats =
    boat.family === "XB"
      ? [
          ...Array.from({ length: 6 }, (_, i) => {
            const s = stationRadii(boat, 0.7 + i * 0.038);
            return { x: s.x, y: s.deck + 0.08, z: 0, r: 0.46 };
          }),
          ...Array.from({ length: 5 }, (_, i) => {
            const s = stationRadii(boat, 0.38 + i * 0.055);
            return [
              { x: s.x, y: s.deck + 0.06, z: s.rx * 0.38, r: 0.28 },
              { x: s.x, y: s.deck + 0.06, z: -s.rx * 0.38, r: 0.28 },
            ];
          }).flat(),
        ]
      : [];
  return (
    <group>
      {streamlined ? (
        <mesh position={[tw.x, tw.y0 + boat.towerH * 0.48, 0]} rotation={[0, 0, lean]}>
          <boxGeometry args={[boat.towerL, boat.towerH * 0.95, boat.towerW * 0.85]} />
          <meshStandardMaterial color="#8b9486" {...steel} />
        </mesh>
      ) : (
        <group rotation={[0, 0, lean]} position={[tw.x, tw.y0 + boat.towerH * 0.5, 0]}>
          <mesh position={[-0.1, -boat.towerH * 0.22, 0]}>
            <boxGeometry args={[boat.towerL * 1.15, boat.towerH * 0.55, boat.towerW * 1.25]} />
            <meshStandardMaterial color="#8b9486" {...steel} />
          </mesh>
          <mesh position={[boat.towerL * 0.06, boat.towerH * 0.28, 0]}>
            <boxGeometry args={[boat.towerL * 0.62, boat.towerH * 0.48, boat.towerW * 0.72]} />
            <meshStandardMaterial color="#9aa394" {...steel} />
          </mesh>
          <mesh position={[boat.towerL * 0.55, -boat.towerH * 0.28, 0]}>
            <boxGeometry args={[boat.towerL * 0.7, boat.towerH * 0.32, boat.towerW * 0.7]} />
            <meshStandardMaterial color="#7f887c" {...steel} />
          </mesh>
        </group>
      )}
      <mesh position={[tw.x + 0.15, tw.y1 + 0.85, 0.12]}>
        <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
        <meshStandardMaterial color="#d7d2c6" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[tw.x - 0.35, tw.y1 + 0.55, -0.1]}>
        <cylinderGeometry args={[0.045, 0.045, 1.15, 8]} />
        <meshStandardMaterial color="#c8c3b6" metalness={0.6} roughness={0.3} />
      </mesh>
      {snort && (
        <mesh position={[tw.x - boat.towerL * 0.2, tw.y1 + 1.3, boat.towerW * 0.2]} rotation={[0, 0, 0.15]}>
          <cylinderGeometry args={[0.09, 0.11, 2.6, 8]} />
          <meshStandardMaterial color="#6d756c" {...steel} />
        </mesh>
      )}
      {winter && (
        <group position={[tw.x - boat.towerL * 0.85, tw.y0 + 0.7, 0]}>
          <mesh>
            <boxGeometry args={[Math.max(2.2, boat.towerL * 0.85), 0.7, boat.towerW * 1.5]} />
            <meshStandardMaterial color="#747c74" {...steel} />
          </mesh>
          {[-0.35, 0.35].map((z) => (
            <mesh key={z} position={[0.2, 0.45, z]} rotation={[0, 0, Math.PI / 2.3]}>
              <cylinderGeometry args={[0.045, 0.05, 1.1, 8]} />
              <meshStandardMaterial color="#5c5348" metalness={0.55} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
      {gun && (
        <group position={[tw.x - boat.towerL * 0.85, tw.deck + 0.35, 0]} rotation={[0, 0, Math.PI / 2.2]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.09, 2.8, 10]} />
            <meshStandardMaterial color="#5c5348" metalness={0.55} roughness={0.4} />
          </mesh>
        </group>
      )}
      {screws.map((side) => (
        <group key={side} position={[stern.x - 0.15, -stern.ry * 0.22, side * boat.beam * 0.15]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.45, 10]} />
            <meshStandardMaterial color="#8a8172" metalness={0.7} roughness={0.35} />
          </mesh>
          {[0, 1, 2].map((b) => (
            <mesh key={b} position={[0, 0.2, 0]} rotation={[0, (b * Math.PI) / 1.5, 0]}>
              <boxGeometry args={[0.05, 0.55, 0.16]} />
              <meshStandardMaterial color="#b7a98a" metalness={0.65} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[stern.x + 0.15, -0.15, 0]}>
        <boxGeometry args={[1.1, 1.7, 0.08]} />
        <meshStandardMaterial color="#6a7268" {...steel} />
      </mesh>
      <mesh position={[bow.x, bow.deck * 0.15, boat.beam * 0.42]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.55]} />
        <meshStandardMaterial color="#6a7268" {...steel} />
      </mesh>
      <mesh position={[bow.x, bow.deck * 0.15, -boat.beam * 0.42]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.55]} />
        <meshStandardMaterial color="#6a7268" {...steel} />
      </mesh>
      <mesh position={[stern.x + 0.2, -stern.ry * 0.08, 0]}>
        <boxGeometry args={[1.3, 0.06, Math.max(1.6, boat.beam * 0.62)]} />
        <meshStandardMaterial color="#6a7268" {...steel} />
      </mesh>
      <mesh position={[stationRadii(boat, 0.985).x, stationRadii(boat, 0.985).deck * 0.35, 0]}>
        <boxGeometry args={[0.35, Math.max(0.8, stationRadii(boat, 0.985).ry * 0.7), 0.06]} />
        <meshStandardMaterial color="#5e665c" {...steel} />
      </mesh>
      {hats.map((h, i) => (
        <mesh key={`h${i}`} position={[h.x, h.y, h.z]}>
          <cylinderGeometry args={[h.r, h.r, 0.16, 12]} />
          <meshStandardMaterial color="#5c564c" metalness={0.4} roughness={0.55} />
        </mesh>
      ))}
      <Pennant boat={boat} />
    </group>
  );
}

function Pennant({ boat }: { boat: ReturnType<typeof boatById> }) {
  const tw = towerBox(boat);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d");
    if (!g) return null;
    g.fillStyle = "#4e574c";
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#e7dcc6";
    g.lineWidth = 14;
    g.strokeRect(12, 12, 488, 232);
    g.fillStyle = "#f4ead8";
    g.font = "700 118px Barlow, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(boat.name.replace("-", " "), 256, 140);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [boat.name]);
  useEffect(() => {
    return () => tex?.dispose();
  }, [tex]);
  if (!tex) return null;
  const w = Math.min(3.4, Math.max(1.6, boat.towerL * 0.92));
  const y = tw.y0 + boat.towerH * 0.55;
  return (
    <group>
      <mesh position={[tw.x, y, boat.towerW / 2 + 0.03]}>
        <planeGeometry args={[w, w * 0.42]} />
        <meshStandardMaterial map={tex} roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[tw.x, y, -boat.towerW / 2 - 0.03]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, w * 0.42]} />
        <meshStandardMaterial map={tex} roughness={0.75} metalness={0.15} />
      </mesh>
    </group>
  );
}

const YIELD_COLOR = { full: "#b5523a", mechanical: "#c6a15a", none: "#8a8070" } as const;

function Markers({ result, spheres, weaponId }: { result: SimResult; spheres: boolean; weaponId: string }) {
  const show = result.charges.filter((c) => c.yield === "full");
  const drawn = show.length > 6 ? [...show].sort((a, b) => a.slantPh - b.slantPh).slice(0, 4) : show;
  const model = chargeModelFor(weaponId);
  return (
    <group>
      {result.charges.map((c) => {
        const sphere = (
          <mesh position={[c.x, c.y, c.z]}>
            <sphereGeometry args={[c.yield === "none" ? 0.28 : 0.55, 12, 10]} />
            <meshStandardMaterial
              color={YIELD_COLOR[c.yield]}
              emissive={c.yield === "full" ? "#5a2418" : "#000"}
              roughness={0.45}
            />
          </mesh>
        );
        if (!model) return <group key={c.id}>{sphere}</group>;
        // Ordigno in scala reale; l'anello conserva il codice colore dell'esito dello scoppio.
        return (
          <group key={c.id}>
            <Suspense fallback={sphere}>
              <ChargeModel model={model} chargeId={c.id} position={[c.x, c.y, c.z]} />
            </Suspense>
            <mesh position={[c.x, c.y, c.z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.62, 0.035, 8, 40]} />
              <meshBasicMaterial color={YIELD_COLOR[c.yield]} />
            </mesh>
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

type ViewProps = { skin: boolean; sea: boolean; quality: "alta" | "media" };

function Stage({
  input,
  result,
  xray,
  cut,
  spheres,
  interior,
  cam,
  shot,
  finish,
  skin,
  sea,
  quality,
  probe,
  selected,
  onHit,
}: ViewProps & {
  input: SimInput;
  result: SimResult;
  xray: boolean;
  cut: boolean;
  spheres: boolean;
  interior: boolean;
  cam: string;
  shot: number;
  finish: "controllo" | "atlantico";
  probe: HullProbe | null;
  selected: string | null;
  onHit: (x: number, y: number, z: number) => void;
}) {
  const boat = boatById(input.boatId);
  const mid = stationRadii(boat, 0.5);
  const { scene, gl } = useThree();
  const atlantic = finish === "atlantico";
  useLayoutEffect(() => {
    // Il tone mapping lo fa PostFX; l'esposizione resta quella di prima.
    gl.toneMapping = THREE.NoToneMapping;
    gl.toneMappingExposure = 1.18;
    if (atlantic) return; // sfondo e nebbia li gestisce <Atlantic>
    scene.background = new THREE.Color("#d5ddd6");
    scene.fog = null;
  }, [scene, gl, atlantic]);
  const sel = result.compartments.find((c) => c.id === (selected ?? probe?.compId));
  const ring = (x: number) => {
    const s = stationRadii(boat, clampT(x, boat.loa));
    return Math.max(s.rx, s.ry) * 1.02;
  };
  return (
    <>
      {atlantic ? (
        <Atlantic depth={input.axisDepth} loa={boat.loa} sea={sea} quality={quality} />
      ) : (
        <>
          <hemisphereLight args={["#f7f4ee", "#9aa59c", 0.72]} />
          <directionalLight position={[40, 70, 30]} intensity={1.45} />
          <directionalLight position={[-28, 22, -24]} intensity={0.45} color="#f3ead8" />
          <directionalLight position={[0, -18, 20]} intensity={0.28} color="#d7c7a4" />
        </>
      )}
      <PostFX mode={finish} quality={quality} />
      <CameraRig cam={cam} loa={boat.loa} />
      <Hull boatId={boat.id} era={input.era} finish={finish} result={result} xray={xray} cut={cut} interior={interior} skin={skin} onHit={onHit} />
      <Markers result={result} spheres={spheres} weaponId={input.weaponId} />
      <Shocks shot={shot} boatId={boat.id} result={result} />
      <Bubbles shot={shot} result={result} />
      {sel && (
        <group>
          {[sel.x0, sel.x1].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[ring(x), 0.07, 8, 40]} />
              <meshBasicMaterial color="#c6a15a" />
            </mesh>
          ))}
        </group>
      )}
      {probe && (
        <mesh position={[probe.x, probe.y, probe.z]}>
          <sphereGeometry args={[0.28, 12, 10]} />
          <meshBasicMaterial color="#c6a15a" />
        </mesh>
      )}
      {!atlantic && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -mid.ry - 1.4, 0]}>
            <circleGeometry args={[boat.loa * 0.95, 64]} />
            <meshStandardMaterial color="#c5d0c8" roughness={1} metalness={0} />
          </mesh>
          <gridHelper args={[boat.loa * 1.7, 18, "#8c7040", "#8ea096"]} position={[0, -mid.ry - 1.35, 0]} />
        </>
      )}
      <OrbitControls
        makeDefault
        enablePan
        minDistance={6}
        maxDistance={Math.max(120, boat.loa * 3.4)}
        maxPolarAngle={Math.PI * 0.92}
        target={[0, 0.4, 0]}
      />
    </>
  );
}

function clampT(x: number, loa: number) {
  return Math.min(1, Math.max(0, x / loa + 0.5));
}

class Boundary extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  render() {
    if (this.state.bad) {
      return (
        <div className="webgl-fallback" role="status">
          <strong>Vista 3D non disponibile</strong>
          <p>
            Questo browser non ha concesso un contesto WebGL (accelerazione grafica disattivata o
            bloccata). Il calcolo, il diagramma e il rapporto restano validi nei pannelli a fianco.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Scene({
  active = true,
  input,
  result,
  xray,
  cut,
  spheres,
  interior,
  cam,
  shot,
  finish,
  skin,
  sea,
  quality,
  probe,
  selected,
  onHit,
  onMiss,
}: ViewProps & {
  /** Falso quando la scheda Studio è nascosta: il render loop si ferma. */
  active?: boolean;
  input: SimInput;
  result: SimResult;
  xray: boolean;
  cut: boolean;
  spheres: boolean;
  interior: boolean;
  cam: string;
  shot: number;
  finish: "controllo" | "atlantico";
  probe: HullProbe | null;
  selected: string | null;
  onHit: (x: number, y: number, z: number) => void;
  onMiss: () => void;
}) {
  return (
    <Boundary>
      <Canvas
        camera={{ position: [52, 23, 72], fov: 46, near: 0.2, far: 900 }}
        dpr={quality === "alta" ? [1, 2] : [1, 1.25]}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: false, localClippingEnabled: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
        onPointerMissed={() => onMiss()}
      >
        <Stage
          input={input}
          result={result}
          xray={xray}
          cut={cut}
          spheres={spheres}
          interior={interior}
          cam={cam}
          shot={shot}
          finish={finish}
          skin={skin}
          sea={sea}
          quality={quality}
          probe={probe}
          selected={selected}
          onHit={onHit}
        />
      </Canvas>
    </Boundary>
  );
}
