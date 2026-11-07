// The checks of ova_cg_go's internal/save/save_test.go, with its
// labels (ova_cg_po's TestFiles, and TestModel's save and load). Each
// fixture is loaded, saved into obj/files/ (for test/files.sh) and
// compared with ova_cg_go's save of it, test/golden/NAME.yaml, byte for
// byte; then loaded again: no notices, since the copy's overrides: keys
// list every number kept as an override, and the same text saved. The
// notices are the numbers the first load kept as overrides, those the
// file differs from the rules on without listing them. ova_cg_go's
// checks of a save to a path that can't be written and of a missing
// file have nothing to check here: the page downloads, and is handed a
// file's text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseAllDocuments } from "yaml";
import * as rules from "../../src/core/rules.ts";
import * as calc from "../../src/core/calc.ts";
import * as entities from "../../src/core/entities.ts";
import * as character from "../../src/core/character.ts";
import * as save from "../../src/core/save.ts";

const dataDir = new URL("../../testdata/", import.meta.url);
const goldenDir = new URL("../golden/", import.meta.url);
const savedDir = new URL("../../obj/files/", import.meta.url);
mkdirSync(savedDir, { recursive: true });

function read(name: string): string {
  return readFileSync(new URL(name + ".yaml", dataDir), "utf8");
}

function loadAll(name: string): {
  cs: character.Character[];
  notices: string[];
} {
  const r = character.loadAll(read(name), name + ".yaml");
  assert.ok(r.ok, `${name}: loaded: ${r.ok ? "" : r.message}`);
  return { cs: r.value, notices: r.notices };
}

function load(name: string): character.Character {
  const r = character.load(read(name), name + ".yaml");
  assert.ok(r.ok, `${name}: loaded: ${r.ok ? "" : r.message}`);
  return r.value;
}

// reload is text loaded as a file's, which must hold one character.
function reload(
  text: string,
  name: string,
): { c: character.Character; notices: string[] } {
  const r = character.load(text, name);
  assert.ok(r.ok, `${name}: loaded again: ${r.ok ? "" : r.message}`);
  return { c: r.value, notices: r.notices };
}

// roundTrip loads name, saves it, loads the copy; want: the notices
// expected.
function roundTrip(name: string, want: number): void {
  const { cs, notices } = loadAll(name);
  assert.equal(
    notices.length,
    want,
    `notices: ${notices.length}, want ${want}:\n    ${notices.join("\n    ")}`,
  );
  const text = save.allToText(cs);
  writeFileSync(new URL(name + ".yaml", savedDir), text);
  const golden = readFileSync(new URL(name + ".yaml", goldenDir), "utf8");
  assert.equal(text, golden, "saved as ova_cg_go saves it");
  const r = character.loadAll(text, name + ".yaml");
  assert.ok(r.ok, `the copy loaded: ${r.ok ? "" : r.message}`);
  assert.deepEqual(
    r.notices,
    [],
    "the copy has no notices: it lists its overrides",
  );
  assert.ok(
    text !== "" && save.allToText(r.value) === text,
    "the copy saves the same",
  );
}

// TestFixtures: the samples' numbers are all the rules', given the keys
// the fixtures carry, but the book's two rulings, which their
// overrides: list (ova_cg_go's comment says which is which).
const fixtures: readonly [string, number][] = [
  ["Ai", 0],
  ["Auren", 0],
  ["Braun", 0],
  ["Cora", 0],
  ["Daisuke", 0],
  ["Fukiko", 0],
  ["Karis", 0],
  ["Miho", 0],
  ["Natsuki", 0],
  ["Raine", 0],
  ["Shou", 0],
  ["Yuu", 0],
  ["Sheet", 0],
  ["Defenses", 0],
  ["Wisp", 0],
  ["Escaping", 5],
  ["Unsorted", 8],
  ["Vehicle", 5],
  ["Acacia", 1],
  ["Zurkrieg", 0],
  ["Ancel", 0],
  ["Dr-Tomori", 0],
  ["Jiro", 0],
  ["Nazo", 1],
  ["Saspar", 0],
  ["Shadowman", 0],
  ["Beat-Cop", 0],
  ["Cat-Burglar", 0],
  ["Dragon", 0],
  ["Ebullient-Club-President", 0],
  ["Ghosts", 0],
  ["Goblin", 0],
  ["GPL-Agents", 0],
  ["Indebted-Yakuza", 0],
  ["Magical-Fairies", 0],
  ["Ninja", 0],
  ["Oni", 0],
  ["Sentry-Bots", 0],
  ["Shady-Teacher", 0],
  ["Shinto-Priest", 0],
  ["Snobbish-Upperclassman", 0],
  ["Spider-Tank", 0],
  ["Thugs", 0],
  ["Venomous-Killer", 0],
  ["Weathered-Salaryman", 0],
  ["Weird-Exchange-Student", 0],
  ["Wild-Beast", 0],
  ["Zombies", 0],
  ["Fragment", 0],
  ["Group", 27],
  ["Options", 0],
  ["two-documents", 0],
];

