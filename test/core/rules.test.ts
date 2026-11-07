// The checks of ova_cg_go's internal/rules/rules_test.go, with its
// labels.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../src/core/rules.ts";

type QuickEntry = [rules.Kind, string, rules.CostKind, number, number];

// The Quick List (p. 90) is a source independent of the entries'
// headings, from which the pages were taken: every name on it must be
// here, of the same kind, at the same place in the book's order, with
// the cost it gives. Its entries were generated from the PDF's text of
// p. 90 (ova_cg_po's PLAN.md, Phase 1), not typed; here they were
// converted from ova_cg_go's rules_test.go by a script.
const quickList: QuickEntry[] = [
  [rules.Ability, "Agile", rules.FixedCost, 0, 0],
  [rules.Ability, "Armored", rules.FixedCost, 0, 0],
  [rules.Ability, "Art of Invisibility", rules.FixedCost, 0, 0],
  [rules.Ability, "Attack", rules.FixedCost, 0, 0],
  [rules.Ability, "Barrier", rules.FixedCost, 0, 0],
  [rules.Ability, "Beautiful", rules.FixedCost, 0, 0],
  [rules.Ability, "Charismatic", rules.FixedCost, 0, 0],
  [rules.Ability, "Combat Expert", rules.FixedCost, 0, 0],
  [rules.Ability, "Companion", rules.FixedCost, 0, 0],
  [rules.Ability, "Connected", rules.FixedCost, 0, 0],
  [rules.Ability, "Cute!", rules.FixedCost, 0, 0],
  [rules.Ability, "Dexterous", rules.FixedCost, 0, 0],
  [rules.Ability, "Dimensional Pocket", rules.FixedCost, 0, 0],
  [rules.Ability, "Endurance Reserve", rules.FixedCost, 0, 0],
  [rules.Ability, "Evasive", rules.FixedCost, 0, 0],
  [rules.Ability, "Famous", rules.FixedCost, 0, 0],
  [rules.Ability, "Flight", rules.FixedCost, 0, 0],
  [rules.Ability, "Gear", rules.FixedCost, 0, 0],
  [rules.Ability, "Healer", rules.FixedCost, 0, 0],
  [rules.Ability, "Heightened Sense", rules.FixedCost, 0, 0],
  [rules.Ability, "Illusionist", rules.FixedCost, 0, 0],
  [rules.Ability, "Incorporeal Form", rules.FixedCost, 0, 0],
  [rules.Ability, "Intimidating", rules.FixedCost, 0, 0],
  [rules.Ability, "Intuitive", rules.FixedCost, 0, 0],
  [rules.Ability, "Inventor", rules.FixedCost, 0, 0],
  [rules.Ability, "Invisibility", rules.FixedCost, 0, 0],
  [rules.Ability, "Iron-Willed", rules.FixedCost, 0, 0],
  [rules.Ability, "Knowledge", rules.FixedCost, 0, 0],
  [rules.Ability, "Life Support", rules.FixedCost, 0, 0],
  [rules.Ability, "Lucky", rules.FixedCost, 0, 0],
  [rules.Ability, "Magic, Arcane", rules.FixedCost, 0, 0],
  [rules.Ability, "Magic, Witchcraft", rules.FixedCost, 0, 0],
  [rules.Ability, "Minions", rules.FixedCost, 0, 0],
  [rules.Ability, "Passion", rules.FixedCost, 0, 0],
  [rules.Ability, "Perceptive", rules.FixedCost, 0, 0],
  [rules.Ability, "Performer", rules.FixedCost, 0, 0],
  [rules.Ability, "Pilot", rules.FixedCost, 0, 0],
  [rules.Ability, "Position of Power", rules.FixedCost, 0, 0],
  [rules.Ability, "Psychic", rules.FixedCost, 0, 0],
  [rules.Ability, "Quick", rules.FixedCost, 0, 0],
  [rules.Ability, "Resistance", rules.FixedCost, 0, 0],
  [rules.Ability, "Shape-Shifter", rules.FixedCost, 0, 0],
  [rules.Ability, "Sixth Sense", rules.FixedCost, 0, 0],
  [rules.Ability, "Smart", rules.FixedCost, 0, 0],
  [rules.Ability, "Spirit Medium", rules.FixedCost, 0, 0],
  [rules.Ability, "Strong", rules.FixedCost, 0, 0],
  [rules.Ability, "Telekinesis", rules.FixedCost, 0, 0],
  [rules.Ability, "Teleport", rules.FixedCost, 0, 0],
  [rules.Ability, "Time Freeze", rules.FixedCost, 0, 0],
  [rules.Ability, "Tough", rules.FixedCost, 0, 0],
  [rules.Ability, "Transformation", rules.FixedCost, 0, 0],
  [rules.Ability, "Unique Ability", rules.FixedCost, 0, 0],
  [rules.Ability, "Vehicle (Mecha)", rules.FixedCost, 0, 0],
  [rules.Ability, "Vigorous", rules.FixedCost, 0, 0],
  [rules.Ability, "Walking Arsenal", rules.FixedCost, 0, 0],
  [rules.Ability, "Wealthy", rules.FixedCost, 0, 0],
  [rules.Weakness, "Absent-Minded", rules.FixedCost, 0, 0],
  [rules.Weakness, "Accidental Transformation", rules.FixedCost, 0, 0],
  [rules.Weakness, "Ageism", rules.FixedCost, 0, 0],
  [rules.Weakness, "Airhead", rules.FixedCost, 0, 0],
  [rules.Weakness, "Amnesia", rules.FixedCost, 0, 0],
  [rules.Weakness, "Arrogant", rules.FixedCost, 0, 0],
  [rules.Weakness, "Awkward Size", rules.FixedCost, 0, 0],
  [rules.Weakness, "Bizarre Appearance", rules.FixedCost, 0, 0],
  [rules.Weakness, "Clumsy", rules.FixedCost, 0, 0],
  [rules.Weakness, "Code of Conduct", rules.FixedCost, 0, 0],
  [rules.Weakness, "Compulsion", rules.FixedCost, 0, 0],
  [rules.Weakness, "Coward", rules.FixedCost, 0, 0],
  [rules.Weakness, "Crybaby", rules.FixedCost, 0, 0],
  [rules.Weakness, "Dense", rules.FixedCost, 0, 0],
  [rules.Weakness, "Dependency", rules.FixedCost, 0, 0],
  [rules.Weakness, "Dull", rules.FixedCost, 0, 0],
  [rules.Weakness, "Easily Distracted", rules.FixedCost, 0, 0],
  [rules.Weakness, "Emotionless", rules.FixedCost, 0, 0],
  [rules.Weakness, "Endurance Use", rules.FixedCost, 0, 0],
  [rules.Weakness, "Fear", rules.FixedCost, 0, 0],
  [rules.Weakness, "Focus", rules.FixedCost, 0, 0],
  [rules.Weakness, "Frail", rules.FixedCost, 0, 0],
  [rules.Weakness, "Fussy", rules.FixedCost, 0, 0],
  [rules.Weakness, "Greedy", rules.FixedCost, 0, 0],
  [rules.Weakness, "Guardian", rules.FixedCost, 0, 0],
  [rules.Weakness, "Hatred", rules.FixedCost, 0, 0],
  [rules.Weakness, "Impaired Sense", rules.FixedCost, 0, 0],
  [rules.Weakness, "Impulsive", rules.FixedCost, 0, 0],
  [rules.Weakness, "Ineptitude", rules.FixedCost, 0, 0],
  [rules.Weakness, "Infamous", rules.FixedCost, 0, 0],
  [rules.Weakness, "Jittery", rules.FixedCost, 0, 0],
  [rules.Weakness, "Kind-Hearted", rules.FixedCost, 0, 0],
  [rules.Weakness, "Languid", rules.FixedCost, 0, 0],
  [rules.Weakness, "Lecherous", rules.FixedCost, 0, 0],
  [rules.Weakness, "Limited Uses", rules.FixedCost, 0, 0],
  [rules.Weakness, "Loner", rules.FixedCost, 0, 0],
  [rules.Weakness, "Love Interest", rules.FixedCost, 0, 0],
  [rules.Weakness, "Love Magnet", rules.FixedCost, 0, 0],
  [rules.Weakness, "Mute", rules.FixedCost, 0, 0],
  [rules.Weakness, "Naive", rules.FixedCost, 0, 0],
  [rules.Weakness, "Nosebleeder", rules.FixedCost, 0, 0],
  [rules.Weakness, "Oblivious", rules.FixedCost, 0, 0],
  [rules.Weakness, "Obsession", rules.FixedCost, 0, 0],
  [rules.Weakness, "Outcast", rules.FixedCost, 0, 0],
  [rules.Weakness, "Overconfident", rules.FixedCost, 0, 0],
  [rules.Weakness, "Pacifist", rules.FixedCost, 0, 0],
  [rules.Weakness, "Poor", rules.FixedCost, 0, 0],
  [rules.Weakness, "Quirk", rules.FixedCost, 0, 0],
  [rules.Weakness, "Restricted Freedom", rules.FixedCost, 0, 0],
  [rules.Weakness, "Rival", rules.FixedCost, 0, 0],
  [rules.Weakness, "Room for Two", rules.FixedCost, 0, 0],
  [rules.Weakness, "Rude", rules.FixedCost, 0, 0],
  [rules.Weakness, "Secret", rules.FixedCost, 0, 0],
  [rules.Weakness, "Sensitivity", rules.FixedCost, 0, 0],
  [rules.Weakness, "Servitude", rules.FixedCost, 0, 0],
  [rules.Weakness, "Short-Tempered", rules.FixedCost, 0, 0],
  [rules.Weakness, "Shy", rules.FixedCost, 0, 0],
  [rules.Weakness, "Slow", rules.FixedCost, 0, 0],
  [rules.Weakness, "Soft Spot", rules.FixedCost, 0, 0],
  [rules.Weakness, "Split Personality", rules.FixedCost, 0, 0],
  [rules.Weakness, "Stubborn", rules.FixedCost, 0, 0],
  [rules.Weakness, "Suppressed Power", rules.FixedCost, 0, 0],
  [rules.Weakness, "Trigger", rules.FixedCost, 0, 0],
  [rules.Weakness, "Unique Weakness", rules.FixedCost, 0, 0],
  [rules.Weakness, "Unlucky", rules.FixedCost, 0, 0],
  [rules.Weakness, "Vulnerability", rules.FixedCost, 0, 0],
  [rules.Weakness, "Wanted", rules.FixedCost, 0, 0],
  [rules.Weakness, "Weak", rules.FixedCost, 0, 0],
  [rules.Weakness, "Weak-Willed", rules.FixedCost, 0, 0],
  [rules.Perk, "Accurate", rules.FixedCost, 5, 0],
  [rules.Perk, "Area Effect", rules.FixedCost, 10, 0],
  [rules.Perk, "Armor Piercing", rules.FixedCost, 5, 0],
  [rules.Perk, "Barrier Buster", rules.FixedCost, 5, 0],
  [rules.Perk, "Blinding", rules.FixedCost, 20, 0],
  [rules.Perk, "Continued Effect", rules.FixedCost, 10, 0],
  [rules.Perk, "Defensive", rules.FixedCost, 5, 0],
  [rules.Perk, "Disarming", rules.FixedCost, 10, 0],
  [rules.Perk, "Effective", rules.FixedCost, 5, 0],
  [rules.Perk, "Fatiguing", rules.FixedCost, 0, 0],
  [rules.Perk, "Impairing", rules.FixedCost, 10, 0],
  [rules.Perk, "Multiple Targets", rules.FixedCost, 10, 0],
  [rules.Perk, "No Gesture", rules.FixedCost, 5, 0],
  [rules.Perk, "Overwhelming", rules.FixedCost, 15, 0],
  [rules.Perk, "Paralyzing", rules.FixedCost, 10, 0],
  [rules.Perk, "Ranged", rules.FixedCost, 0, 0],
  [rules.Perk, "Ranged, Str.-Powered", rules.FixedCost, 5, 0],
  [rules.Perk, "Reach", rules.FixedCost, 5, 0],
  [rules.Perk, "Redirectable", rules.FixedCost, 5, 0],
  [rules.Perk, "Strike Through", rules.FixedCost, 5, 0],
  [rules.Perk, "Stunning", rules.FixedCost, 10, 0],
  [rules.Perk, "Trap", rules.FixedCost, 5, 0],
  [rules.Perk, "Unique Perk", rules.UserCost, 0, 0],
  [rules.Perk, "Vampire", rules.FixedCost, 5, 0],
  [rules.Perk, "Will Attack", rules.FixedCost, 0, 0],
  [rules.Flaw, "Activation", rules.FixedCost, -10, 0],
  [rules.Flaw, "Ammunition", rules.FixedCost, -5, 0],
  [rules.Flaw, "Assisted", rules.FixedCost, -15, 0],
  [rules.Flaw, "Backlash", rules.FixedCost, -5, 0],
  [rules.Flaw, "Break", rules.FixedCost, -10, 0],
  [rules.Flaw, "Buildup", rules.FixedCost, -5, 0],
  [rules.Flaw, "Cancel", rules.RangeCost, -20, 0],
  [rules.Flaw, "Concentration", rules.FixedCost, -20, 0],
  [rules.Flaw, "Delayed", rules.FixedCost, -5, 0],
  [rules.Flaw, "Elaborate Gestures", rules.FixedCost, -5, 0],
  [rules.Flaw, "Feather Blow", rules.FixedCost, -5, 0],
  [rules.Flaw, "Finisher", rules.FixedCost, -10, 0],
  [rules.Flaw, "Inaccurate", rules.FixedCost, -5, 0],
  [rules.Flaw, "Ineffective", rules.FixedCost, -5, 0],
  [rules.Flaw, "Low Penetration", rules.FixedCost, -5, 0],
  [rules.Flaw, "No Damage", rules.FixedCost, -20, 0],
  [rules.Flaw, "Open to Attack", rules.FixedCost, -25, 0],
  [rules.Flaw, "Recoil", rules.FixedCost, -10, 0],
  [rules.Flaw, "Requirement", rules.RangeCost, -20, -5],
  [rules.Flaw, "Self-Only", rules.FixedCost, -5, 0],
  [rules.Flaw, "Unique Flaw", rules.UserCost, 0, 0],
  [rules.Flaw, "Unwieldy", rules.FixedCost, -5, 0],
  [rules.Flaw, "Weapon", rules.FixedCost, -5, 0],
];

