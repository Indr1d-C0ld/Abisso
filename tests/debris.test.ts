import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "@/sim/model";
import { DEFAULT_INPUT } from "@/state/store";
import { boatById } from "@/data/boats";
import { buildTimeline } from "@/sim/timeline";
import { dragLength, fragmentAt, fragmentsOf, launchSpeed, MAX_FRAGMENTS, settleSpeed, STEEL, throwDistance, V0_MAX, WOOD } from "@/sim/debris";
import { bulkheadLoads, bulkheadPeaks, bulkheadsOf, roomPressureBar, stateOf } from "@/sim/bulkheads";
import { pAbsBar } from "@/sim/hydrostatics";

test("detriti: l'acqua frena in meno di due metri, l'acciaio affonda, il legno sale", () => {
  assert.ok(Math.abs(dragLength(STEEL) - (2 * 7850 * 0.006) / (1025 * 1.2)) < 1e-12);
  assert.ok(throwDistance(V0_MAX, STEEL, 5) < 2);
  assert.ok(settleSpeed(STEEL) < -0.5 && settleSpeed(STEEL) > -1.5);
  assert.ok(settleSpeed(WOOD) > 0.3 && settleSpeed(WOOD) < 1);
  assert.ok(launchSpeed(1e9, STEEL) === V0_MAX);
});

test("detriti: nessuno se lo scoppio è lontano, limitati e deterministici se è vicino", () => {
  const boat = boatById("vii-c");
  const far = evaluate({ ...DEFAULT_INPUT, boatId: "vii-c", missZ: 60 });
  assert.equal(fragmentsOf(boat, far).length, 0);
  const near = evaluate({ ...DEFAULT_INPUT, boatId: "vii-c", missZ: 8 });
  const a = fragmentsOf(boat, near);
  assert.ok(a.length > 10 && a.length <= MAX_FRAGMENTS);
  assert.deepEqual(a, fragmentsOf(boat, near));
  // Il legno non supera la superficie; l'acciaio dopo un minuto è molto più in basso.
  const steel = a.find((f) => f.material.id === "acciaio")!;
  assert.ok(fragmentAt(steel, 60, 70)[1] < steel.origin[1] - 20);
  const wood = { ...steel, material: WOOD };
  assert.equal(fragmentAt(wood, 3600, 70)[1], 70);
});

test("paratie: pressione del locale e carico differenziale", () => {
  assert.equal(roomPressureBar(0, 100), 1.013);
  assert.ok(Math.abs(roomPressureBar(0.5, 100) - 2.026) < 1e-9);
  assert.equal(roomPressureBar(0.999, 100), pAbsBar(100));
  assert.equal(stateOf(0.5, 100), "scarica");
  assert.equal(stateOf(50, null), "ignota");
  assert.equal(stateOf(50, 100), "carica");
  assert.equal(stateOf(150, 100), "oltre");
});

test("paratie: una per confine, carico solo fra locali in condizioni diverse", () => {
  const input = { ...DEFAULT_INPUT, boatId: "vii-c", missZ: 12 };
  const r = evaluate(input);
  const boat = boatById("vii-c");
  const b = bulkheadsOf(boat, r);
  assert.equal(b.length, r.compartments.length - 1);
  assert.ok(b.some((x) => x.pressure));
  assert.ok(bulkheadLoads(b, r, 0, 70).every((l) => l.headM === 0));
  const tl = buildTimeline(input, r);
  const peaks = bulkheadPeaks(b, r, tl.hydro, 70);
  assert.ok(peaks.some((l) => l.headM > 1));
  // Il carico non supera mai la colonna d'acqua esterna.
  assert.ok(peaks.every((l) => l.headM <= 70 + 1e-6));
});
