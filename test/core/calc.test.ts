// The checks of ova_cg_go's internal/calc/calc_test.go, with its labels:
// the hand-made cases of ova_cg_po's TestCalc, a case for each Perk and
// Flaw that changes ROLL or DX, the floor at 0, 1/2 DX, Endurance Use,
// spells, Defense, Health and Endurance, TV, each limit and warning, and
// overrides counting downstream. The sample characters, the oracle, are
// checked in character's tests, which build them from their files, as
// ova_cg_go's are.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../src/core/rules.ts";
import * as calc from "../../src/core/calc.ts";

// Like Go's t.Errorf, a failed check doesn't stop the test: every
// failure is reported, together, by done.
class Checker {
  sample: string;
  failures: string[] = [];

  constructor(sample: string) {
    this.sample = sample;
  }

  ok(ok: boolean, label: string): void {
    if (!ok) this.failures.push(`${this.sample}: ${label}`);
  }

  /** n's text in effect against want. */
  text(n: calc.Number, want: string, label: string): void {
    const got = n.text();
    if (got !== want)
      this.failures.push(`${this.sample}: ${label} ${want} (got ${got})`);
  }

  int(n: calc.Number, want: number, label: string): void {
    this.text(n, String(want), label);
  }

  is(got: number, want: number, label: string): void {
    if (got !== want)
      this.failures.push(`${this.sample}: ${label} ${want} (got ${got})`);
  }

  done(): void {
    assert.deepEqual(this.failures, []);
  }
}

/** Whether s has a warning of code about attack a (undefined: about none). */
function warnedAbout(
  s: calc.Sheet,
  code: calc.Code,
  a: calc.Attack | undefined,
): boolean {
  return s.warnings.some((w) => w.code === code && w.attack === a);
}

function item(name: string): rules.Item {
  const it = rules.find(name);
  if (it === undefined) throw new Error(`no item ${name}`);
  return it;
}

/** name at level, added to list (a sheet's traits or a form). */
function tr(list: calc.Trait[], name: string, level: number): calc.Trait {
  const it = item(name);
  const t = new calc.Trait(it, it.kind, level);
  list.push(t);
  return t;
}

/** name taken times, at cost each time where the user sets it. */
function md(mods: calc.Mod[], name: string, times: number, cost: number): void {
  mods.push(new calc.Mod(item(name), times, cost));
}

function newAttack(s: calc.Sheet): calc.Attack {
  const a = new calc.Attack();
  s.attacks.push(a);
  return a;
}

// No Abilities: the plain attack, the starting numbers.
test("plain", () => {
  const c = new Checker("plain");
  const s = new calc.Sheet(calc.Character);
  calc.compute(s);
  c.int(s.tv, 5, "no attack: TV 2 + 2 + 1");
  const a = newAttack(s);
  calc.compute(s);
  c.int(a.roll, 2, "ROLL");
  c.int(a.dx, 1, "DX");
  c.int(a.end, 0, "END");
  c.int(s.defense, 2, "DEFENSE");
  c.ok(!s.hasBarrier, "no Barrier");
  c.int(s.health, 40, "HEALTH");
  c.int(s.endurance, 40, "ENDURANCE");
  c.ok(!s.hasReserve, "no Reserve");
  c.int(s.tv, 5, "TV");
  c.done();
});

