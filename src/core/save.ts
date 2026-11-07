// Characters as the YAML ova_fmt reads, from ova_cg_go's
// internal/save (ova_cg_po's Save): byte for byte what ova_cg_go
// writes. The page downloads allToText's text; there's no SaveAll to a
// path here.
//
// The structure is the yaml library's nodes, as ova_cg_go's is
// yaml.v3's. Each scalar's text is written by a port of yaml.v3's
// (v3.0.4, which ova_cg_go builds with): the style it picks for a
// string (encode.go's node, emitterc.go's analyze_scalar and
// select_scalar_style, resolve.go's resolve) and how it writes each
// style. The yaml library picks and writes styles its own way, quoting
// '#1 fan' as "#1 fan" and leaving 😀 unescaped (PLAN.md, "The YAML a
// save writes").

import { Document, Pair, Scalar, YAMLMap, YAMLSeq } from "yaml";
import * as calc from "./calc.ts";
import * as character from "./character.ts";
import * as entities from "./entities.ts";
import * as rules from "./rules.ts";

// ---- Scalars, as yaml.v3 writes them ----

// A Text is a !!str node, ova_cg_go's text(): quoted where plain would
// read as another type. Any other Scalar is ova_cg_go's plain(), an
// untagged node: a key, a number, a boolean.
class Text extends Scalar<string> {}

// yaml.v3's character classes (yamlprivateh.go), on code points.
const isBreak = (c: number): boolean =>
  c === 0x0d || c === 0x0a || c === 0x85 || c === 0x2028 || c === 0x2029;
const isSpace = (c: number): boolean => c === 0x20;
const isBlank = (c: number): boolean => c === 0x20 || c === 0x09;
// undefined is the end of the text; a NUL counts as one too, as there.
const isBlankZ = (c: number | undefined): boolean =>
  c === undefined || c === 0 || isBlank(c) || isBreak(c);
const isPrintable = (c: number): boolean =>
  c === 0x0a ||
  (c >= 0x20 && c <= 0x7e) ||
  (c >= 0xa0 && c <= 0xd7ff) ||
  (c >= 0xe000 && c <= 0xfffd && c !== 0xfeff);

// What analyze_scalar finds a text may be written as.
interface Analysis {
  multiline: boolean;
  flowPlain: boolean;
  blockPlain: boolean;
  single: boolean;
  block: boolean;
}

function analyze(cs: readonly number[]): Analysis {
  if (cs.length === 0) {
    return {
      multiline: false,
      flowPlain: false,
      blockPlain: true,
      single: true,
      block: false,
    };
  }
  let blockIndicators = false;
  let flowIndicators = false;
  let lineBreaks = false;
  let special = false;
  let tabs = false;
  let leadingSpace = false;
  let leadingBreak = false;
  let trailingSpace = false;
  let trailingBreak = false;
  let breakSpace = false;
  let spaceBreak = false;
  let previousSpace = false;
  let previousBreak = false;
  const start = String.fromCodePoint(...cs.slice(0, 3));
  if (start === "---" || start === "...") {
    blockIndicators = true;
    flowIndicators = true;
  }
  let precededByWhitespace = true;
  const n = cs.length;
  for (let i = 0; i < n; i++) {
    const c = cs[i]!;
    const next = cs[i + 1];
    const followedByWhitespace = next === undefined || isBlank(next);
    const ch = String.fromCodePoint(c);
    if (i === 0) {
      if ("#,[]{}&*!|>'\"%@`".includes(ch)) {
        flowIndicators = true;
        blockIndicators = true;
      } else if (ch === "?" || ch === ":") {
        flowIndicators = true;
        if (followedByWhitespace) blockIndicators = true;
      } else if (ch === "-" && followedByWhitespace) {
        flowIndicators = true;
        blockIndicators = true;
      }
    } else if (",?[]{}".includes(ch)) {
      flowIndicators = true;
    } else if (ch === ":") {
      flowIndicators = true;
      if (followedByWhitespace) blockIndicators = true;
    } else if (ch === "#" && precededByWhitespace) {
      flowIndicators = true;
      blockIndicators = true;
    }
    if (c === 0x09) tabs = true;
    else if (!isPrintable(c)) special = true;
    if (isSpace(c)) {
      if (i === 0) leadingSpace = true;
      if (i === n - 1) trailingSpace = true;
      if (previousBreak) breakSpace = true;
      previousSpace = true;
      previousBreak = false;
    } else if (isBreak(c)) {
      lineBreaks = true;
      if (i === 0) leadingBreak = true;
      if (i === n - 1) trailingBreak = true;
      if (previousSpace) spaceBreak = true;
      previousSpace = false;
      previousBreak = true;
    } else {
      previousSpace = false;
      previousBreak = false;
    }
    precededByWhitespace = isBlankZ(c);
  }
  const a: Analysis = {
    multiline: lineBreaks,
    flowPlain: true,
    blockPlain: true,
    single: true,
    block: true,
  };
  if (leadingSpace || leadingBreak || trailingSpace || trailingBreak) {
    a.flowPlain = false;
    a.blockPlain = false;
  }
  if (trailingSpace) a.block = false;
  if (breakSpace || spaceBreak || tabs || special) {
    a.flowPlain = false;
    a.blockPlain = false;
    a.single = false;
  }
  if (spaceBreak || special) a.block = false;
  if (lineBreaks) {
    a.flowPlain = false;
    a.blockPlain = false;
  }
  if (flowIndicators) a.flowPlain = false;
  if (blockIndicators) a.blockPlain = false;
  return a;
}

