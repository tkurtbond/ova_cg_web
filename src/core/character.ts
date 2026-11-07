// The character being built: calc's sheet, with its names and text.
//
// ova_cg_go's internal/character, the port of ova_cg_po's OvaCharacter
// (its PLAN.md, "Files" and "Modules"). A Character is a calc.Sheet,
// and its Traits, Mods, Attacks and Spells are calc's, each extended
// with what calc doesn't need: names, details, notes, descriptions, the
// background and the fluff, and which optional keys a file had, so that
// a file loaded and saved formats the same in ova_fmt. Go embeds calc's
// records with an Owner pointing back; here they are subclasses, so
// calc's lists hold these records themselves (PLAN.md, "calc").
//
// A file is read by entities, ova_fmt_po's loader, so the generator
// reads exactly what ova_fmt_po reads, and then built into a Character.
// A number the file's overrides: key lists is an override. Every other
// number the file holds is compared with the one calc computes; one
// that differs is kept as an override too, with a notice saying so: the
// file is the user's (a GM's ruling, a hand edit, or a case the rules
// here don't cover), and nothing in it is lost.
//
// An optional text is undefined when absent, "" when present and empty,
// in place of Go's HasX flags.
import * as rules from "./rules.ts";
import * as calc from "./calc.ts";
import * as entities from "./entities.ts";

export const NFluff = entities.NFluff;

/** A Defense value, in the order a combat: block's defense holds them. */
export type Slot = 0 | 1 | 2;
export const DefenseSlot = 0;
export const BarrierSlot = 1;
export const IncorporealSlot = 2;

/** A headed note. */
export interface Note {
  header: string;
  text: string;
}

/** The character (or a partner's sheet) being built. */
export class Character extends calc.Sheet {
  /** A partner's sheet: "Companion" or "Vehicle"; "" for the character */
  label = "";
  name = "";
  player?: string;
  /** The image's path, relative to the file */
  portrait?: string;
  tagline?: string;
  summary?: string;
  background?: string;
  appearance?: string;
  personality?: string;
  otherNotes?: string;
  characterHooks?: string;
  /** entities.Heroic, Secondary, Extra or Boss; it sets the sheet's kind (setNpcType) */
  npcType?: entities.NpcType;
  /** count:, how many it stands for; kept for the save */
  count = 1;
  notes: Note[] = [];
  hasFluff = false;
  /** NFluff of them, undefined where absent */
  fluff: (string | undefined)[] = new Array<string | undefined>(NFluff).fill(
    undefined,
  );
  /** An options: block, even an empty one */
  hasOptions = false;
  /** An NPC Fragment, or a simple Companion */
  isFragment = false;
  /** A combat: block: a Fragment or Companion may have none */
  hasCombat = true;
  hasThreatValue = true;
  // The file gave one Defense though Barrier or Incorporeal Form gives
  // another, as the book's Sample NPCs have it: the best, saved so, the
  // others left out (singleDefense). singleSlot, the slot it was read
  // into, bestDefense's then; Go's unexported singleSlot, for this
  // module only.
  omitAlternates = false;
  singleSlot: Slot = DefenseSlot;
  combatNotes?: string;
}

/** An Ability or Weakness. */
export class Trait extends calc.Trait {
  name: string;
  detail?: string;
  note?: string;
  /** halfTV is written: threat-value-half; else the rules' */
  hasHalfTV = false;

  constructor(
    item: rules.Item | undefined,
    kind: rules.Kind,
    level: number,
    name: string,
  ) {
    super(item, kind, level);
    this.name = name;
  }
}

/** A Perk or Flaw. */
export class Mod extends calc.Mod {
  name: string;
  detail?: string;
  /** Which list it is in, whether or not rules has it */
  isFlaw: boolean;
  /** Its cost is written: chosen (Cancel, Requirement, Unique), or the file's */
  hasCost: boolean;

  constructor(
    item: rules.Item | undefined,
    times: number,
    cost: number,
    name: string,
    isFlaw: boolean,
    hasCost: boolean,
  ) {
    super(item, times, cost);
    this.name = name;
    this.isFlaw = isFlaw;
    this.hasCost = hasCost;
  }
}

