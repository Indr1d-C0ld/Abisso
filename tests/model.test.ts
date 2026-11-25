// Verifiche di calibrazione del modello di danno (ex src/sim/selfcheck.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { boatById } from "@/data/boats";
import type { SimInput } from "@/data/types";
import { weaponById } from "@/data/weapons";
import { evaluate, referenceRadius } from "@/sim/model";

function base(p: Partial<SimInput> = {}): SimInput {
  return {
    boatId: "vii-c",
    weaponId: "mk7-amatol",
    pattern: "single",
    axisDepth: 75,
    burstDepth: 75,
    missX: 0,
    missZ: 8.45,
    spacing: 28,
    heading: 0,
    speedKn: 0,
    applyDrift: false,
    armWindow: 8,
    era: "1941",
    ...p,
  };
}

const levels = (r: ReturnType<typeof evaluate>) => r.compartments.map((c) => c.level).join(",");

test("caso di riferimento: Mk VII amatolo su VIIC a 75 m, raggio di rottura ~20 ft", () => {
  const ref = evaluate(base());
  assert.equal(ref.charges[0].yield, "full", ref.charges[0].reason);
  assert.ok(Math.abs(ref.rSplitBeam - 6.096) < 0.15, `rSplit ${ref.rSplitBeam}`);
  assert.ok(Math.abs(ref.charges[0].slantPh - 6.1) < 0.45, `slant ${ref.charges[0].slantPh}`);
  assert.ok(
    ref.outcome === "perdita" || ref.compartments.some((c) => c.level === "rottura"),
    `atteso cedimento, ottenuto ${ref.outcome}`,
  );
});

test("a 20 m danno intermedio senza rottura, a 40 m quasi nullo", () => {
  const mid = evaluate(base({ missZ: 20 }));
  assert.ok(["serio", "grave", "scossa"].includes(mid.outcome), `${mid.outcome} ${levels(mid)}`);
  assert.ok(!mid.compartments.some((c) => c.level === "rottura"));
  const far = evaluate(base({ missZ: 40 }));
  assert.ok(["nessuno", "scossa"].includes(far.outcome), far.outcome);
});

test("Torpex/Minol: +30% sul raggio del Mark VII", () => {
  const torp = referenceRadius(weaponById("mk7-heavy-torpex"));
  assert.ok(Math.abs(torp - 6.096 * 1.3) < 0.2, `torpex ${torp}`);
});

test("scoppio troppo alto sopra il battello: nessun danno rilevante", () => {
  const shallow = evaluate(base({ axisDepth: 80, burstDepth: 35, missZ: 0 }));
  assert.ok(["nessuno", "scossa"].includes(shallow.outcome), shallow.outcome);
});

test("carica centrata: scoppio sulla lamiera e perdita", () => {
  const hit = evaluate(base({ missZ: 0, axisDepth: 70, burstDepth: 70 }));
  assert.equal(hit.charges[0].yield, "full", hit.charges[0].reason);
  assert.equal(hit.outcome, "perdita");
});

test("finestra di armamento nulla: solo urto meccanico", () => {
  const inert = evaluate(base({ missZ: 0, axisDepth: 70, burstDepth: 70, armWindow: 0 }));
  assert.equal(inert.charges[0].yield, "mechanical", inert.charges[0].reason);
  assert.notEqual(inert.outcome, "perdita");
});

test("oltre la quota di collasso: collasso idrostatico", () => {
  const hydro = evaluate(base({ axisDepth: 260, missZ: 30 }));
  assert.ok(hydro.hydrostatic);
  assert.equal(hydro.outcome, "collasso");
});

test("Hedgehog: centrato colpisce, spostato di 40 m non esplode", () => {
  const hog = evaluate(
    base({ weaponId: "hedgehog", pattern: "hedgehog", axisDepth: 60, burstDepth: 60, missZ: 0 }),
  );
  assert.ok(hog.charges.some((c) => c.yield === "full"));
  const miss = evaluate(base({ weaponId: "hedgehog", pattern: "hedgehog", missZ: 40 }));
  assert.ok(miss.charges.every((c) => c.yield === "none"));
});

test("il Tipo XXI ha raggio letale minore del VIIC", () => {
  const xxi = evaluate(base({ boatId: "u2511" }));
  const viic = evaluate(base({ boatId: "vii-c" }));
  assert.ok(xxi.rSplitBeam < viic.rSplitBeam, `xxi ${xxi.rSplitBeam} vs viic ${viic.rSplitBeam}`);
});

test("scoppio sotto la chiglia riconosciuto", () => {
  const keel = evaluate(
    base({ weaponId: "mk7-heavy-torpex", axisDepth: 70, burstDepth: 82, missZ: 4 }),
  );
  assert.equal(keel.charges[0].yield, "full", keel.charges[0].reason);
  assert.ok(keel.charges[0].underKeel);
});

test("Squid centrato aggancia uno scafo lungo", () => {
  const squid = evaluate(
    base({ weaponId: "squid", pattern: "squid3", axisDepth: 70, burstDepth: 70, missZ: 0 }),
  );
  assert.ok(squid.charges.filter((c) => c.yield === "full").length >= 1);
});

test("i battelli storici ereditano la famiglia della classe", () => {
  assert.equal(boatById("u96").family, "VII");
});

test("uOfEffect è l'inversa di effectFromU sulle soglie", async () => {
  const { effectFromU, uOfEffect, LEVEL_THRESHOLDS, levelOf } = await import("@/sim/model");
  for (const th of LEVEL_THRESHOLDS) {
    const u = uOfEffect(th.s);
    assert.ok(Math.abs(effectFromU(u) - th.s) < 1e-9, `${th.level}: ${effectFromU(u)}`);
    assert.equal(levelOf(effectFromU(u - 1e-6)), th.level);
  }
});
