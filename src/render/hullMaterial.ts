import * as THREE from "three";
import { OUTER_FACTOR, type ChargeResult } from "@/sim/model";

/**
 * Danno sullo scafo calcolato nello shader, per pixel.
 *
 * La gravità è la stessa di `severityAtPoint(..., "outer")` in src/sim/model.ts:
 * per ogni carica che scoppia, u = distanza / max(0,45, rSplit · OUTER_FACTOR), effetto
 * `effectFromU(u)`, ×0,35 per l'urto senza bolla; si tiene il massimo. Se cambia lì,
 * va cambiata qui (GLSL `effectFromU`) e in tests/render.test.ts.
 *
 * Squarci e ammaccature arrivano dalle "ferite" calcolate da `stamp()` sullo scafo
 * parametrico, così rivestimento e geometria del calcolo restano coerenti.
 */

export const MAX_CHARGES = 32;
export const MAX_WOUNDS = 32;

export type Wound = {
  x: number;
  y: number;
  z: number;
  hole: number;
  dentR: number;
  amp: number;
  iny: number;
  inz: number;
};

export type DamageUniforms = {
  uCharges: { value: THREE.Vector4[] };
  uChargeK: { value: number[] };
  uChargeCount: { value: number };
  uWounds: { value: THREE.Vector4[] };
  uWoundsB: { value: THREE.Vector4[] };
  uWoundCount: { value: number };
  /** 0 = Controllo (scala analitica della legenda), 1 = Atlantico (resa realistica). */
  uMode: { value: number };
};

export function createDamageUniforms(): DamageUniforms {
  return {
    uCharges: { value: Array.from({ length: MAX_CHARGES }, () => new THREE.Vector4()) },
    uChargeK: { value: new Array(MAX_CHARGES).fill(0) },
    uChargeCount: { value: 0 },
    uWounds: { value: Array.from({ length: MAX_WOUNDS }, () => new THREE.Vector4()) },
    uWoundsB: { value: Array.from({ length: MAX_WOUNDS }, () => new THREE.Vector4()) },
    uWoundCount: { value: 0 },
    uMode: { value: 0 },
  };
}

/** Raggio sul fasciame esterno e peso della carica, come in severityAtPoint. */
export function chargeTerms(c: ChargeResult) {
  if (c.yield === "none") return null;
  return { radius: Math.max(0.45, c.rSplit * OUTER_FACTOR), k: c.yield === "mechanical" ? 0.35 : 1 };
}

export function updateDamageUniforms(
  u: DamageUniforms,
  charges: ChargeResult[],
  wounds: Wound[],
  mode: "controllo" | "atlantico",
) {
  let n = 0;
  for (const c of charges) {
    const t = chargeTerms(c);
    if (!t || n >= MAX_CHARGES) continue;
    u.uCharges.value[n].set(c.x, c.y, c.z, t.radius);
    u.uChargeK.value[n] = t.k;
    n++;
  }
  u.uChargeCount.value = n;
  let m = 0;
  for (const w of wounds) {
    if (m >= MAX_WOUNDS) break;
    u.uWounds.value[m].set(w.x, w.y, w.z, w.hole);
    u.uWoundsB.value[m].set(w.dentR, w.amp, w.iny, w.inz);
    m++;
  }
  u.uWoundCount.value = m;
  u.uMode.value = mode === "atlantico" ? 1 : 0;
}

const COMMON = /* glsl */ `
#define MAX_CHARGES ${MAX_CHARGES}
#define MAX_WOUNDS ${MAX_WOUNDS}
uniform vec4 uCharges[MAX_CHARGES];
uniform float uChargeK[MAX_CHARGES];
uniform int uChargeCount;
uniform vec4 uWounds[MAX_WOUNDS];
uniform vec4 uWoundsB[MAX_WOUNDS];
uniform int uWoundCount;
uniform float uMode;
varying vec3 vDmgWorld;
`;

