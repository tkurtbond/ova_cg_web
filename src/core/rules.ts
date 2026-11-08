// The rulebook's names, pages and numbers: no descriptions.
//
// Every Ability, Weakness, Perk and Flaw of the OVA rulebook, in the
// book's order (alphabetical within each kind), with the page it is
// described on and what the calculations need of it; and the rulebook's
// small tables (Tough, Vigorous, Endurance Reserve, Endurance Use, spell
// costs). The rulebook's text stays out (AGENTS.md): to explain an item
// the page opens the book at its page.
//
// Pages are the book's printed numbers, which are also the PDF's page
// labels; the PDF's page index is the printed page + PdfPageOffset. The
// pages are checked against the PDF by the font of the entries' headings
// (tools/rulebook-headings.py, make check-pages), as ova_cg_po's and
// ova_cg_go's were.
//
// The port of ova_cg_go's internal/rules (itself ova_cg_po's OvaRules).
// Go's iota constants are plain numeric constants here, under the same
// names, since TypeScript's enum isn't erasable (AGENTS.md).

/** What an item is. */
export type Kind = 0 | 1 | 2 | 3;
export const Ability = 0;
export const Weakness = 1;
export const Perk = 2;
export const Flaw = 3;
/** The four kinds, in order, for a loop over them. */
export const kinds: readonly Kind[] = [Ability, Weakness, Perk, Flaw];

/** The PDF page index less the printed page. */
export const PdfPageOffset = 2;

/** Something an item does to the sheet: a bit number of Flags. */
export type Flag = number;
/** A set of Flag, as bits, all below bit 31 so that it stays positive. */
export type Flags = number;

// What an Ability or Weakness does to the sheet. Its signed level is
// what it adds: Agile +2 adds 2 dice, Clumsy -2 takes 2.
/** Attack Rolls, but a Will Attack's: Agile, Clumsy (p. 105, 86) */
export const Agility: Flag = 0;
/** Attack Rolls, a Will Attack's too: Combat Expert */
export const CombatSkill: Flag = 1;
/** A Will Attack's roll, in Agility's place: Iron-Willed, Weak-Willed */
export const Will: Flag = 2;
/** Defense Rolls: Evasive, Quick, Slow (p. 105) */
export const DefenseRoll: Flag = 3;
/** The Damage Multiplier: Attack (p. 106) */
export const Damage: Flag = 4;
/** The Damage Multiplier, but a Ranged attack's: Strong, Weak (p. 85) */
export const Strength: Flag = 5;
/** Health + the Tough table (p. 63) */
export const HealthTable: Flag = 6;
/** Health - 10 a level: Frail (p. 71) */
export const HealthTens: Flag = 7;
/** Endurance + the Vigorous table (p. 65) */
export const EnduranceTable: Flag = 8;
/** Endurance - 10 a level: Languid (p. 73) */
export const EnduranceTens: Flag = 9;
/** Armored: in TV (p. 124) */
export const Armor: Flag = 10;
/** A second Defense Roll, 2 + its level: Barrier (p. 51) */
export const SecondDefense: Flag = 11;
/** Its level adds to an attack made with it: Telekinesis (p. 62) */
export const Telekinetic: Flag = 12;
/** Adds half its level to TV unless unmarked: Healer, Magic (p. 124) */
export const HalfTV: Flag = 13;
/** Never in TV, which is its own: Companion, Minions (p. 124) */
export const NoTV: Flag = 14;
/** May cost half under the limits: Knowledge, Ineptitude (p. 57) */
export const HalfCost: Flag = 15;
/** A separate store of Endurance, 20 a level: Endurance Reserve (p. 53) */
export const Reserve: Flag = 16;
/** Raises one Ability's Endurance cost: Endurance Use (p. 70) */
export const CostUp: Flag = 17;
/**
 * Spends Endurance of its own as it is used, so a spell of it costs more
 * than the table's, "10+": Barrier (p. 51, 58)
 */
export const OwnCost: Flag = 18;
/** Its spells cast Weaknesses, -1 to -3, at Arcane's costs: Witchcraft (p. 58) */
export const CastsWeaknesses: Flag = 19;
/**
 * Another alternate Defense Roll, 2 + its level, written after
 * Barrier's: Incorporeal Form, its dice as the Defense Roll (p. 55)
 */
