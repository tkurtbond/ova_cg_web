// A character's sheet in Markdown, as ova_fmt_po -M writes it: the
// port of ova_cg_go's internal/markdown (markdown.go), itself ova_cg_po's
// OvaMarkdown and the Markdown path of ova_fmt_po's OvaCommon.
//
// The character is written as it would be saved and read back as
// ova_fmt_po reads a file's entity (save.toEntity), then formatted as
// OvaCommon.ProcessEntity formats it with its format Markdown and its
// defaults: the minus sign U+2212, and no options: block (no -O).
// test/files.sh checks the sheet is ova_fmt_po -M's of the saved file,
// byte for byte. OvaCommon's comments explain each choice of layout;
// these only summarize. There is no Save, as there is in the Go: the
// page downloads the text.
//
// The pieces inline.ts shares are exported under `parts`.

import * as entities from "./entities.ts";
import type * as character from "./character.ts";
import * as save from "./save.ts";

// sheet is c's sheet. save.toEntity throws if c can't be read back (a
// programmer's error), where Go's Sheet returns "".
export function sheet(c: character.Character): string {
  return entity(save.toEntity(c));
}

// entity is e's sheet: OvaCommon.ProcessEntity's.
export function entity(e: entities.Entity): string {
  const b: string[] = [];
  if (e.isFragment) {
    fragmentHeader(b, e);
    fragmentAttributes(b, e);
    characterHooks(b, e);
    combatAndAttacks(b, e.combat, "");
    linkedSections(b, e);
  } else {
    headerAndProse(b, e);
    if (e.abilities.length > 0) {
      b.push(
        bullet +
          bold("Abilities:") +
          " " +
          joinAbilities(e.abilities) +
          ".\n\n",
      );
    }
    if (e.weaknesses.length > 0) {
      b.push(
        bullet +
          bold("Weaknesses:") +
          " " +
          joinWeaknesses(e.weaknesses) +
          ".\n\n",
      );
    }
    combatAndAttacks(b, e.combat, npcTypeText(e));
    linkedSections(b, e);
  }
  tail(b, e);
  return b.join("");
}

// ---- Primitives ----

const bullet = "- ";

// line writes s and a line feed.
function line(b: string[], s: string): void {
  b.push(s, "\n");
}

function bold(s: string): string {
  return "**" + s + "**";
}

function italic(s: string): string {
  return "*" + s + "*";
}

// sectionHeader is a section's label: bold, in Markdown.
function sectionHeader(s: string): string {
  return bold(s);
}

// ---- Numbers and text ----

function trimImg(n: number): string {
  return String(n);
}

// numberImg is a number that may be negative, with U+2212 MINUS SIGN.
function numberImg(n: number): string {
  return n < 0 ? "−" + trimImg(-n) : trimImg(n);
}

// signedImg is a Level: always signed.
function signedImg(n: number): string {
  return n >= 0 ? "+" + trimImg(n) : numberImg(n);
}

function endWithPeriod(s: string): string {
  return s.endsWith(".") ? s : s + ".";
}

// nameDetail is "Name (detail)", or "Name" without a detail.
function nameDetail(name: string, detail: string | undefined): string {
  return detail !== undefined ? name + " (" + detail + ")" : name;
}

// marked is s, then "\*" if k is in overrides: escaped, so it can't open
// emphasis.
function marked(
  s: string,
  k: entities.Override,
  overrides: entities.Overrides,
): string {
  return entities.has(overrides, k) ? s + "\\*" : s;
}

// defenseText is c's defense with a mark after each overridden value: a
// "2/4/6" Defense's are defense, defense-2 and defense-3.
function defenseText(c: entities.Combat): string {
  let r = "";
  let k: entities.Override = entities.OvDefense;
  let rest = c.defense;
  for (;;) {
    const slash = rest.indexOf("/");
    if (slash < 0 || k === entities.OvDefense3) break;
    r += marked(rest.slice(0, slash), k, c.overrides) + "/";
    rest = rest.slice(slash + 1);
    k = (k + 1) as entities.Override;
  }
  return r + marked(rest, k, c.overrides);
}

function join<T>(l: readonly T[], f: (x: T) => string): string {
  return l.map(f).join(", ");
}

// ---- Perks and Flaws ----