// ---- resolve: whether plain text would read as a string ----

// resolve.go's resolveMap: none of these reads as a string.
const resolveMap: ReadonlySet<string> = new Set([
  "true",
  "True",
  "TRUE",
  "false",
  "False",
  "FALSE",
  "",
  "~",
  "null",
  "Null",
  "NULL",
  ".nan",
  ".NaN",
  ".NAN",
  ".inf",
  ".Inf",
  ".INF",
  "+.inf",
  "+.Inf",
  "+.INF",
  "-.inf",
  "-.Inf",
  "-.INF",
  "<<",
]);

// Go's strconv.ParseUint(s, base, 64) (base 0 reads Go's prefixes),
// with max for its range: undefined where it gives an error.
function parseUint(s: string, base: number, max: bigint): bigint | undefined {
  if (s === "") return undefined;
  if (base === 0) {
    base = 10;
    if (s[0] === "0") {
      const p = s[1]?.toLowerCase();
      if (s.length >= 3 && (p === "b" || p === "o" || p === "x")) {
        base = p === "b" ? 2 : p === "o" ? 8 : 16;
        s = s.slice(2);
      } else {
        base = 8;
        s = s.slice(1);
      }
    }
  }
  let v = 0n;
  for (const ch of s) {
    const d = /^[0-9a-zA-Z]$/.test(ch) ? parseInt(ch, 36) : 99;
    if (d >= base) return undefined;
    v = v * BigInt(base) + BigInt(d);
    if (v > max) return undefined;
  }
  return v;
}

// Go's strconv.ParseInt(s, base, 64): whether it reads s.
function goInt(s: string, base: number): boolean {
  if (s === "") return false;
  let neg = false;
  if (s[0] === "+" || s[0] === "-") {
    neg = s[0] === "-";
    s = s.slice(1);
  }
  const max = neg ? 1n << 63n : (1n << 63n) - 1n;
  return parseUint(s, base, max) !== undefined;
}

// Go's strconv.ParseUint(s, base, 64): whether it reads s.
function goUint(s: string, base: number): boolean {
  return parseUint(s, base, (1n << 64n) - 1n) !== undefined;
}

// Go's strconv's underscoreOK: each "_" between digits, or after a
// base prefix.
function underscoreOK(s: string): boolean {
  let saw = "^";
  let i = 0;
  if (s[0] === "-" || s[0] === "+") s = s.slice(1);
  let hex = false;
  const p = s[1]?.toLowerCase();
  if (s.length >= 2 && s[0] === "0" && (p === "b" || p === "o" || p === "x")) {
    i = 2;
    saw = "0";
    hex = p === "x";
  }
  for (; i < s.length; i++) {
    const c = s[i]!;
    const l = c.toLowerCase();
    if ((c >= "0" && c <= "9") || (hex && l >= "a" && l <= "f")) {
      saw = "0";
      continue;
    }
    if (c === "_") {
      if (saw !== "0") return false;
      saw = "_";
      continue;
    }
    if (saw === "_") return false;
    saw = "!";
  }
  return saw !== "_";
}