export const ThirdDefense: Flag = 20;
/** A Boss Ability: +5 TV (p. 124), no level in the totals (p. 123) */
export const BossOnly: Flag = 21;

// What a Perk or Flaw does to an attack's numbers, after the Abilities'
// and Weaknesses' flags, with room for more of those.
/** +1 die a time (Accurate), or -1 (Inaccurate) */
export const RollEach: Flag = 24;
/** +1 DX a time (Effective), or -1 (Ineffective) */
export const DamageEach: Flag = 25;
/** Drops Strong and Weak (Ranged, p. 85) */
export const RangedAttack: Flag = 26;
/** Keeps them (Ranged, Strength-Powered, p. 86) */
export const StrengthRanged: Flag = 27;
/** Iron-Willed and Weak-Willed for Agile and Clumsy (p. 86) */
export const WillAttack: Flag = 28;
/** DX 0 (No Damage, p. 88) */
export const NoDamageDone: Flag = 29;

/** Whether f is in the set s (Go's Flags.Has). */
export function hasFlag(s: Flags, f: Flag): boolean {
  return (s & (1 << f)) !== 0;
}

function flags(...fs: Flag[]): Flags {
  let s = 0;
  for (const f of fs) s |= 1 << f;
  return s;
}

/** What linked content an Ability has. */
export type Link = 0 | 1 | 2 | 3 | 4;
export const NoLink = 0;
/** A Magic's spells */
export const Spells = 1;
/** A Transformation's form */
export const Form = 2;
/** A Companion's sheet */
export const Partner = 3;
/** A Vehicle's sheet */
export const Machine = 4;

/** How a Perk's or Flaw's cost is set. */
export type CostKind = 0 | 1 | 2;
/** Cost, each time it is taken */
export const FixedCost = 0;
/** Chosen from MinCost..MaxCost, in steps of 5 (Cancel, Requirement) */
export const RangeCost = 1;
/** Any the user and GM agree on (Unique Perk, Unique Flaw) */
export const UserCost = 2;

/** MaxTimes of a Perk or Flaw taken as often as wanted: Go's math.MaxInt32. */
export const Unlimited = 2147483647;

// Pages of the rules themselves, for the page's "?" buttons.
/** Limiting the Character */
export const LimitsPage = 21;
/** Ability Perks and Flaws: how they cost */
export const PerksFlawsPage = 83;
export const AffinitiesPage = 89;
export const QuickListPage = 90;
/** The Spell Endurance Cost table */
export const SpellCostPage = 58;
export const RollsPage = 105;
export const DamagePage = 106;
export const HealthEndurancePage = 107;
export const ThreatValuePage = 124;
/** Knowledge, half cost */
export const HalfCostPage = 57;
/**
 * Where the NPC types, Heroic, Secondary, Extra and Boss (ova_fmt's
 * npc-type:), and the Boss Abilities are described: their Health and
 * Endurance; TV's step for them is on p. 124.
 */
export const NpcTypesPage = 123;

// The steps of Creating a Character, for the guide (src/core/guide.ts,
// PLAN.md "The guide"): the page's own, not ova_cg_go's.
/** Step 0: Discussion */
export const DiscussionPage = 17;
/** Step 1: Concept */
export const ConceptPage = 17;
/** Step 2: The Abilities */
export const AbilitiesStepPage = 18;
/** Step 3: The Weaknesses */
export const WeaknessesStepPage = 18;
/** Step 4: Health and Endurance */
export const HealthEnduranceStepPage = 19;
/** Step 5: Finishing Touches */
export const FinishingTouchesPage = 19;
/** Fluffing */
export const FluffingPage = 20;
/** Using the Characters: the sample characters */
export const SampleCharactersPage = 23;

/** An Ability, Weakness, Perk or Flaw. Read-only once made. */
export class Item {
  readonly name: string;
  readonly kind: Kind;
  readonly page: number;
  readonly flags: Flags;
  /** An Ability's linked content */
  readonly linked: Link;
  // A Perk's or Flaw's Endurance cost, each time it is taken (negative
  // for a Flaw); for a RangeCost one, minCost..maxCost; and how often it
  // may be taken.
  readonly costKind: CostKind;
  readonly cost: number;
  readonly minCost: number;
  readonly maxCost: number;
  readonly maxTimes: number;