// perkFlaw is "Name: detail x2 (−5)", each part only if there.
function perkFlaw(pf: entities.PerkFlaw): string {
  let r = pf.name;
  if (pf.detail !== undefined) r += ": " + pf.detail;
  if (pf.countsAs !== undefined) r += " x" + trimImg(pf.countsAs);
  if (pf.cost !== undefined) r += " (" + numberImg(pf.cost) + ")";
  return r;
}

// modifiersBracket is " [Perks: ...; Flaws: ...; 5 Endurance]", with only
// the parts there are; "" if none is.
function modifiersBracket(s: entities.SubItem): string {
  const parts: string[] = [];
  if (s.perks.length > 0) parts.push("Perks: " + join(s.perks, perkFlaw));
  if (s.flaws.length > 0) parts.push("Flaws: " + join(s.flaws, perkFlaw));
  if (s.endurance !== undefined) {
    parts.push(
      marked(trimImg(s.endurance), entities.OvEndurance, s.overrides) +
        " Endurance",
    );
  }
  return parts.length === 0 ? "" : " [" + parts.join("; ") + "]";
}

// attackClause is "(Affinity: ...; Perks: ...; Flaws: ...)", with only
// the clauses there are; "" if none is.
function attackClause(a: entities.Attack): string {
  const parts: string[] = [];
  if (a.affinity !== undefined) parts.push("Affinity: " + a.affinity);
  if (a.perks.length > 0) parts.push("Perks: " + join(a.perks, perkFlaw));
  if (a.flaws.length > 0) parts.push("Flaws: " + join(a.flaws, perkFlaw));
  return parts.length === 0 ? "" : "(" + parts.join("; ") + ")";
}

// ---- Item lines ----

// subItemLine is "Name (detail) +L [Perks: ...; Flaws: ...] (note)": an
// Ability or a SubItem.
function subItemLine(s: entities.SubItem): string {
  let r =
    nameDetail(s.name, s.detail) +
    " " +
    signedImg(s.level) +
    modifiersBracket(s);
  if (s.note !== undefined) r += " (" + s.note + ")";
  return r;
}

// weaknessLine is "Name (detail) +L".
function weaknessLine(w: entities.Weakness): string {
  return nameDetail(w.name, w.detail) + " " + signedImg(w.level);
}

// fragmentSubItemLine is an NPC Fragment's order, "Name +L (detail)
// [...] (note)".
function fragmentSubItemLine(s: entities.SubItem): string {
  let r = s.name + " " + signedImg(s.level);
  if (s.detail !== undefined) r += " (" + s.detail + ")";
  r += modifiersBracket(s);
  if (s.note !== undefined) r += " (" + s.note + ")";
  return r;
}

// fragmentWeaknessLine is "Name +L (detail)".
function fragmentWeaknessLine(w: entities.Weakness): string {
  let r = w.name + " " + signedImg(w.level);
  if (w.detail !== undefined) r += " (" + w.detail + ")";
  return r;
}

// spellLine is "Name (Ability +L; E Endurance)".
function spellLine(s: entities.Spell): string {
  return (
    s.name +
    " (" +
    s.ability +
    " " +
    signedImg(s.level) +
    "; " +
    marked(s.endurance, entities.OvEndurance, s.overrides) +
    " Endurance)"
  );
}

function joinSubItems(l: readonly entities.SubItem[]): string {
  return join(l, subItemLine);
}

// An Ability is a SubItem here (Go embeds one), so these take it whole.
function joinAbilities(l: readonly entities.Ability[]): string {
  return join(l, subItemLine);
}

function joinFragmentAbilities(l: readonly entities.Ability[]): string {
  return join(l, fragmentSubItemLine);
}

function joinWeaknesses(l: readonly entities.Weakness[]): string {
  return join(l, weaknessLine);
}

// semi is a, then "; " if both a and b are there, then b.
function semi(a: string, b: string, haveA: boolean, haveB: boolean): string {
  return haveA && haveB ? a + "; " + b : a + b;
}

// ---- Combat ----

// attackLine is "**Name:** Roll **N dice** | **DX d** | **Endurance
// Cost: c** (clause). *Description*", with no bullet.
function attackLine(a: entities.Attack): string {
  let r =
    bold(a.name + ":") +
    " Roll " +
    bold(marked(numberImg(a.roll), entities.OvRoll, a.overrides) + " dice") +
    " | " +
    bold("DX " + marked(a.dx, entities.OvDx, a.overrides)) +
    " | " +
    bold(
      "Endurance Cost: " +
        marked(trimImg(a.endurance), entities.OvEndurance, a.overrides),
    );
  const clause = attackClause(a);
  if (clause !== "") r += " " + clause;
  r += ".";
  if (a.description !== undefined) r += " " + italic(a.description);
  return r;
}