/** An attack. */
export class Attack extends calc.Attack {
  name: string;
  affinity?: string;
  description?: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

/** A Magic's spell. */
export class Spell extends calc.Spell {
  name: string;
  ability: string;

  constructor(
    item: rules.Item | undefined,
    level: number,
    name: string,
    ability: string,
  ) {
    super(item, level);
    this.name = name;
    this.ability = ability;
  }
}

// The records calc's lists hold, as the character's: Go's TraitOf and
// the rest, here casts, since every record in a Character's lists is
// made by this module.

/** t's Trait. */
export function traitOf(t: calc.Trait): Trait {
  return t as Trait;
}

/** m's Mod. */
export function modOf(m: calc.Mod): Mod {
  return m as Mod;
}

/** a's Attack. */
export function attackOf(a: calc.Attack): Attack {
  return a as Attack;
}

/** sp's Spell. */
export function spellOf(sp: calc.Spell): Spell {
  return sp as Spell;
}

/** s's Character. */
export function sheetOf(s: calc.Sheet): Character {
  return s as Character;
}

// ---- Endurance Use ----

// names says whether name, or name and detail as "Name (detail)", is
// target, ignoring case.
function names(
  name: string,
  detail: string | undefined,
  target: string,
): boolean {
  target = entities.foldCI(entities.trim(target));
  if (target === "") return false;
  if (entities.foldCI(name) === target) return true;
  return (
    detail !== undefined &&
    entities.foldCI(name + " (" + detail + ")") === target
  );
}

// linkList ties each Endurance Use in list to the Ability in list, or
// else the attack of s, that its detail names (ova_cg_po's PLAN.md,
// "Changes to ova_fmt": it needs no key of its own), setting their use;
// one naming nothing ties to nothing.
function linkList(list: readonly calc.Trait[], s: calc.Sheet): void {
  for (const w of list) {
    const wt = traitOf(w);
    if (
      w.kind !== rules.Weakness ||
      !rules.has(w.item, rules.CostUp) ||
      wt.detail === undefined
    )
      continue;
    let found = false;
    for (const t of list) {
      const x = traitOf(t);
      if (t.kind === rules.Ability && names(x.name, x.detail, wt.detail)) {
        t.use = w.level;
        found = true;
        break;
      }
    }
    for (const a of s.attacks) {
      if (found) break;
      if (names(attackOf(a).name, undefined, wt.detail)) {
        a.use = w.level;
        found = true;
      }
    }
  }
}

// link ties every Endurance Use of s, its Transformations' forms and its
// partners to what it names.
function link(s: calc.Sheet): void {
  for (const t of s.traits) {
    t.use = 0;
    for (const f of t.form) f.use = 0;
  }
  for (const a of s.attacks) a.use = 0;
  linkList(s.traits, s);
  for (const t of s.traits) {
    linkList(t.form, s);
    if (t.partner !== undefined) link(t.partner);
  }
}

/**
 * Computes every number of c again, after a change: what calc.compute
 * does, with each Endurance Use tied first.
 */
export function recompute(c: Character): void {
  link(c);
  calc.compute(c);
}

// ---- Building from what entities read ----

/** A new, empty character. */
export function newCharacter(): Character {
  return new Character(calc.Character);
}

// kindOf is the sheet kind of an NPC type (p. 123-124): a Heroic NPC's
// is a character's, a Secondary's a Companion's, an Extra's and a Boss's
// their own; no type is a character's.
function kindOf(k: entities.NpcType | undefined): calc.SheetKind {
  if (k === undefined || k === entities.Heroic) return calc.Character;
  if (k === entities.Secondary) return calc.CompanionSheet;
  if (k === entities.Boss) return calc.BossSheet;
  return calc.ExtraSheet;
}

/**
 * Sets c's NPC type (undefined: none), and so its sheet's kind:
 * recompute after.
 */
export function setNpcType(
  c: Character,
  k: entities.NpcType | undefined,
): void {
  if (k !== undefined && !(k >= entities.Heroic && k <= entities.Boss))
    throw new Error("character.setNpcType: no such NPC type");
  c.npcType = k;
  c.kind = kindOf(k);
}

// mods adds l's Perks (isFlaw false) or Flaws to list.
function mods(
  l: readonly entities.PerkFlaw[],
  isFlaw: boolean,
  list: calc.Mod[],
): void {
  for (const pf of l) {
    const m = new Mod(
      rules.find(pf.name),
      pf.countsAs ?? 1,
      pf.cost ?? 0,
      pf.name,
      isFlaw,
      pf.cost !== undefined,
    );
    m.detail = pf.detail;
    list.push(m);
  }
}

function subTrait(x: entities.SubItem, k: rules.Kind): Trait {
  const t = new Trait(rules.find(x.name), k, x.level, x.name);
  t.detail = x.detail;
  t.note = x.note;
  if (x.threatValueHalf !== undefined) {
    t.hasHalfTV = true;
    t.halfTV = x.threatValueHalf;
  }
  mods(x.perks, false, t.mods);
  mods(x.flaws, true, t.mods);
  return t;
}

function subTraits(
  l: readonly entities.SubItem[],
  k: rules.Kind,
  list: calc.Trait[],
): void {
  for (const x of l) list.push(subTrait(x, k));
}

function attacks(x: entities.Combat, c: Character): void {
  c.hasCombat = x.hasCombat;
  c.hasThreatValue = x.threatValue !== undefined;
  c.combatNotes = x.notes;
  c.transformed = x.transformed;
  for (const y of x.attacks) {
    const a = new Attack(y.name);
    a.affinity = y.affinity;
    a.description = y.description;
    a.telekinetic = y.telekinesis;
    a.transformed = y.transformed;
    mods(y.perks, false, a.mods);
    mods(y.flaws, true, a.mods);
    c.attacks.push(a);
  }
}

// partner is a Companion's sheet (a Secondary NPC's), or a Vehicle's (a
// character's).
function partner(x: entities.SubEntity): Character {
  const c = new Character(
    x.label === "Companion" ? calc.CompanionSheet : calc.Character,
  );
  c.label = x.label;
  c.name = x.name;
  c.isFragment = x.isFragment;
  subTraits(x.abilities, rules.Ability, c.traits);
  subTraits(x.weaknesses, rules.Weakness, c.traits);
  attacks(x.combat, c);
  return c;
}

/**
 * e's character, every number computed, none overridden: its Abilities,
 * then its Weaknesses, each in e's (sorted) order, its attacks in the
 * file's.
 */
export function build(e: entities.Entity): Character {
  const c = newCharacter();
  c.name = e.name;
  c.player = e.player;
  c.portrait = e.portrait;
  c.tagline = e.tagline;
  c.summary = e.summary;
  c.background = e.background;
  c.appearance = e.appearance;
  c.personality = e.personality;
  c.characterHooks = e.characterHooks;
  setNpcType(c, e.npcType);
  c.count = e.count;
  c.otherNotes = e.otherNotes;
  c.isFragment = e.isFragment;
  for (const a of e.abilities) {
    const t = subTrait(a, rules.Ability);
    subTraits(a.subAbilities, rules.Ability, t.form);
    subTraits(a.subWeaknesses, rules.Weakness, t.form);
    for (const sp of a.spells)
      t.spells.push(
        new Spell(rules.find(sp.ability), sp.level, sp.name, sp.ability),
      );
    if (a.subEntity !== undefined) t.partner = partner(a.subEntity);
    c.traits.push(t);
  }
  for (const w of e.weaknesses) {
    const t = new Trait(rules.find(w.name), rules.Weakness, w.level, w.name);
    t.detail = w.detail;
    c.traits.push(t);
  }
  attacks(e.combat, c);
  for (const x of e.notes) c.notes.push({ header: x.header, text: x.text });
  c.hasFluff = e.hasFluff;
  c.fluff = [...e.fluff];
  c.hasOptions = e.options !== undefined;
  if (e.options !== undefined) {
    const o = e.options;
    const p = c.options;
    p.baseZero = o.baseZero !== undefined;
    p.baseZeroRange = o.baseZero ?? 0;
    p.powerCeiling = o.powerCeiling !== undefined;
    p.ceiling = o.powerCeiling ?? 0;
    p.startingLevels = o.startingLevels !== undefined;
    p.starting = o.startingLevels ?? 0;
    p.scaledCost = o.scaledCost;
    p.halfCostKnowledge = o.halfCostKnowledge;
    p.combinedEffectiveness = o.combinedEffectiveness;
  }
  recompute(c);
  return c;
}

// ---- The file's numbers ----

/**
 * c's best Defense value, its slot: the Defense, or an alternate c has
 * that is higher than those before it.
 */
export function bestDefense(c: Character): Slot {
  let best: Slot = DefenseSlot;
  let value = c.defense.get();
  if (c.hasBarrier && c.barrier.get() > value) {
    best = BarrierSlot;
    value = c.barrier.get();
  }
  if (c.hasIncorporeal && c.incorporeal.get() > value) best = IncorporealSlot;
  return best;
}

/**
 * Whether c's defense is saved as one value, and which, slot: the file
 * gave one (omitAlternates), and the only value overridden, if any, is
 * the one it was read into. It is saved, or else the best.
 */
export function singleDefense(c: Character): { slot: Slot; single: boolean } {
  let n = 0;
  let slot = bestDefense(c);
  if (c.defense.overridden) {
    n++;
    slot = DefenseSlot;
  }
  if (c.barrier.overridden) {
    n++;
    slot = BarrierSlot;
  }
  if (c.incorporeal.overridden) {
    n++;
    slot = IncorporealSlot;
  }
  return {
    slot,
    single: c.omitAlternates && (n === 0 || (n === 1 && slot === c.singleSlot)),
  };
}

function within(where: string, name: string): string {
  return where + ": " + name;
}

const has = entities.has;

class Adopter {
  notices: string[] = [];

