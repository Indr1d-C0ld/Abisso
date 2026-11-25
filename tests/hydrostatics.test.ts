import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "@/sim/model";
import { DEFAULT_INPUT } from "@/state/store";
import { boatById } from "@/data/boats";
import { buildTimeline } from "@/sim/timeline";
import {
  AIR_FREE_M3,
  blowCapacityT,
  crushAt,
  dropletRiseMps,
  hydroAt,
  hydroTrack,
  IMPLOSION_S,
  pitchOf,
  surfacedDepth,
} from "@/sim/hydrostatics";
import { levelOfFill, wetAngle } from "@/render/effects/floodGeometry";

test("aria del VIIC: 12 × 325 l a 205 at", () => {
  assert.ok(Math.abs(AIR_FREE_M3.VII.m3 - 799.5) < 0.1);
  // A 100 m l'aria espelle circa 73 m³ (ricostruito nel rapporto di ricerca).
  const viic = boatById("vii-c");
  assert.ok(Math.abs(blowCapacityT(viic, 100) - 73 * 1.025) < 2, `${blowCapacityT(viic, 100)}`);
  // In superficie il limite sono le casse.
  assert.equal(blowCapacityT(viic, 0), viic.dispSub - viic.dispSurf);
});

test("gocce di nafta: valori della tabella di risalita", () => {
  assert.ok(Math.abs(dropletRiseMps(0.001) - 0.036) < 0.002);
  assert.ok(Math.abs(dropletRiseMps(0.002) - 0.076) < 0.002);
  assert.ok(Math.abs(dropletRiseMps(0.005) - 0.15) < 0.005);
});

test("assetto: peso a prua abbassa la prua, limitato", () => {
  assert.ok(pitchOf(-100, 871, 0.3) < 0);
  assert.ok(pitchOf(100, 871, 0.3) > 0);
  assert.ok(Math.abs(pitchOf(-1e9, 871, 0.3)) <= (75 * Math.PI) / 180 + 1e-9);
});

test("pelo libero: mezzo pieno a quota zero, monotono", () => {
  assert.ok(Math.abs(levelOfFill(0.5)) < 1e-6);
  assert.ok(Math.abs(wetAngle(1) - Math.PI) < 1e-9);
  let prev = -1;
  for (let f = 0.05; f < 1; f += 0.05) {
    const y = levelOfFill(f);
    assert.ok(y > prev);
    prev = y;
  }
});

test("battello asciutto: nessuna dinamica", () => {
  const input = { ...DEFAULT_INPUT, missZ: 60 };
  const r = evaluate(input);
  const tr = hydroTrack(boatById(input.boatId), r, input.axisDepth, 0, 100);
  assert.equal(tr.tCollapse, null);
  assert.equal(hydroAt(tr, 50).depth, input.axisDepth);
});

test("molta acqua: il VIIC scende e implode alla quota di collasso", () => {
  const input = { ...DEFAULT_INPUT, boatId: "vii-c", missZ: 4 };
  const r = evaluate(input);
  const tl = buildTimeline(input, r);
  assert.ok(tl.hydro.tCollapse !== null);
  assert.ok(tl.segments.some((s) => s.id === "implosione"));
  const at = tl.hydro.t0 + tl.hydro.tCollapse!;
  assert.ok(Math.abs(hydroAt(tl.hydro, at).depth - boatById("vii-c").collapseM) < 1);
  assert.equal(crushAt(tl.hydro, at - 0.01), 0);
  assert.equal(crushAt(tl.hydro, at + IMPLOSION_S), 1);
  // Velocità di caduta dell'ordine di pochi m/s.
  const v = hydroAt(tl.hydro, at - 1).vz;
  assert.ok(v > 1 && v < 10, `vz ${v}`);
});

test("acqua entro la riserva: il battello emerge e si assesta", () => {
  const input = { ...DEFAULT_INPUT, boatId: "vii-c", missZ: 12 };
  const r = evaluate(input);
  const tl = buildTimeline(input, r);
  assert.ok(tl.hydro.tSurface !== null);
  const end = hydroAt(tl.hydro, tl.hydro.t0 + tl.hydro.span);
  assert.equal(end.depth, surfacedDepth(boatById("vii-c")));
  assert.ok(Math.abs(end.pitch) < (5 * Math.PI) / 180);
});

test("oltre il collasso prima dello scoppio: implosione subito dopo la bolla", () => {
  const boat = boatById("vii-c");
  const input = { ...DEFAULT_INPUT, boatId: "vii-c", axisDepth: boat.collapseM + 20, burstDepth: boat.collapseM + 20 };
  const tl = buildTimeline(input, evaluate(input));
  assert.equal(tl.hydro.already, true);
  assert.ok(tl.segments.some((s) => s.id === "implosione"));
});
