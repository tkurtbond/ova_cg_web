// The checks of ova_cg_go's internal/markdown/markdown_test.go, with its
// labels (ova_cg_po's TestFiles' Markdown checks): each fixture's sheet,
// one character's after another, written as obj/files/NAME.md, and its
// inline paragraphs as NAME.inline.md, each equal byte for byte to
// ova_cg_go's, test/golden/; test/files.sh then compares them with
// ova_fmt_po -M's and -i's of the copy save.test.ts writes beside them.
// ova_cg_go's TestSave has nothing to check here: the page downloads.
// Then the fill's checks, which the Go leaves to the fixtures.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as character from "../../src/core/character.ts";
import * as markdown from "../../src/core/markdown.ts";
import * as inline from "../../src/core/inline.ts";

const dataDir = new URL("../../testdata/", import.meta.url);
const goldenDir = new URL("../golden/", import.meta.url);
const savedDir = new URL("../../obj/files/", import.meta.url);
mkdirSync(savedDir, { recursive: true });

// The fixtures save.test.ts's TestFixtures and TestDefenses save.
const fixtures = [
  "Ai",
  "Auren",
  "Braun",
  "Cora",
  "Daisuke",
  "Fukiko",
  "Karis",
  "Miho",
  "Natsuki",
  "Raine",
  "Shou",
  "Yuu",
  "Sheet",
  "Defenses",
  "Wisp",
  "Escaping",
  "Unsorted",
  "Vehicle",
  "Acacia",
  "Zurkrieg",
  "Ancel",
  "Dr-Tomori",
  "Jiro",
  "Nazo",
  "Saspar",
  "Shadowman",
  "Beat-Cop",
  "Cat-Burglar",
  "Dragon",
  "Ebullient-Club-President",
  "Ghosts",
  "Goblin",
  "GPL-Agents",
  "Indebted-Yakuza",
  "Magical-Fairies",
  "Ninja",
  "Oni",
  "Sentry-Bots",
  "Shady-Teacher",
  "Shinto-Priest",
  "Snobbish-Upperclassman",
  "Spider-Tank",
  "Thugs",
  "Venomous-Killer",
  "Weathered-Salaryman",
  "Weird-Exchange-Student",
  "Wild-Beast",
  "Zombies",
  "Fragment",
  "Group",
  "Options",
  "two-documents",
  "defense-best",
  "defense-best-differs",
  "defense-two",
];

// written writes text as savedDir's file, after removing the one there,
// so files.sh never compares a file from before, and checks it against
// the golden file of that name.
function written(file: string, text: string, what: string): void {
  const u = new URL(file, savedDir);
  rmSync(u, { force: true });
  writeFileSync(u, text);
  const golden = readFileSync(new URL(file, goldenDir), "utf8");
  assert.equal(text, golden, `${what}, as ova_cg_go writes it`);
}

test("TestFixtures", async (t) => {
  for (const name of fixtures) {
    await t.test(name, () => {
      const text = readFileSync(new URL(name + ".yaml", dataDir), "utf8");
      const r = character.loadAll(text, name + ".yaml");
      assert.ok(r.ok, `loaded: ${r.ok ? "" : r.message}`);
      let sheet = "";
      let paragraphs = "";
      for (const c of r.value) {
        const s = markdown.sheet(c);
        assert.notEqual(s, "", `${c.name}: no sheet`);
        sheet += s;
        paragraphs += inline.inline(c);
      }
      written(name + ".md", sheet, "its Markdown sheet");
      written(name + ".inline.md", paragraphs, "its inline paragraphs");
    });
  }
});

function filled(p: string): string {
  const b: string[] = [];
  inline.testing.paragraph(b, p);
  return b.join("");
}

// TestFillCountsCharacters: the 70 columns count code points, so a line
// of non-ASCII words fills as one of ASCII words does. Counted in
// bytes, as Go's len would, "é" and "−" would break the line early;
// counted in UTF-16 units (JavaScript's length), "😀", outside the
// Basic Multilingual Plane, would. No fixture holds such text where a
// line breaks: a fill by length passes all of them.
test("TestFillCountsCharacters", () => {
  for (const ch of ["a", "é", "−", "😀"]) {
    const word = ch.repeat(9); // ten words of 9 and blanks: 99 columns
    const p = Array(10).fill(word).join(" ");
    const lines = filled(p).split("\n");
    assert.equal(
      lines[0],
      Array(7).fill(word).join(" "),
      `${ch}: seven words, 69 columns, on the first line`,
    );
    assert.equal(lines[1], Array(3).fill(word).join(" "), `${ch}: then three`);
  }
  // Exactly 70 fits.
  const seventy = "é".repeat(35) + " " + "é".repeat(34);
  assert.equal(filled(seventy), seventy + "\n\n", "70 columns: one line");
  assert.equal(
    filled(seventy + "é"),
    "é".repeat(35) + "\n" + "é".repeat(35) + "\n\n",
    "71 columns: two lines",
  );
});

// TestFillKeepsBlocksOff: a word that would open a Markdown block at a
// line's start goes with the word before it.
test("TestFillKeepsBlocksOff", () => {
  const { opensBlock } = inline.testing;
  for (const w of [
    "#",
    "#1",
    ">",
    "+",
    "-",
    "*",
    "---",
    "==",
    "_",
    "1.",
    "12)",
  ]) {
    assert.ok(opensBlock(w), `${w} opens a block`);
  }
  for (const w of ["a", "−1", "1", "1.5", "+2", "-x", "(1)", "1a."]) {
    assert.ok(!opensBlock(w), `${w} doesn't`);
  }
  const p = "x".repeat(68) + " - y";
  assert.equal(
    filled(p),
    "x".repeat(68) + " -\ny\n\n",
    "a dash that fits goes on the line before",
  );
  const q = "x".repeat(66) + " ab - y";
  assert.equal(
    filled(q),
    "x".repeat(66) + "\nab - y\n\n",
    "a dash that would start a line takes the word before it along",
  );
});