  // adopt takes the file's text for n: n's override if listed (the
  // mapping's overrides: names it), or if it differs from the computed
  // number, with a notice. Text that isn't a number for n is noted and
  // dropped, the computed number kept.
  adopt(
    n: calc.Number,
    file: string,
    allowHalf: boolean,
    allowPlus: boolean,
    listed: boolean,
    where: string,
    what: string,
  ): void {
    const computed = n.computedText();
    const t = Object.assign(new calc.Number(), n);
    t.clear();
    if (!t.parse(file, allowHalf, allowPlus) || !t.overridden) {
      this.notices.push(
        `${where}: ${what} is ${file} in the file, not a number: ${computed} by the rules is used`,
      );
      return;
    }
    const got = t.text();
    if (listed) {
      Object.assign(n, t);
    } else if (got !== computed) {
      Object.assign(n, t);
      this.notices.push(
        `${where}: ${what} is ${got} in the file, ${computed} by the rules: kept as an override`,
      );
    }
  }

  adoptInt(
    n: calc.Number,
    i: number,
    listed: boolean,
    where: string,
    what: string,
  ): void {
    this.adopt(n, String(i), false, false, listed, where, what);
  }

  // adoptDefense takes the file's value v for Defense slot slot of c.
  adoptDefense(
    c: Character,
    slot: Slot,
    v: string,
    listed: boolean,
    where: string,
  ): void {
    switch (slot) {
      case DefenseSlot:
        this.adopt(c.defense, v, false, false, listed, where, "DEFENSE");
        break;
      case BarrierSlot:
        this.adopt(
          c.barrier,
          v,
          false,
          false,
          listed,
          where,
          "Barrier's DEFENSE",
        );
        break;
      case IncorporealSlot:
        this.adopt(
          c.incorporeal,
          v,
          false,
          false,
          listed,
          where,
          "Incorporeal Form's DEFENSE",
        );
        break;
    }
  }

