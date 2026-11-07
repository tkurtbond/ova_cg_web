// Computes the numbers on the sheet from the character.
//
// ova_cg_po's PLAN.md, "The rules the program computes" and "Limiting
// the character": each attack's ROLL, DX and END; the END of an Ability
// with Perks and Flaws or Endurance Use, and of each spell; DEFENSE,
// Barrier's and Incorporeal Form's alternate Defenses; HEALTH,
// ENDURANCE, Endurance Reserve and TV; the running totals; and the
// warnings of broken limits.
//
// A character is given as a Sheet of Traits (its Abilities and
// Weaknesses) and Attacks, each Attack and Trait with its Perks and
// Flaws (Mods). Where ova_cg_go's model embeds these types and points
// back with an Owner, character's classes here extend them (PLAN.md,
// "calc"), so a warning's Trait is the character's own record.
//
// Every computed number is a Number, which also holds the user's
// override (ova_cg_po's PLAN.md, "Overriding a computed number").
// compute reads the overrides of the numbers others are computed from
// (an attack's ROLL and DX, Defense, the totals) so that an override
// counts downstream, and sets every computed value; the overrides it
// leaves alone.
//
// The port of ova_cg_go's internal/calc (itself ova_cg_po's OvaCalc).
// This module's Number shadows the global Number inside it, so nothing
// here uses the global; import the module as a namespace (calc.Number).

import * as rules from "./rules.ts";

/** Where Health and Endurance start, and TV's last step. */
export type SheetKind = 0 | 1 | 2 | 3 | 4;
/** 40 and 40 (p. 19); a Vehicle's too (p. 64) */
export const Character = 0;
/** 20 and 20 (p. 52); TV 4 less, at least 1, a Secondary NPC's (p. 123-124) */
export const CompanionSheet = 1;
/** 10 and 10 (p. 58) */
export const MinionSheet = 2;
/** 10 and 10 (p. 123); TV always 1, an Extra's (p. 124) */
export const ExtraSheet = 3;
/** 40 and 40, a character's (p. 123); it alone may have Boss Abilities */
export const BossSheet = 4;

/**
 * A warning's kind. Each names what it is about in its trait, attack,
 * mod or spell; none for the sheet as a whole.
 */
export type Code = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
/** Trait or mod: a name rules doesn't have */
export const UnknownItem = 0;
/** Trait: an Ability not +1 to +5, a Weakness not -1 to -3 (p. 18) */
export const LevelRange = 1;
/** Mod: taken more times than its text allows (p. 83) */
export const TooOften = 2;
/** Mod: a chosen cost outside its range, or not in steps of 5 (p. 87-88) */
export const CostRange = 3;
/** Attack: No Damage with Ineffective (p. 88) */
export const NoDamageIneffective = 4;
/** Attack: Redirectable without Ranged (p. 86) */
export const RedirectableAlone = 5;
/**
 * Spell: its Magic's level not 1 to 5, or its own not 1 to 5 or -1 to
 * -3: no cost (p. 58)
 */
export const SpellRange = 6;
/** Tough, Vigorous or Endurance Reserve past +5 in all: counted as +5 */
export const TableRange = 7;
/** The Character Total (or points) beyond Base Zero's range (p. 21) */
export const BaseZeroBroken = 8;
/** Abilities beyond the starting levels and the Weaknesses' (p. 21) */
export const StartingBroken = 9;
/** Abilities beyond the Power Ceiling (p. 21) */
export const CeilingBroken = 10;
/** Attack, or none for Defense: Abilities give a roll more than +5 (p. 21) */
export const OverFive = 11;
/** Trait: a Boss Ability on a sheet that isn't a Boss's (p. 123) */
export const NotBoss = 12;

const combinedLimit = 5; // Combined Effectiveness: at most +5 to a roll
const characterBase = 40;
const companionBase = 20;
const minionBase = 10;
const companionTV = 4; // taken off a Secondary NPC's TV
const bossTV = 5; // added for each Boss Ability (p. 124)
const maxLevel = 5;
const minWeakness = -3;
const costStep = 5;

