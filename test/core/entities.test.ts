// Checks of src/core/entities.ts. ova_cg_go has no entities_test.go:
// it checks its loader through character's and save's tests, which
// come in Phases 3.2 and 3.4. These check what Phase 3.1 needs on its
// own: every fixture loads; the errors are ova_fmt_po's, its output
// for each case written out below; and the scalars' grammar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as entities from "../../src/core/entities.ts";

const testdata = new URL("../../testdata/", import.meta.url);

function readFixture(name: string): entities.Read {
  return entities.readEntities(
    readFileSync(new URL(name, testdata), "utf8"),
    "testdata/" + name,
  );
}

function read(text: string): entities.Read {
  return entities.readEntities(text, "t.yaml");
}

function mustRead(text: string): entities.Entity[] {
  const r = read(text);
  if (!r.ok) assert.fail(r.message);
  return r.entities;
}

// The errors as ova_fmt_po prints them: FILE[:LINE:COL]: error: PATH:
// MESSAGE, or for the fatal ones, the message alone.
function printed(r: entities.Read): string[] {
  if (r.ok) return ["ok " + r.entities.length];
  if (r.errors.length === 0) return [r.message];
  return r.errors.map(
    (e) =>
      "t.yaml" +
      (e.line !== undefined ? `:${e.line}:${e.column}` : "") +
      ": error: " +
      entities.loadErrorText(e),
  );
}

test("fixtures", () => {
  const names = readdirSync(testdata).filter((n) => n.endsWith(".yaml"));
  assert.ok(names.length > 50, "too few fixtures: " + names.length);
  for (const name of names) {
    if (name === "Broken.yaml") continue;
    const r = readFixture(name);
    assert.ok(r.ok, name + ": " + (r.ok ? "" : r.message));
    assert.ok(r.entities.length > 0, name + ": no entities");
  }
});

// ova_fmt_po's own words for Broken.yaml (ova_fmt_po
// testdata/Broken.yaml), lines and columns included.
test("Broken", () => {
  const r = readFixture("Broken.yaml");
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, [
    {
      path: "/1/abilities/1/name",
      message: 'missing required key "name"',
    },
    {
      path: "/1/abilities/2/level",
      message: 'missing required key "level"',
      line: 24,
      column: 13,
    },
    {
      path: "/1/weaknesses/0/level",
      message: 'missing required key "level"',
      line: 27,
      column: 13,
    },
    {
      path: "/1/combat/attacks/0/dx",
      message: 'missing required key "dx"',
      line: 34,
      column: 15,
    },
    {
      path: "/1/combat/attacks/0/endurance",
      message: 'missing required key "endurance"',
      line: 34,
      column: 15,
    },
  ]);
  assert.equal(
    r.message,
    [
      '/1/abilities/1/name: missing required key "name"',
      '/1/abilities/2/level: missing required key "level"',
      '/1/weaknesses/0/level: missing required key "level"',
      '/1/combat/attacks/0/dx: missing required key "dx"',
      '/1/combat/attacks/0/endurance: missing required key "endurance"',
    ].join("\n"),
  );
});

test("two documents", () => {
  const r = readFixture("two-documents.yaml");
  assert.ok(r.ok);
  assert.deepEqual(
    r.entities.map((e) => [e.name, e.isFragment]),
    [
      ["First Of Two", true],
      ["Second Of Two", true],
    ],
  );
});

