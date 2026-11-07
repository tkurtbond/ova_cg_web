// Reads an OVA entity once from its YAML: the port of ova_cg_go's
// internal/entities (entities.go), itself ova_fmt_po's OvaEntities
// (copied into ova_cg_po), itself the Ada Ova_Fmt.Entities. Each entity
// (a character, or an NPC Fragment) is read from its YAML mapping once,
// by Loader.load, into plain records. The Go package's comments
// describe the reasons for its shape; the notes here say only what
// differs.
//
// Errors come in two kinds, as in the Go:
//
//   - A required field that is missing or malformed is recorded in the
//     Loader's errors, with a placeholder in its place, and loading goes
//     on, so that every such problem in a file is reported together.
//     Each has a path, and an approximate location: that of its
//     mapping's own "name" scalar, when there is one.
//   - Anything else (an optional field that is malformed, YAML of the
//     wrong shape) ends loading: load gives a message, and the caller
//     abandons the file.
//
// The YAML is read with the yaml library into nodes, with the failsafe
// schema, so every scalar is its text; integers and booleans are
// converted with polibfyaml's grammar (parseInt, parseBool), and paths
// written in its syntax ("/1/abilities/2"), so this reads exactly what
// ova_fmt_po reads, and says it the same way.
//
// Go's HasX flag beside X becomes an optional x?: here, undefined when
// absent (AGENTS.md); "" is a present, empty text.

import {
  type Document,
  type Node as YNode,
  LineCounter,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments,
} from "yaml";

// The fluff: fields, in the order every format writes them (the Ada
// Fluff_Block's field order); index Entity.fluff with these.
export const Concept = 0;
export const Birthday = 1;
export const Age = 2;
export const Gender = 3;
export const Height = 4;
export const Weight = 5;
export const Hair = 6;
export const Eyes = 7;
export const Association = 8;
export const Hobbies = 9;
export const FavoriteFood = 10;
export const Allies = 11;
export const Enemies = 12;
export const LoveInterests = 13;
export const NFluff = 14;

// FluffKeys are the fluff fields' YAML keys, by the constants above.
export const FluffKeys: readonly string[] = [
  "concept",
  "birthday",
  "age",
  "gender",
  "height",
  "weight",
  "hair",
  "eyes",
  "association",
  "hobbies",
  "favorite-food",
  "allies",
  "enemies",
  "love-interests",
];

// Override is a number an overrides: list can name (the Ada
// Override_Key).
export const OvRoll = 0;
export const OvDx = 1;
export const OvEndurance = 2;
export const OvDefense = 3;
export const OvDefense2 = 4;
export const OvDefense3 = 5;
export const OvHealth = 6;
export const OvThreatValue = 7;
const nOverrides = 8;
export type Override = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const overrideKeys: readonly string[] = [
  "roll",
  "dx",
  "endurance",
  "defense",
  "defense-2",
  "defense-3",
  "health",
  "threat-value",
];

// NpcType is an npc-type: (p. 133), an NPC's importance to the story:
// the Ada NPC_Kind. Matched ignoring case; anything else is a recorded
// error. See npcTypeName.
export const Heroic = 0;
export const Secondary = 1;
export const Extra = 2;
export const Boss = 3;
export const NNpcTypes = 4;
export type NpcType = 0 | 1 | 2 | 3;

const npcTypeNames: readonly string[] = [
  "Heroic",
  "Secondary",
  "Extra",
  "Boss",
];

// npcTypeName is the rulebook's capitalization of npc-type k
// ("Heroic").
export function npcTypeName(k: NpcType): string {
  return npcTypeNames[k]!;
}

// keyName is k's YAML spelling ("threat-value").
export function keyName(k: Override): string {
  return overrideKeys[k]!;
}

// Overrides is a set of Override, as bits.
export type Overrides = number;

// has says whether k is in the set o.
export function has(o: Overrides, k: Override): boolean {
  return (o & (1 << k)) !== 0;
}

// withKey is the set o with k in it too: Go's Overrides.With ("with"
// is a reserved word).
export function withKey(o: Overrides, k: Override): Overrides {
  return o | (1 << k);
}

function overridesOf(...ks: Override[]): Overrides {
  let o = 0;
  for (const k of ks) o = withKey(o, k);
  return o;
}

// Named is what a sorted item has: a name and an optional detail.
export interface Named {
  name: string;
  detail?: string;
}

// PerkFlaw is a Perk or a Flaw: a plain name, or a mapping with a
// detail, a repeat count (counts-as) and a chosen cost, each optional.
export interface PerkFlaw extends Named {
  countsAs?: number;
  cost?: number;
}