// A decimal float in range, as Go's strconv.ParseFloat reads one
// without an error: JavaScript reads these forms alike, and an
// overflow is Go's ErrRange.
const finite = (s: string): boolean => Number.isFinite(Number(s));

const yamlStyleFloat = /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/;

// resolve.go's allowedTimestampFormats, as Go's time.Parse reads them:
// a 1- or 2-digit field takes 2 digits if it can; a fraction is "." or
// "," and any digits; a zone is Z or ±hh:mm.
const timestamps: readonly RegExp[] = [
  /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})(?:[.,]\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/,
  /^(\d{4})-(\d{1,2})-(\d{1,2})t(\d{1,2}):(\d{1,2}):(\d{1,2})(?:[.,]\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/,
  /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})(?:[.,]\d+)?$/,
  /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
];

function daysIn(month: number, year: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

// Whether time.Parse reads s in one of the formats, its fields in
// range: an hour to 23, a zone's to 24 (and its minutes to 60).
function isTimestamp(s: string): boolean {
  for (const re of timestamps) {
    const m = re.exec(s);
    if (m === null) continue;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12) continue;
    if (
      m[4] !== undefined &&
      (Number(m[4]) >= 24 || Number(m[5]) >= 60 || Number(m[6]) >= 60)
    ) {
      continue;
    }
    if (m[7] !== undefined && (Number(m[7]) > 24 || Number(m[8]) > 60)) {
      continue;
    }
    if (day < 1 || day > daysIn(month, year)) continue;
    return true;
  }
  return false;
}

// Whether yaml.v3 resolves plain s as a !!str: if not, a text is
// double-quoted (encode.go's forceQuoting).
function resolvesToStr(s: string): boolean {
  const c = s[0];
  let hint: string;
  if (c === undefined) hint = "N";
  else if (c === "+" || c === "-") hint = "S";
  else if (c >= "0" && c <= "9") hint = "D";
  else if ("yYnNtTfFoO~".includes(c)) hint = "M";
  else if (c === ".") hint = ".";
  else return true;
  if (resolveMap.has(s)) return false;
  if (hint === ".") {
    const t = s.replaceAll("_", "");
    return !(
      underscoreOK(s) &&
      /^\.[0-9]+([eE][-+]?[0-9]+)?$/.test(t) &&
      finite(t)
    );
  }
  if (hint === "D" || hint === "S") {
    if (isTimestamp(s)) return false;
    const plain = s.replaceAll("_", "");
    if (goInt(plain, 0) || goUint(plain, 0)) return false;
    if (yamlStyleFloat.test(plain) && finite(plain)) return false;
    for (const [prefix, base] of [
      ["0b", 2],
      ["0o", 8],
    ] as const) {
      if (plain.startsWith(prefix)) {
        const rest = plain.slice(2);
        if (goInt(rest, base) || goUint(rest, base)) return false;
      } else if (plain.startsWith("-" + prefix)) {
        if (goInt("-" + plain.slice(3), base)) return false;
      }
    }
  }
  return true;
}

// ---- The writers ----

// write_single_quoted_scalar, for a text with no "\n" (that's a
// literal) and no space beside a break (that's double-quoted): a
// U+2028 or U+2029 is written as it is, the next line indented.
function singleQuoted(cs: readonly number[], indent: number): string {
  let o = "'";
  let breaks = false;
  for (const c of cs) {
    if (isBreak(c)) {
      o += String.fromCodePoint(c);
      breaks = true;
    } else if (isSpace(c)) {
      o += " ";
    } else {
      if (breaks) o += " ".repeat(indent);
      if (c === 0x27) o += "'";
      o += String.fromCodePoint(c);
      breaks = false;
    }
  }
  return o + "'";
}

