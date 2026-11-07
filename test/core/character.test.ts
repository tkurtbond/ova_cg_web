// The checks of ova_cg_go's internal/character/character_test.go, with
// its labels: the book's sample characters (ova_cg_po's TestCalc,
// Samples12), every number their files hold computed by calc; loading's
// notices; the editing the window does (TestModel); and a file's
// Bosses. TestModel's save and load is in save's tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as rules from "../../src/core/rules.ts";
import * as calc from "../../src/core/calc.ts";
import * as entities from "../../src/core/entities.ts";
import * as character from "../../src/core/character.ts";

const dataDir = new URL("../../testdata/", import.meta.url);

function read(name: string): string {
  return readFileSync(new URL(name, dataDir), "utf8");
}

const samples = [
  "Ai",
  "Auren",
  "Braun",
  "Cora",
  "Daisuke",
  "Fukiko",
  "Karis",
  "Miho",
  "Natsuki",
  "Raine",
  "Shou",
  "Yuu",
];

// Like Go's t.Errorf, a failed check doesn't stop the test: every
// failure is reported, together, by done.
class Checker {
  failures: string[] = [];

  error(s: string): void {
    this.failures.push(s);
  }

  text(label: string, n: calc.Number, want: string): void {
    const got = n.text();
    if (got !== want) this.error(`${label} ${want} (got ${got})`);
  }

  int(label: string, n: calc.Number, want: number): void {
    this.text(label, n, String(want));
  }

  is(got: string, want: string, label: string): void {
    if (got !== want) this.error(`${label}\n    got: ${got}`);
  }

  done(): void {
    assert.deepEqual(this.failures, []);
  }
}

// checkCombat checks the numbers of a combat: block against s's.
function checkCombat(
  t: Checker,
  sample: string,
  c: entities.Combat,
  s: calc.Sheet,
): void {
  c.attacks.forEach((x, i) => {
    const a = s.attacks[i]!;
    t.int(sample + ": " + x.name + " ROLL", a.roll, x.roll);
    t.text(sample + ": " + x.name + " DX", a.dx, x.dx);
    t.int(sample + ": " + x.name + " END", a.end, x.endurance);
  });
  let def = s.defense.text();
  if (s.hasBarrier) def += "/" + s.barrier.text();
  if (s.hasIncorporeal) def += "/" + s.incorporeal.text();
  if (def !== c.defense)
    t.error(`${sample}: DEFENSE ${c.defense} (got ${def})`);
  t.int(sample + ": HEALTH", s.health, c.health);
  t.int(sample + ": ENDURANCE", s.endurance, c.endurance);
  if (c.threatValue !== undefined) t.int(sample + ": TV", s.tv, c.threatValue);
}

function checkSubItems(
  t: Checker,
  sample: string,
  l: readonly entities.SubItem[],
  ts: readonly calc.Trait[],
): void {
  l.forEach((x, i) => {
    if (x.endurance !== undefined) {
      if (!ts[i]!.hasEnd) t.error(`${sample}: ${x.name} has an END`);
      t.int(sample + ": " + x.name + " END", ts[i]!.end, x.endurance);
    }
  });
}

// checkEntity checks every number e's file holds against s's.
function checkEntity(
  t: Checker,
  sample: string,
  e: entities.Entity,
  s: calc.Sheet,
): void {
  e.abilities.forEach((a, i) => {
    const tr = s.traits[i]!;
    if (a.endurance !== undefined)
      t.int(sample + ": " + a.name + " END", tr.end, a.endurance);
    checkSubItems(t, sample, a.subAbilities, tr.form);
    a.spells.forEach((x, j) => {
      t.text(
        sample + ": " + x.name + " spell END",
        tr.spells[j]!.end,
        x.endurance,
      );
    });
    const se = a.subEntity;
    if (se !== undefined && se.combat.hasCombat) {
      checkCombat(t, se.name, se.combat, tr.partner!);
      if (tr.partner!.warnings.length !== 0)
        t.error(`${se.name}: no warnings (got ${tr.partner!.warnings.length})`);
    }
  });
  checkCombat(t, sample, e.combat, s);
  if (s.warnings.length !== 0)
    t.error(`${sample}: no warnings (got ${s.warnings.length})`);
}

function attackIndex(c: entities.Combat, name: string): number {
  return c.attacks.findIndex((a) => a.name === name);
}

// readEntity is the first entity of the fixture, and how many it holds
// (Go's ReadEntity).
function readEntity(name: string): { first: entities.Entity; n: number } {
  const r = entities.readEntities(read(name), name);
  if (!r.ok) assert.fail(r.message);
  assert.ok(r.entities.length > 0, `${name}: no entities`);
  return { first: r.entities[0]!, n: r.entities.length };
}