// Attack is an attack of a combat: block.
export interface Attack {
  name: string;
  perks: PerkFlaw[]; // sorted
  flaws: PerkFlaw[]; // sorted
  affinity?: string;
  description?: string; // trimmed
  roll: number;
  dx: string; // text: "1/2" happens
  endurance: number;
  telekinesis: boolean; // the generator's inputs, not printed
  transformed: boolean;
  overrides: Overrides; // of OvRoll, OvDx, OvEndurance
}

// Combat is a combat: block. hasCombat is false when there is none (a
// Companion may have no combat stats).
export interface Combat {
  hasCombat: boolean;
  defense: string; // text: "4/5" happens
  health: number;
  endurance: number;
  threatValue?: number;
  attacks: Attack[]; // in document order
  notes?: string; // the Combat Notes, trimmed
  transformed: boolean; // the generator's input, not printed
  overrides: Overrides;
}

// SubItem is a linked sub-ability or sub-weakness, or a Companion's or
// Vehicle's own ability or weakness.
export interface SubItem extends Named {
  level: number;
  perks: PerkFlaw[]; // sorted
  flaws: PerkFlaw[]; // sorted
  endurance?: number;
  note?: string;
  threatValueHalf?: boolean;
  overrides: Overrides; // of OvEndurance
}

// Spell is a Magic ability's spell.
export interface Spell {
  name: string;
  ability: string;
  level: number;
  endurance: string; // text: "10+" happens
  overrides: Overrides; // of OvEndurance
}

// SubEntity is a Companion or Vehicle, nested under the Ability that
// grants it. label is "Companion" or "Vehicle", for the headings.
export interface SubEntity {
  label: string;
  name: string;
  isFragment: boolean;
  abilities: SubItem[]; // sorted
  weaknesses: SubItem[]; // sorted
  combat: Combat;
}

// Ability is a top-level Ability: a SubItem's fields, and its linked
// content. subEntity is undefined if it grants none.
export interface Ability extends SubItem {
  subAbilities: SubItem[]; // sorted
  subWeaknesses: SubItem[]; // sorted
  spells: Spell[]; // in document order
  subEntity?: SubEntity;
}

// Weakness is a top-level Weakness.
export interface Weakness extends Named {
  level: number;
}

// Note is a headed note.
export interface Note {
  header: string;
  text: string; // trimmed
}

// Options is an options: block: the character-creation limiting rules.
export interface Options {
  baseZero?: number;
  powerCeiling?: number;
  startingLevels?: number;
  scaledCost: boolean;
  halfCostKnowledge: boolean;
  combinedEffectiveness: boolean;
}

// Entity is a character or an NPC Fragment.
export interface Entity {
  name: string; // required
  player?: string; // untrimmed, as in the Ada version
  portrait?: string;
  tagline?: string; // trimmed
  summary?: string;
  background?: string;
  appearance?: string;
  personality?: string;
  otherNotes?: string;
  characterHooks?: string;
  npcType?: NpcType;
  count: number; // how many it stands for, 1 or more; 1 with no count:
  abilities: Ability[]; // sorted
  weaknesses: Weakness[]; // sorted
  combat: Combat;
  notes: Note[]; // in document order
  hasFluff: boolean;
  fluff: (string | undefined)[]; // NFluff of them, untrimmed
  options?: Options;
  isFragment: boolean; // an NPC Fragment
}

// LoadError is a required field that is missing or malformed. line and
// column (1-based) are undefined when it has no location.
export interface LoadError {
  message: string;
  path: string;
  line?: number;
  column?: number;
}

// loadErrorText is e as ova_cg_go's LoadError.Error says it.
export function loadErrorText(e: LoadError): string {
  return e.path + ": " + e.message;
}

// Fatal ends a load with its message: Go's fatal, thrown here rather
// than returned through every function, and caught by Loader.load.
class Fatal extends Error {}

// ---- Nodes ----

// The yaml library's node for an empty sequence item or a missing
// value is a plain, empty scalar; null only for a key with no value at
// all ("? key").
type YValue = YNode | null;

// N is a YAML node and its path: Go's node. doc resolves aliases, lc
// gives lines and columns.
class N {
  readonly n: YNode;
  readonly path: string;
  readonly doc: Document;
  readonly lc: LineCounter;

  constructor(n: YNode, path: string, doc: Document, lc: LineCounter) {
    this.n = n;
    this.path = path;
    this.doc = doc;
    this.lc = lc;
  }