// ROLL: Agile, Clumsy, Combat Expert; Accurate and Inaccurate each time;
// a Will Attack's Iron-Willed and Weak-Willed. Attack and Strong don't
// add.
test("rolls", () => {
  const c = new Checker("rolls");
  let s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 3);
  tr(s.traits, "Combat Expert", 2);
  tr(s.traits, "Clumsy", -1);
  tr(s.traits, "Iron-Willed", 1);
  tr(s.traits, "Attack", 4);
  tr(s.traits, "Strong", 2);
  const plain = newAttack(s);
  const acc = newAttack(s);
  md(acc.mods, "Accurate", 2, 0);
  const inacc = newAttack(s);
  md(inacc.mods, "Inaccurate", 3, 0);
  const both = newAttack(s);
  md(both.mods, "Accurate", 2, 0);
  md(both.mods, "Inaccurate", 3, 0);
  let will = newAttack(s);
  md(will.mods, "Will Attack", 1, 0);
  calc.compute(s);
  c.int(plain.roll, 6, "2 + Agile 3 + Combat Expert 2 - Clumsy 1");
  c.int(acc.roll, 8, "Accurate x2");
  c.int(acc.end, 10, "Accurate x2 END");
  c.int(inacc.roll, 3, "Inaccurate x3");
  c.int(inacc.end, 0, "Inaccurate x3 END, floored");
  c.int(both.roll, 5, "Accurate x2, Inaccurate x3");
  c.int(both.end, 0, "Accurate x2, Inaccurate x3 END, floored");
  c.int(will.roll, 5, "Will Attack: 2 + Iron-Willed 1 + Combat Expert 2");
  c.int(will.end, 0, "Will Attack END");
  c.is(acc.tvRoll, 6, "TV's roll leaves out Accurate");
  c.is(inacc.tvRoll, 6, "TV's roll leaves out Inaccurate");
  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 2);
  tr(s.traits, "Weak-Willed", -2);
  will = newAttack(s);
  md(will.mods, "Will Attack", 1, 0);
  calc.compute(s);
  c.int(will.roll, 0, "Will Attack: 2 - Weak-Willed 2, Agile not counted");
  c.done();
});

// DX: Attack, Strong, Weak; Ranged and Ranged, Strength-Powered;
// Telekinesis; Effective and Ineffective; No Damage; 1/2.
test("damage", () => {
  const c = new Checker("DX");
  let s = new calc.Sheet(calc.Character);
  tr(s.traits, "Attack", 2);
  tr(s.traits, "Strong", 3);
  tr(s.traits, "Agile", 2);
  let melee = newAttack(s);
  let ranged = newAttack(s);
  md(ranged.mods, "Ranged", 1, 0);
  const strRanged = newAttack(s);
  md(strRanged.mods, "Ranged, Strength-Powered", 1, 0);
  const both = newAttack(s);
  md(both.mods, "Ranged", 1, 0);
  md(both.mods, "Ranged, Strength-Powered", 1, 0);
  const eff = newAttack(s);
  md(eff.mods, "Effective", 2, 0);
  const ineff = newAttack(s);
  md(ineff.mods, "Ineffective", 3, 0);
  const half = newAttack(s);
  md(half.mods, "Ineffective", 6, 0);
  const none = newAttack(s);
  md(none.mods, "Area Effect", 2, 0);
  md(none.mods, "No Damage", 1, 0);
  calc.compute(s);
  c.int(melee.dx, 6, "1 + Attack 2 + Strong 3");
  c.int(ranged.dx, 3, "Ranged drops Strong");
  c.int(ranged.end, 0, "Ranged END");
  c.int(strRanged.dx, 6, "Ranged, Strength-Powered keeps Strong");
  c.int(strRanged.end, 5, "Ranged, Strength-Powered END");
  c.int(both.dx, 6, "Ranged with Ranged, Strength-Powered keeps Strong");
  c.int(eff.dx, 8, "Effective x2");
  c.int(eff.end, 10, "Effective x2 END");
  c.int(ineff.dx, 3, "Ineffective x3");
  c.text(half.dx, "1/2", "Ineffective x6: 0 is 1/2");
  c.ok(half.dx.isHalf() && half.dx.get() === 0, "1/2 is half");
  c.int(none.dx, 0, "No Damage: 0, not 1/2");
  c.int(none.end, 0, "No Damage, Area Effect x2 END");
  c.is(eff.tvDX, 6, "TV's DX leaves out Effective");
  c.is(half.tvDX, 6, "TV's DX leaves out Ineffective");
  c.is(none.tvDX, 6, "TV's DX leaves out No Damage");
  c.int(s.tv, 12, "TV: roll 4 + Defense 2 + DX 6");

  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Attack", 1);
  tr(s.traits, "Weak", -2);
  tr(s.traits, "Telekinesis", 3);
  melee = newAttack(s);
  ranged = newAttack(s);
  md(ranged.mods, "Ranged", 1, 0);
  const tk = newAttack(s);
  md(tk.mods, "Ranged", 1, 0);
  tk.telekinetic = true;
  const plainTk = newAttack(s);
  plainTk.telekinetic = true;
  calc.compute(s);
  c.text(melee.dx, "1/2", "1 + Attack 1 - Weak 2: 0 is 1/2");
  c.is(melee.tvDX, 0, "TV's DX of a 1/2 is 0");
  c.int(ranged.dx, 2, "Ranged drops Weak");
  c.int(tk.dx, 5, "made with Telekinesis 3, Ranged");
  c.int(plainTk.dx, 3, "made with Telekinesis 3, not Ranged");
  c.is(tk.tvDX, 5, "TV's DX keeps Telekinesis");
  c.done();
});