test("the Quick List", () => {
  const next = [0, 0, 0, 0];
  for (const [kind, name, costKind, cost, max] of quickList) {
    const it = rules.find(name);
    let ok =
      it !== undefined &&
      it.kind === kind &&
      next[kind]! < rules.count(kind) &&
      rules.get(kind, next[kind]!) === it;
    if (ok && kind >= rules.Perk) {
      ok = it!.costKind === costKind;
      if (ok && costKind === rules.FixedCost) ok = it!.cost === cost;
      else if (ok && costKind === rules.RangeCost)
        ok = it!.minCost === cost && it!.maxCost === max;
    }
    assert.ok(ok, `the Quick List's ${name} doesn't match`);
    next[kind]!++;
  }
  for (const k of rules.kinds)
    assert.equal(
      next[k],
      rules.count(k),
      `kind ${k}: ${next[k]} on the Quick List, ${rules.count(k)} here: nothing beyond the Quick List`,
    );
  assert.ok(
    rules.count(rules.Ability) === 56 &&
      rules.count(rules.Weakness) === 69 &&
      rules.count(rules.Perk) === 25 &&
      rules.count(rules.Flaw) === 23,
    "56 Abilities, 69 Weaknesses, 25 Perks, 23 Flaws",
  );
});

// Each kind's pages lie within its part of the chapter and never go
// back, since the book lists each kind alphabetically.
function pagesIn(k: rules.Kind, from: number, to: number): boolean {
  let last = from;
  for (let i = 0; i < rules.count(k); i++) {
    const it = rules.get(k, i);
    if (it.page < last || it.page > to) return false;
    last = it.page;
  }
  return (
    rules.get(k, 0).page === from &&
    rules.get(k, rules.count(k) - 1).page === to
  );
}