  isScalar(): boolean {
    return isScalar(this.n);
  }
  isSequence(): boolean {
    return isSeq(this.n);
  }
  isMapping(): boolean {
    return isMap(this.n);
  }

  // text is a scalar's text: with the failsafe schema, always a string.
  text(): string {
    return isScalar(this.n) ? String(this.n.value) : "";
  }

  // value is the mapping's value for key; undefined if there is none.
  // A key with no value ("key:" and nothing) counts as none, as
  // libfyaml gives no node for it: the yaml library gives a plain,
  // empty scalar with no tag (yaml.v3's !!null), or null.
  value(key: string): N | undefined {
    if (!isMap(this.n)) return undefined;
    for (const p of this.n.items) {
      const k = deref(p.key as YValue, this.doc);
      if (k !== null && isScalar(k) && String(k.value) === key) {
        const v = deref(p.value as YValue, this.doc);
        if (
          v === null ||
          (isScalar(v) &&
            v.type === "PLAIN" &&
            v.value === "" &&
            v.tag === undefined)
        ) {
          return undefined;
        }
        return new N(v, this.path + "/" + key, this.doc, this.lc);
      }
    }
    return undefined;
  }

  items(): N[] {
    if (!isSeq(this.n)) return [];
    return this.n.items.map(
      (c, i) =>
        new N(
          deref(c as YValue, this.doc) ?? emptyScalar(this.doc),
          this.path + "/" + i,
          this.doc,
          this.lc,
        ),
    );
  }

  // position is the node's line and column, 1-based, if it has one.
  position(): { line: number; col: number } | undefined {
    const r = this.n.range;
    return r ? this.lc.linePos(r[0]) : undefined;
  }
}

function deref(n: YValue, doc: Document): YValue {
  while (n !== null && isAlias(n)) {
    n = (n.resolve(doc) as YNode | undefined) ?? null;
  }
  return n;
}

function emptyScalar(doc: Document): YNode {
  return doc.createNode("") as YNode;
}

// ---- Scalars, as polibfyaml converts them ----

function digitValue(c: string | undefined): number {
  if (c === undefined) return 99;
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "a" && c <= "f") return c.charCodeAt(0) - 97 + 10;
  if (c >= "A" && c <= "F") return c.charCodeAt(0) - 65 + 10;
  return 99;
}

// digitRun is the length of the run digit {["_"] digit} of base-digits
// at s[i], or 0 if s[i] isn't one. Go counts bytes, this UTF-16 units;
// since only ASCII can be in a run, the run and the test against the
// rest of s agree.
function digitRun(s: string, i: number, base: number): number {
  let j = i;
  if (j >= s.length || digitValue(s[j]) >= base) return 0;
  j++;
  while (j < s.length) {
    if (digitValue(s[j]) < base) {
      j++;
    } else if (
      s[j] === "_" &&
      j + 1 < s.length &&
      digitValue(s[j + 1]) < base
    ) {
      j += 2;
    } else {
      break;
    }
  }
  return j - i;
}

// A result: the value, or the message of what's wrong with it.
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

// parseInt converts s as polibfyaml's IntegerValue does: [+-], then
// decimal, 0x hex, 0o octal or 0b binary digits, with single "_"s
// between them, within 32 bits. Exact, by BigInt, however long s is.
export function parseInt(s: string): Parsed<number> {
  let i = 0;
  let neg = false;
  if (s.length > 0 && (s[0] === "+" || s[0] === "-")) {
    neg = s[0] === "-";
    i = 1;
  }
  let base = 10;
  let prefix = "";
  if (s.length - i >= 2 && s[i] === "0") {
    const p = s[i + 1];
    if (p === "x" || p === "o" || p === "b") {
      base = p === "x" ? 16 : p === "o" ? 8 : 2;
      prefix = "0" + p;
      i += 2;
    }
  }
  if (i === s.length || digitRun(s, i, base) !== s.length - i) {
    return { ok: false, error: "not a valid integer: " + quoted(s) };
  }
  let v = BigInt(prefix + s.slice(i).replaceAll("_", ""));
  if (neg) v = -v;
  if (v < -(2n ** 31n) || v > 2n ** 31n - 1n) {
    return { ok: false, error: "integer out of range: " + quoted(s) };
  }
  return { ok: true, value: Number(v) };
}