  constructor(f: {
    name: string;
    kind: Kind;
    page: number;
    flags?: Flags;
    linked?: Link;
    costKind?: CostKind;
    cost?: number;
    minCost?: number;
    maxCost?: number;
    maxTimes?: number;
  }) {
    this.name = f.name;
    this.kind = f.kind;
    this.page = f.page;
    this.flags = f.flags ?? 0;
    this.linked = f.linked ?? NoLink;
    this.costKind = f.costKind ?? FixedCost;
    this.cost = f.cost ?? 0;
    this.minCost = f.minCost ?? 0;
    this.maxCost = f.maxCost ?? 0;
    this.maxTimes = f.maxTimes ?? 1;
    Object.freeze(this);
  }

  /** Whether the item has flag f. */
  has(f: Flag): boolean {
    return hasFlag(this.flags, f);
  }
}

/**
 * Whether it has flag f; false for undefined, an item the tables don't
 * have (Go's Item.Has, which takes a nil receiver).
 */
export function has(it: Item | undefined, f: Flag): boolean {
  return it !== undefined && it.has(f);
}

const items: Item[] = [];
const byKind: [Item[], Item[], Item[], Item[]] = [[], [], [], []];
// The Boss Abilities: of kind Ability, but not in byKind, so that only a
// Boss's list offers them.
const boss: Item[] = [];
const aliases = new Map<string, Item>(); // folded alias -> item
// spellCost[magic-1][ability-1]
const spellCostTable: readonly (readonly number[])[] = [
  [20, 30, 40, 50, 60],
  [10, 20, 30, 40, 50],
  [5, 10, 20, 30, 40],
  [2, 5, 10, 20, 30],
  [0, 2, 5, 10, 20],
];

function add(it: Item): void {
  items.push(it);
  byKind[it.kind].push(it);
}

function a(name: string, page: number, ...fs: Flag[]): void {
  add(new Item({ name, kind: Ability, page, flags: flags(...fs) }));
}

function l(name: string, page: number, linked: Link, ...fs: Flag[]): void {
  add(new Item({ name, kind: Ability, page, flags: flags(...fs), linked }));
}

function w(name: string, page: number, ...fs: Flag[]): void {
  add(new Item({ name, kind: Weakness, page, flags: flags(...fs) }));
}

/** A Perk or Flaw of fixed cost, taken at most maxTimes. */
function pf(
  name: string,
  kind: Kind,
  page: number,
  cost: number,
  maxTimes: number,
  ...fs: Flag[]
): void {
  add(new Item({ name, kind, page, flags: flags(...fs), cost, maxTimes }));
}

function rangeFlaw(name: string, page: number, min: number, max: number): void {
  add(
    new Item({
      name,
      kind: Flaw,
      page,
      costKind: RangeCost,
      minCost: min,
      maxCost: max,
    }),
  );
}

function unique(name: string, kind: Kind, page: number): void {
  add(new Item({ name, kind, page, costKind: UserCost }));
}

/** A Boss Ability: an Ability, kept out of the kind's order (count, get). */
function b(name: string): void {
  const it = new Item({
    name,
    kind: Ability,
    page: NpcTypesPage,
    flags: flags(BossOnly),
  });
  items.push(it);
  boss.push(it);
}

function alias(alias: string, name: string): void {
  const it = items.find((x) => x.name === name);
  if (it === undefined) throw new Error("rules: no item " + name);
  aliases.set(fold(alias), it);
}