  // adoptDefenses takes the Defense values of x's defense: one is the
  // best of c's, two its Defense and its first alternate, three its
  // Defense, Barrier's and Incorporeal Form's (ova_fmt allows no more).
  adoptDefenses(x: entities.Combat, c: Character, where: string): void {
    const v = splitN(x.defense, "/", 3);
    const ov = x.overrides;
    if (v.length === 1) {
      c.omitAlternates = c.hasBarrier || c.hasIncorporeal;
      c.singleSlot = bestDefense(c);
      this.adoptDefense(
        c,
        c.singleSlot,
        v[0]!,
        has(ov, entities.OvDefense),
        where,
      );
      return;
    }
    this.adoptDefense(
      c,
      DefenseSlot,
      v[0]!,
      has(ov, entities.OvDefense),
      where,
    );
    if (v.length === 3) {
      this.adoptDefense(
        c,
        BarrierSlot,
        v[1]!,
        has(ov, entities.OvDefense2),
        where,
      );
      this.adoptDefense(
        c,
        IncorporealSlot,
        v[2]!,
        has(ov, entities.OvDefense3),
        where,
      );
      return;
    }
    const second: Slot =
      !c.hasBarrier && c.hasIncorporeal ? IncorporealSlot : BarrierSlot;
    this.adoptDefense(c, second, v[1]!, has(ov, entities.OvDefense2), where);
  }