// parseBool converts s as polibfyaml's BooleanValue does.
export function parseBool(s: string): Parsed<boolean> {
  switch (s) {
    case "true":
    case "True":
    case "TRUE":
      return { ok: true, value: true };
    case "false":
    case "False":
    case "FALSE":
      return { ok: true, value: false };
  }
  return { ok: false, error: "not a valid boolean: " + quoted(s) };
}

// quoted is s in double quotes, as polibfyaml's messages, which
// ova_fmt_po prints, put it: as it is, with nothing escaped. ova_cg_go
// uses Go's %q, which escapes quotes, backslashes and unprintable
// characters, so its message for 'a"b' differs (PLAN.md, Phase 3.1).
function quoted(s: string): string {
  return '"' + s + '"';
}

// ---- Fields ----

function notScalar(key: string): string {
  return 'key "' + key + '" is not a scalar value';
}

function failAt(n: N, text: string): Fatal {
  return new Fatal(n.path + ": " + text);
}

// optString is the text of the scalar for key, undefined if there is
// no such key. A value that isn't a scalar fails the load.
function optString(m: N, key: string): string | undefined {
  const v = m.value(key);
  if (v === undefined) return undefined;
  if (!v.isScalar()) throw new Fatal(notScalar(key));
  return v.text();
}

// optInteger is the integer for key, undefined if there is no such
// key. A malformed one fails the load.
function optInteger(m: N, key: string): number | undefined {
  const v = m.value(key);
  if (v === undefined) return undefined;
  if (!v.isScalar()) throw new Fatal(notScalar(key));
  const r = parseInt(v.text());
  if (!r.ok) throw new Fatal(r.error);
  return r.value;
}

// optBoolean is the boolean for key, or b if there is no such key. A
// malformed one fails the load.
function optBoolean(m: N, key: string, b: boolean): boolean {
  const v = m.value(key);
  if (v === undefined) return b;
  if (!v.isScalar()) throw new Fatal(notScalar(key));
  const r = parseBool(v.text());
  if (!r.ok) throw new Fatal(r.error);
  return r.value;
}

// sequence is the sequence for key, undefined if there's no such key;
// anything else there fails the load.
function sequence(m: N, key: string): N | undefined {
  const s = m.value(key);
  if (s !== undefined && !s.isSequence()) throw failAt(s, "not a sequence");
  return s;
}

// mapping is the mapping for key, undefined if there's no such key;
// anything else there fails the load.
function mapping(m: N, key: string): N | undefined {
  const s = m.value(key);
  if (s !== undefined && !s.isMapping()) throw failAt(s, "not a mapping");
  return s;
}

// loadList reads the items of the sequence for key (none if absent),
// each a mapping read by load.
function loadList<T>(m: N, key: string, load: (n: N) => T): T[] {
  const seq = sequence(m, key);
  if (seq === undefined) return [];
  const r: T[] = [];
  for (const item of seq.items()) {
    if (!item.isMapping()) throw failAt(item, "not a mapping");
    r.push(load(item));
  }
  return r;
}

// ---- Sorting ----

// utf8 is s's UTF-8 bytes, by hand: core uses no global the browser
// and Node don't both have in ES2022's library (TextEncoder isn't).
function utf8(s: string): number[] {
  const b: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) b.push(c);
    else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000)
      b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else
      b.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
  }
  return b;
}

// foldCI is s's UTF-8 bytes with every byte lowered as the Ada
// To_Lower lowers it, which names are sorted by: A..Z, and also the
// Latin-1 capitals C0..DE but D7. In UTF-8 those are lead bytes, so
// this doesn't lower non-ASCII letters, but it does move names starting
// with some of them relative to others, as in the Ada version.
//
// Go's FoldCI gives a string of those bytes, which may not be UTF-8;
// here they are a string of one character per byte (U+0000..U+00FF), so
// that == and < compare them as Go's do, bytewise. It is for comparing,
// not showing; for ASCII it is s lowered.
export function foldCI(s: string): string {
  let r = "";
  for (const c of utf8(s)) {
    const lower =
      (c >= 0x41 && c <= 0x5a) || (c >= 0xc0 && c <= 0xde && c !== 0xd7);
    r += String.fromCharCode(lower ? c + 32 : c);
  }
  return r;
}

// before says whether name an and detail ad sort before bn, bd: by
// name, then detail, folded.
export function before(
  an: string,
  ad: string,
  bn: string,
  bd: string,
): boolean {
  const a = foldCI(an);
  const b = foldCI(bn);
  if (a !== b) return a < b;
  return foldCI(ad) < foldCI(bd);
}