// TestSamples builds each of the twelve sample characters (ova_fmt's
// test-data/, pp. 23-47) and compares every number its file holds with
// calc's. The book's two rulings the rules don't reproduce are checked
// as overrides: the computed number first, then the book's.
for (const name of samples) {
  test(`TestSamples/${name}`, () => {
    const { first: e, n } = readEntity(name + ".yaml");
    assert.equal(n, 1, "loaded: n");
    const s: calc.Sheet = character.build(e);
    const t = new Checker();
    switch (name) {
      case "Ai": {
        let ok = s.attacks.length > 0;
        for (const a of s.attacks) ok = ok && a.telekinetic && !a.transformed;
        if (!ok) t.error("both attacks made with Telekinesis");
        break;
      }
      case "Fukiko":
        if (!s.transformed) t.error("the sheet shown transformed");
        break;
      case "Miho": {
        const i = attackIndex(e.combat, "Mode SP: Miho Ray");
        assert.ok(i >= 0, "has Mode SP");
        if (!s.attacks[i]!.transformed) t.error("Mode SP made transformed");
        if (s.transformed) t.error("the sheet not transformed");
        break;
      }
      case "Braun":
        // The rule: 2 - Clumsy 2 = 0, TV 0 + 2 + 0 = 2; the book's -2
        // as an override makes TV 0.
        calc.compute(s);
        t.int("First Day of Sale Shove! computed ROLL", s.attacks[0]!.roll, 0);
        t.int("computed TV", s.tv, 2);
        s.attacks[0]!.roll.override(-2, false, false);
        break;
      case "Natsuki": {
        const i = attackIndex(e.combat, "Stiletto Kick");
        assert.ok(i >= 0, "has Stiletto Kick");
        calc.compute(s);
        t.int("Stiletto Kick computed DX", s.attacks[i]!.dx, 6);
        s.attacks[i]!.dx.override(3, false, false);
        break;
      }
    }
    calc.compute(s);
    checkEntity(t, name, e, s);
    t.done();
  });
}

// TestLoadNotices: load keeps a file's number that differs from the
// rules' as an override, with a notice; the samples whose numbers are
// all the rules' load with none.
test("TestLoadNotices", () => {
  const t = new Checker();
  for (const name of samples) {
    const r = character.load(read(name + ".yaml"), name + ".yaml");
    if (!r.ok || r.notices.length !== 0)
      t.error(`${name}: loads with no notices: ${JSON.stringify(r)}`);
  }
  // Braun's -2 is listed in its overrides:.
  const b = character.load(read("Braun.yaml"), "Braun.yaml");
  if (!b.ok) assert.fail(b.message);
  if (!b.value.attacks[0]!.roll.overridden) t.error("Braun: ROLL overridden");
  t.int("Braun: TV from the override", b.value.tv, 0);

  // A number not listed that differs from the rules'.
  const ai = read("Ai.yaml").replace("health: 20", "health: 25");
  const c = character.load(ai, "Ai.yaml");
  if (!c.ok) assert.fail(c.message);
  const want = [
    "Ai: HEALTH is 25 in the file, 20 by the rules: kept as an override",
  ];
  if (JSON.stringify(c.notices) !== JSON.stringify(want))
    t.error(`a changed HEALTH: ${JSON.stringify(c.notices)}`);
  if (!c.value.health.overridden || c.value.health.get() !== 25)
    t.error("and it is an override");

  for (const [name, want] of [
    ["Broken", "level"],
    ["Fragment", "holds 2 characters"],
    ["Options", "holds 2 characters"],
  ] as const) {
    const r = character.load(read(name + ".yaml"), name + ".yaml");
    if (r.ok || !r.message.includes(want))
      t.error(`${name}: refused, saying "${want}": ${JSON.stringify(r)}`);
  }
  // Go's last check, a missing file, has no counterpart: the page loads
  // text it has already read. A file with no characters in it:
  const r = character.loadAll("", "empty.yaml");
  if (r.ok || r.message !== "empty.yaml holds no characters")
    t.error(`empty: ${JSON.stringify(r)}`);
  t.done();
});

function item(name: string): rules.Item {
  const it = rules.find(name);
  assert.ok(it !== undefined, `no item "${name}"`);
  return it;
}

// traits is the traits' names and details, in order: "Flight;
// Telekinesis; Endurance Use (Gust)".
function traits(list: readonly calc.Trait[]): string {
  return list
    .map((x) => {
      const t = character.traitOf(x);
      return t.detail !== undefined ? `${t.name} (${t.detail})` : t.name;
    })
    .join("; ");
}

function modNames(list: readonly calc.Mod[]): string {
  return list.map((m) => character.modOf(m).name).join("; ");
}