test("TestFixtures", async (t) => {
  for (const [name, want] of fixtures) {
    await t.test(name, () => roundTrip(name, want));
  }
});

test("TestErrors", () => {
  const r = character.load(read("Broken"), "Broken.yaml");
  assert.ok(
    !r.ok && r.message.includes("level"),
    `Broken.yaml: refused, saying level: ${r.ok ? "" : r.message}`,
  );
});

function names(cs: readonly character.Character[]): string {
  return cs.map((c) => c.name).join("|");
}

// TestSeveral: files of several characters (ova_cg_po's PLAN.md,
// "Several characters in a file"): every one loaded, in order, each its
// notices, and saved in that order; load still takes exactly one.
test("TestSeveral", () => {
  let { cs, notices } = loadAll("Acacia");
  assert.equal(
    names(cs),
    "Acacia|Sazza and Fraz|High Fructo Cezar",
    "Acacia.yaml: her and her two demons, in the file's order",
  );
  assert.ok(
    notices.length === 1 &&
      notices[0]!.startsWith("Acacia: Lock Heaven's Door: END"),
    `its one notice names its character: ${notices.join("; ")}`,
  );
  ({ cs } = loadAll("two-documents"));
  assert.equal(
    names(cs),
    "First Of Two|Second Of Two",
    "two-documents.yaml: a character from each document",
  );
  const text = save.allToText(cs);
  const r = character.loadAll(text, "two-documents.yaml");
  assert.ok(
    r.ok &&
      names(r.value) === "First Of Two|Second Of Two" &&
      !text.includes("---"),
    "saved as one document, the two in order",
  );
  ({ cs, notices } = loadAll("Zurkrieg"));
  assert.ok(
    names(cs) === "Zurkrieg|Men in Black" &&
      cs[0]!.hasCombat &&
      cs[1]!.isFragment &&
      !cs[1]!.hasCombat &&
      notices.length === 0,
    "Zurkrieg.yaml: him, with combat stats, and his Men in Black, a Fragment; no notices",
  );
  const one = character.load(read("Zurkrieg"), "Zurkrieg.yaml");
  assert.ok(
    !one.ok && one.message.includes("holds 2 characters, not one"),
    "load, for one character, refuses it, saying how many it holds",
  );
});

// TestCopy: a copy, for Duplicate Character, saves the same and shares
// nothing.
test("TestCopy", () => {
  const c = load("Fukiko");
  const d = save.copy(c);
  assert.ok(
    d !== c && save.toText(d) === save.toText(c),
    "a copy, the same when saved",
  );
  d.health.override(55, false, false);
  character.recompute(d);
  assert.ok(
    !c.health.overridden && d.traits.length > 0 && d.traits[0] !== c.traits[0],
    "the copy's HEALTH overridden, the first's not: they share nothing",
  );
});

// holdsLine says whether text holds the line line.
function holdsLine(text: string, line: string): boolean {
  return text.startsWith(line + "\n") || text.includes("\n" + line + "\n");
}

// savesAs loads name and saves it: its text must hold the line want.
function savesAs(name: string, want: string): void {
  const text = save.toText(load(name));
  assert.ok(holdsLine(text, want), `${name}: saved with ${want}:\n${text}`);
}

// TestCount: count: is kept for the save and the inline paragraphs,
// though the window doesn't show it; a count of 1 is the same as none;
// under 1 is a recorded error.
test("TestCount", () => {
  const { cs } = loadAll("Group");
  assert.equal(cs.length, 8, "Group: count: its eight load");
  const text = save.allToText(cs);
  assert.ok(
    cs[0]!.count === 3 && text.includes("  count: 3\n"),
    "Group: Guards keep a count of 3, and save it",
  );
  assert.ok(
    cs[4]!.count === 1 && !text.includes("  count: 1\n"),
    "Group: a count of 1 isn't saved",
  );
  const r = character.loadAll("- name: None\n  count: 0\n", "bad-count.yaml");
  assert.ok(
    !r.ok && r.message.includes("is not 1 or more"),
    `a count of 0 is an error: ${r.ok ? "" : r.message}`,
  );
});

