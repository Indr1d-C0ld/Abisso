// Lamiera: numero di danno di Nurick–Martin, freccia, ordinate, petali.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boatById } from "@/data/boats";
import { evaluate } from "@/sim/model";
import {
  damageNumber,
  FRAME_SPACING,
  permanentDeflection,
  petalCount,
  plateReport,
  STEEL_RHO,
  STEEL_YIELD_PA,
} from "@/sim/plate";
import { DEFAULT_INPUT } from "@/state/store";

test("φq = I / (2 H² √(B L ρ σ)) con I = i·B·L, adimensionale", () => {
  const i = 1e4;
  const H = 0.0185;
  const s = 0.6;
  const phi = damageNumber(i, H, s, s);
  const byHand = (i * s * s) / (2 * H * H * Math.sqrt(s * s * STEEL_RHO * STEEL_YIELD_PA));
  assert.ok(Math.abs(phi - byHand) < 1e-9);
  // Raddoppiando lo spessore φ scende di un fattore 4.
  assert.ok(Math.abs(damageNumber(i, 2 * H, s, s) - phi / 4) < 1e-9);
});

test("freccia: aggiornamento 2017 δ/H = 0,506 φ − 0,158, mai negativa", () => {
  assert.ok(Math.abs(permanentDeflection(10, 0.02) - (0.506 * 10 - 0.158) * 0.02) < 1e-12);
  assert.equal(permanentDeflection(0.1, 0.02), 0);
});

test("ordinate: valori dalle fonti dove trovati, stima dichiarata altrove", () => {
  assert.equal(FRAME_SPACING.VII.m, 0.6);
  assert.equal(FRAME_SPACING.IX.m, 0.7);
  assert.ok(FRAME_SPACING.VII.verified && FRAME_SPACING.XXI.verified);
  assert.ok(!FRAME_SPACING.II.verified);
});

test("petali fra 4 e 6, deterministici", () => {
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const n = petalCount(`c1-${i}`);
    assert.ok(n >= 4 && n <= 6);
    assert.equal(n, petalCount(`c1-${i}`));
    seen.add(n);
  }
  assert.equal(seen.size, 3);
});

test("rapporto lamiera: più vicino = freccia maggiore", () => {
  const near = plateReport(boatById("u96"), evaluate({ ...DEFAULT_INPUT, missZ: 8 })).charges[0];
  const far = plateReport(boatById("u96"), evaluate({ ...DEFAULT_INPUT, missZ: 30 })).charges[0];
  assert.ok(near.deflectionM > far.deflectionM && far.deflectionM >= 0);
});