const VERTEX_PROJECT = /* glsl */ `
vec4 dmgWorld = modelMatrix * vec4( transformed, 1.0 );
// Ammaccature: stesso profilo di stamp() (u², verso l'asse del battello).
vec3 dmgP = dmgWorld.xyz;
for ( int i = 0; i < MAX_WOUNDS; i++ ) {
  if ( i >= uWoundCount ) break;
  float d = distance( dmgP, uWounds[i].xyz );
  float r = uWoundsB[i].x;
  if ( d < r ) {
    float u = 1.0 - d / r;
    dmgWorld.yz += uWoundsB[i].zw * uWoundsB[i].y * u * u;
  }
}
vDmgWorld = dmgP;
vec4 mvPosition = viewMatrix * dmgWorld;
gl_Position = projectionMatrix * mvPosition;
`;

/** Copia GLSL di effectFromU() in src/sim/model.ts (tests/render.test.ts la confronta). */
export const GLSL_EFFECT_FROM_U = /* glsl */ `
float effectFromU( float u ) {
  if ( u <= 0.0 ) return 1.0;
  if ( u < 1.0 ) return 1.0 - 0.08 * u;
  if ( u < 2.0 ) return 0.92 - 0.34 * ( u - 1.0 );
  if ( u < 4.0 ) return 0.58 - 0.19 * ( u - 2.0 );
  if ( u < 7.0 ) return 0.2 * ( 1.0 - ( u - 4.0 ) / 3.0 );
  return 0.0;
}
`;

const FRAGMENT_FUNCS = /* glsl */ `
float dmgHash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float dmgNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( dmgHash( i + vec3( 0, 0, 0 ) ), dmgHash( i + vec3( 1, 0, 0 ) ), f.x ),
                   mix( dmgHash( i + vec3( 0, 1, 0 ) ), dmgHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( dmgHash( i + vec3( 0, 0, 1 ) ), dmgHash( i + vec3( 1, 0, 1 ) ), f.x ),
                   mix( dmgHash( i + vec3( 0, 1, 1 ) ), dmgHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
${GLSL_EFFECT_FROM_U}
float dmgSeverity( vec3 p ) {
  float m = 0.0;
  for ( int i = 0; i < MAX_CHARGES; i++ ) {
    if ( i >= uChargeCount ) break;
    float s = effectFromU( distance( p, uCharges[i].xyz ) / uCharges[i].w ) * uChargeK[i];
    m = max( m, s );
  }
  return m;
}
// Scala della legenda, con le stesse soglie di levelOf(): 0,1 · 0,28 · 0,55 · 0,85.
vec3 dmgLegend( float s ) {
  vec3 c0 = vec3( 0.77, 0.80, 0.72 );
  vec3 c1 = vec3( 0.88, 0.77, 0.42 );
  vec3 c2 = vec3( 0.83, 0.47, 0.23 );
  vec3 c3 = vec3( 0.71, 0.32, 0.23 );
  vec3 c4 = vec3( 0.16, 0.09, 0.08 );
  if ( s < 0.1 ) return mix( c0, c1, s / 0.1 );
  if ( s < 0.28 ) return mix( c1, c2, ( s - 0.1 ) / 0.18 );
  if ( s < 0.55 ) return mix( c2, c3, ( s - 0.28 ) / 0.27 );
  if ( s < 0.85 ) return mix( c3, c4, ( s - 0.55 ) / 0.3 );
  return c4;
}
`;