// TestDefenses: up to three Defense values (ova_cg_po's PLAN.md, Phase
// 11): one where the rules give more is the best; two, the Defense and
// the first alternate; an overridden alternate the character doesn't
// have is saved where it is read back.
test("TestDefenses", async (t) => {
  await t.test("defense-best", () => roundTrip("defense-best", 0));
  savesAs("defense-best", "    defense: 4");
  await t.test("defense-best-differs", () =>
    roundTrip("defense-best-differs", 1),
  );
  savesAs("defense-best-differs", "    defense: 3");
  let c = load("defense-best-differs");
  const { slot, single } = character.singleDefense(c);
  assert.ok(
    c.incorporeal.overridden &&
      !c.barrier.overridden &&
      !c.defense.overridden &&
      single &&
      slot === character.IncorporealSlot,
    "defense-best-differs: read as Incorporeal Form's, the best by the rules, and saved as one",
  );
  await t.test("defense-two", () => roundTrip("defense-two", 0));
  savesAs("defense-two", "    defense: 2/3/4");

  // One value, but another overridden since: all of them saved.
  c = load("defense-best");
  c.defense.override(3, false, false);
  character.recompute(c);
  let text = save.toText(c);
  assert.ok(
    !character.singleDefense(c).single &&
      holdsLine(text, "    defense: 3/4/4") &&
      holdsLine(text, "    overrides: [defense]"),
    `defense-best, its DEFENSE overridden: saved with all three:\n${text}`,
  );

  // An overridden Incorporeal Form's Defense the character doesn't have:
  // Barrier's is saved before it, so it is read back as the third.
  c = character.newCharacter();
  c.name = "Ghostless";
  c.incorporeal.override(7, false, false);
  character.recompute(c);
  text = save.toText(c);
  assert.ok(
    holdsLine(text, "    defense: 2/0/7") &&
      holdsLine(text, "    overrides: [defense-3]"),
    `an overridden Incorporeal Form's DEFENSE without it: saved third, after Barrier's 0:\n${text}`,
  );
  const r = reload(text, "ghostless.yaml");
  assert.ok(
    r.notices.length === 0 &&
      r.c.incorporeal.overridden &&
      r.c.incorporeal.get() === 7 &&
      !r.c.barrier.overridden,
    `and read back as Incorporeal Form's, with no notice: ${r.notices.join("; ")}`,
  );
});

// TestAwkwardText: text plain YAML can't hold, saved and loaded back.
test("TestAwkwardText", () => {
  const c = character.newCharacter();
  c.name = `#1 "Ace"`;
  c.tagline = "'Til the end: - and | >";
  c.background = "  Indented first line,\nthen a second; # not a comment";
  const note = { header: "? Header", text: "@line one\n\n%line three" };
  c.notes = [note];
  c.hasFluff = true;
  c.fluff[entities.Hobbies] = "#1 fan";
  calc.compute(c);
  const text = save.toText(c);
  writeFileSync(new URL("awkward.yaml", savedDir), text);
  const { c: c2, notices } = reload(text, "awkward.yaml");
  assert.equal(c2.name, c.name, "the name");
  assert.equal(c2.tagline, c.tagline, "the tagline");
  // The file keeps the background's first blanks; entities trims it
  // on loading, as ova_fmt_po and the Ada ova_fmt do.
  const docs = parseAllDocuments(text);
  const background =
    Array.isArray(docs) && docs.length === 1
      ? (docs[0]!.toJS() as { background?: string }[])[0]?.background
      : undefined;
  assert.equal(
    background,
    c.background,
    "the file holds the background exactly, its first blanks too",
  );
  assert.equal(
    c2.background,
    entities.trim(c.background),
    "the background loads trimmed",
  );
  assert.deepEqual(c2.notes, [note], "the note");
  assert.equal(c2.fluff[entities.Hobbies], "#1 fan", "hobbies #1 fan");
  assert.deepEqual(notices, [], "no notices");
});

function item(name: string): rules.Item {
  const it = rules.find(name);
  assert.ok(it !== undefined, `no item "${name}"`);
  return it;
}