  // adoptCombat takes the numbers of a combat: block but TV.
  adoptCombat(x: entities.Combat, c: Character, where: string): void {
    if (!x.hasCombat) return;
    x.attacks.forEach((y, i) => {
      const a = c.attacks[i]!;
      const at = within(where, y.name);
      const ov = y.overrides;
      this.adoptInt(a.roll, y.roll, has(ov, entities.OvRoll), at, "ROLL");
      this.adopt(a.dx, y.dx, true, false, has(ov, entities.OvDx), at, "DX");
      this.adoptInt(
        a.end,
        y.endurance,
        has(ov, entities.OvEndurance),
        at,
        "END",
      );
    });
    this.adoptDefenses(x, c, where);
    this.adoptInt(
      c.health,
      x.health,
      has(x.overrides, entities.OvHealth),
      where,
      "HEALTH",
    );
    this.adoptInt(
      c.endurance,
      x.endurance,
      has(x.overrides, entities.OvEndurance),
      where,
      "ENDURANCE",
    );
  }

  adoptSubItems(
    l: readonly entities.SubItem[],
    ts: readonly calc.Trait[],
    where: string,
  ): void {
    l.forEach((x, i) => {
      if (x.endurance !== undefined)
        this.adoptInt(
          ts[i]!.end,
          x.endurance,
          has(x.overrides, entities.OvEndurance),
          within(where, x.name),
          "END",
        );
    });
  }