const escapes: ReadonlyMap<number, string> = new Map([
  [0x00, "0"],
  [0x07, "a"],
  [0x08, "b"],
  [0x09, "t"],
  [0x0a, "n"],
  [0x0b, "v"],
  [0x0c, "f"],
  [0x0d, "r"],
  [0x1b, "e"],
  [0x22, '"'],
  [0x5c, "\\"],
  [0x85, "N"],
  [0xa0, "_"],
  [0x2028, "L"],
  [0x2029, "P"],
]);

// write_double_quoted_scalar: a text that starts with a byte-order
// mark is escaped throughout, as there (is_bom looks at the start).
function doubleQuoted(cs: readonly number[]): string {
  let o = '"';
  const bom = cs[0] === 0xfeff;
  for (const c of cs) {
    if (bom || !isPrintable(c) || isBreak(c) || c === 0x22 || c === 0x5c) {
      const e = escapes.get(c);
      const hex = c.toString(16).toUpperCase();
      if (e !== undefined) o += "\\" + e;
      else if (c <= 0xff) o += "\\x" + hex.padStart(2, "0");
      else if (c <= 0xffff) o += "\\u" + hex.padStart(4, "0");
      else o += "\\U" + hex.padStart(8, "0");
    } else {
      o += String.fromCodePoint(c);
    }
  }
  return o + '"';
}

// write_literal_scalar, its lines at indent: the header and its hints
// (write_block_scalar_hints), a line break, then the text. The yaml
// library ends the line after the value, so one "\n" ending the text is
// left to it. (A text ending in U+2028 or U+2029 differs: yaml.v3
// writes the next key on the same line.)
function literal(cs: readonly number[], indent: number): string {
  let o = "|";
  const first = cs[0]!;
  if (isSpace(first) || isBreak(first)) o += String(saveIndent);
  const n = cs.length;
  if (!isBreak(cs[n - 1]!)) o += "-";
  else if (n === 1 || isBreak(cs[n - 2]!)) o += "+";
  o += "\n";
  let breaks = true;
  for (const c of cs) {
    if (isBreak(c)) {
      o += String.fromCodePoint(c);
      breaks = true;
    } else {
      if (breaks) o += " ".repeat(indent);
      o += String.fromCodePoint(c);
      breaks = false;
    }
  }
  return o.endsWith("\n") ? o.slice(0, -1) : o;
}

// scalarText is s as yaml.v3 writes it, a !!str (text) or untagged, its
// continuation lines at indent, in a flow collection or as a simple
// key or not: node's style, then select_scalar_style's.
function scalarText(
  s: string,
  text: boolean,
  indent: number,
  flow: boolean,
  simpleKey: boolean,
): string {
  const cs = [...s].map((ch) => ch.codePointAt(0)!);
  const a = analyze(cs);
  let style: "plain" | "single" | "double" | "literal" = "plain";
  if (s.includes("\n")) style = "literal";
  else if (text && !resolvesToStr(s)) style = "double";
  if (simpleKey && a.multiline) style = "double";
  if (style === "plain") {
    if (flow ? !a.flowPlain : !a.blockPlain) style = "single";
    if (cs.length === 0 && (flow || simpleKey)) style = "single";
  }
  if (style === "single" && !a.single) style = "double";
  if (style === "literal" && (!a.block || flow || simpleKey)) style = "double";
  switch (style) {
    case "plain":
      return s; // never multiline: a break forbids plain
    case "single":
      return singleQuoted(cs, indent);
    case "double":
      return doubleQuoted(cs);
    case "literal":
      return literal(cs, indent);
  }
}

// The string tag every Scalar is written with: the core schema's
// otherwise. ctx.indent is the indent yaml.v3 writes a value's
// continuation lines at (its emitter's indent, increased for the
// scalar), as seen in a value of a mapping and an item of a sequence,
// two levels deep.
const strTag = {
  identify: (v: unknown) => typeof v === "string",
  default: true,
  tag: "tag:yaml.org,2002:str",
  resolve: (s: string) => s,
  stringify(
    item: Scalar,
    ctx: { indent: string; inFlow: boolean | null; implicitKey?: boolean },
  ): string {
    return scalarText(
      String(item.value),
      item instanceof Text,
      ctx.indent.length,
      ctx.inFlow === true,
      ctx.implicitKey === true,
    );
  },
};