/** Go's integer division, which truncates toward 0. */
function quo(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** The integer as Go's strconv.Itoa writes it. */
function itoa(n: number): string {
  return String(n);
}

// ---- Numbers ----

/**
 * A number on the sheet: the computed value, and the override the user
 * typed, if any. A DX can be 1/2 (half, value 0) and a spell's END "10+"
 * (plus). An override is the same three.
 */
export class Number {
  value = 0;
  half = false;
  plus = false;
  overridden = false;
  ovValue = 0;
  ovHalf = false;
  ovPlus = false;

  /** Sets the computed value: for calc, never the page. */
  setComputed(value: number, half: boolean, plus: boolean): void {
    this.value = value;
    this.half = half;
    this.plus = plus;
  }

  /** Sets the computed value, neither 1/2 nor "+": for calc. */
  set(value: number): void {
    this.setComputed(value, false, false);
  }

  /** Overrides the number with value (1/2 if half, value+ if plus). */
  override(value: number, half: boolean, plus: boolean): void {
    this.overridden = true;
    if (half) value = 0;
    this.ovValue = value;
    this.ovHalf = half;
    this.ovPlus = plus;
  }

  /** Goes back to the computed value. */
  clear(): void {
    this.overridden = false;
    this.ovValue = 0;
    this.ovHalf = false;
    this.ovPlus = false;
  }

  /** The value in effect: the override if there is one; 1/2 is 0. */
  get(): number {
    return this.overridden ? this.ovValue : this.value;
  }

  /** Whether the number in effect is 1/2. */
  isHalf(): boolean {
    return this.overridden ? this.ovHalf : this.half;
  }

  /** Whether the number in effect is written with a "+". */
  isPlus(): boolean {
    return this.overridden ? this.ovPlus : this.plus;
  }

  /** The number in effect as the sheet writes it: "4", "1/2", "10+". */
  text(): string {
    return format(this.get(), this.isHalf(), this.isPlus());
  }

  /** The computed number, whatever the override. */
  computedText(): string {
    return format(this.value, this.half, this.plus);
  }

  /**
   * Sets the override from what the user typed in its box: blank clears
   * it; else an integer, "1/2" if allowHalf (a DX), or an integer and
   * "+" if allowPlus (an END). False, the number unchanged, for anything
   * else.
   */
  parse(s: string, allowHalf: boolean, allowPlus: boolean): boolean {
    s = trimBlanks(s);
    if (s === "") {
      this.clear();
      return true;
    }
    if (allowHalf && s === "1/2") {
      this.override(0, true, false);
      return true;
    }
    let plus = false;
    if (allowPlus && s.endsWith("+")) {
      plus = true;
      s = s.slice(0, -1);
    }
    let neg = false;
    if (s.startsWith("-")) {
      neg = true;
      s = s.slice(1);
    }
    // At most six digits, as ova_cg_po's: no overflow, and nothing on
    // the sheet is near a million.
    if (s.length === 0 || s.length > 6) return false;
    let v = 0;
    for (const c of s) {
      if (c < "0" || c > "9") return false;
      v = 10 * v + (c.charCodeAt(0) - 48);
    }
    if (neg) v = -v;
    this.override(v, false, plus);
    return true;
  }
}

function format(value: number, half: boolean, plus: boolean): string {
  let s = half ? "1/2" : itoa(value);
  if (plus) s += "+";
  return s;
}

/** s without leading and trailing spaces and tabs: Go's strings.Trim(s, " \t"). */
function trimBlanks(s: string): string {
  let i = 0;
  let j = s.length;
  while (i < j && (s[i] === " " || s[i] === "\t")) i++;
  while (j > i && (s[j - 1] === " " || s[j - 1] === "\t")) j--;
  return s.slice(i, j);
}

// ---- What a sheet is made of ----

/**
 * A Perk or Flaw taken, by an attack or an Ability. cost is each time's
 * cost where the user sets it: a RangeCost's or UserCost's, or an item
 * the tables don't have (from the file); else ignored.
 */
export class Mod {
  /** undefined: a name rules doesn't have */
  item: rules.Item | undefined;
  /** >= 1; ova_fmt's counts-as */
  times: number;
  cost: number;

  constructor(item: rules.Item | undefined, times: number, cost: number) {
    this.item = item;
    this.times = times;
    this.cost = cost;
  }
}

/** A Magic Ability's spell, mimicking item at level. */
export class Spell {
  item: rules.Item | undefined;
  level: number;
  end = new Number();

  constructor(item: rules.Item | undefined, level: number) {
    this.item = item;
    this.level = level;
  }
}

/** An Ability or Weakness, at its signed level. */
export class Trait {
  /** undefined: a name rules doesn't have */
  item: rules.Item | undefined;
  /** rules.Ability or Weakness, with or without item */
  kind: rules.Kind;
  level: number;
  /** Marked: half its level counts toward TV (p. 124) */
  halfTV: boolean;
  /** Its Perks and Flaws (p. 83) */
  mods: Mod[] = [];
  /** The level, -1 to -3, of an Endurance Use tied to it; 0 if none */
  use = 0;
  /** A Transformation's form: counted when transformed (p. 63) */
  form: Trait[] = [];
  /** A Magic Ability's */
  spells: Spell[] = [];
  /** A Companion's or Vehicle's own sheet */
  partner: Sheet | undefined = undefined;
  /** It has Perks, Flaws or Endurance Use: end is its cost */
  hasEnd = false;
  end = new Number();
  /** Its Scaled Cost points (p. 21), as the totals count them; 0 in a form */
  points = 0;

  /**
   * item may be undefined, for a name rules doesn't have; kind then says
   * which it is. A Healer or Magic Ability starts marked for TV (Go's
   * InitTrait).
   */
  constructor(item: rules.Item | undefined, kind: rules.Kind, level: number) {
    this.item = item;
    this.kind = kind;
    this.level = level;
    this.halfTV = rules.has(item, rules.HalfTV);
  }
}

/** An attack in the combat box. */
export class Attack {
  mods: Mod[] = [];
  /** Made with Telekinesis, which adds to its DX (p. 62) */
  telekinetic = false;
  /** Made in the transformed form, as Miho's Mode SP */
  transformed = false;
  /** An Endurance Use tied to it, as a Trait's */
  use = 0;
  roll = new Number();
  dx = new Number();
  end = new Number();
  // What TV takes of it (ova_cg_po's PLAN.md, "The combat box"): its
  // ROLL and DX in effect, less what Accurate, Inaccurate, Effective and
  // Ineffective add; 1/2 and No Damage count as 0. inTV is false for an
  // attack made in a form the sheet isn't shown in.
  inTV = false;
  tvRoll = 0;
  tvDX = 0;
}

/** The limits the user turned on (p. 21; ova_fmt's options:). */
export class Options {
  baseZero = false;
  baseZeroRange = 0;
  powerCeiling = false;
  ceiling = 0;
  startingLevels = false;
  starting = 0;
  scaledCost = false;
  halfCostKnowledge = false;
  combinedEffectiveness = false;
}

/** Something the rules find wrong, and what it is about. */
export interface Warning {
  readonly code: Code;
  readonly trait: Trait | undefined;
  readonly attack: Attack | undefined;
  readonly mod: Mod | undefined;
  readonly spell: Spell | undefined;
}

/**
 * A character's (or a partner's) Traits and Attacks, and every number
 * computed from them.
 */
export class Sheet {
  kind: SheetKind;
  /** In the order added */
  traits: Trait[] = [];
  attacks: Attack[] = [];
  /** Shown in the transformed form, as Fukiko's sheet is */
  transformed = false;
  options = new Options();
  defense = new Number();
  barrier = new Number();
  incorporeal = new Number();
  health = new Number();
  endurance = new Number();
  reserve = new Number();
  tv = new Number();
  hasBarrier = false;
  hasIncorporeal = false;
  hasReserve = false;
  // The running totals: levels (Knowledge and Ineptitude halved if the
  // options say so), the Character Total, and Scaled Cost's points: the
  // abilities', and the abilities' less the weaknesses'.
  abilityLevels = new Number();
  weaknessLevels = new Number();
  total = new Number();
  abilityPoints = new Number();
  points = new Number();
  /** >= 0 */
  weaknessPoints = 0;
  /** From the last compute, in the order found */
  warnings: Warning[] = [];

  /** An empty sheet of kind k (Go's NewSheet). */
  constructor(kind: SheetKind) {
    this.kind = kind;
  }

  /** Whether the last compute gave a warning of code c. */
  warned(c: Code): boolean {
    return this.warnings.some((w) => w.code === c);
  }
}

// ---- Warnings ----

function warn(
  s: Sheet,
  code: Code,
  trait?: Trait,
  attack?: Attack,
  mod?: Mod,
  spell?: Spell,
): void {
  s.warnings.push({ code, trait, attack, mod, spell });
}

// ---- Traits ----

function traitHas(t: Trait, f: rules.Flag): boolean {
  return rules.has(t.item, f);
}

/**
 * The signed levels of s's Traits that have flag f, with their forms'
 * when form (a Transformation's form adds to the same Abilities).
 */
function sum(s: Sheet, f: rules.Flag, form: boolean): number {
  let n = 0;
  for (const t of s.traits) {
    if (traitHas(t, f)) n += t.level;
    if (form) for (const x of t.form) if (traitHas(x, f)) n += x.level;
  }
  return n;
}

/** Whether s has a Trait with flag f (in its form too, when form). */
function present(s: Sheet, f: rules.Flag, form: boolean): boolean {
  for (const t of s.traits) {
    if (traitHas(t, f)) return true;
    if (form) for (const x of t.form) if (traitHas(x, f)) return true;
  }
  return false;
}

/**
 * A table's level, 0 to +5; one past it is counted as +5, with a warning
 * (two Tough Abilities, or the form's added to the base's).
 */
function tableLevel(s: Sheet, level: number): number {
  if (level > maxLevel) {
    warn(s, TableRange);
    return maxLevel;
  }
  if (level < 0) {
    warn(s, TableRange);
    return 0;
  }
  return level;
}

// ---- Perks and Flaws ----

function modHas(list: readonly Mod[], f: rules.Flag): boolean {
  return list.some((m) => rules.has(m.item, f));
}

/** Whether list has a Mod of kind k (rules.Perk or Flaw) with flag f. */
function kindHas(list: readonly Mod[], k: rules.Kind, f: rules.Flag): boolean {
  return list.some(
    (m) => m.item !== undefined && m.item.kind === k && m.item.has(f),
  );
}

function modHasItem(list: readonly Mod[], it: rules.Item): boolean {
  return list.some((m) => m.item === it);
}

/**
 * The times the Perks with flag f are taken, less the times the Flaws
 * with it are: Accurate x2 and Inaccurate x3 make -1.
 */
function net(list: readonly Mod[], f: rules.Flag): number {
  let n = 0;
  for (const m of list)
    if (m.item !== undefined && m.item.has(f)) {
      if (m.item.kind === rules.Perk) n += m.times;
      else n -= m.times;
    }
  return n;
}

/** What m adds to an END: its item's fixed cost, or its own, each time. */
export function modCost(m: Mod): number {
  if (m.item !== undefined && m.item.costKind === rules.FixedCost)
    return m.item.cost * m.times;
  return m.cost * m.times;
}

/** What Endurance Use at level adds (p. 70); none outside -1 to -3. */
function useCost(level: number): number {
  if (level < 0 && level >= minWeakness) return rules.enduranceUseCost(level);
  return 0;
}

/**
 * An attack's or Ability's Endurance cost (p. 83, 70): its Perks', its
 * Endurance Use's, less its Flaws', never below 0.
 */
function endCost(list: readonly Mod[], use: number): number {
  let n = useCost(use);
  for (const m of list) n += modCost(m);
  return n < 0 ? 0 : n;
}

/**
 * The warnings of each Mod: unknown, taken too often, a cost out of its
 * range. t or a is the owner.
 */
function checkMods(
  s: Sheet,
  list: readonly Mod[],
  t?: Trait,
  a?: Attack,
): void {
  for (const m of list) {
    const it = m.item;
    if (it === undefined) {
      warn(s, UnknownItem, t, a, m);
      continue;
    }
    if (m.times < 1 || m.times > it.maxTimes) warn(s, TooOften, t, a, m);
    // Go's %: the remainder takes the dividend's sign, as JavaScript's.
    if (
      it.costKind === rules.RangeCost &&
      (m.cost < it.minCost || m.cost > it.maxCost || m.cost % costStep !== 0)
    )
      warn(s, CostRange, t, a, m);
  }
}

// ---- The combat box (p. 105-107) ----

const redirectable = rules.find("Redirectable");

function computeAttack(s: Sheet, a: Attack): void {
  const form = s.transformed || a.transformed;
  // ROLL: 2 + Agile - Clumsy, or Iron-Willed - Weak-Willed for a Will
  // Attack, + Combat Expert, + Accurate - Inaccurate.
  let roll: number;
  if (modHas(a.mods, rules.WillAttack)) roll = 2 + sum(s, rules.Will, form);
  else roll = 2 + sum(s, rules.Agility, form);
  roll += sum(s, rules.CombatSkill, form);
  if (s.options.combinedEffectiveness && roll - 2 > combinedLimit)
    warn(s, OverFive, undefined, a);
  const netRoll = net(a.mods, rules.RollEach);
  a.roll.set(roll + netRoll);
  // DX: 1 + Attack + Strong - Weak (not if Ranged, unless
  // Strength-Powered) + Telekinesis if made with it + Effective -
  // Ineffective; 0 for No Damage, else 1/2 at 0 or less.
  let dx = 1 + sum(s, rules.Damage, form);
  if (
    !modHas(a.mods, rules.RangedAttack) ||
    modHas(a.mods, rules.StrengthRanged)
  )
    dx += sum(s, rules.Strength, form);
  if (a.telekinetic) dx += sum(s, rules.Telekinetic, form);
  const netDX = net(a.mods, rules.DamageEach);
  if (modHas(a.mods, rules.NoDamageDone)) a.dx.set(0);
  else if (dx + netDX <= 0) a.dx.setComputed(0, true, false);
  else a.dx.set(dx + netDX);
  a.end.set(endCost(a.mods, a.use));
  // What TV takes: the numbers in effect, overrides included, less what
  // the Perks and Flaws added each time.
  a.inTV = !a.transformed || s.transformed;
  a.tvRoll = a.roll.get() - netRoll;
  if (!a.dx.overridden) a.tvDX = dx;
  else if (a.dx.ovHalf) a.tvDX = 0;
  else a.tvDX = a.dx.ovValue - netDX;
  if (a.tvDX < 0) a.tvDX = 0;
  checkMods(s, a.mods, undefined, a);
  if (
    modHas(a.mods, rules.NoDamageDone) &&
    kindHas(a.mods, rules.Flaw, rules.DamageEach)
  )
    warn(s, NoDamageIneffective, undefined, a);
  if (
    redirectable !== undefined &&
    modHasItem(a.mods, redirectable) &&
    !modHas(a.mods, rules.RangedAttack) &&
    !modHas(a.mods, rules.StrengthRanged)
  )
    warn(s, RedirectableAlone, undefined, a);
}

/**
 * An Ability's or Weakness's own warnings and END, and its spells' costs
 * (p. 58): by the Magic's level and the spell's, "+" for an Ability that
 * spends Endurance of its own (Barrier). A spell at -1 to -3 casts a
 * Weakness, as Witchcraft's do, at the same costs (p. 58): by its size,
 * as Acacia's curses cost (p. 134).
 */
function computeTrait(s: Sheet, t: Trait): void {
  if (t.item === undefined) warn(s, UnknownItem, t);
  if (
    (t.kind === rules.Ability && (t.level < 1 || t.level > maxLevel)) ||
    (t.kind === rules.Weakness && (t.level > -1 || t.level < minWeakness))
  )
    warn(s, LevelRange, t);
  if (traitHas(t, rules.BossOnly) && s.kind !== BossSheet) warn(s, NotBoss, t);
  t.hasEnd = t.mods.length > 0 || t.use !== 0;
  if (t.hasEnd) t.end.set(endCost(t.mods, t.use));
  else t.end.set(0);
  checkMods(s, t.mods, t);
  for (const sp of t.spells) {
    const size = sp.level < 0 ? -sp.level : sp.level;
    if (
      t.level >= 1 &&
      t.level <= maxLevel &&
      ((sp.level >= 1 && sp.level <= maxLevel) ||
        (sp.level <= -1 && sp.level >= minWeakness))
    )
      sp.end.setComputed(
        rules.spellCost(t.level, size),
        false,
        rules.has(sp.item, rules.OwnCost),
      );
    else {
      sp.end.set(0);
      warn(s, SpellRange, t, undefined, undefined, sp);
    }
  }
}

/**
 * An alternate Defense Roll, 2 + the levels of what has flag f (p. 51,
 * 55), into n; whether the character has one.
 */
function computeAlternate(s: Sheet, f: rules.Flag, n: Number): boolean {
  const form = s.transformed;
  const has = present(s, f, form);
  if (has) {
    const d = 2 + sum(s, f, form);
    n.set(d);
    if (s.options.combinedEffectiveness && d - 2 > combinedLimit)
      warn(s, OverFive);
  } else n.set(0);
  return has;
}

/** Defense (p. 105), and Barrier's (p. 51) and Incorporeal Form's (p. 55). */
function computeDefense(s: Sheet): void {
  const d = 2 + sum(s, rules.DefenseRoll, s.transformed);
  s.defense.set(d);
  if (s.options.combinedEffectiveness && d - 2 > combinedLimit)
    warn(s, OverFive);
  s.hasBarrier = computeAlternate(s, rules.SecondDefense, s.barrier);
  s.hasIncorporeal = computeAlternate(s, rules.ThirdDefense, s.incorporeal);
}

/**
 * Health and Endurance (p. 107), from the sheet's base, + the Tough and
 * Vigorous table (p. 63, 65), - 10 a level of Frail and Languid (p. 71,
 * 73); and Endurance Reserve's separate store (p. 53).
 */
function computeHealth(s: Sheet): void {
  const form = s.transformed;
  let base = characterBase;
  switch (s.kind) {
    case CompanionSheet:
      base = companionBase;
      break;
    case MinionSheet:
    case ExtraSheet:
      base = minionBase;
      break;
  }
  s.health.set(
    base +
      rules.toughBonus(tableLevel(s, sum(s, rules.HealthTable, form))) +
      10 * sum(s, rules.HealthTens, form),
  );
  s.endurance.set(
    base +
      rules.toughBonus(tableLevel(s, sum(s, rules.EnduranceTable, form))) +
      10 * sum(s, rules.EnduranceTens, form),
  );
  s.hasReserve = present(s, rules.Reserve, form);
  if (s.hasReserve)
    s.reserve.set(
      rules.reserveBonus(tableLevel(s, sum(s, rules.Reserve, form))),
    );
  else s.reserve.set(0);
}

/** Half of a marked Ability's level, rounded up (p. 124). */
function halfTVLevel(t: Trait): number {
  if (
    t.halfTV &&
    t.kind === rules.Ability &&
    t.level > 0 &&
    !traitHas(t, rules.NoTV)
  )
    return quo(t.level + 1, 2);
  return 0;
}

/**
 * TV (p. 124), the best ROLL, Defense and DX, without the Perks and
 * Flaws that add to them each time (Attack.tvRoll, tvDX), + Armored +
 * the signed levels that change Health and Endurance + half of each
 * marked Ability's + 5 for each Boss Ability; a Companion's 4 less, at
 * least 1. With no attack, the plain one: 2 + Agile + Combat Expert -
 * Clumsy, 1 + Attack + Strong - Weak.
 */
function computeTV(s: Sheet): void {
  const form = s.transformed;
  let any = false;
  let roll = 0;
  let dx = 0;
  for (const a of s.attacks)
    if (a.inTV) {
      if (!any || a.tvRoll > roll) roll = a.tvRoll;
      if (!any || a.tvDX > dx) dx = a.tvDX;
      any = true;
    }
  if (!any) {
    roll = 2 + sum(s, rules.Agility, form) + sum(s, rules.CombatSkill, form);
    dx = 1 + sum(s, rules.Damage, form) + sum(s, rules.Strength, form);
    if (dx < 0) dx = 0;
  }
  let def = s.defense.get();
  if (s.hasBarrier && s.barrier.get() > def) def = s.barrier.get();
  if (s.hasIncorporeal && s.incorporeal.get() > def) def = s.incorporeal.get();
  let tv =
    roll +
    def +
    dx +
    sum(s, rules.Armor, form) +
    sum(s, rules.HealthTable, form) +
    sum(s, rules.HealthTens, form) +
    sum(s, rules.EnduranceTable, form) +
    sum(s, rules.EnduranceTens, form);
  for (const t of s.traits) {
    tv += halfTVLevel(t);
    if (traitHas(t, rules.BossOnly)) tv += bossTV;
    if (form) for (const f of t.form) tv += halfTVLevel(f);
  }
  if (s.kind === CompanionSheet) {
    tv -= companionTV;
    if (tv < 1) tv = 1;
  } else if (s.kind === ExtraSheet) tv = 1;
  s.tv.set(tv);
}

// ---- The totals and the limits (p. 21) ----

/** Scaled Cost's points for a level's size (p. 21): 1, 2, 4, 8, 15. */
function scaled(size: number): number {
  if (size <= 0) return 0;
  if (size >= maxLevel) return 15;
  return 1 << (size - 1);
}

/**
 * n halved, rounded away from 0: Knowledge 3 counts 2, Ineptitude -3
 * counts -2 (p. 57, "round up").
 */
function halfUp(n: number): number {
  if (n >= 0) return quo(n + 1, 2);
  return -quo(1 - n, 2);
}

/**
 * The totals of the character's own Traits (not a form's, which
 * Transformation's level pays for, p. 63), then the limits on them.
 */
function computeTotals(s: Sheet): void {
  const o = s.options;
  const half =
    o.halfCostKnowledge && (o.baseZero || o.powerCeiling || o.scaledCost);
  let abilities = 0;
  let abilityPoints = 0;
  let weaknesses = 0;
  s.weaknessPoints = 0;
  for (const t of s.traits) {
    let lv = t.level;
    if (traitHas(t, rules.BossOnly)) lv = 0; // applied and removed as needed (p. 123)
    let pts = scaled(Math.abs(lv));
    if (half && traitHas(t, rules.HalfCost)) {
      lv = halfUp(lv);
      pts = halfUp(pts);
    }
    t.points = pts;
    if (t.kind === rules.Ability) {
      abilities += lv;
      abilityPoints += pts;
    } else {
      weaknesses += lv;
      s.weaknessPoints += pts;
    }
  }
  s.abilityLevels.set(abilities);
  s.weaknessLevels.set(weaknesses);
  s.total.set(s.abilityLevels.get() + s.weaknessLevels.get());
  s.abilityPoints.set(abilityPoints);
  s.points.set(s.abilityPoints.get() - s.weaknessPoints);
  let measure: number;
  let spent: number;
  if (o.scaledCost) {
    measure = s.points.get();
    spent = s.abilityPoints.get();
  } else {
    measure = s.total.get();
    spent = s.abilityLevels.get();
  }
  if (o.baseZero && Math.abs(measure) > o.baseZeroRange)
    warn(s, BaseZeroBroken);
  if (o.powerCeiling && spent > o.ceiling) warn(s, CeilingBroken);
  if (o.startingLevels) {
    measure = o.scaledCost ? s.weaknessPoints : -s.weaknessLevels.get();
    if (spent > o.starting + measure) warn(s, StartingBroken);
  }
}

/** Sets every number of s and of its partners' sheets, and their warnings. */
export function compute(s: Sheet): void {
  s.warnings = [];
  for (const t of s.traits) {
    computeTrait(s, t);
    for (const f of t.form) computeTrait(s, f);
    if (t.partner !== undefined) compute(t.partner);
  }
  computeTotals(s);
  for (const a of s.attacks) computeAttack(s, a);
  computeDefense(s);
  computeHealth(s);
  computeTV(s);
}