  // adoptNumbers takes every number but TV, which is computed from them,
  // and then TV.
  adoptNumbers(e: entities.Entity, c: Character): void {
    e.abilities.forEach((a, i) => {
      const t = c.traits[i]!;
      const at = within(c.name, a.name);
      if (a.endurance !== undefined)
        this.adoptInt(
          t.end,
          a.endurance,
          has(a.overrides, entities.OvEndurance),
          at,
          "END",
        );
      // The form holds the sub-abilities first, then the
      // sub-weaknesses, which have no END.
      this.adoptSubItems(a.subAbilities, t.form, at);
      a.spells.forEach((x, j) => {
        this.adopt(
          t.spells[j]!.end,
          x.endurance,
          false,
          true,
          has(x.overrides, entities.OvEndurance),
          within(c.name, x.name),
          "END",
        );
      });
      if (a.subEntity !== undefined) {
        const p = sheetOf(t.partner!);
        this.adoptSubItems(a.subEntity.abilities, p.traits, p.name);
        this.adoptCombat(a.subEntity.combat, p, p.name);
      }
    });
    this.adoptCombat(e.combat, c, c.name);
    recompute(c);
    e.abilities.forEach((a, i) => {
      const se = a.subEntity;
      if (
        se !== undefined &&
        se.combat.hasCombat &&
        se.combat.threatValue !== undefined
      ) {
        const p = sheetOf(c.traits[i]!.partner!);
        this.adoptInt(
          p.tv,
          se.combat.threatValue,
          has(se.combat.overrides, entities.OvThreatValue),
          p.name,
          "TV",
        );
      }
    });
    if (e.combat.hasCombat && e.combat.threatValue !== undefined)
      this.adoptInt(
        c.tv,
        e.combat.threatValue,
        has(e.combat.overrides, entities.OvThreatValue),
        c.name,
        "TV",
      );
    recompute(c);
  }
}

// splitN is Go's strings.SplitN(s, sep, n) for n > 0: at most n parts,
// the last holding the rest.
function splitN(s: string, sep: string, n: number): string[] {
  const r: string[] = [];
  while (r.length < n - 1) {
    const i = s.indexOf(sep);
    if (i < 0) break;
    r.push(s.slice(0, i));
    s = s.slice(i + sep.length);
  }
  r.push(s);
  return r;
}

// ---- Files ----

/**
 * The character of entity e, its numbers e's: each its mapping's
 * overrides: lists is an override, and each other that differs from
 * the rules' is kept as one too, with a notice.
 */
export function fromEntity(e: entities.Entity): {
  character: Character;
  notices: string[];
} {
  const c = build(e);
  const ad = new Adopter();
  ad.adoptNumbers(e, c);
  return { character: c, notices: ad.notices };
}

/** c alone, as a file's characters. */
export function one(c: Character): Character[] {
  return [c];
}

/** What loadAll and load give: the characters and notices, or an error. */
export type Loaded<T> =
  { ok: true; value: T; notices: string[] } | { ok: false; message: string };

/**
 * Every character in text, the file name's contents, in order, as
 * fromEntity builds them, with the notices of all of them (each names
 * its character). An error if entities finds a problem, or it holds
 * none. Go's LoadAll reads a path; here the page has read the file.
 */
export function loadAll(text: string, name: string): Loaded<Character[]> {
  const r = entities.readEntities(text, name);
  if (!r.ok) return { ok: false, message: r.message };
  if (r.entities.length === 0)
    return { ok: false, message: `${name} holds no characters` };
  const cs: Character[] = [];
  const notices: string[] = [];
  for (const e of r.entities) {
    const x = fromEntity(e);
    cs.push(x.character);
    notices.push(...x.notices);
  }
  return { ok: true, value: cs, notices };
}

/**
 * The one character in text, as loadAll; an error as loadAll's, or if
 * the file holds more than one.
 */
export function load(text: string, name: string): Loaded<Character> {
  const r = loadAll(text, name);
  if (!r.ok) return r;
  if (r.value.length !== 1)
    return {
      ok: false,
      message: `${name} holds ${r.value.length} characters, not one`,
    };
  return { ok: true, value: r.value[0]!, notices: r.notices };
}

// ---- Editing (the window's) ----
//
// Every change the window makes goes through these, then recompute.
// Traits and Mods are kept in the order the file's loader sorts them (by
// name, then detail, ignoring case), so the window lists them as ova_fmt
// prints them; attacks keep the order they were added in, as a file's
// do.

// opt is a text the user typed: "" is none.
function opt(s: string): string | undefined {
  return s === "" ? undefined : s;
}

/**
 * A new Ability or Weakness (kind), named for it, or name if it is
 * undefined (a name the tables don't have); detail "" for none.
 */
export function newTrait(
  it: rules.Item | undefined,
  kind: rules.Kind,
  level: number,
  name: string,
  detail: string,
): Trait {
  const t = new Trait(it, kind, level, it !== undefined ? it.name : name);
  t.detail = opt(detail);
  return t;
}

/**
 * Puts t into list in its place: Abilities before Weaknesses, each
 * sorted; no detail sorts as "", as the loader sorts it.
 */
export function insertTrait(list: calc.Trait[], t: Trait): void {
  let i = 0;
  while (i < list.length) {
    const p = list[i]!;
    const x = traitOf(p);
    if (!(
      p.kind < t.kind ||
      (p.kind === t.kind &&
        !entities.before(t.name, t.detail ?? "", x.name, x.detail ?? ""))
    ))
      break;
    i++;
  }
  list.splice(i, 0, t);
}

function remove<T>(list: T[], x: T): void {
  const i = list.indexOf(x);
  if (i >= 0) list.splice(i, 1);
}

/** Takes t out of list; nothing if it isn't there. */
export function removeTrait(list: calc.Trait[], t: calc.Trait): void {
  remove(list, t);
}

function linked(it: rules.Item | undefined): rules.Link {
  return it === undefined ? rules.NoLink : it.linked;
}

/**
 * Changes t to item it at level with detail ("" for none), and moves it
 * to its new place in list. Its Perks and Flaws stay; its linked
 * content stays if it keeps the same kind (Magic, Arcane to Magic,
 * Witchcraft keeps the spells), and is dropped if not, as the file
 * couldn't hold it.
 */
export function changeTrait(
  list: calc.Trait[],
  t: Trait,
  it: rules.Item | undefined,
  level: number,
  detail: string,
): void {
  removeTrait(list, t);
  if (linked(it) !== linked(t.item)) {
    t.form = [];
    t.spells = [];
    t.partner = undefined;
  }
  if (it !== t.item) {
    t.item = it;
    if (it !== undefined) t.name = it.name;
    t.hasHalfTV = false;
    t.halfTV = rules.has(it, rules.HalfTV);
  }
  t.level = level;
  t.detail = opt(detail);
  insertTrait(list, t);
}

/**
 * A new sheet for t, a Companion (a Secondary NPC's sheet, p. 52) or a
 * Vehicle (a character's, p. 64): named t's detail, or what it is; with
 * a combat block, not a Fragment.
 */
export function newPartner(t: Trait): Character {
  let c: Character;
  switch (linked(t.item)) {
    case rules.Partner:
      c = new Character(calc.CompanionSheet);
      c.label = "Companion";
      break;
    case rules.Machine:
      c = new Character(calc.Character);
      c.label = "Vehicle";
      break;
    default:
      throw new Error("character: newPartner of a trait with no partner");
  }
  c.name = t.detail ?? c.label;
  return c;
}

/**
 * A new spell named name, mimicking ability (the Ability's name; it,
 * rules', or undefined) at level.
 */
export function newSpell(
  name: string,
  ability: string,
  it: rules.Item | undefined,
  level: number,
): Spell {
  return new Spell(it, level, name, ability);
}

/** Takes sp out of t's spells. */
export function removeSpell(t: calc.Trait, sp: calc.Spell): void {
  remove(t.spells, sp);
}

/** A new attack named name, with no Perks or Flaws. */
export function newAttack(name: string): Attack {
  return new Attack(name);
}

/** Takes a out of c's attacks. */
export function removeAttack(c: Character, a: calc.Attack): void {
  remove(c.attacks, a);
}

/**
 * A new Perk, or Flaw if isFlaw, taken times times at cost each (a
 * RangeCost's or UserCost's; else ignored).
 */
export function newMod(
  it: rules.Item,
  isFlaw: boolean,
  times: number,
  cost: number,
): Mod {
  return new Mod(
    it,
    times,
    cost,
    it.name,
    isFlaw,
    it.costKind !== rules.FixedCost,
  );
}

/** Puts m into list in its place: Perks before Flaws, each sorted. */
export function insertMod(list: calc.Mod[], m: Mod): void {
  let i = 0;
  while (i < list.length) {
    const p = modOf(list[i]!);
    if (!(
      (!p.isFlaw && m.isFlaw) ||
      (p.isFlaw === m.isFlaw &&
        !entities.before(m.name, m.detail ?? "", p.name, p.detail ?? ""))
    ))
      break;
    i++;
  }
  list.splice(i, 0, m);
}

/** Takes m out of list. */
export function removeMod(list: calc.Mod[], m: calc.Mod): void {
  remove(list, m);
}

/** A copy of list, each Mod copied: what a dialog puts back on Cancel. */
export function copyMods(list: readonly calc.Mod[]): calc.Mod[] {
  return list.map((x) => {
    const m = modOf(x);
    const c = new Mod(m.item, m.times, m.cost, m.name, m.isFlaw, m.hasCost);
    c.detail = m.detail;
    return c;
  });
}

/** s as an optional text field holds it: "" is none (Go's SetText). */
export function setText(s: string): string | undefined {
  return opt(s);
}