function pageIs(name: string, page: number): boolean {
  return rules.find(name)?.page === page;
}

test("pages", () => {
  assert.ok(pagesIn(rules.Ability, 49, 65), "Abilities on pp. 49-65, in order");
  assert.ok(
    pagesIn(rules.Weakness, 66, 82),
    "Weaknesses on pp. 66-82, in order",
  );
  assert.ok(pagesIn(rules.Perk, 83, 86), "Perks on pp. 83-86, in order");
  assert.ok(pagesIn(rules.Flaw, 87, 89), "Flaws on pp. 87-89, in order");
  assert.ok(
    pageIs("Attack", 50) &&
      pageIs("Short-Tempered", 79) &&
      pageIs("Weapon", 89) &&
      pageIs("Ammunition", 87) &&
      pageIs("Ranged, Strength-Powered", 86),
    "pages checked by eye and by hand",
  );
  assert.equal(
    rules.pdfIndex(50),
    52,
    "the PDF's page index is the printed page + 2",
  );
});

function maxTimes(name: string): number {
  return rules.find(name)?.maxTimes ?? -1;
}

function linked(name: string): number {
  return rules.find(name)?.linked ?? -1;
}

test("repeats", () => {
  let unlimited = 0,
    two = 0,
    three = 0,
    once = 0;
  for (const k of [rules.Perk, rules.Flaw] as const) {
    for (let i = 0; i < rules.count(k); i++) {
      switch (rules.get(k, i).maxTimes) {
        case rules.Unlimited:
          unlimited++;
          break;
        case 2:
          two++;
          break;
        case 3:
          three++;
          break;
        case 1:
          once++;
          break;
      }
    }
  }
  assert.ok(
    unlimited === 16 && two === 2 && three === 1 && once === 29,
    "16 repeat freely, 2 at most twice, 1 at most three times, 29 once",
  );
  assert.ok(
    maxTimes("Continued Effect") === 2 &&
      maxTimes("Paralyzing") === 2 &&
      maxTimes("Ammunition") === 3,
    "the limited ones: Continued Effect, Paralyzing, Ammunition",
  );
  assert.ok(
    maxTimes("Low Penetration") === rules.Unlimited &&
      maxTimes("Assisted") === rules.Unlimited &&
      maxTimes("Effective") === rules.Unlimited,
    "Low Penetration, Assisted, Effective repeat",
  );
  assert.ok(
    maxTimes("Cancel") === 1 &&
      maxTimes("Requirement") === 1 &&
      maxTimes("Unique Perk") === 1,
    "Cancel, Requirement, Unique Perk are taken once",
  );
});