// sortByName sorts l by name and then detail, ignoring case: the Ada
// Ability_CI_Less and friends. An insertion sort, as Go's: stable, and
// the lists are short. An absent detail sorts as "".
function sortByName<T extends Named>(l: T[]): void {
  for (let i = 1; i < l.length; i++) {
    const x = l[i]!;
    let j = i;
    while (j > 0) {
      const y = l[j - 1]!;
      if (!before(x.name, x.detail ?? "", y.name, y.detail ?? "")) break;
      l[j] = y;
      j--;
    }
    l[j] = x;
  }
}

// ---- The loader ----

function emptyCombat(): Combat {
  return {
    hasCombat: false,
    defense: "",
    health: 0,
    endurance: 0,
    attacks: [],
    transformed: false,
    overrides: 0,
  };
}

// The result of loading an entity: it, or the message that ended the
// load.
export type Loaded =
  { ok: true; entity: Entity } | { ok: false; message: string };

// Loader reads entities, collecting the LoadErrors of every one read.
export class Loader {
  errors: LoadError[] = [];

  // load reads an entity from item, the i'th item of document doc's
  // top-level sequence, whose lines lc counts. A required field that
  // is missing or malformed is added to errors, and loading goes on:
  // check errors once the whole file is loaded. Anything else wrong
  // gives a message; the caller abandons the file.
  load(item: YNode, i: number, doc: Document, lc: LineCounter): Loaded {
    const n = deref(item, doc) ?? emptyScalar(doc);
    const m = new N(n, "/" + i, doc, lc);
    try {
      if (!m.isMapping()) throw failAt(m, "not a mapping");
      return { ok: true, entity: this.loadEntity(m) };
    } catch (e) {
      if (e instanceof Fatal) return { ok: false, message: e.message };
      throw e;
    }
  }

  // record records an error for key in mapping m: the Ada
  // Record_Error. The location is that of m's own "name" scalar, if it
  // has one: the missing key itself has no position to report.
  private record(m: N, key: string, message: string): void {
    const e: LoadError = { message, path: m.path + "/" + key };
    const name = m.value("name");
    if (name !== undefined && name.isScalar()) {
      const p = name.position();
      if (p !== undefined) {
        e.line = p.line;
        e.column = p.col;
      }
    }
    this.errors.push(e);
  }

  // requireString is the text of the scalar for key, which is required.
  // Records an error, and gives "", if it is missing or isn't a scalar.
  private requireString(m: N, key: string): string {
    const v = m.value(key);
    if (v === undefined) {
      this.record(m, key, 'missing required key "' + key + '"');
    } else if (!v.isScalar()) {
      this.record(m, key, notScalar(key));
    } else {
      return v.text();
    }
    return "";
  }

  // requireInteger is the integer for key, which is required. Records
  // an error, and gives 0, if it is missing or malformed.
  private requireInteger(m: N, key: string): number {
    const v = m.value(key);
    if (v === undefined) {
      this.record(m, key, 'missing required key "' + key + '"');
    } else if (!v.isScalar()) {
      this.record(m, key, notScalar(key));
    } else {
      const r = parseInt(v.text());
      if (r.ok) return r.value;
      this.record(m, key, r.error);
    }
    return 0;
  }

  // loadOverrides reads m's overrides: list, if any: the Ada
  // Load_Overrides. A list that isn't a sequence, or an item that isn't
  // one of the allowed key names, is a recorded error, like a missing
  // required key.
  private loadOverrides(m: N, allowed: Overrides): Overrides {
    let o = 0;
    const seq = m.value("overrides");
    if (seq === undefined) return o;
    if (!seq.isSequence()) {
      this.record(m, "overrides", "not a sequence of key names");
      return o;
    }
    for (const item of seq.items()) {
      if (!item.isScalar()) {
        this.record(m, "overrides", "an item is not a key name");
        continue;
      }
      const t = item.text();
      let found = false;
      for (let k = 0 as Override; k < nOverrides; k++) {
        if (has(allowed, k) && t === overrideKeys[k]) {
          o = withKey(o, k);
          found = true;
          break;
        }
      }
      // defense-2's name before there could be a third value.
      if (!found && has(allowed, OvDefense2) && t === "barrier") {
        o = withKey(o, OvDefense2);
        found = true;
      }
      if (!found) {
        const names: string[] = [];
        for (let k = 0 as Override; k < nOverrides; k++) {
          if (has(allowed, k)) names.push(overrideKeys[k]!);
        }
        this.record(
          m,
          "overrides",
          '"' + t + '" is not one of ' + names.join(", "),
        );
      }
    }
    return o;
  }