a("Agile", 49, Agility);
a("Armored", 49, Armor);
a("Art of Invisibility", 50);
a("Attack", 50, Damage);
a("Barrier", 51, SecondDefense, OwnCost);
a("Beautiful", 51);
a("Charismatic", 51);
a("Combat Expert", 51, CombatSkill);
l("Companion", 52, Partner, NoTV);
a("Connected", 52);
a("Cute!", 52);
a("Dexterous", 52);
a("Dimensional Pocket", 52);
a("Endurance Reserve", 53, Reserve);
a("Evasive", 53, DefenseRoll);
a("Famous", 53);
a("Flight", 54);
a("Gear", 54);
a("Healer", 54, HalfTV);
a("Heightened Sense", 54);
a("Illusionist", 54);
a("Incorporeal Form", 55, ThirdDefense);
a("Intimidating", 55);
a("Intuitive", 56);
a("Inventor", 56);
a("Invisibility", 56);
a("Iron-Willed", 56, Will);
a("Knowledge", 57, HalfCost);
a("Life Support", 57);
a("Lucky", 57);
l("Magic, Arcane", 57, Spells, HalfTV);
l("Magic, Witchcraft", 58, Spells, HalfTV, CastsWeaknesses);
a("Minions", 58, NoTV);
a("Passion", 59);
a("Perceptive", 59);
a("Performer", 59);
a("Pilot", 59);
a("Position of Power", 59);
a("Psychic", 59);
a("Quick", 60, DefenseRoll);
a("Resistance", 60);
a("Shape-Shifter", 60);
a("Sixth Sense", 61);
a("Smart", 61);
a("Spirit Medium", 61);
a("Strong", 62, Strength);
a("Telekinesis", 62, Telekinetic);
a("Teleport", 62);
a("Time Freeze", 63);
a("Tough", 63, HealthTable);
l("Transformation", 63, Form);
a("Unique Ability", 64);
l("Vehicle (Mecha)", 64, Machine);
a("Vigorous", 65, EnduranceTable);
a("Walking Arsenal", 65);
a("Wealthy", 65);

w("Absent-Minded", 66);
w("Accidental Transformation", 66);
w("Ageism", 66);
w("Airhead", 66);
w("Amnesia", 67);
w("Arrogant", 67);
w("Awkward Size", 67);
w("Bizarre Appearance", 68);
w("Clumsy", 68, Agility);
w("Code of Conduct", 68);
w("Compulsion", 69);
w("Coward", 69);
w("Crybaby", 69);
w("Dense", 69);
w("Dependency", 70);
w("Dull", 70);
w("Easily Distracted", 70);
w("Emotionless", 70);
w("Endurance Use", 70, CostUp);
w("Fear", 70);
w("Focus", 71);
w("Frail", 71, HealthTens);
w("Fussy", 71);
w("Greedy", 71);
w("Guardian", 72);
w("Hatred", 72);
w("Impaired Sense", 72);
w("Impulsive", 72);
w("Ineptitude", 72, HalfCost);
w("Infamous", 73);
w("Jittery", 73);
w("Kind-Hearted", 73);
w("Languid", 73, EnduranceTens);
w("Lecherous", 73);
w("Limited Uses", 74);
w("Loner", 74);
w("Love Interest", 74);
w("Love Magnet", 75);
w("Mute", 75);
w("Naive", 75);
w("Nosebleeder", 75);
w("Oblivious", 76);
w("Obsession", 76);
w("Outcast", 76);
w("Overconfident", 76);
w("Pacifist", 77);
w("Poor", 77);
w("Quirk", 77);
w("Restricted Freedom", 77);
w("Rival", 77);
w("Room for Two", 78);
w("Rude", 78);
w("Secret", 78);
w("Sensitivity", 78);
w("Servitude", 78);
w("Short-Tempered", 79);
w("Shy", 80);
w("Slow", 80, DefenseRoll);
w("Soft Spot", 80);
w("Split Personality", 80);
w("Stubborn", 80);
w("Suppressed Power", 81);
w("Trigger", 81);
w("Unique Weakness", 81);
w("Unlucky", 81);
w("Vulnerability", 82);
w("Wanted", 82);
w("Weak", 82, Strength);
w("Weak-Willed", 82, Will);