// ova_cg_go's encoder's SetIndent(2).
const saveIndent = 2;

// ---- Nodes ----

type Node = Scalar | YAMLMap | YAMLSeq;

function text(s: string): Text {
  return new Text(s);
}

function plain(s: string): Scalar {
  return new Scalar(s);
}

function integer(i: number): Scalar {
  return plain(String(i));
}

function boolean(b: boolean): Scalar {
  return plain(b ? "true" : "false");
}

// num is n in effect: "4", "1/2", "10+".
function num(n: calc.Number): Scalar {
  return plain(n.text());
}

function mapping(): YAMLMap {
  return new YAMLMap();
}

function sequence(): YAMLSeq {
  return new YAMLSeq();
}

function pair(m: YAMLMap, key: string, v: Node): void {
  m.items.push(new Pair(plain(key), v));
}

// over adds k to the set if n is overridden.
function over(
  set: entities.Overrides,
  k: entities.Override,
  n: calc.Number,
): entities.Overrides {
  return n.overridden ? entities.withKey(set, k) : set;
}

// overrides is "overrides: [...]", the keys in set in entities' order,
// if any.
function overrides(m: YAMLMap, set: entities.Overrides): void {
  if (set === 0) return;
  const seq = sequence();
  seq.flow = true;
  for (let k = entities.OvRoll; k <= entities.OvThreatValue; k++) {
    const o = k as entities.Override;
    if (entities.has(set, o)) seq.items.push(plain(entities.keyName(o)));
  }
  pair(m, "overrides", seq);
}

function textPair(m: YAMLMap, key: string, s: string | undefined): void {
  if (s !== undefined) pair(m, key, text(s));
}

// ---- Perks and Flaws ----

// modNode is a plain name, as the fixtures write most; a mapping when it
// has a detail, a count or a cost to say.
function modNode(x: calc.Mod): Node {
  const m = character.modOf(x);
  if (m.detail === undefined && m.times === 1 && !m.hasCost) {
    return text(m.name);
  }
  const n = mapping();
  pair(n, "name", text(m.name));
  textPair(n, "detail", m.detail);
  if (m.times !== 1) pair(n, "counts-as", integer(m.times));
  if (m.hasCost) pair(n, "cost", integer(m.cost));
  return n;
}

// mods is the Perks (flaws false) or Flaws of list, under key, if any.
function mods(
  m: YAMLMap,
  key: string,
  list: readonly calc.Mod[],
  flaws: boolean,
): void {
  let seq: YAMLSeq | undefined;
  for (const x of list) {
    if (character.modOf(x).isFlaw === flaws) {
      seq ??= sequence();
      seq.items.push(modNode(x));
    }
  }
  if (seq !== undefined) pair(m, key, seq);
}

// ---- Traits ----

function traitNode(x: calc.Trait): YAMLMap {
  const t = character.traitOf(x);
  const n = mapping();
  pair(n, "name", text(t.name));
  pair(n, "level", integer(t.level));
  textPair(n, "detail", t.detail);
  mods(n, "perks", t.mods, false);
  mods(n, "flaws", t.mods, true);
  // An END of 0 isn't written, as the fixtures don't write one; an
  // override always is.
  if ((t.hasEnd && t.end.get() !== 0) || t.end.overridden) {
    pair(n, "endurance", num(t.end));
  }
  textPair(n, "note", t.note);
  if (t.hasHalfTV) pair(n, "threat-value-half", boolean(t.halfTV));
  overrides(n, over(0, entities.OvEndurance, t.end));
  traits(n, "abilities", t.form, rules.Ability);
  traits(n, "weaknesses", t.form, rules.Weakness);
  if (t.spells.length > 0) {
    const seq = sequence();
    for (const sp of t.spells) {
      const s = character.spellOf(sp);
      const sn = mapping();
      pair(sn, "name", text(s.name));
      pair(sn, "ability", text(s.ability));
      pair(sn, "level", integer(s.level));
      pair(sn, "endurance", num(s.end));
      overrides(sn, over(0, entities.OvEndurance, s.end));
      seq.items.push(sn);
    }
    pair(n, "spells", seq);
  }
  if (t.partner !== undefined) {
    const p = character.sheetOf(t.partner);
    pair(n, entities.foldCI(p.label), partner(p)); // "companion" or "vehicle"
  }
  return n;
}