  // loadNpcType reads m's npc-type:, if any: the Ada Load_NPC_Type.
  // Anything but one of the names is a recorded error, like an
  // overrides: name. A value that isn't a scalar fails the load, as any
  // optional string's does.
  private loadNpcType(m: N): NpcType | undefined {
    const raw = optString(m, "npc-type");
    if (raw === undefined) return undefined;
    for (let k = Heroic as NpcType; k < NNpcTypes; k++) {
      if (foldCI(trim(raw)) === foldCI(npcTypeName(k))) return k;
    }
    this.record(
      m,
      "npc-type",
      '"' + raw + '" is not one of Heroic, Secondary, Extra, Boss',
    );
    return undefined;
  }

  // loadCount reads m's count:, 1 if there is none: the Ada Load_Count.
  // Less than 1 is a recorded error, as a bad npc-type: is. Something
  // that isn't an integer fails the load, as any optional integer's
  // does.
  private loadCount(m: N): number {
    const count = optInteger(m, "count");
    if (count === undefined) return 1;
    if (count < 1) {
      this.record(m, "count", '"' + count + '" is not 1 or more');
      return 1;
    }
    return count;
  }

  // ---- Perks and Flaws ----

  // loadPerkFlaw reads a Perk or Flaw: a scalar (just the name) or a
  // mapping.
  private loadPerkFlaw(n: N): PerkFlaw {
    if (n.isScalar()) return { name: n.text() };
    if (n.isMapping()) {
      const pf: PerkFlaw = { name: this.requireString(n, "name") };
      setOpt(pf, "detail", optString(n, "detail"));
      setOpt(pf, "countsAs", optInteger(n, "counts-as"));
      setOpt(pf, "cost", optInteger(n, "cost"));
      return pf;
    }
    // The Ada version's own message, which has no path.
    throw new Fatal("unrecognized Perk/Flaw shape");
  }

  // loadPerkFlaws reads the Perks or Flaws for key (none if absent),
  // sorted.
  private loadPerkFlaws(m: N, key: string): PerkFlaw[] {
    const seq = sequence(m, key);
    if (seq === undefined) return [];
    const r = seq.items().map((item) => this.loadPerkFlaw(item));
    sortByName(r);
    return r;
  }

  // ---- Attacks and combat: blocks ----

  private loadAttack(m: N): Attack {
    const name = this.requireString(m, "name");
    const perks = this.loadPerkFlaws(m, "perks");
    const flaws = this.loadPerkFlaws(m, "flaws");
    const affinity = optString(m, "affinity");
    const description = optString(m, "description");
    const a: Attack = {
      name,
      perks,
      flaws,
      roll: this.requireInteger(m, "roll"),
      dx: this.requireString(m, "dx"),
      endurance: this.requireInteger(m, "endurance"),
      telekinesis: optBoolean(m, "telekinesis", false),
      transformed: optBoolean(m, "transformed", false),
      overrides: 0,
    };
    setOpt(a, "affinity", affinity);
    setOpt(a, "description", mapOpt(description, trim));
    a.overrides = this.loadOverrides(m, overridesOf(OvRoll, OvDx, OvEndurance));
    return a;
  }

  // loadCombat reads the combat: block m. m has no "name" of its own,
  // so these errors have a path but no location, as in the Ada
  // version.
  private loadCombat(m: N): Combat {
    const c = emptyCombat();
    c.hasCombat = true;
    c.defense = this.requireString(m, "defense");
    if (c.defense.split("/").length - 1 > 2) {
      this.record(
        m,
        "defense",
        '"' + c.defense + '" has more than three values',
      );
    }
    c.health = this.requireInteger(m, "health");
    c.endurance = this.requireInteger(m, "endurance");
    setOpt(c, "threatValue", optInteger(m, "threat-value"));
    c.attacks = loadList(m, "attacks", (n) => this.loadAttack(n));
    const notes = optString(m, "notes");
    c.transformed = optBoolean(m, "transformed", false);
    setOpt(c, "notes", mapOpt(notes, trim));
    c.overrides = this.loadOverrides(
      m,
      overridesOf(
        OvEndurance,
        OvDefense,
        OvDefense2,
        OvDefense3,
        OvHealth,
        OvThreatValue,
      ),
    );
    return c;
  }

  // optCombat reads the combat: block, if there is one.
  private optCombat(m: N): Combat {
    const n = mapping(m, "combat");
    return n === undefined ? emptyCombat() : this.loadCombat(n);
  }