// END: Endurance Use, on an attack and on an Ability; the floor; a
// chosen cost; Unique Perk.
test("endurance", () => {
  const c = new Checker("END");
  const s = new calc.Sheet(calc.Character);
  const a = newAttack(s);
  a.use = -2;
  md(a.mods, "Accurate", 1, 0);
  const b = newAttack(s);
  b.use = -1;
  md(b.mods, "Effective", 2, 0);
  md(b.mods, "Weapon", 1, 0);
  const cc = newAttack(s);
  md(cc.mods, "Requirement", 1, -15);
  md(cc.mods, "Area Effect", 1, 0);
  md(cc.mods, "Cancel", 1, -5);
  const d = newAttack(s);
  md(d.mods, "Unique Perk", 1, 15);
  md(d.mods, "Ammunition", 3, 0);
  const barrier = tr(s.traits, "Barrier", 3);
  barrier.use = -1;
  md(barrier.mods, "Elaborate Gestures", 1, 0);
  const flight = tr(s.traits, "Flight", 2);
  flight.use = -3;
  const plain = tr(s.traits, "Smart", 2);
  calc.compute(s);
  c.int(a.end, 15, "Endurance Use -2 + Accurate");
  c.int(b.end, 10, "Endurance Use -1 + Effective x2 - Weapon");
  c.int(cc.end, 0, "Area Effect - Requirement 15 - Cancel 5, floored");
  c.int(d.end, 0, "Unique Perk 15 - Ammunition x3");
  c.ok(barrier.hasEnd, "Barrier with Endurance Use -1 has an END");
  c.int(barrier.end, 0, "Barrier: Endurance Use -1 - Elaborate Gestures");
  c.int(flight.end, 20, "Flight: Endurance Use -3");
  c.ok(!plain.hasEnd, "Smart has no END");
  c.is(s.warnings.length, 0, "no warnings");
  c.done();
});