// Each case's expected lines are ova_fmt_po's output for it, less its
// "ova_fmt: ..." lines, run on 2026-11-07.
test("errors as ova_fmt_po's", () => {
  const cases: [string, string[]][] = [
    ["- a\n", ["/0: not a mapping"]],
    [
      "- name: [A]\n  weaknesses:\n    - name: W\n      level: x\n",
      [
        't.yaml: error: /0/name: key "name" is not a scalar value',
        't.yaml:3:13: error: /0/weaknesses/0/level: not a valid integer: "x"',
      ],
    ],
    ["", ["ok 0"]],
    [
      "- name: A\n  options:\n    base-zero: 1_\n",
      ['not a valid integer: "1_"'],
    ],
    [
      "- name: A\n  count: 0\n  npc-type: boss\n",
      ['t.yaml:1:9: error: /0/count: "0" is not 1 or more'],
    ],
    [
      "- name: A\n  count: 0\n  npc-type: Bossy\n",
      [
        't.yaml:1:9: error: /0/npc-type: "Bossy" is not one of Heroic, Secondary, Extra, Boss',
        't.yaml:1:9: error: /0/count: "0" is not 1 or more',
      ],
    ],
    [
      '- name: A\n  abilities:\n    - name: X\n      level: 0x1_F\n    - name: Y\n      level: "9999999999"\n    - name: Z\n      level: "a\\tb"\n',
      [
        't.yaml:5:13: error: /0/abilities/1/level: integer out of range: "9999999999"',
        't.yaml:7:13: error: /0/abilities/2/level: not a valid integer: "a\tb"',
      ],
    ],
    [
      '- name: A\n  weaknesses:\n    - name: W\n      level: \'a"b\\\\c\\u00e9\'\n    - name: V\n      level: "é"\n',
      [
        't.yaml:3:13: error: /0/weaknesses/0/level: not a valid integer: "a"b\\\\c\\u00e9"',
        't.yaml:5:13: error: /0/weaknesses/1/level: not a valid integer: "é"',
      ],
    ],
    ["- name: A\n  fragment: yes\n", ['not a valid boolean: "yes"']],
    ["- name: A\n  abilities: x\n", ["/0/abilities: not a sequence"]],
    [
      "- name: A\n  combat:\n    defense: 1/2/3/4\n    health: 1\n    endurance: 1\n    overrides: [barrier, roll, 3]\n",
      [
        't.yaml: error: /0/combat/defense: "1/2/3/4" has more than three values',
        't.yaml: error: /0/combat/overrides: "roll" is not one of endurance, defense, defense-2, defense-3, health, threat-value',
        't.yaml: error: /0/combat/overrides: "3" is not one of endurance, defense, defense-2, defense-3, health, threat-value',
      ],
    ],
    [
      "- name: A\n  abilities:\n    - name: X\n      level: 1\n      perks: [[a]]\n",
      ["unrecognized Perk/Flaw shape"],
    ],
    ["name: A\n", ["expected a top-level YAML sequence of entities in t.yaml"]],
  ];
  for (const [text, want] of cases) {
    assert.deepEqual(printed(read(text)), want, JSON.stringify(text));
  }
});

// A YAML error is the yaml library's, not libfyaml's, in wording; its
// file, line and column are ova_fmt_po's (PLAN.md, entities).
test("YAML errors", () => {
  const cases: [string, string][] = [
    // ova_fmt_po: "c12.yaml:3:1: error: flow sequence without a
    // closing bracket"
    ["- name: A\n  abilities: [ {name: X, level: 1}\n", "t.yaml:3:1: error: "],
    // ova_fmt_po: "c8.yaml:2:3: error: duplicate key"
    ["- name: A\n  name: B\n", "t.yaml:2:3: error: "],
    // In a second document, after a good first one.
    ["- name: A\n---\n- name: B\n  name: C\n", "t.yaml:4:3: error: "],
  ];
  for (const [text, prefix] of cases) {
    const r = read(text);
    assert.ok(!r.ok && r.message.startsWith(prefix), JSON.stringify(text));
    assert.ok(!r.ok && r.errors.length === 0);
  }
});

test("absent and empty", () => {
  const [e] = mustRead(
    [
      "- name: A",
      "  player:",
      '  portrait: ""',
      "  tagline: '  '",
      "  weaknesses:",
      "    - name: W",
      "      level: -1",
      "      detail:",
      "    - name: V",
      "      level: -1",
      '      detail: ""',
      "",
    ].join("\n"),
  );
  assert.ok(e !== undefined);
  assert.equal(e.player, undefined);
  assert.ok(!("player" in e), "an absent field is missing, not undefined");
  assert.equal(e.portrait, "");
  assert.equal(e.tagline, "");
  assert.deepEqual(
    e.weaknesses.map((w) => [w.name, w.detail]),
    [
      ["V", ""],
      ["W", undefined],
    ],
  );
  assert.equal(e.count, 1);
  assert.equal(e.npcType, undefined);
  assert.equal(e.options, undefined);
  assert.equal(e.combat.hasCombat, false);
  assert.equal(e.hasFluff, false);
});