  // ---- Sub-items, spells, sub-entities ----

  // loadSubItemFields reads the fields an Ability and a SubItem share.
  private loadSubItemFields(m: N): SubItem {
    const s: SubItem = {
      name: this.requireString(m, "name"),
      level: this.requireInteger(m, "level"),
      perks: [],
      flaws: [],
      overrides: 0,
    };
    setOpt(s, "detail", optString(m, "detail"));
    s.perks = this.loadPerkFlaws(m, "perks");
    s.flaws = this.loadPerkFlaws(m, "flaws");
    setOpt(s, "endurance", optInteger(m, "endurance"));
    setOpt(s, "note", optString(m, "note"));
    if (m.value("threat-value-half") !== undefined) {
      s.threatValueHalf = optBoolean(m, "threat-value-half", false);
    }
    s.overrides = this.loadOverrides(m, overridesOf(OvEndurance));
    return s;
  }

  // loadSubItems reads the SubItems for key (none if absent), sorted.
  private loadSubItems(m: N, key: string): SubItem[] {
    const r = loadList(m, key, (n) => this.loadSubItemFields(n));
    sortByName(r);
    return r;
  }

  private loadSpell(m: N): Spell {
    return {
      name: this.requireString(m, "name"),
      ability: this.requireString(m, "ability"),
      level: this.requireInteger(m, "level"),
      endurance: this.requireString(m, "endurance"),
      overrides: this.loadOverrides(m, overridesOf(OvEndurance)),
    };
  }

  private loadSubEntity(m: N, label: string): SubEntity {
    return {
      label,
      name: this.requireString(m, "name"),
      isFragment: optBoolean(m, "fragment", false),
      abilities: this.loadSubItems(m, "abilities"),
      weaknesses: this.loadSubItems(m, "weaknesses"),
      combat: this.optCombat(m),
    };
  }

  // ---- Abilities, weaknesses, notes ----

  private loadAbility(m: N): Ability {
    const a: Ability = {
      ...this.loadSubItemFields(m),
      subAbilities: this.loadSubItems(m, "abilities"),
      subWeaknesses: this.loadSubItems(m, "weaknesses"),
      spells: loadList(m, "spells", (n) => this.loadSpell(n)),
    };
    const companion = mapping(m, "companion");
    if (companion !== undefined) {
      a.subEntity = this.loadSubEntity(companion, "Companion");
      return a;
    }
    const vehicle = mapping(m, "vehicle");
    if (vehicle !== undefined) {
      a.subEntity = this.loadSubEntity(vehicle, "Vehicle");
    }
    return a;
  }

  private loadWeakness(m: N): Weakness {
    const w: Weakness = {
      name: this.requireString(m, "name"),
      level: this.requireInteger(m, "level"),
    };
    setOpt(w, "detail", optString(m, "detail"));
    return w;
  }

  // loadNote reads a note. A note has no "name" of its own, so its
  // errors have a path but no location.
  private loadNote(m: N): Note {
    const header = this.requireString(m, "header");
    return { header, text: trim(this.requireString(m, "text")) };
  }

  // ---- Entities ----

  private loadEntity(m: N): Entity {
    const e: Entity = {
      name: this.requireString(m, "name"),
      count: 1,
      abilities: [],
      weaknesses: [],
      combat: emptyCombat(),
      notes: [],
      hasFluff: false,
      fluff: new Array<string | undefined>(NFluff).fill(undefined),
      isFragment: optBoolean(m, "fragment", false),
    };
    setOpt(e, "player", optString(m, "player"));
    // The prose fields, trimmed, as the Ada Load_Entity does.
    for (const [key, field] of [
      ["tagline", "tagline"],
      ["summary", "summary"],
      ["background", "background"],
      ["appearance", "appearance"],
      ["personality", "personality"],
      ["character-hooks", "characterHooks"],
    ] as const) {
      setOpt(e, field, mapOpt(optString(m, key), trim));
    }
    setOpt(e, "npcType", this.loadNpcType(m));
    e.count = this.loadCount(m);
    setOpt(e, "otherNotes", mapOpt(optString(m, "other-notes"), trim));
    setOpt(e, "portrait", optString(m, "portrait"));
    e.abilities = loadList(m, "abilities", (n) => this.loadAbility(n));
    sortByName(e.abilities);
    e.weaknesses = loadList(m, "weaknesses", (n) => this.loadWeakness(n));
    sortByName(e.weaknesses);
    e.combat = this.optCombat(m);
    e.notes = loadList(m, "notes", (n) => this.loadNote(n));
    const fluff = mapping(m, "fluff");
    e.hasFluff = fluff !== undefined;
    if (fluff !== undefined) {
      for (let i = 0; i < NFluff; i++) {
        e.fluff[i] = optString(fluff, FluffKeys[i]!);
      }
    }
    const options = mapping(m, "options");
    if (options !== undefined) e.options = loadOptions(options);
    return e;
  }
}