// TestModel: what the window changes goes through these, then
// recompute: the order traits and mods are kept in, removing and
// changing them, copying a list of mods, and each Endurance Use tied to
// the Ability or attack its detail names.
test("TestModel", () => {
  const t = new Checker();
  // ---- Traits: in the loader's order ----
  const c = character.newCharacter();
  c.name = "Model";
  const use = character.newTrait(
    item("Endurance Use"),
    rules.Weakness,
    -2,
    "",
    "telekinesis",
  );
  character.insertTrait(c.traits, use);
  const tk = character.newTrait(item("Telekinesis"), rules.Ability, 2, "", "");
  character.insertTrait(c.traits, tk);
  const fl = character.newTrait(item("Flight"), rules.Ability, 1, "", "");
  character.insertTrait(c.traits, fl);
  character.insertTrait(
    c.traits,
    character.newTrait(undefined, rules.Ability, 1, "Zany Gadgets", "b"),
  );
  const z = character.newTrait(
    undefined,
    rules.Ability,
    1,
    "zany gadgets",
    "A",
  );
  character.insertTrait(c.traits, z);
  t.is(
    traits(c.traits),
    "Flight; Telekinesis; zany gadgets (A); Zany Gadgets (b); Endurance Use (telekinesis)",
    "InsertTrait: Abilities before Weaknesses, each by name, then detail, ignoring case",
  );
  character.removeTrait(c.traits, z);
  t.is(
    traits(c.traits),
    "Flight; Telekinesis; Zany Gadgets (b); Endurance Use (telekinesis)",
    "RemoveTrait",
  );
  character.changeTrait(c.traits, fl, item("Telekinesis"), 3, "small things");
  t.is(
    traits(c.traits),
    "Telekinesis; Telekinesis (small things); Zany Gadgets (b); Endurance Use (telekinesis)",
    "ChangeTrait: renamed and moved to its new place",
  );
  if (fl.item !== item("Telekinesis") || fl.level !== 3)
    t.error("ChangeTrait: the item and level");
  character.changeTrait(c.traits, fl, item("Flight"), 1, "");
  if (fl.detail !== undefined) t.error("ChangeTrait: a detail removed");

  // ---- Endurance Use ----
  character.recompute(c);
  if (!tk.hasEnd || tk.end.get() !== 10)
    t.error("Endurance Use -2 ties to the Ability its detail names: END 10");
  if (fl.hasEnd) t.error("and to no other");
  character.changeTrait(c.traits, use, use.item, -1, "Telekinesis (x)");
  character.recompute(c);
  if (tk.hasEnd) t.error("a detail naming nothing ties to nothing");
  character.changeTrait(c.traits, tk, tk.item, 2, "x");
  character.recompute(c);
  if (!tk.hasEnd || tk.end.get() !== 5)
    t.error(
      "a detail naming an Ability and its detail: Endurance Use -1, END 5",
    );
  const a = character.newAttack("Gust");
  c.attacks.push(a);
  character.insertMod(a.mods, character.newMod(item("Accurate"), false, 1, 0));
  character.changeTrait(c.traits, use, use.item, -1, "gust");
  character.recompute(c);
  if (tk.hasEnd || a.end.get() !== 10)
    t.error("else the attack it names: Accurate's 5 and Endurance Use's 5");

  // ---- Mods ----
  const list: calc.Mod[] = [];
  character.insertMod(
    list,
    character.newMod(item("Requirement"), true, 1, -10),
  );
  const perk = character.newMod(item("Ranged"), false, 1, 0);
  character.insertMod(list, perk);
  const cancel = character.newMod(item("Cancel"), true, 1, -15);
  character.insertMod(list, cancel);
  const m = character.newMod(item("Accurate"), false, 2, 0);
  character.insertMod(list, m);
  t.is(
    modNames(list),
    "Accurate; Ranged; Cancel; Requirement",
    "InsertMod: Perks before Flaws, each by name",
  );
  if (!cancel.hasCost || cancel.cost !== -15 || m.hasCost)
    t.error("NewMod: a chosen cost is written, a fixed one isn't");
  const cp = character.copyMods(list);
  character.removeMod(list, perk);
  m.times = 3;
  t.is(modNames(list), "Accurate; Cancel; Requirement", "RemoveMod");
  t.is(
    modNames(cp),
    "Accurate; Ranged; Cancel; Requirement",
    "CopyMods: a copy the list's changes don't reach",
  );
  if (cp[0] === m || cp[0]!.times !== 2) t.error("CopyMods: each mod copied");
  t.done();
});

// A file's Bosses: a Boss's sheet, and the file's numbers the rules'.
test("TestLoadBoss", () => {
  const r = character.loadAll(read("Boss.yaml"), "Boss.yaml");
  if (!r.ok) assert.fail(r.message);
  assert.equal(r.value.length, 2, "Boss.yaml: characters");
  const t = new Checker();
  for (const c of r.value)
    if (c.npcType !== entities.Boss || c.kind !== calc.BossSheet)
      t.error(`${c.name}: a Boss's sheet`);
  t.int("The Warden: HEALTH", r.value[0]!.health, 40);
  if (r.notices.length !== 0)
    t.error(`Boss.yaml: no notices: ${JSON.stringify(r.notices)}`);
  t.done();
});