// Spells (p. 58): the table's corners and middle, "+" for Barrier, a
// level out of the table.
test("spells", () => {
  const c = new Checker("spells");
  const sp = (t: calc.Trait, name: string, level: number): calc.Spell => {
    const x = new calc.Spell(item(name), level);
    t.spells.push(x);
    return x;
  };
  const s = new calc.Sheet(calc.Character);
  let magic = tr(s.traits, "Magic, Arcane", 3);
  let a = sp(magic, "Barrier", 2);
  let b = sp(magic, "Flight", 2);
  let cc = sp(magic, "Quick", 6);
  const low = tr(s.traits, "Magic, Witchcraft", 1);
  const d = sp(low, "Strong", 5);
  const e = sp(low, "Flight", 1);
  calc.compute(s);
  c.text(a.end, "10+", "Magic 3, Barrier 2");
  c.text(b.end, "10", "Magic 3, Flight 2");
  c.int(d.end, 60, "Magic 1, Strong 5");
  c.int(e.end, 20, "Magic 1, Flight 1");
  c.ok(s.warned(calc.SpellRange), "Quick 6 is out of the table");
  c.is(s.warnings.length, 1, "one warning");
  magic.level = 5;
  cc.level = 1;
  calc.compute(s);
  c.int(cc.end, 0, "Magic 5, Quick 1");
  c.text(a.end, "2+", "Magic 5, Barrier 2");
  // Witchcraft's curses: Weaknesses, at Arcane's costs, by their size
  // (p. 58); Acacia's, at Magic 3 (p. 134).
  magic = tr(s.traits, "Magic, Witchcraft", 3);
  a = sp(magic, "Frail", -2);
  b = sp(magic, "Weak", -3);
  cc = sp(magic, "Slow", -4);
  calc.compute(s);
  c.int(a.end, 10, "Witchcraft 3, Frail -2");
  c.int(b.end, 20, "Witchcraft 3, Weak -3");
  c.int(cc.end, 0, "Slow -4 is out of the table");
  c.ok(s.warned(calc.SpellRange), "and warned");
  c.done();
});

// Defense, Barrier, Health, Endurance, Endurance Reserve, by sheet kind.
test("stats", () => {
  const c = new Checker("stats");
  let s = new calc.Sheet(calc.Character);
  tr(s.traits, "Evasive", 2);
  tr(s.traits, "Quick", 3);
  tr(s.traits, "Slow", -1);
  tr(s.traits, "Barrier", 4);
  tr(s.traits, "Tough", 5);
  tr(s.traits, "Frail", -2);
  tr(s.traits, "Vigorous", 3);
  tr(s.traits, "Languid", -1);
  tr(s.traits, "Endurance Reserve", 2);
  calc.compute(s);
  c.int(s.defense, 6, "DEFENSE 2 + Evasive 2 + Quick 3 - Slow 1");
  c.ok(s.hasBarrier, "Barrier");
  c.int(s.barrier, 6, "Barrier's Defense 2 + 4");
  c.int(s.health, 80, "HEALTH 40 + Tough 5's 60 - Frail 2's 20");
  c.int(s.endurance, 60, "ENDURANCE 40 + Vigorous 3's 30 - Languid 1's 10");
  c.ok(s.hasReserve, "Reserve");
  c.int(s.reserve, 40, "Endurance Reserve 2");
  c.ok(!s.hasIncorporeal, "no Incorporeal Form");

  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Incorporeal Form", 3);
  calc.compute(s);
  c.ok(s.hasIncorporeal && !s.hasBarrier, "Incorporeal Form");
  c.int(s.incorporeal, 5, "Incorporeal Form's Defense 2 + 3");
  c.int(s.tv, 8, "TV: 2 + Incorporeal Form's Defense 5, the best, + 1");
  tr(s.traits, "Barrier", 4);
  calc.compute(s);
  c.int(s.barrier, 6, "and Barrier's 2 + 4");
  c.int(s.tv, 9, "TV: Barrier's Defense 6 the best");
  s.incorporeal.override(8, false, false);
  calc.compute(s);
  c.int(s.tv, 11, "TV: Incorporeal Form's Defense overridden 8");
  s.incorporeal.clear();
  tr(s.traits, "Incorporeal Form", 3);
  s.options.combinedEffectiveness = true;
  calc.compute(s);
  c.ok(
    s.warned(calc.OverFive),
    "Combined Effectiveness: Incorporeal Form 6 past 5",
  );

  s = new calc.Sheet(calc.CompanionSheet);
  tr(s.traits, "Tough", 1);
  calc.compute(s);
  c.int(s.health, 30, "a Companion's HEALTH 20 + Tough 1");
  c.int(s.endurance, 20, "a Companion's ENDURANCE");
  c.int(s.tv, 2, "a Companion's TV 2 + 2 + 1 + Tough 1 - 4, at least 1");
  tr(s.traits, "Frail", -3);
  calc.compute(s);
  c.int(s.tv, 1, "a Companion's TV, at least 1");
  s = new calc.Sheet(calc.MinionSheet);
  calc.compute(s);
  c.int(s.health, 10, "Minions' HEALTH");
  c.int(s.endurance, 10, "Minions' ENDURANCE");
  s = new calc.Sheet(calc.ExtraSheet);
  tr(s.traits, "Tough", 1);
  tr(s.traits, "Armored", 3);
  calc.compute(s);
  c.int(s.health, 20, "an Extra's HEALTH 10 + Tough 1");
  c.int(s.endurance, 10, "an Extra's ENDURANCE");
  c.int(s.tv, 1, "an Extra's TV, always 1");
  c.done();
});