// TestModelSaved: each Endurance Use tied to the Ability or attack its
// detail names counts in that one's END, and survives a save and a load
// with no notice (TestModel's end).
test("TestModelSaved", () => {
  const c = character.newCharacter();
  c.name = "Model";
  character.insertTrait(
    c.traits,
    character.newTrait(
      item("Endurance Use"),
      rules.Weakness,
      -1,
      "",
      "telekinesis (x)",
    ),
  );
  const tk = character.newTrait(item("Telekinesis"), rules.Ability, 2, "", "x");
  character.insertTrait(c.traits, tk);
  character.insertTrait(
    c.traits,
    character.newTrait(item("Flight"), rules.Ability, 1, "", ""),
  );
  character.insertTrait(
    c.traits,
    character.newTrait(undefined, rules.Ability, 1, "Zany Gadgets", "b"),
  );
  const a = character.newAttack("Gust");
  c.attacks.push(a);
  character.insertMod(a.mods, character.newMod(item("Accurate"), false, 1, 0));
  character.recompute(c);
  assert.ok(tk.hasEnd && tk.end.get() === 5, "Telekinesis (x) has END 5");
  const text = save.toText(c);
  writeFileSync(new URL("model.yaml", savedDir), text);
  const r = reload(text, "model.yaml");
  assert.deepEqual(
    r.notices,
    [],
    "loaded again with no notices: the END it wrote is the rules'",
  );
  assert.equal(save.toText(r.c), text, "and it saves the same");
});

// kindOf is c's sheet's kind, read where assert.ok's narrowing of
// c.kind doesn't reach: setNpcType changes it.
function kindOf(c: character.Character): calc.SheetKind {
  return c.kind;
}

// TestNpcTypeSaved: the NPC type sets the sheet's kind, and it and the
// hooks are saved and loaded back (TestModel's).
test("TestNpcTypeSaved", () => {
  const c = character.newCharacter();
  c.name = "Typed";
  character.insertTrait(
    c.traits,
    character.newTrait(item("Tough"), rules.Ability, 1, "", ""),
  );
  character.recompute(c);
  assert.ok(
    c.npcType === undefined &&
      kindOf(c) === calc.Character &&
      c.health.get() === 50,
    "no NPC type: a character's sheet, HEALTH 40 + Tough 1",
  );
  character.setNpcType(c, entities.Secondary);
  character.recompute(c);
  assert.ok(
    kindOf(c) === calc.CompanionSheet &&
      c.health.get() === 30 &&
      c.endurance.get() === 20,
    "Secondary: a Companion's sheet, HEALTH 20 + Tough 1, ENDURANCE 20",
  );
  character.setNpcType(c, entities.Extra);
  character.recompute(c);
  assert.ok(
    kindOf(c) === calc.ExtraSheet && c.health.get() === 20 && c.tv.get() === 1,
    "Extra: HEALTH 10 + Tough 1, TV 1",
  );
  character.setNpcType(c, entities.Heroic);
  character.recompute(c);
  assert.ok(
    kindOf(c) === calc.Character && c.health.get() === 50,
    "Heroic: a character's sheet",
  );
  character.setNpcType(c, entities.Secondary);
  c.characterHooks = "Hooks.";
  character.recompute(c);
  const text = save.toText(c);
  assert.ok(
    text.includes("npc-type: Secondary") &&
      text.includes("character-hooks: Hooks."),
    `the type and the hooks saved:\n${text}`,
  );
  const r = reload(text, "model.yaml");
  assert.ok(
    r.notices.length === 0 &&
      r.c.npcType === entities.Secondary &&
      kindOf(r.c) === calc.CompanionSheet &&
      r.c.characterHooks === "Hooks.",
    `loaded again: the type, so the sheet's kind, and the hooks; no notices: ${r.notices.join("; ")}`,
  );
  character.setNpcType(c, undefined);
  character.recompute(c);
  assert.ok(
    c.npcType === undefined &&
      kindOf(c) === calc.Character &&
      !save.toText(c).includes("npc-type"),
    "the type taken off: a character's sheet, nothing saved",
  );
});

// TestEndZero: an Ability's END of 0 isn't written unless it is an
// override (TestModel's).
test("TestEndZero", () => {
  const c = character.newCharacter();
  c.name = "Free";
  c.hasCombat = false;
  const tr = character.newTrait(item("Attack"), rules.Ability, 3, "", "");
  character.insertMod(
    tr.mods,
    character.newMod(item("Armor Piercing"), false, 1, 0),
  );
  character.insertMod(tr.mods, character.newMod(item("Ranged"), false, 1, 0));
  character.insertMod(
    tr.mods,
    character.newMod(item("Ineffective"), true, 1, 0),
  );
  character.insertMod(tr.mods, character.newMod(item("Weapon"), true, 1, 0));
  character.insertTrait(c.traits, tr);
  character.recompute(c);
  assert.ok(
    tr.hasEnd && tr.end.get() === 0,
    "Perks and Flaws costing nothing: END 0",
  );
  assert.ok(!save.toText(c).includes("endurance"), "an END of 0 isn't written");
  tr.end.override(0, false, false);
  assert.ok(
    save.toText(c).includes("endurance: 0"),
    "unless it is an override",
  );
  tr.end.clear();
  tr.end.override(5, false, false);
  assert.ok(save.toText(c).includes("endurance: 5"), "an override of 5 is");
});
