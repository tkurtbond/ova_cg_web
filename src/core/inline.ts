// The inline format, ova_fmt_po -i's: the port of ova_cg_go's
// internal/markdown/inline.go (ova_fmt_po's OvaInline, which ova_cg_po
// copies, and the Ada ova_fmt's Format_Inline). Each entity is one
// Markdown paragraph, a stat block for an adventure's cast list:
//
//   **Name** (Secondary). Summary. Background. *Ability +2 (detail),
//   ...; Weakness −1, ...* Attack (Perks; Flaws): Roll 4, DX 3, End
//   0. Defense 3. Health 20, Endurance 20. TV 6.
//
// Abilities and Weaknesses, a Companion's or Vehicle's and those a
// Transformation grants too, are "Name Level (detail)", the NPC Fragment
// order. The prose that describes the entity runs together, as do its
// combat notes; the tagline, character hooks, notes, fluff, options, the
// player and the portrait are left out. An NPC Fragment's background
// names it already, so it leads instead of the bold name. An Ability's
// linked content follows as a paragraph of its own. Each paragraph is
// filled to 70 columns, counting code points, as the Go counts runes,
// and never breaks a line before a word that would start a Markdown
// block there. A count: over 1 makes the lead "**Name** (three
// Secondaries)." and the end "TV 6 each.": one stat block standing for
// a group. test/files.sh checks it is ova_fmt_po -i's of the saved
// file, byte for byte.

import * as entities from "./entities.ts";
import type * as character from "./character.ts";
import * as save from "./save.ts";
import { parts } from "./markdown.ts";

const {
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
} = parts;

const inlineWidth = 70;

// inline is c as inline paragraphs. save.toEntity throws if c can't be
// read back (a programmer's error), where Go's Inline returns "".
export function inline(c: character.Character): string {
  return inlineEntity(save.toEntity(c));
}

// inlineEntity is e's paragraphs: OvaInline.ProcessEntity's.
export function inlineEntity(e: entities.Entity): string {
  const b: string[] = [];
  let p = "";
  const group = e.count > 1;
  if (e.isFragment && e.background !== undefined) {
    p = addProse(p, e.background);
    if (e.npcType !== undefined && group) {
      p = add(p, npcTypeText(e) + " NPCs (" + countText(e.count) + ").");
    } else if (e.npcType !== undefined) {
      p = add(p, npcTypeText(e) + " NPC.");
    } else if (group) {
      p = add(p, "(" + countText(e.count) + ").");
    }
  } else {
    if (group) {
      let r = countText(e.count);
      if (e.npcType !== undefined) r += " " + npcTypePlural(e);
      p = bold(e.name) + " (" + r + ").";
    } else if (e.npcType !== undefined) {
      p = bold(e.name) + " (" + npcTypeText(e) + ").";
    } else {
      p = bold(e.name + ".");
    }
    if (e.summary !== undefined) p = addProse(p, e.summary);
    if (e.background !== undefined) p = addProse(p, e.background);
    if (e.appearance !== undefined) p = addProse(p, e.appearance);
    if (e.personality !== undefined) p = addProse(p, e.personality);
  }
  const t = traits(
    joinFragmentAbilities(e.abilities),
    join(e.weaknesses, fragmentWeaknessLine),
  );
  if (t !== "") p = add(p, t);
  p = addCombat(p, e.combat, group);
  paragraph(b, p);
  for (const a of e.abilities) linked(b, a);
  return b.join("");
}

// add is p, then a blank unless p is empty, then s.
function add(p: string, s: string): string {
  return p === "" ? s : p + " " + s;
}

