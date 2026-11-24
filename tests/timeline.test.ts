// La linea del tempo deve derivare dal modello ed essere coerente con se stessa.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { SimInput } from "@/data/types";
import { weaponById } from "@/data/weapons";
import { evaluate, SOUND_MPS } from "@/sim/model";
import {
  bubbleRadius,
  buildTimeline,
  chargeState,
  displayToReal,
  floodFraction,
  realToDisplay,
} from "@/sim/timeline";
import { DEFAULT_INPUT } from "@/state/store";

const CASES: Partial<SimInput>[] = [
  {},
  { missZ: 0, burstDepth: 70, axisDepth: 70 },
  { weaponId: "mk7-amatol", pattern: "diamond5", missZ: 10 },
  { weaponId: "hedgehog", pattern: "hedgehog", axisDepth: 60, burstDepth: 60, missZ: 0 },
  { weaponId: "hedgehog", pattern: "hedgehog", missZ: 40 },
  { weaponId: "squid", pattern: "squid6", missZ: 0 },
  { weaponId: "mk7-amatol", missZ: 40 },
  { speedKn: 6, applyDrift: true, missZ: 0 },
];

for (const patch of CASES) {
  const input = { ...DEFAULT_INPUT, ...patch };
  const result = evaluate(input);
  const tl = buildTimeline(input, result);
  const name = JSON.stringify(patch);

  test(`tempi dal modello ${name}`, () => {
    const sink = weaponById(input.weaponId).sinkMps;
    for (const [i, tr] of tl.tracks.entries()) {
      const c = result.charges[i];
      assert.ok(Math.abs(tr.tEnd - Math.max(0.5, c.depthM / sink)) < 1e-9);
      if (c.yield === "full") assert.ok(Math.abs(tr.tShock! - tr.tEnd - c.slantPh / SOUND_MPS) < 1e-9);
      const p = chargeState(tr, tr.tEnd).pos;
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(p[k] - tr.end[k]) < 1e-9, "posizione finale");
    }
  });

  test(`segmenti contigui, mappa invertibile, durata ragionevole ${name}`, () => {
    let d = 0;
    let t = 0;
    for (const s of tl.segments) {
      assert.ok(Math.abs(s.d0 - d) < 1e-9 && s.d1 > s.d0, `schermo ${s.id}`);
      assert.ok(Math.abs(s.t0 - t) < 1e-9 && s.t1 >= s.t0, `reale ${s.id}`);
      d = s.d1;
      t = s.t1;
    }
    assert.ok(tl.duration >= 6 && tl.duration <= 40, `durata ${tl.duration}`);
    let prev = -1;
    for (let x = 0; x <= tl.duration; x += tl.duration / 200) {
      const r = displayToReal(tl, x);
      assert.ok(r >= prev - 1e-9, "monotona");
      prev = r;
      assert.ok(Math.abs(realToDisplay(tl, r) - x) < 1e-6, `inversa a ${x}`);
    }
  });

  test(`bolla e allagamento ${name}`, () => {
    for (const [i, tr] of tl.tracks.entries()) {
      const c = result.charges[i];
      if (c.yield !== "full") {
        assert.equal(bubbleRadius(tr, 0.1), 0);
        continue;
      }
      // Massimo del primo ciclo a metà periodo, uguale al raggio del modello.
      assert.ok(Math.abs(bubbleRadius(tr, c.periodS / 2) - c.bubbleR) < 1e-9);
    }
    const f = floodFraction(result, tl, tl.segments[tl.segments.length - 1].t1);
    assert.ok(f >= 0 && f <= 1);
    if (result.flood.dry) assert.ok(!tl.segments.some((s) => s.id === "allagamento"));
  });
}