test("find", () => {
  assert.equal(rules.find("attack")?.name, "Attack", "Find ignores case");
  assert.equal(
    rules.find("Vehicle")?.name,
    "Vehicle (Mecha)",
    "Find: Vehicle is Vehicle (Mecha)",
  );
  assert.equal(
    rules.find("ranged, str.-powered")?.name,
    "Ranged, Strength-Powered",
    "Find: the Quick List's Ranged, Str.-Powered",
  );
  assert.ok(
    rules.find("Magic, Testing") === undefined &&
      rules.find("") === undefined &&
      rules.find("Attac") === undefined &&
      rules.find("Attacks") === undefined,
    "Find: no near misses",
  );
});

test("labels", () => {
  assert.equal(
    rules.label(rules.find("Attack")!),
    "Attack (p. 50)",
    "Label: Attack (p. 50)",
  );
  assert.equal(
    rules.pageText(rules.find("Attack")),
    "p. 50",
    "PageText: p. 50",
  );
  assert.equal(
    rules.pageText(undefined),
    "p. ?",
    "PageText of an unknown item: p. ?",
  );
  assert.equal(
    rules.labelOf("Magic, Testing"),
    "Magic, Testing (p. ?)",
    "LabelOf an unknown name keeps it, with p. ?",
  );
  assert.equal(
    rules.labelOf("vehicle"),
    "Vehicle (Mecha) (p. 64)",
    "LabelOf a known name gives the book's name",
  );
  assert.equal(
    rules.nameLabel(undefined, "Zany"),
    "Zany (p. ?)",
    "NameLabel of an unknown item",
  );
});