// sentence is s ended with a period, unless it ends a sentence already:
// with ".", "!" or "?", perhaps then closing quotes or parentheses.
function sentence(s: string): string {
  const t = s.replace(/["')]+$/, "");
  return t.endsWith(".") || t.endsWith("!") || t.endsWith("?") ? s : s + ".";
}

// addProse is p, then the prose s, on one line, as a sentence.
function addProse(p: string, s: string): string {
  return add(p, sentence(s.replaceAll("\n", " ")));
}

// ---- Filling ----

// opensBlock is whether the word w, at the start of a line, would make
// it something other than a paragraph's text: a heading, a block quote,
// a list item (a lone "-", "+" or "*", or digits and a "." or ")"), a
// thematic break or a setext underline (nothing but "-", "=", "*" or
// "_").
function opensBlock(w: string): boolean {
  if (w[0] === "#" || w[0] === ">" || w === "+") return true;
  if (/^[-=*_]*$/.test(w)) return true;
  const digits = w.replace(/^[0-9]+/, "");
  return digits.length < w.length && (digits === "." || digits === ")");
}

// paragraph writes p filled to inlineWidth columns, then an empty line.
// Words are split at blanks, and a run of blanks is one. A word that
// would open a Markdown block at the start of a line stays on the line
// of the word before it, so the break comes before that one instead. A
// word, or words kept together, longer than inlineWidth has a line of
// its own.
function paragraph(b: string[], p: string): void {
  const words = p.split(" ").filter((w) => w !== "");
  let col = 0;
  for (let i = 0; i < words.length;) {
    // Take in the words that can't start a line.
    let group = words[i]!;
    for (i++; i < words.length && opensBlock(words[i]!); i++) {
      group += " " + words[i];
    }
    const w = [...group].length;
    if (col > 0) {
      if (col + 1 + w > inlineWidth) {
        b.push("\n");
        col = 0;
      } else {
        b.push(" ");
        col++;
      }
    }
    b.push(group);
    col += w;
  }
  b.push("\n\n");
}

// ---- Parts ----

// traits is "*abilities; weaknesses.*", "" if there are neither.
function traits(abilities: string, weaknesses: string): string {
  if (abilities === "" && weaknesses === "") return "";
  return italic(
    semi(abilities, weaknesses, abilities !== "", weaknesses !== "") + ".",
  );
}

// inlineAttack is "Name (Affinity: a; perks; flaws): Roll N, DX d, End
// c.", then its description, with only the parenthesized parts there
// are.
function inlineAttack(a: entities.Attack): string {
  const ps: string[] = [];
  if (a.affinity !== undefined) ps.push("Affinity: " + a.affinity);
  if (a.perks.length > 0) ps.push(join(a.perks, perkFlaw));
  if (a.flaws.length > 0) ps.push(join(a.flaws, perkFlaw));
  let r = a.name;
  if (ps.length > 0) r += " (" + ps.join("; ") + ")";
  r +=
    ": Roll " +
    marked(numberImg(a.roll), entities.OvRoll, a.overrides) +
    ", DX " +
    marked(a.dx, entities.OvDx, a.overrides) +
    ", End " +
    marked(trimImg(a.endurance), entities.OvEndurance, a.overrides) +
    ".";
  if (a.description !== undefined) r = addProse(r, a.description);
  return r;
}

// countWords are the counts prose spells out.
const countWords: readonly string[] = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

// countText is n as a word, up to twelve; past that its digits: the Ada
// Count_Text.
function countText(n: number): string {
  return n < countWords.length ? countWords[n]! : trimImg(n);
}

// npcTypePlural is e's NPC type's plural, as a count of them has it:
// "Secondaries".
function npcTypePlural(e: entities.Entity): string {
  switch (e.npcType) {
    case entities.Secondary:
      return "Secondaries";
    case entities.Boss:
      return "Bosses";
  }
  return npcTypeText(e) + "s";
}

// addCombat is p, then c's attacks, "Defense D. Health H, Endurance E.
// TV T." and its notes; p if there is no combat.
function addCombat(p: string, c: entities.Combat, group: boolean): string {
  if (!c.hasCombat) return p;
  for (const a of c.attacks) p = add(p, inlineAttack(a));
  let s =
    "Defense " +
    defenseText(c) +
    ". Health " +
    marked(trimImg(c.health), entities.OvHealth, c.overrides) +
    ", Endurance " +
    marked(trimImg(c.endurance), entities.OvEndurance, c.overrides) +
    ".";
  if (c.threatValue !== undefined) {
    s +=
      " TV " +
      marked(trimImg(c.threatValue), entities.OvThreatValue, c.overrides);
    if (group) s += " each";
    s += ".";
  }
  p = add(p, s);
  if (c.notes !== undefined) p = addProse(p, c.notes);
  return p;
}

// linked writes a paragraph for a's linked content, led by its title in
// bold: "**Companion: Name.**", or the Ability's name and detail.
function linked(b: string[], a: entities.Ability): void {
  if (!hasLinked(a)) return;
  const se = a.subEntity;
  let p =
    se !== undefined
      ? bold(se.label + ": " + se.name + ".")
      : bold(nameDetail(a.name, a.detail) + ".");
  if (a.subAbilities.length > 0 || a.subWeaknesses.length > 0) {
    p = add(
      p,
      sentence(
        "Grants: " +
          semi(
            join(a.subAbilities, fragmentSubItemLine),
            join(a.subWeaknesses, fragmentSubItemLine),
            a.subAbilities.length > 0,
            a.subWeaknesses.length > 0,
          ),
      ),
    );
  }
  if (a.spells.length > 0) {
    p = add(p, sentence("Spells: " + join(a.spells, spellLine)));
  }
  if (se !== undefined) {
    const t = traits(
      join(se.abilities, fragmentSubItemLine),
      join(se.weaknesses, fragmentSubItemLine),
    );
    if (t !== "") p = add(p, t);
    p = addCombat(p, se.combat, false);
  }
  paragraph(b, p);
}

export const testing = { paragraph, opensBlock, sentence };