// Costs from the Quick List (p. 90) and the headings; how often each may
// be taken from its own text (ova_cg_po's PLAN.md, "Perk and Flaw
// costs").
pf("Accurate", Perk, 83, 5, Unlimited, RollEach);
pf("Area Effect", Perk, 83, 10, Unlimited);
pf("Armor Piercing", Perk, 83, 5, Unlimited);
pf("Barrier Buster", Perk, 83, 5, 1);
pf("Blinding", Perk, 84, 20, 1);
pf("Continued Effect", Perk, 84, 10, 2);
pf("Defensive", Perk, 84, 5, Unlimited);
pf("Disarming", Perk, 84, 10, 1);
pf("Effective", Perk, 84, 5, Unlimited, DamageEach);
pf("Fatiguing", Perk, 84, 0, 1);
pf("Impairing", Perk, 85, 10, 1);
pf("Multiple Targets", Perk, 85, 10, Unlimited);
pf("No Gesture", Perk, 85, 5, 1);
pf("Overwhelming", Perk, 85, 15, 1);
pf("Paralyzing", Perk, 85, 10, 2);
pf("Ranged", Perk, 85, 0, 1, RangedAttack);
pf("Ranged, Strength-Powered", Perk, 86, 5, 1, StrengthRanged);
pf("Reach", Perk, 86, 5, Unlimited);
pf("Redirectable", Perk, 86, 5, 1);
pf("Strike Through", Perk, 86, 5, 1);
pf("Stunning", Perk, 86, 10, 1);
pf("Trap", Perk, 86, 5, 1);
unique("Unique Perk", Perk, 86);
pf("Vampire", Perk, 86, 5, Unlimited);
pf("Will Attack", Perk, 86, 0, 1, WillAttack);

pf("Activation", Flaw, 87, -10, 1);
pf("Ammunition", Flaw, 87, -5, 3);
pf("Assisted", Flaw, 87, -15, Unlimited);
pf("Backlash", Flaw, 87, -5, Unlimited);
pf("Break", Flaw, 87, -10, 1);
pf("Buildup", Flaw, 87, -5, Unlimited);
rangeFlaw("Cancel", 87, -20, 0);
pf("Concentration", Flaw, 87, -20, Unlimited);
pf("Delayed", Flaw, 88, -5, 1);
pf("Elaborate Gestures", Flaw, 88, -5, 1);
pf("Feather Blow", Flaw, 88, -5, 1);
pf("Finisher", Flaw, 88, -10, 1);
pf("Inaccurate", Flaw, 88, -5, Unlimited, RollEach);
pf("Ineffective", Flaw, 88, -5, Unlimited, DamageEach);
pf("Low Penetration", Flaw, 88, -5, Unlimited);
pf("No Damage", Flaw, 88, -20, 1, NoDamageDone);
pf("Open to Attack", Flaw, 88, -25, 1);
pf("Recoil", Flaw, 88, -10, 1);
rangeFlaw("Requirement", 88, -20, -5);
pf("Self-Only", Flaw, 88, -5, 1);
unique("Unique Flaw", Flaw, 88);
pf("Unwieldy", Flaw, 89, -5, Unlimited);
pf("Weapon", Flaw, 89, -5, 1);

alias("Vehicle", "Vehicle (Mecha)");
alias("Ranged, Str.-Powered", "Ranged, Strength-Powered"); // the Quick List's (p. 90)

// In the book's order (p. 123).
b("Health Reserve");
b("Extra Actions");
b("Scale Advantage");
b("Escape Plan");