// traits is the Traits of list of kind, under key, if any.
function traits(
  m: YAMLMap,
  key: string,
  list: readonly calc.Trait[],
  kind: rules.Kind,
): void {
  let seq: YAMLSeq | undefined;
  for (const t of list) {
    if (t.kind === kind) {
      seq ??= sequence();
      seq.items.push(traitNode(t));
    }
  }
  if (seq !== undefined) pair(m, key, seq);
}

// ---- Combat ----

// defenses is c's defense and its overrides, added to set: the best
// value alone (singleDefense), or the Defense, then Barrier's, then
// Incorporeal Form's, each that c has or that is overridden. Barrier's
// is written before an overridden Incorporeal Form's that c doesn't
// have, which a second value alone would be read as (character's
// adoptDefenses).
function defenses(
  c: character.Character,
  set: entities.Overrides,
): { text: string; set: entities.Overrides } {
  const { slot, single } = character.singleDefense(c);
  if (single) {
    const n =
      slot === character.BarrierSlot
        ? c.barrier
        : slot === character.IncorporealSlot
          ? c.incorporeal
          : c.defense;
    return { text: n.text(), set: over(set, entities.OvDefense, n) };
  }
  let def = c.defense.text();
  set = over(set, entities.OvDefense, c.defense);
  let k: entities.Override = entities.OvDefense2;
  if (
    c.hasBarrier ||
    c.barrier.overridden ||
    (c.incorporeal.overridden && !c.hasIncorporeal)
  ) {
    def += "/" + c.barrier.text();
    set = over(set, k, c.barrier);
    k = entities.OvDefense3;
  }
  if (c.hasIncorporeal || c.incorporeal.overridden) {
    def += "/" + c.incorporeal.text();
    set = over(set, k, c.incorporeal);
  }
  return { text: def, set };
}

function combat(m: YAMLMap, c: character.Character): void {
  if (!c.hasCombat) return;
  const n = mapping();
  const d = defenses(c, 0);
  let set = d.set;
  pair(n, "defense", plain(d.text));
  pair(n, "health", num(c.health));
  pair(n, "endurance", num(c.endurance));
  if (c.hasThreatValue) pair(n, "threat-value", num(c.tv));
  if (c.transformed) pair(n, "transformed", boolean(true));
  set = over(set, entities.OvHealth, c.health);
  set = over(set, entities.OvEndurance, c.endurance);
  if (c.hasThreatValue) set = over(set, entities.OvThreatValue, c.tv);
  overrides(n, set);
  textPair(n, "notes", c.combatNotes);
  if (c.attacks.length > 0) {
    const seq = sequence();
    for (const x of c.attacks) {
      const a = character.attackOf(x);
      const an = mapping();
      pair(an, "name", text(a.name));
      mods(an, "perks", a.mods, false);
      textPair(an, "affinity", a.affinity);
      mods(an, "flaws", a.mods, true);
      textPair(an, "description", a.description);
      pair(an, "roll", num(a.roll));
      pair(an, "dx", num(a.dx));
      pair(an, "endurance", num(a.end));
      if (a.telekinetic) pair(an, "telekinesis", boolean(true));
      if (a.transformed) pair(an, "transformed", boolean(true));
      let s: entities.Overrides = 0;
      s = over(s, entities.OvRoll, a.roll);
      s = over(s, entities.OvDx, a.dx);
      s = over(s, entities.OvEndurance, a.end);
      overrides(an, s);
      seq.items.push(an);
    }
    pair(n, "attacks", seq);
  }
  pair(m, "combat", n);
}

// ---- Entities ----

// partner is a Companion's or Vehicle's mapping.
function partner(c: character.Character): YAMLMap {
  const m = mapping();
  pair(m, "name", text(c.name));
  if (c.isFragment) pair(m, "fragment", boolean(true));
  traits(m, "abilities", c.traits, rules.Ability);
  traits(m, "weaknesses", c.traits, rules.Weakness);
  combat(m, c);
  return m;
}