// TV (p. 124): Armored, the signed Health and Endurance levels, the
// marked Abilities' halves; Companion never counted.
test("threat value", () => {
  const c = new Checker("TV");
  const s = new calc.Sheet(calc.Character);
  tr(s.traits, "Armored", 2);
  tr(s.traits, "Tough", 1);
  tr(s.traits, "Languid", -1);
  const healer = tr(s.traits, "Healer", 3);
  tr(s.traits, "Magic, Arcane", 1);
  const companion = tr(s.traits, "Companion", 3);
  const smart = tr(s.traits, "Smart", 3);
  calc.compute(s);
  c.ok(healer.halfTV, "Healer starts marked");
  c.ok(!companion.halfTV, "Companion doesn't");
  c.int(
    s.tv,
    10,
    "5 + Armored 2 + Tough 1 - Languid 1 + Healer 3/2 + Magic 1/2",
  );
  companion.halfTV = true;
  calc.compute(s);
  c.int(s.tv, 10, "a marked Companion still doesn't count");
  healer.halfTV = false;
  smart.halfTV = true;
  calc.compute(s);
  c.int(s.tv, 10, "Healer unmarked, Smart 3 marked");
  smart.halfTV = false;
  calc.compute(s);
  c.int(s.tv, 8, "neither");
  c.done();
});

// Transformation (p. 63): the form counts when the sheet is shown
// transformed, or for an attack made in it, which TV then leaves out.
test("transformation", () => {
  const c = new Checker("Transformation");
  const s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 1);
  tr(s.traits, "Tough", 4);
  const x = tr(s.traits, "Transformation", 2);
  tr(x.form, "Combat Expert", 2);
  tr(x.form, "Barrier", 1);
  tr(x.form, "Tough", 3);
  const base = newAttack(s);
  const formed = newAttack(s);
  formed.transformed = true;
  calc.compute(s);
  c.int(base.roll, 3, "ROLL 2 + Agile 1");
  c.int(formed.roll, 5, "made transformed, + Combat Expert 2");
  c.ok(!s.hasBarrier, "no Barrier untransformed");
  c.int(s.health, 80, "HEALTH: Tough 4");
  c.int(s.tv, 10, "TV leaves out the transformed attack: 3 + 2 + 1 + Tough 4");
  c.is(s.warnings.length, 0, "no warnings");
  c.int(s.abilityLevels, 7, "the form's levels aren't in the totals");
  s.transformed = true;
  calc.compute(s);
  c.int(base.roll, 5, "transformed: ROLL");
  c.ok(s.hasBarrier, "transformed: Barrier");
  c.int(s.health, 100, "transformed: Tough 4 + 3 counted as 5");
  c.ok(s.warned(calc.TableRange), "transformed: Tough past 5 warned of");
  c.int(s.tv, 16, "transformed: TV 5 + Barrier 3 + 1 + Tough 7");
  c.done();
});

