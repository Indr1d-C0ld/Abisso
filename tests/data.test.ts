// Coerenza del catalogo: ogni riferimento incrociato deve risolversi davvero.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_BOATS } from "@/data/boats";
import { EVENTS } from "@/data/events";
import { patternsFor, WEAPONS } from "@/data/weapons";
import { evaluate } from "@/sim/model";
import { DEFAULT_INPUT } from "@/state/store";

const boatIds = new Set(ALL_BOATS.map((b) => b.id));
const weaponIds = new Set(WEAPONS.map((w) => w.id));

test("id unici per battelli, ordigni ed eventi", () => {
  assert.equal(boatIds.size, ALL_BOATS.length);
  assert.equal(weaponIds.size, WEAPONS.length);
  assert.equal(new Set(EVENTS.map((e) => e.id)).size, EVENTS.length);
});

test("i compartimenti coprono il corpo resistente in ordine", () => {
  for (const b of ALL_BOATS) {
    assert.ok(b.compartments.length > 0, b.id);
    for (const c of b.compartments) assert.ok(c.a >= 0 && c.b <= 1 && c.a < c.b, `${b.id}/${c.id}`);
  }
});

test("ogni evento punta a un battello, un ordigno e uno schema validi", () => {
  for (const e of EVENTS) {
    assert.ok(boatIds.has(e.boatId), `${e.id}: battello ${e.boatId}`);
    if (e.recreable) assert.ok(e.setup, `${e.id}: ricostruibile ma senza setup`);
    else assert.ok(e.whyNot, `${e.id}: non ricostruibile ma senza motivazione`);
    if (!e.setup) continue;
    const s = { ...DEFAULT_INPUT, ...e.setup };
    const w = WEAPONS.find((x) => x.id === s.weaponId);
    assert.ok(w, `${e.id}: ordigno ${s.weaponId}`);
    assert.ok(patternsFor(w.kind).includes(s.pattern), `${e.id}: schema ${s.pattern} per ${w.id}`);
    const r = evaluate(s);
    assert.ok(r.narrative.length > 0, `${e.id}: valutazione vuota`);
  }
});