// combatSummaryLine is "**Health:** H | **Endurance:** E | **Defense:** D
// | **Threat Value (TV):** T", an em dash for a missing TV; led by "**NPC
// Type:** T | " if npcType isn't "".
function combatSummaryLine(c: entities.Combat, npcType: string): string {
  let r = "";
  if (npcType !== "") r = bold("NPC Type:") + " " + npcType + " | ";
  r +=
    bold("Health:") +
    " " +
    marked(trimImg(c.health), entities.OvHealth, c.overrides) +
    " | " +
    bold("Endurance:") +
    " " +
    marked(trimImg(c.endurance), entities.OvEndurance, c.overrides) +
    " | " +
    bold("Defense:") +
    " " +
    defenseText(c) +
    " | " +
    bold("Threat Value (TV):") +
    " ";
  if (c.threatValue !== undefined) {
    r += marked(trimImg(c.threatValue), entities.OvThreatValue, c.overrides);
  } else {
    r += "—";
  }
  return r;
}

// combatAndAttacks is the combat summary, then the attacks, each a
// sub-bullet, and the combat notes, a paragraph.
function combatAndAttacks(
  b: string[],
  c: entities.Combat,
  npcType: string,
): void {
  if (!c.hasCombat) return;
  line(b, bullet + combatSummaryLine(c, npcType));
  b.push("\n");
  if (c.attacks.length > 0) {
    line(b, bullet + bold("Attacks:"));
    b.push("\n");
    for (const a of c.attacks) line(b, "  - " + attackLine(a));
    b.push("\n");
  }
  if (c.notes !== undefined) {
    line(b, bold("Combat Notes:") + " " + c.notes);
    b.push("\n");
  }
}

// ---- Linked content ----

// subEntityFragmentStyle is a Companion or Vehicle with fragment: true.
function subEntityFragmentStyle(b: string[], se: entities.SubEntity): void {
  if (se.abilities.length === 0 && se.weaknesses.length === 0) {
    line(b, bold(se.name) + ".");
  } else {
    line(
      b,
      bold(se.name) +
        " -- " +
        bold("Attributes:") +
        " " +
        semi(
          join(se.abilities, fragmentSubItemLine),
          join(se.weaknesses, fragmentSubItemLine),
          se.abilities.length > 0,
          se.weaknesses.length > 0,
        ) +
        ".",
    );
  }
  b.push("\n");
  combatAndAttacks(b, se.combat, "");
}

function hasLinked(a: entities.Ability): boolean {
  return (
    a.subAbilities.length > 0 ||
    a.subWeaknesses.length > 0 ||
    a.spells.length > 0 ||
    a.subEntity !== undefined
  );
}

// linkedSection is a section for an Ability's linked content.
function linkedSection(b: string[], a: entities.Ability): void {
  if (!hasLinked(a)) return;
  const se = a.subEntity;
  if (se !== undefined && se.isFragment) {
    subEntityFragmentStyle(b, se);
    return;
  }
  if (se !== undefined) {
    line(b, sectionHeader(se.label + ": " + se.name));
  } else {
    line(b, sectionHeader(nameDetail(a.name, a.detail)));
  }
  b.push("\n");
  if (a.subAbilities.length > 0 || a.subWeaknesses.length > 0) {
    line(
      b,
      endWithPeriod(
        "Grants: " +
          semi(
            joinSubItems(a.subAbilities),
            joinSubItems(a.subWeaknesses),
            a.subAbilities.length > 0,
            a.subWeaknesses.length > 0,
          ),
      ),
    );
    b.push("\n");
  }
  if (a.spells.length > 0) {
    line(b, endWithPeriod("Spells: " + join(a.spells, spellLine)));
    b.push("\n");
  }
  if (se !== undefined) {
    if (se.abilities.length > 0) {
      line(b, endWithPeriod("Abilities: " + joinSubItems(se.abilities)));
      b.push("\n");
    }
    if (se.weaknesses.length > 0) {
      line(b, endWithPeriod("Weaknesses: " + joinSubItems(se.weaknesses)));
      b.push("\n");
    }
    combatAndAttacks(b, se.combat, "");
  }
}