test("fields", () => {
  const [e] = mustRead(
    [
      "- name: A",
      "  npc-type: ' secondary '",
      "  count: 3",
      "  background: |",
      "    Line one.",
      "",
      "    Line two.",
      "  fluff:",
      "    age: ' 15 '",
      "  options:",
      "    power-ceiling: 4",
      "    scaled-cost: true",
      "  abilities:",
      "    - name: Zed",
      "      level: 1",
      "      threat-value-half: false",
      "      perks: [Area Effect, {name: Accurate, counts-as: 2}]",
      "      overrides: [endurance]",
      "      endurance: 0b11",
      "    - &q",
      "      name: quick",
      "      level: +2",
      "    - *q",
      "  combat:",
      "    defense: 4/5",
      "    health: 40",
      "    endurance: 60",
      "    overrides: [barrier, health]",
      "    notes: '  n  '",
      "",
    ].join("\n"),
  );
  assert.ok(e !== undefined);
  assert.equal(e.npcType, entities.Secondary);
  assert.equal(e.count, 3);
  assert.equal(e.background, "Line one.\n\nLine two.");
  assert.equal(e.hasFluff, true);
  assert.equal(e.fluff[entities.Age], " 15 ");
  assert.equal(e.fluff[entities.Concept], undefined);
  assert.deepEqual(e.options, {
    powerCeiling: 4,
    scaledCost: true,
    halfCostKnowledge: false,
    combinedEffectiveness: false,
  });
  // Sorted ignoring case, the alias's copy beside its anchor's.
  assert.deepEqual(
    e.abilities.map((a) => [a.name, a.level]),
    [
      ["quick", 2],
      ["quick", 2],
      ["Zed", 1],
    ],
  );
  const zed = e.abilities[2]!;
  assert.equal(zed.threatValueHalf, false);
  assert.equal(e.abilities[0]!.threatValueHalf, undefined);
  assert.equal(zed.endurance, 3);
  assert.ok(entities.has(zed.overrides, entities.OvEndurance));
  assert.deepEqual(zed.perks, [
    { name: "Accurate", countsAs: 2 },
    { name: "Area Effect" },
  ]);
  assert.equal(e.combat.defense, "4/5");
  assert.equal(e.combat.notes, "n");
  const o = e.combat.overrides;
  assert.ok(entities.has(o, entities.OvDefense2));
  assert.ok(entities.has(o, entities.OvHealth));
  assert.ok(!entities.has(o, entities.OvDefense));
});

test("parseInt", () => {
  const good: [string, number][] = [
    ["0", 0],
    ["-0", 0],
    ["+7", 7],
    ["007", 7],
    ["1_000", 1000],
    ["0x1F", 31],
    ["0xff", 255],
    ["0o17", 15],
    ["0b101", 5],
    ["-0x10", -16],
    ["2147483647", 2147483647],
    ["-2147483648", -2147483648],
    ["0x7fff_ffff", 2147483647],
  ];
  for (const [s, v] of good) {
    assert.deepEqual(entities.parseInt(s), { ok: true, value: v }, s);
  }
  const bad: [string, string][] = [
    ["", "not a valid integer"],
    ["+", "not a valid integer"],
    ["1_", "not a valid integer"],
    ["_1", "not a valid integer"],
    ["1__0", "not a valid integer"],
    ["0x", "not a valid integer"],
    ["0X1", "not a valid integer"],
    ["0b2", "not a valid integer"],
    ["0o8", "not a valid integer"],
    ["1.0", "not a valid integer"],
    [" 1", "not a valid integer"],
    ["1e3", "not a valid integer"],
    ["١", "not a valid integer"], // an Arabic-Indic one
    ["2147483648", "integer out of range"],
    ["-2147483649", "integer out of range"],
    ["99999999999999999999999", "integer out of range"],
  ];
  for (const [s, msg] of bad) {
    assert.deepEqual(
      entities.parseInt(s),
      { ok: false, error: msg + ': "' + s + '"' },
      s,
    );
  }
});

test("parseBool", () => {
  for (const s of ["true", "True", "TRUE"]) {
    assert.deepEqual(entities.parseBool(s), { ok: true, value: true });
  }
  for (const s of ["false", "False", "FALSE"]) {
    assert.deepEqual(entities.parseBool(s), { ok: true, value: false });
  }
  for (const s of ["yes", "tRUE", "1", "", "on"]) {
    assert.deepEqual(entities.parseBool(s), {
      ok: false,
      error: 'not a valid boolean: "' + s + '"',
    });
  }
});

test("sorting", () => {
  assert.ok(entities.before("apple", "", "Banana", ""));
  assert.ok(!entities.before("Banana", "", "apple", ""));
  assert.ok(!entities.before("a", "", "A", ""), "equal names");
  assert.ok(entities.before("Skill", "cooking", "skill", "Driving"));
  assert.ok(!entities.before("skill", "Driving", "Skill", "cooking"));
  assert.ok(entities.before("Skill", "", "skill", "a"));
  // Bytewise, by UTF-8: "é" (C3 A9) folds its lead byte to E3, after
  // "z"; "ä" (C3 A4) and "é" share it, and "ä" is first by its second.
  assert.ok(entities.before("z", "", "é", ""));
  assert.ok(entities.before("ä", "", "é", ""));
  // ASCII is lowered; any C3 lead byte is raised to E3, the rest kept;
  // an astral character (lead byte F0) sorts after them.
  assert.equal(entities.foldCI("AZ"), "az");
  assert.ok(entities.before("é", "", "😀", ""));
  assert.equal(entities.foldCI("é"), "\xe3\xa9");
  assert.equal(entities.foldCI("×"), "\xe3\x97");
});

test("trim", () => {
  assert.equal(entities.trim(" \t\r\nx y\n\n"), "x y");
  assert.equal(entities.trim(" x "), " x ");
  assert.equal(entities.trim("  "), "");
});
