// Il danno disegnato nello shader deve coincidere con quello calcolato dal modello.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chargeTerms, GLSL_EFFECT_FROM_U } from "@/render/hullMaterial";
import { effectFromU, evaluate, severityAtPoint } from "@/sim/model";
import { DEFAULT_INPUT } from "@/state/store";

/** Traduce la funzione GLSL in JS (corpo fatto solo di if/return su float). */
function glslEffect(): (u: number) => number {
  const body = GLSL_EFFECT_FROM_U.replace(/float effectFromU\(\s*float u\s*\)/, "return function (u)");
  return new Function(body.replace(/(\d)\.0\b/g, "$1"))() as (u: number) => number;
}

test("effectFromU in GLSL è identica a quella del modello", () => {
  const f = glslEffect();
  for (let u = -0.5; u <= 8; u += 0.01) assert.ok(Math.abs(f(u) - effectFromU(u)) < 1e-9, `u=${u}`);
});

test("chargeTerms riproduce severityAtPoint sul fasciame esterno", () => {
  for (const patch of [{}, { pattern: "diamond5" as const, weaponId: "mk7-amatol" }, { armWindow: 0, missZ: 0 }]) {
    const r = evaluate({ ...DEFAULT_INPUT, ...patch });
    for (let i = 0; i < 400; i++) {
      const x = (i % 20) * 4 - 40;
      const y = ((i * 7) % 11) - 5;
      const z = ((i * 13) % 17) - 8;
      let m = 0;
      for (const c of r.charges) {
        const t = chargeTerms(c);
        if (!t) continue;
        m = Math.max(m, effectFromU(Math.hypot(x - c.x, y - c.y, z - c.z) / t.radius) * t.k);
      }
      assert.ok(Math.abs(m - severityAtPoint(r.charges, x, y, z, "outer")) < 1e-9);
    }
  }
});