test("tables", () => {
  assert.ok(
    rules.toughBonus(0) === 0 &&
      rules.toughBonus(1) === 10 &&
      rules.toughBonus(4) === 40 &&
      rules.toughBonus(5) === 60,
    "Tough and Vigorous: 10, 20, 30, 40, 60",
  );
  assert.ok(
    rules.reserveBonus(1) === 20 && rules.reserveBonus(5) === 100,
    "Endurance Reserve: 20 a level",
  );
  assert.ok(
    rules.enduranceUseCost(0) === 0 &&
      rules.enduranceUseCost(-1) === 5 &&
      rules.enduranceUseCost(-2) === 10 &&
      rules.enduranceUseCost(-3) === 20,
    "Endurance Use: 5, 10, 20",
  );
  const rows = [
    [20, 30, 40, 50, 60],
    [10, 20, 30, 40, 50],
    [5, 10, 20, 30, 40],
    [2, 5, 10, 20, 30],
    [0, 2, 5, 10, 20],
  ];
  for (let m = 1; m <= 5; m++)
    for (let a = 1; a <= 5; a++)
      assert.equal(
        rules.spellCost(m, a),
        rows[m - 1]![a - 1],
        `the Spell Endurance Cost table (p. 58): Magic ${m}, Ability ${a}`,
      );
  assert.equal(
    rules.spellCost(3, 2),
    10,
    "Auren's Mana Shield: Barrier +2 at Magic 3 costs 10",
  );
});

