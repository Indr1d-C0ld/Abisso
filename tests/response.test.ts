// Risposta dello scafo: forma del primo modo flessionale libero–libero.
import assert from "node:assert/strict";
import { test } from "node:test";

test("primo modo libero–libero: simmetrico, estremi a 1, nodi a 0,224 e 0,776", () => {
  assert.ok(Math.abs(freeFreeMode(0) - 1) < 1e-9);
  assert.ok(Math.abs(freeFreeMode(1) - 1) < 1e-6);
  for (let x = 0; x <= 0.5; x += 0.01) assert.ok(Math.abs(freeFreeMode(x) - freeFreeMode(1 - x)) < 1e-6);
  for (const node of [0.2242, 0.7758]) assert.ok(Math.abs(freeFreeMode(node)) < 0.01, `nodo ${node}`);
  assert.ok(Math.abs(freeFreeMode(0.5) + 0.6078) < 0.005, `centro ${freeFreeMode(0.5)}`);
});

import { boatById } from "@/data/boats";
import { bubblePeriod, evaluate } from "@/sim/model";
import {
  freeFreeMode,
  bubbleHull,
  hullFrequencyHz,
  migrationFirst,
  migrationProfile,
  responseReport,
  surfaceEffect,
} from "@/sim/response";
import { DEFAULT_INPUT } from "@/state/store";

test("risalita al primo minimo: 100 kg a 50 m ≈ 2,05 m (Riley/Brainard, √W)", () => {
  assert.ok(Math.abs(migrationFirst(100, 50) - 2.05) < 0.02, `${migrationFirst(100, 50)}`);
  assert.equal(migrationProfile(0), 0);
  assert.ok(Math.abs(migrationProfile(1) - 1) < 1e-9);
});

test("caso di risonanza di Vernon: 167 kg a 24 m → periodo ≈ 0,61 s (≈ 1,66 Hz)", () => {
  const T = bubblePeriod(167, 24);
  assert.ok(Math.abs(T - 0.614) < 0.01, `${T}`);
});

test("frequenza a 2 nodi: forma DNV = trave di Eulero con E = 2,06e11 Pa", () => {
  const f = hullFrequencyHz({ lengthM: 67.1, phDiameterM: 4.7, plateMm: 18.5, dispSubT: 871 });
  const euler = ((4.73004 ** 2) / (2 * Math.PI)) * Math.sqrt((2.06e11 * f.inertiaM4) / (f.virtualMassKg * 67.1 ** 3));
  assert.ok(Math.abs(f.hz - euler) / euler < 0.005, `${f.hz} vs ${euler}`);
  // VIIC: ordine di 2 Hz, nella banda dei periodi di bolla delle cariche (0,3–1 s).
  assert.ok(f.hz > 1 && f.hz < 3.5, `${f.hz}`);
});

test("getto: vicino allo scafo colpisce la lamiera, lontano domina il galleggiamento", () => {
  const near = bubbleHull({ rMax: 4.5, depthM: 70, standoffM: 5.5, toHull: [0, 0, -1] });
  assert.equal(near.regime, "scafo");
  const touching = bubbleHull({ rMax: 4.5, depthM: 70, standoffM: 3, toHull: [0, 1, 0] });
  assert.equal(touching.regime, "scafo-attaccata");
  const far = bubbleHull({ rMax: 4.5, depthM: 70, standoffM: 40, toHull: [0, 0, -1] });
  assert.equal(far.regime, "alto");
  // ζ_g = Rmax / (d + 10,1) in colonna d'acqua.
  assert.ok(Math.abs(far.zetaBuoyancy - 4.5 / 80.1) < 1e-3);
});

test("superficie: classe da profondità / Rmax e velocità della cupola da Cole", () => {
  const deep = surfaceEffect(130, 150);
  assert.ok(deep.ratio > 25, `${deep.ratio}`);
  const shallow = surfaceEffect(130, 8);
  assert.ok(shallow.ratio < 4, shallow.kind);
  const u = surfaceEffect(100, 50).domeMps;
  // 2 · 52,16e6 / (ρ c) con ρ = 1025 (acqua di mare) e c = 1500 m/s.
  const derived = ((2 * 52.16e6) / (1025 * 1500)) * Math.pow(Math.cbrt(100) / 50, 1.13);
  assert.ok(Math.abs(u - derived) / derived < 0.02, `${u} vs ${derived}`);
});

test("rapporto per caso: coerente con il modello", () => {
  const input = { ...DEFAULT_INPUT, missZ: 14 };
  const r = evaluate(input);
  const rep = responseReport(boatById(input.boatId), input, r);
  assert.equal(rep.charges.length, r.charges.filter((c) => c.yield === "full").length);
  assert.ok(rep.whipAmpM >= 0 && rep.whipAmpM <= 0.3);
  assert.ok(rep.ratio > 0);
});

test("amplificazione della frusta: 1 in risonanza, piccola lontano", async () => {
  const { whipAmplification } = await import("@/sim/response");
  assert.ok(Math.abs(whipAmplification(1) - 1) < 1e-9);
  assert.ok(whipAmplification(1.86) < 0.05);
  assert.ok(whipAmplification(0.98) > whipAmplification(1.3));
});