const FRAGMENT_COLOR = /* glsl */ `
float dmgSev = dmgSeverity( vDmgWorld );
float dmgRim = 0.0;
for ( int i = 0; i < MAX_WOUNDS; i++ ) {
  if ( i >= uWoundCount ) break;
  float h = uWounds[i].w;
  if ( h <= 0.0 ) continue;
  float d = distance( vDmgWorld, uWounds[i].xyz );
  // Bordo strappato: il raggio dello squarcio oscilla col rumore, a scala di lamiera.
  float jag = ( dmgNoise( vDmgWorld * 2.6 ) - 0.5 ) * 0.55 + ( dmgNoise( vDmgWorld * 9.0 ) - 0.5 ) * 0.18;
  float edge = h * ( 1.0 + jag );
  if ( d < edge ) discard;
  dmgRim = max( dmgRim, 1.0 - smoothstep( edge, edge + h * 0.6, d ) );
}
float grain = dmgNoise( vDmgWorld * 1.7 );
if ( uMode < 0.5 ) {
  // Controllo: la tinta è l'indice di gravità, leggibile come la legenda.
  float w = smoothstep( 0.06, 0.22, dmgSev ) * 0.88;
  diffuseColor.rgb = mix( diffuseColor.rgb, dmgLegend( dmgSev ), w );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.1, 0.07, 0.06 ), dmgRim * 0.8 );
} else {
  // Atlantico: lamiera sporca e annerita, vernice che salta a chiazze, nerofumo agli squarci.
  float flake = dmgNoise( vDmgWorld * 6.0 ) * 0.6 + dmgNoise( vDmgWorld * 1.4 ) * 0.4;
  diffuseColor.rgb *= 1.0 - 0.3 * smoothstep( 0.1, 0.45, dmgSev );
  float strip = smoothstep( 0.32, 0.78, dmgSev + ( flake - 0.5 ) * 0.4 );
  vec3 bare = mix( vec3( 0.15, 0.15, 0.145 ), vec3( 0.19, 0.105, 0.06 ), smoothstep( 0.45, 0.8, flake ) );
  diffuseColor.rgb = mix( diffuseColor.rgb, bare, strip );
  float soot = smoothstep( 0.55, 0.95, dmgSev ) * ( 0.55 + 0.45 * flake );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.03, 0.028, 0.027 ), max( soot, dmgRim * 0.9 ) );
}
`;

const FRAGMENT_NORMAL = /* glsl */ `
// Lamiera spiegazzata: la normale tende alla faccetta e si increspa dove il danno cresce.
{
  float crumple = smoothstep( 0.2, 0.7, dmgSev ) + dmgRim * 0.6;
  if ( crumple > 0.001 ) {
    vec3 faceN = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
    vec3 jitter = vec3( dmgNoise( vDmgWorld * 4.0 ), dmgNoise( vDmgWorld * 4.0 + 7.1 ), dmgNoise( vDmgWorld * 4.0 + 13.7 ) ) - 0.5;
    normal = normalize( mix( normal, normalize( faceN + jitter * 0.9 ), clamp( crumple, 0.0, 1.0 ) * 0.75 ) );
  }
}
`;

const FRAGMENT_ROUGH = /* glsl */ `
roughnessFactor = mix( roughnessFactor, 0.95, smoothstep( 0.45, 0.95, dmgSev ) );
`;

/** Applica il danno a un MeshStandardMaterial (lo modifica: passare un clone). */
export function applyDamage(mat: THREE.MeshStandardMaterial, uniforms: DamageUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${COMMON}`)
      .replace("#include <project_vertex>", VERTEX_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${COMMON}\n${FRAGMENT_FUNCS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT_COLOR}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${FRAGMENT_ROUGH}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`);
  };
  mat.customProgramCacheKey = () => "abisso-damage-v1";
  mat.needsUpdate = true;
  return mat;
}

/**
 * Maschera per il corpo resistente sotto il rivestimento: si vede solo dietro gli squarci
 * (entro 1,6 volte il raggio dello squarcio). Il modello generato non è sempre più largo
 * del cilindro del Druckkörper: senza maschera il cilindro sporgerebbe dai fianchi.
 */
export function applyBreachMask(mat: THREE.MeshStandardMaterial, uniforms: DamageUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${COMMON}`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDmgWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${COMMON}`)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        {
          bool near = false;
          for ( int i = 0; i < MAX_WOUNDS; i++ ) {
            if ( i >= uWoundCount ) break;
            float h = uWounds[i].w;
            if ( h > 0.0 && distance( vDmgWorld, uWounds[i].xyz ) < h * 1.6 + 0.6 ) near = true;
          }
          if ( !near ) discard;
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // In Atlantico la lamiera interna è acciaio annerito, non la scala della legenda.
        if ( uMode > 0.5 ) {
          float g = fract( sin( dot( floor( vDmgWorld * 3.0 ), vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
          diffuseColor.rgb = vec3( 0.075, 0.07, 0.066 ) * ( 0.75 + 0.5 * g );
        }`,
      );
  };
  mat.customProgramCacheKey = () => "abisso-breach-v1";
  mat.needsUpdate = true;
  return mat;
}