// Overrides, and what is computed from them.
test("overrides", () => {
  const c = new Checker("overrides");
  const s = new calc.Sheet(calc.Character);
  tr(s.traits, "Attack", 2);
  tr(s.traits, "Evasive", 1);
  tr(s.traits, "Barrier", 1);
  const a = newAttack(s);
  md(a.mods, "Accurate", 2, 0);
  md(a.mods, "Effective", 1, 0);
  const b = newAttack(s);
  calc.compute(s);
  c.int(s.tv, 8, "TV 2 + Defense 3 + DX 3");
  a.roll.override(10, false, false);
  calc.compute(s);
  c.int(a.roll, 10, "ROLL overridden");
  c.ok(a.roll.computedText() === "4", "still computed");
  c.int(s.tv, 14, "TV: overridden ROLL 10 less Accurate x2");
  a.dx.override(0, true, false);
  b.dx.override(1, false, false);
  calc.compute(s);
  c.text(a.dx, "1/2", "DX overridden 1/2");
  c.int(s.tv, 12, "TV: DX 1/2 and 1");
  b.dx.override(7, false, false);
  calc.compute(s);
  c.int(s.tv, 18, "TV: DX overridden 7");
  s.barrier.override(6, false, false);
  calc.compute(s);
  c.int(s.tv, 21, "TV: Barrier's Defense overridden 6");
  s.defense.override(9, false, false);
  calc.compute(s);
  c.int(s.tv, 24, "TV: Defense overridden 9");
  s.tv.override(1, false, false);
  calc.compute(s);
  c.int(s.tv, 1, "TV overridden");
  s.tv.clear();
  s.defense.clear();
  s.barrier.clear();
  a.roll.clear();
  a.dx.clear();
  b.dx.clear();
  calc.compute(s);
  c.int(s.tv, 8, "all cleared");
  s.abilityLevels.override(10, false, false);
  calc.compute(s);
  c.int(s.total, 10, "Character Total from the overridden Abilities' 10");
  s.options.baseZero = true;
  s.options.baseZeroRange = 5;
  calc.compute(s);
  c.ok(s.warned(calc.BaseZeroBroken), "and Base Zero checks it");
  s.abilityLevels.clear();
  calc.compute(s);
  c.ok(!s.warned(calc.BaseZeroBroken), "cleared: Base Zero kept");

  c.sample = "Parse";
  const n = new calc.Number();
  c.ok(n.parse("12", false, false) && n.overridden && n.get() === 12, "12");
  c.ok(n.parse(" -2 ", false, false) && n.get() === -2, "' -2 '");
  c.ok(n.parse("  ", false, false) && !n.overridden, "blank clears");
  c.ok(n.parse("1/2", true, false) && n.isHalf(), "1/2 for a DX");
  c.ok(!n.parse("1/2", false, true) && n.isHalf(), "1/2 only for a DX");
  c.ok(n.parse("10+", false, true) && n.isPlus(), "10+ for an END");
  c.ok(n.text() === "10+", "10+ written back");
  c.ok(!n.parse("10+", true, false), "10+ only for an END");
  c.ok(!n.parse("x", true, true), "x refused");
  c.ok(!n.parse("+", true, true), "+ refused");
  c.ok(!n.parse("-", true, true), "- refused");
  c.ok(!n.parse("4 5", true, true), "4 5 refused");
  c.ok(!n.parse("1234567", true, true), "seven digits refused");
  c.done();
});