function linkedSections(b: string[], e: entities.Entity): void {
  for (const a of e.abilities) linkedSection(b, a);
}

// ---- Header, prose and tail ----

// fragmentHeader: an NPC Fragment's name is in its background's prose;
// only without one is the bare name written, bold.
function fragmentHeader(b: string[], e: entities.Entity): void {
  line(b, e.background !== undefined ? e.background : bold(e.name));
  b.push("\n");
}

function npcTypeText(e: entities.Entity): string {
  return e.npcType !== undefined ? entities.npcTypeName(e.npcType) : "";
}

function fragmentAttributes(b: string[], e: entities.Entity): void {
  if (e.abilities.length === 0 && e.weaknesses.length === 0) return;
  const label =
    e.npcType !== undefined
      ? bold("Attributes (" + npcTypeText(e) + "):")
      : bold("Attributes:");
  line(
    b,
    label +
      " " +
      semi(
        joinFragmentAbilities(e.abilities),
        join(e.weaknesses, fragmentWeaknessLine),
        e.abilities.length > 0,
        e.weaknesses.length > 0,
      ) +
      ".",
  );
  b.push("\n");
}

function characterHooks(b: string[], e: entities.Entity): void {
  section(b, e.characterHooks, "Character Hooks");
}

// title is "Name (concept)", or "Name", then ", played by Player" with a
// player:.
function title(e: entities.Entity): string {
  let r = nameDetail(
    e.name,
    e.hasFluff ? e.fluff[entities.Concept] : undefined,
  );
  if (e.player !== undefined) r += ", played by " + e.player;
  return r;
}

// section writes a prose section, if there is its text: its header, then
// the text.
function section(b: string[], text: string | undefined, header: string): void {
  if (text !== undefined) {
    line(b, sectionHeader(header));
    b.push("\n");
    line(b, text);
    b.push("\n");
  }
}

// headerAndProse is the title, "# Title", then the tagline, summary,
// background, appearance, personality and character hooks.
function headerAndProse(b: string[], e: entities.Entity): void {
  line(b, "# " + title(e));
  b.push("\n");
  if (e.tagline !== undefined) {
    line(b, italic('"' + e.tagline + '"'));
    b.push("\n");
  }
  if (e.summary !== undefined) {
    line(b, italic(e.summary));
    b.push("\n");
  }
  section(b, e.background, "Background");
  section(b, e.appearance, "Appearance");
  section(b, e.personality, "Personality");
  characterHooks(b, e);
}

const fluffLabels: readonly string[] = [
  "Concept",
  "Birthday",
  "Age",
  "Gender",
  "Height",
  "Weight",
  "Hair",
  "Eyes",
  "Association",
  "Hobbies",
  "Favorite Food",
  "Allies",
  "Enemies",
  "Love Interests",
];

// fluffLine is "**Concept:** ..., **Age:** ...", every fluff field there
// is, without the period.
function fluffLine(e: entities.Entity): string {
  const parts: string[] = [];
  for (let i = 0; i < entities.NFluff; i++) {
    const f = e.fluff[i];
    if (f !== undefined) parts.push(bold(fluffLabels[i] + ":") + " " + f);
  }
  return parts.join(", ");
}

// tail is the notes, the other notes and the fluff; the creation rules
// only with -O, which the sheet doesn't have.
function tail(b: string[], e: entities.Entity): void {
  if (e.notes.length > 0) {
    line(b, sectionHeader("Notes"));
    b.push("\n");
    for (const n of e.notes) {
      line(b, bold(n.header) + " -- " + n.text);
      b.push("\n");
    }
  }
  section(b, e.otherNotes, "Other Notes");
  if (e.hasFluff) {
    line(b, sectionHeader("Fluff"));
    b.push("\n");
    line(b, endWithPeriod(fluffLine(e)));
    b.push("\n");
  }
}

// The pieces inline.ts shares with the sheet, as the Go package's two
// files share them.
export const parts = {
  bold,
  italic,
  trimImg,
  numberImg,
  nameDetail,
  marked,
  defenseText,
  join,
  perkFlaw,
  fragmentSubItemLine,
  fragmentWeaknessLine,
  spellLine,
  joinFragmentAbilities,
  semi,
  hasLinked,
  npcTypeText,
};