function entity(c: character.Character): YAMLMap {
  const m = mapping();
  pair(m, "name", text(c.name));
  if (c.isFragment) pair(m, "fragment", boolean(true));
  if (c.npcType !== undefined) {
    pair(m, "npc-type", text(entities.npcTypeName(c.npcType)));
  }
  if (c.count > 1) pair(m, "count", integer(c.count));
  textPair(m, "player", c.player);
  textPair(m, "portrait", c.portrait);
  textPair(m, "tagline", c.tagline);
  textPair(m, "summary", c.summary);
  textPair(m, "background", c.background);
  textPair(m, "appearance", c.appearance);
  textPair(m, "personality", c.personality);
  textPair(m, "character-hooks", c.characterHooks);
  textPair(m, "other-notes", c.otherNotes);
  if (c.hasOptions) {
    const o = mapping();
    const op = c.options;
    if (op.baseZero) pair(o, "base-zero", integer(op.baseZeroRange));
    if (op.powerCeiling) pair(o, "power-ceiling", integer(op.ceiling));
    if (op.startingLevels) pair(o, "starting-levels", integer(op.starting));
    if (op.scaledCost) pair(o, "scaled-cost", boolean(true));
    if (op.halfCostKnowledge) pair(o, "half-cost-knowledge", boolean(true));
    if (op.combinedEffectiveness) {
      pair(o, "combined-effectiveness", boolean(true));
    }
    pair(m, "options", o);
  }
  traits(m, "abilities", c.traits, rules.Ability);
  traits(m, "weaknesses", c.traits, rules.Weakness);
  combat(m, c);
  if (c.notes.length > 0) {
    const seq = sequence();
    for (const note of c.notes) {
      const n = mapping();
      pair(n, "header", text(note.header));
      pair(n, "text", text(note.text));
      seq.items.push(n);
    }
    pair(m, "notes", seq);
  }
  if (c.hasFluff) {
    const f = mapping();
    for (let i = 0; i < character.NFluff; i++) {
      textPair(f, entities.FluffKeys[i]!, c.fluff[i]);
    }
    pair(m, "fluff", f);
  }
  return m;
}

// documentText is root as YAML text, as ova_cg_go's encoder writes it,
// "[a, b]" for a flow sequence. Its best_width is -1, so it never
// breaks a line; the library breaks a flow collection longer than
// lineWidth (the collection alone, not its indent: stringifyCollection
// in yaml 2.9.1), which no overrides: list is at 80, but 0 makes sure.
function documentText(root: YAMLSeq): string {
  const doc = new Document(null, {
    customTags: (tags) =>
      tags.map((t) =>
        typeof t === "object" && t.tag === strTag.tag
          ? (strTag as typeof t)
          : t,
      ),
  });
  doc.contents = root;
  return doc.toString({
    indent: saveIndent,
    lineWidth: 0,
    flowCollectionPadding: false,
  });
}

// allToText is the characters cs as YAML text, in order: what a save
// downloads.
export function allToText(cs: readonly character.Character[]): string {
  const root = sequence();
  for (const c of cs) root.items.push(entity(c));
  return documentText(root);
}

// toText is c as YAML text.
export function toText(c: character.Character): string {
  return allToText(character.one(c));
}

// toEntity is c as it would be saved, read back as a file's entity is;
// a programmer's error if it can't be.
export function toEntity(c: character.Character): entities.Entity {
  const r = entities.readEntities(toText(c), c.name);
  if (!r.ok || r.entities.length !== 1) {
    throw new Error(
      "a saved character doesn't read back: " + (r.ok ? "" : r.message),
    );
  }
  return r.entities[0]!;
}

// copy is a copy of c, sharing nothing with it: toEntity's, made a
// character as a file's is. A saved character reads back with no
// notices, so the copy's numbers are c's.
export function copy(c: character.Character): character.Character {
  return character.fromEntity(toEntity(c)).character;
}

// The scalar writer, for the tests (test/scalars).
export const testing = { Text, documentText };