// The limits (p. 21) and the totals they check.
test("limits", () => {
  const c = new Checker("limits");
  let s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 4);
  tr(s.traits, "Smart", 4);
  tr(s.traits, "Weak", -1);
  calc.compute(s);
  c.int(s.abilityLevels, 8, "Abilities");
  c.int(s.weaknessLevels, -1, "Weaknesses");
  c.int(s.total, 7, "Character Total");
  c.int(s.points, 15, "Scaled Cost points 8 + 8 - 1");
  c.is(s.warnings.length, 0, "no limits, no warnings");
  s.options.baseZero = true;
  s.options.baseZeroRange = 5;
  calc.compute(s);
  c.ok(s.warned(calc.BaseZeroBroken), "Base Zero: 7 is past 5");
  tr(s.traits, "Poor", -2);
  calc.compute(s);
  c.ok(!s.warned(calc.BaseZeroBroken), "Base Zero: 5 isn't");
  s.options.scaledCost = true;
  calc.compute(s);
  c.int(s.points, 13, "Scaled Cost points 16 - 1 - 2");
  c.ok(
    s.warned(calc.BaseZeroBroken),
    "Base Zero on Scaled Cost's points: 13 is past 5",
  );

  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 5);
  tr(s.traits, "Smart", 5);
  tr(s.traits, "Quick", 5);
  tr(s.traits, "Poor", -3);
  tr(s.traits, "Rude", -3);
  tr(s.traits, "Shy", -3);
  tr(s.traits, "Mute", -1);
  s.options.powerCeiling = true;
  s.options.ceiling = 15;
  s.options.startingLevels = true;
  s.options.starting = 5;
  calc.compute(s);
  c.ok(!s.warned(calc.CeilingBroken), "Power Ceiling 15, 15 levels");
  c.ok(!s.warned(calc.StartingBroken), "starting 5 + Weaknesses 10");
  const know = tr(s.traits, "Knowledge", 1);
  calc.compute(s);
  c.ok(s.warned(calc.CeilingBroken), "Power Ceiling 15, 16 levels");
  c.ok(s.warned(calc.StartingBroken), "starting 5 + Weaknesses 10, 16 levels");
  s.options.halfCostKnowledge = true;
  know.level = 2;
  calc.compute(s);
  c.int(s.abilityLevels, 16, "Knowledge 2 at half cost");
  know.level = 3;
  const inept = tr(s.traits, "Ineptitude", -3);
  calc.compute(s);
  c.int(s.abilityLevels, 17, "Knowledge 3 at half cost, rounded up");
  c.int(s.weaknessLevels, -12, "Ineptitude -3 at half cost, rounded up");
  s.options.scaledCost = true;
  know.level = 5;
  calc.compute(s);
  c.int(s.abilityPoints, 53, "Scaled Cost: Knowledge 5 at half cost, 8");
  c.is(s.weaknessPoints, 15, "Scaled Cost: Ineptitude -3 at half cost, 2");
  c.is(know.points, 8, "Scaled Cost: Knowledge 5's own points, halved");
  c.is(inept.points, 2, "Scaled Cost: Ineptitude -3's own points, halved");
  c.is(s.traits[0]!.points, 15, "Scaled Cost: Agile 5's own points");
  c.ok(s.warned(calc.CeilingBroken), "Power Ceiling on Scaled Cost's points");
  s.abilityPoints.override(15, false, false);
  calc.compute(s);
  c.int(s.points, 0, "Ability points overridden to 15: the points 15 - 15");
  c.ok(
    !s.warned(calc.CeilingBroken),
    "Power Ceiling 15 on the overridden Ability points",
  );
  s.abilityPoints.clear();
  s.options.powerCeiling = false;
  s.options.startingLevels = false;
  s.options.scaledCost = false;
  calc.compute(s);
  c.int(s.abilityLevels, 20, "no limit, no half cost");
  c.is(s.warnings.length, 0, "no limit, no warnings");

  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 4);
  tr(s.traits, "Combat Expert", 2);
  tr(s.traits, "Evasive", 3);
  tr(s.traits, "Quick", 2);
  let a = newAttack(s);
  calc.compute(s);
  c.is(s.warnings.length, 0, "Combined Effectiveness off");
  s.options.combinedEffectiveness = true;
  calc.compute(s);
  c.ok(warnedAbout(s, calc.OverFive, a), "Combined Effectiveness: ROLL +6");
  c.ok(
    !warnedAbout(s, calc.OverFive, undefined),
    "Combined Effectiveness: Defense +5 is all right",
  );
  tr(s.traits, "Quick", 1);
  calc.compute(s);
  c.ok(
    warnedAbout(s, calc.OverFive, undefined),
    "Combined Effectiveness: Defense +6",
  );

  c.sample = "warnings";
  s = new calc.Sheet(calc.Character);
  a = newAttack(s);
  md(a.mods, "Paralyzing", 2, 0);
  md(a.mods, "Requirement", 1, -10);
  md(a.mods, "Cancel", 1, 0);
  md(a.mods, "Redirectable", 1, 0);
  md(a.mods, "Ranged", 1, 0);
  md(a.mods, "No Damage", 1, 0);
  md(a.mods, "Effective", 1, 0);
  calc.compute(s);
  c.is(s.warnings.length, 0, "within the limits");
  // Not in ova_cg_go's check: a thrown weapon, or a bow drawn by
  // strength, is ranged too (p. 86).
  const thrown = newAttack(s);
  md(thrown.mods, "Redirectable", 1, 0);
  md(thrown.mods, "Ranged, Strength-Powered", 1, 0);
  calc.compute(s);
  c.ok(
    !warnedAbout(s, calc.RedirectableAlone, thrown),
    "Redirectable with Ranged, Strength-Powered",
  );
  const b = newAttack(s);
  md(b.mods, "Paralyzing", 3, 0);
  md(b.mods, "Requirement", 1, -25);
  md(b.mods, "Cancel", 1, -7);
  md(b.mods, "Redirectable", 1, 0);
  md(b.mods, "No Damage", 1, 0);
  md(b.mods, "Ineffective", 1, 0);
  md(b.mods, "Ammunition", 4, 0);
  calc.compute(s);
  c.ok(warnedAbout(s, calc.TooOften, b), "Paralyzing x3, Ammunition x4");
  c.ok(warnedAbout(s, calc.CostRange, b), "Requirement -25, Cancel -7");
  c.ok(warnedAbout(s, calc.RedirectableAlone, b), "Redirectable not Ranged");
  c.ok(
    warnedAbout(s, calc.NoDamageIneffective, b),
    "No Damage with Ineffective",
  );
  c.is(s.warnings.length, 6, "six warnings");
  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Agile", 6);
  tr(s.traits, "Weak", 0);
  tr(s.traits, "Poor", -4);
  s.traits.push(new calc.Trait(undefined, rules.Ability, 2));
  calc.compute(s);
  c.ok(s.warned(calc.UnknownItem), "an unknown Ability");
  c.int(s.abilityLevels, 8, "an unknown Ability counts in the totals");
  c.is(s.warnings.length, 4, "Agile 6, Weak 0, Poor -4");
  c.done();
});

// A Boss (p. 123-124): a character's Health and Endurance; 5 TV for each
// Boss Ability, whose level no total counts.
test("boss", () => {
  const c = new Checker("boss");
  let s = new calc.Sheet(calc.BossSheet);
  tr(s.traits, "Attack", 2);
  calc.compute(s);
  const tv = s.tv.get();
  c.int(s.health, 40, "HEALTH");
  c.int(s.endurance, 40, "ENDURANCE");
  tr(s.traits, "Health Reserve", 1);
  tr(s.traits, "Scale Advantage", 1);
  calc.compute(s);
  c.is(s.tv.get(), tv + 10, "TV: 5 for each");
  c.int(s.abilityLevels, 2, "a Boss Ability's level in no total");
  c.int(s.abilityPoints, 2, "nor its points");
  c.int(s.health, 40, "HEALTH isn't doubled");
  c.is(s.warnings.length, 0, "no warnings");
  s = new calc.Sheet(calc.Character);
  tr(s.traits, "Escape Plan", 1);
  calc.compute(s);
  c.ok(s.warned(calc.NotBoss), "a Boss Ability off a Boss's sheet");
  c.done();
});