// Not in ova_cg_go's tests, where a panic out of range is Go's: here a
// level out of range must throw, not give NaN or undefined.
test("tables out of range", () => {
  for (const f of [
    () => rules.toughBonus(6),
    () => rules.toughBonus(-1),
    () => rules.toughBonus(1.5),
    () => rules.reserveBonus(6),
    () => rules.enduranceUseCost(-4),
    () => rules.enduranceUseCost(1),
    () => rules.spellCost(0, 1),
    () => rules.spellCost(1, 6),
    () => rules.get(rules.Ability, rules.count(rules.Ability)),
    () => rules.get(rules.Ability, -1),
    () => rules.offered(rules.Weakness, rules.count(rules.Weakness), true),
  ])
    assert.throws(f, RangeError);
});

function has(name: string, f: rules.Flag): boolean {
  return rules.has(rules.find(name), f);
}

test("flags", () => {
  assert.ok(
    has("Agile", rules.Agility) &&
      has("Clumsy", rules.Agility) &&
      has("Combat Expert", rules.CombatSkill) &&
      has("Iron-Willed", rules.Will) &&
      has("Weak-Willed", rules.Will),
    "the Attack Roll's Abilities and Weaknesses",
  );
  assert.ok(
    has("Evasive", rules.DefenseRoll) &&
      has("Quick", rules.DefenseRoll) &&
      has("Slow", rules.DefenseRoll) &&
      has("Barrier", rules.SecondDefense),
    "the Defense Roll's",
  );
  assert.ok(
    has("Attack", rules.Damage) &&
      has("Strong", rules.Strength) &&
      has("Weak", rules.Strength) &&
      has("Telekinesis", rules.Telekinetic),
    "the Damage Multiplier's",
  );
  assert.ok(
    has("Tough", rules.HealthTable) &&
      has("Frail", rules.HealthTens) &&
      has("Vigorous", rules.EnduranceTable) &&
      has("Languid", rules.EnduranceTens) &&
      has("Endurance Reserve", rules.Reserve),
    "Health's and Endurance's",
  );
  assert.ok(
    has("Healer", rules.HalfTV) &&
      has("Magic, Arcane", rules.HalfTV) &&
      has("Magic, Witchcraft", rules.HalfTV) &&
      has("Companion", rules.NoTV) &&
      has("Minions", rules.NoTV) &&
      has("Armored", rules.Armor),
    "TV's",
  );
  assert.ok(
    has("Knowledge", rules.HalfCost) &&
      has("Ineptitude", rules.HalfCost) &&
      has("Endurance Use", rules.CostUp),
    "half cost, and Endurance Use",
  );
  assert.ok(
    has("Accurate", rules.RollEach) &&
      has("Inaccurate", rules.RollEach) &&
      has("Effective", rules.DamageEach) &&
      has("Ineffective", rules.DamageEach) &&
      has("Ranged", rules.RangedAttack) &&
      has("Ranged, Strength-Powered", rules.StrengthRanged) &&
      has("Will Attack", rules.WillAttack) &&
      has("No Damage", rules.NoDamageDone),
    "the Perks' and Flaws'",
  );
  assert.ok(
    has("Barrier", rules.OwnCost) && !has("Flight", rules.OwnCost),
    "Barrier spends Endurance of its own",
  );
  assert.ok(
    !has("Magic, Testing", rules.Agility),
    "an unknown item has no flags",
  );
  assert.ok(
    linked("Transformation") === rules.Form &&
      linked("Companion") === rules.Partner &&
      linked("Magic, Arcane") === rules.Spells &&
      linked("Magic, Witchcraft") === rules.Spells &&
      linked("Vehicle (Mecha)") === rules.Machine &&
      linked("Attack") === rules.NoLink,
    "linked content",
  );
  assert.ok(
    rules.index(rules.find("Agile")) === 0 &&
      rules.index(rules.find("Weapon")) === rules.count(rules.Flaw) - 1 &&
      rules.index(undefined) === -1,
    "Index",
  );
});