/** s in lower case, ASCII only, as Go's: names are ASCII. */
function fold(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

/** How many items of a kind there are. */
export function count(k: Kind): number {
  return byKind[k].length;
}

/** The i'th item of a kind, 0 <= i < count(k), in the book's order. */
export function get(k: Kind, i: number): Item {
  const it = byKind[k][i];
  if (it === undefined)
    throw new RangeError(`rules.get: no item ${i} of kind ${k}`);
  return it;
}

/** How many Boss Abilities there are. */
export function bossCount(): number {
  return boss.length;
}

/** The i'th Boss Ability, 0 <= i < bossCount(), in the book's order. */
export function getBoss(i: number): Item {
  const it = boss[i];
  if (it === undefined)
    throw new RangeError(`rules.getBoss: no Boss Ability ${i}`);
  return it;
}

/**
 * How many names a list of kind k offers: with withBoss, a list of
 * Abilities offers the Boss Abilities too, at its end.
 */
export function offerCount(k: Kind, withBoss: boolean): number {
  if (withBoss && k === Ability) return count(k) + bossCount();
  return count(k);
}

/** The i'th name such a list offers, 0 <= i < offerCount(k, withBoss). */
export function offered(k: Kind, i: number, withBoss: boolean): Item {
  if (i < count(k)) return get(k, i);
  if (!withBoss || k !== Ability)
    throw new RangeError("rules.offered: no such name");
  return getBoss(i - count(k));
}

/** it's place in such a list; -1 if the list doesn't offer it. */
export function offerIndex(
  it: Item | undefined,
  k: Kind,
  withBoss: boolean,
): number {
  const n = offerCount(k, withBoss);
  for (let i = 0; i < n; i++) if (offered(k, i, withBoss) === it) return i;
  return -1;
}

/**
 * it's place in its kind's order; -1 for undefined, or a Boss Ability,
 * which isn't in it.
 */
export function index(it: Item | undefined): number {
  if (it === undefined) return -1;
  return byKind[it.kind].indexOf(it);
}

/**
 * The item named name, ignoring case, or by an alias ("Vehicle" for
 * "Vehicle (Mecha)"); undefined if there is none. Names are unique across
 * the four kinds.
 */
export function find(name: string): Item | undefined {
  const f = fold(name);
  for (const it of items) if (fold(it.name) === f) return it;
  return aliases.get(f);
}

/** "p. 50"; "p. ?" for undefined, an item the tables don't have. */
export function pageText(it: Item | undefined): string {
  if (it === undefined) return "p. ?";
  return "p. " + String(it.page);
}

/** "Attack (p. 50)": an item's name with its page, as every name is shown. */
export function label(it: Item): string {
  return it.name + " (" + pageText(it) + ")";
}

/**
 * "Secondary (p. 123)": a name that isn't one of the items', with the
 * page it is described on.
 */
export function pageLabel(name: string, page: number): string {
  return name + " (p. " + String(page) + ")";
}

/**
 * name's label, as written, if the tables have it: "Magic, Testing
 * (p. ?)" if they don't.
 */
export function labelOf(name: string): string {
  const it = find(name);
  if (it !== undefined) return label(it);
  return name + " (" + pageText(undefined) + ")";
}

/**
 * it's label, or name's with "(p. ?)" when it is undefined: an item from
 * a file the tables don't have keeps the file's name.
 */
export function nameLabel(it: Item | undefined, name: string): string {
  if (it !== undefined) return label(it);
  return name + " (" + pageText(undefined) + ")";
}

/** The PDF's page index of a printed page. */
export function pdfIndex(page: number): number {
  return page + PdfPageOffset;
}

function checkLevel(fn: string, level: number, min: number, max: number): void {
  if (!Number.isInteger(level) || level < min || level > max)
    throw new RangeError(`rules: ${fn} level out of range`);
}

/**
 * Tough's bonus to Health (p. 63), and Vigorous's to Endurance (p. 65),
 * the same table: 10, 20, 30, 40, 60 for +1 to +5; 0 for 0.
 */
export function toughBonus(level: number): number {
  checkLevel("toughBonus", level, 0, 5);
  if (level === 5) return 60;
  return 10 * level;
}

/** Endurance Reserve's store (p. 53): 20 a level. */
export function reserveBonus(level: number): number {
  checkLevel("reserveBonus", level, 0, 5);
  return 20 * level;
}

/**
 * What Endurance Use adds to an Ability's cost (p. 70): 5, 10, 20 at -1,
 * -2, -3; 0 at 0.
 */
export function enduranceUseCost(level: number): number {
  switch (level) {
    case 0:
      return 0;
    case -1:
      return 5;
    case -2:
      return 10;
    case -3:
      return 20;
  }
  throw new RangeError("rules: enduranceUseCost level out of range");
}

/**
 * The Spell Endurance Cost table (p. 58): casting a spell that mimics an
 * Ability of level ability, at Magic level magic, both 1..5.
 */
export function spellCost(magic: number, ability: number): number {
  checkLevel("spellCost", magic, 1, 5);
  checkLevel("spellCost", ability, 1, 5);
  return spellCostTable[magic - 1]![ability - 1]!;
}