function loadOptions(m: N): Options {
  const o: Options = {
    scaledCost: false,
    halfCostKnowledge: false,
    combinedEffectiveness: false,
  };
  setOpt(o, "baseZero", optInteger(m, "base-zero"));
  setOpt(o, "powerCeiling", optInteger(m, "power-ceiling"));
  setOpt(o, "startingLevels", optInteger(m, "starting-levels"));
  o.scaledCost = optBoolean(m, "scaled-cost", false);
  o.halfCostKnowledge = optBoolean(m, "half-cost-knowledge", false);
  o.combinedEffectiveness = optBoolean(m, "combined-effectiveness", false);
  return o;
}

// setOpt sets the optional field k of o to v, if v is defined, so that
// an absent field is missing rather than present and undefined.
function setOpt<T, K extends keyof T>(o: T, k: K, v: T[K] | undefined): void {
  if (v !== undefined) o[k] = v;
}

function mapOpt<T, U>(v: T | undefined, f: (x: T) => U): U | undefined {
  return v === undefined ? undefined : f(v);
}

// trim is s without leading and trailing blanks, tabs, line feeds and
// carriage returns: the Ada Trim_Whitespace (Go's Trim). Not just
// blanks, because a YAML literal block scalar ("background: |") ends
// with a line feed; and not String.prototype.trim, which strips more.
export function trim(s: string): string {
  let i = 0;
  let j = s.length;
  while (i < j && " \t\n\r".includes(s[i]!)) i++;
  while (j > i && " \t\n\r".includes(s[j - 1]!)) j--;
  return s.slice(i, j);
}

// ---- Files ----

// The result of reading a file's entities: every entity in it, or the
// message of what's wrong with it, and the LoadErrors behind that
// message when those are what's wrong.
export type Read =
  | { ok: true; entities: Entity[] }
  | { ok: false; message: string; errors: LoadError[] };

// readEntities reads every entity of every YAML document in text, the
// file name's contents, in order, as ova_cg_go's
// character.ReadEntities reads them from a path: here, in entities, so
// the YAML library is used in one module. It fails on a YAML error, a
// document whose root isn't a sequence, a fatal error in an entity, or
// any LoadError, all of them then joined into one message, a line each.
//
// A YAML error is the yaml library's message, at its line and column,
// as NAME:LINE:COL: error: MESSAGE, the form of ova_fmt_po's; the
// wording differs from libfyaml's and yaml.v3's (PLAN.md, entities).
export function readEntities(text: string, name: string): Read {
  const lc = new LineCounter();
  // The failsafe schema makes every scalar its text, for parseInt and
  // parseBool to read. A duplicate key stays an error, as in libfyaml.
  const docs = parseAllDocuments(text, {
    schema: "failsafe",
    lineCounter: lc,
    prettyErrors: false,
  });
  const fail = (message: string): Read => ({ ok: false, message, errors: [] });
  const yamlError = (e: { message: string; pos: [number, number] }): Read => {
    const p = lc.linePos(e.pos[0]);
    return fail(`${name}:${p.line}:${p.col}: error: ${e.message}`);
  };
  // An empty stream: no documents, so no entities, unless the stream
  // itself holds an error.
  if ("empty" in docs) {
    const e = docs.errors[0];
    return e !== undefined ? yamlError(e) : { ok: true, entities: [] };
  }
  const l = new Loader();
  const es: Entity[] = [];
  for (const doc of docs) {
    const e = doc.errors[0];
    if (e !== undefined) return yamlError(e);
    const root = deref(doc.contents as YValue, doc);
    if (root === null || !isSeq(root)) {
      return fail("expected a top-level YAML sequence of entities in " + name);
    }
    let i = 0;
    for (const item of root.items) {
      const r = l.load((item as YValue) ?? emptyScalar(doc), i, doc, lc);
      if (!r.ok) return fail(r.message);
      es.push(r.entity);
      i++;
    }
  }
  if (l.errors.length > 0) {
    return {
      ok: false,
      message: l.errors.map(loadErrorText).join("\n"),
      errors: l.errors,
    };
  }
  return { ok: true, entities: es };
}