// The Boss Abilities (p. 123): Abilities, found by name, but offered only
// to a list that asks for them, after every other.
test("boss", () => {
  const n = rules.count(rules.Ability);
  const want = [
    "Health Reserve",
    "Extra Actions",
    "Scale Advantage",
    "Escape Plan",
  ];
  assert.equal(
    rules.bossCount(),
    want.length,
    `BossCount ${rules.bossCount()}`,
  );
  want.forEach((name, i) => {
    const it = rules.getBoss(i);
    assert.ok(
      it.name === name &&
        it.kind === rules.Ability &&
        it.page === 123 &&
        it.has(rules.BossOnly),
      `Boss Ability ${i}: ${JSON.stringify(it)}`,
    );
    assert.ok(
      rules.find(name) === it && rules.index(it) === -1,
      `${name}: found by name, in no kind's order`,
    );
    assert.ok(
      rules.offerIndex(it, rules.Ability, false) === -1 &&
        rules.offerIndex(it, rules.Ability, true) === n + i &&
        rules.offered(rules.Ability, n + i, true) === it,
      `${name}: offered last, and only to a Boss's list`,
    );
  });
  for (let i = 0; i < n; i++) {
    const it = rules.get(rules.Ability, i);
    assert.ok(
      !it.has(rules.BossOnly) &&
        rules.offerIndex(it, rules.Ability, true) === i,
      `${it.name}: an Ability's place the same`,
    );
  }
  assert.ok(
    rules.offerCount(rules.Ability, false) === n &&
      rules.offerCount(rules.Ability, true) === n + 4 &&
      rules.offerCount(rules.Weakness, true) === rules.count(rules.Weakness),
    "only Abilities offer them",
  );
});
