// The scalar writer save.ts ports from yaml.v3 (v3.0.4, which
// ova_cg_go saves with): each text, in a document holding it in four
// places, as yaml.v3 writes it. The places are a value in a mapping, an
// item of a sequence, the same two levels down, each a !!str node as
// save.go's text() makes, and a value that is an untagged node, as its
// plain() makes. The expected documents were written by yaml.v3 itself,
// a throwaway Go program encoding these nodes with ova_cg_go's encoder
// settings (SetIndent(2)); the cases are chosen to cover each branch
// of its style choice, resolve and writers. One difference is left out:
// a literal text ending in U+2028 or U+2029, after which yaml.v3 writes
// the next key on the same line (PLAN.md, "The YAML a save writes").
import { test } from "node:test";
import assert from "node:assert/strict";
import { Pair, Scalar, YAMLMap, YAMLSeq } from "yaml";
import * as save from "../../src/core/save.ts";

const { Text, documentText } = save.testing;

function mapping(...kv: (Scalar | YAMLSeq | YAMLMap)[]): YAMLMap {
  const m = new YAMLMap();
  for (let i = 0; i < kv.length; i += 2)
    m.items.push(new Pair(kv[i], kv[i + 1]));
  return m;
}

function sequence(...v: (Scalar | YAMLMap)[]): YAMLSeq {
  const s = new YAMLSeq();
  s.items.push(...v);
  return s;
}

// written is the document holding s in the four places.
function written(s: string): string {
  const text = (): Scalar => new Text(s);
  const plain = (k: string): Scalar => new Scalar(k);
  const inner = mapping(plain("m"), text(), plain("l2"), sequence(text()));
  return documentText(
    sequence(
      mapping(
        plain("k"),
        text(),
        plain("l"),
        sequence(text(), inner),
        plain("p"),
        plain(s),
      ),
    ),
  );
}

// [text, as yaml.v3 writes it]
const cases: readonly [string, string][] = [
  ["a", "- k: a\n  l:\n    - a\n    - m: a\n      l2:\n        - a\n  p: a\n"],
  [
    "#1 fan",
    "- k: '#1 fan'\n  l:\n    - '#1 fan'\n    - m: '#1 fan'\n      l2:\n        - '#1 fan'\n  p: '#1 fan'\n",
  ],
  [
    "a# b",
    "- k: a# b\n  l:\n    - a# b\n    - m: a# b\n      l2:\n        - a# b\n  p: a# b\n",
  ],
  [
    "15",
    '- k: "15"\n  l:\n    - "15"\n    - m: "15"\n      l2:\n        - "15"\n  p: 15\n',
  ],
  [
    "1.5",
    '- k: "1.5"\n  l:\n    - "1.5"\n    - m: "1.5"\n      l2:\n        - "1.5"\n  p: 1.5\n',
  ],
  [
    ".5",
    '- k: ".5"\n  l:\n    - ".5"\n    - m: ".5"\n      l2:\n        - ".5"\n  p: .5\n',
  ],
  [
    "true",
    '- k: "true"\n  l:\n    - "true"\n    - m: "true"\n      l2:\n        - "true"\n  p: true\n',
  ],
  [
    "yes",
    "- k: yes\n  l:\n    - yes\n    - m: yes\n      l2:\n        - yes\n  p: yes\n",
  ],
  [
    "null",
    '- k: "null"\n  l:\n    - "null"\n    - m: "null"\n      l2:\n        - "null"\n  p: null\n',
  ],
  ["", '- k: ""\n  l:\n    - ""\n    - m: ""\n      l2:\n        - ""\n  p:\n'],
  [
    " ",
    "- k: ' '\n  l:\n    - ' '\n    - m: ' '\n      l2:\n        - ' '\n  p: ' '\n",
  ],
  [
    "trail ",
    "- k: 'trail '\n  l:\n    - 'trail '\n    - m: 'trail '\n      l2:\n        - 'trail '\n  p: 'trail '\n",
  ],
  [
    "\tTab",
    '- k: "\\tTab"\n  l:\n    - "\\tTab"\n    - m: "\\tTab"\n      l2:\n        - "\\tTab"\n  p: "\\tTab"\n',
  ],
  [
    "'Til the end: - and | >",
    "- k: '''Til the end: - and | >'\n  l:\n    - '''Til the end: - and | >'\n    - m: '''Til the end: - and | >'\n      l2:\n        - '''Til the end: - and | >'\n  p: '''Til the end: - and | >'\n",
  ],
  [
    '"Ace"',
    "- k: '\"Ace\"'\n  l:\n    - '\"Ace\"'\n    - m: '\"Ace\"'\n      l2:\n        - '\"Ace\"'\n  p: '\"Ace\"'\n",
  ],
  [
    "a: b",
    "- k: 'a: b'\n  l:\n    - 'a: b'\n    - m: 'a: b'\n      l2:\n        - 'a: b'\n  p: 'a: b'\n",
  ],
  [
    "a:b",
    "- k: a:b\n  l:\n    - a:b\n    - m: a:b\n      l2:\n        - a:b\n  p: a:b\n",
  ],
  [
    "key:",
    "- k: 'key:'\n  l:\n    - 'key:'\n    - m: 'key:'\n      l2:\n        - 'key:'\n  p: 'key:'\n",
  ],
  [
    "- x",
    "- k: '- x'\n  l:\n    - '- x'\n    - m: '- x'\n      l2:\n        - '- x'\n  p: '- x'\n",
  ],
  [
    "-",
    "- k: '-'\n  l:\n    - '-'\n    - m: '-'\n      l2:\n        - '-'\n  p: '-'\n",
  ],
  [
    ":x",
    "- k: :x\n  l:\n    - :x\n    - m: :x\n      l2:\n        - :x\n  p: :x\n",
  ],
  [
    "[x",
    "- k: '[x'\n  l:\n    - '[x'\n    - m: '[x'\n      l2:\n        - '[x'\n  p: '[x'\n",
  ],
  [
    "a,b",
    "- k: a,b\n  l:\n    - a,b\n    - m: a,b\n      l2:\n        - a,b\n  p: a,b\n",
  ],
  [
    "a'b",
    "- k: a'b\n  l:\n    - a'b\n    - m: a'b\n      l2:\n        - a'b\n  p: a'b\n",
  ],
  [
    "'a",
    "- k: '''a'\n  l:\n    - '''a'\n    - m: '''a'\n      l2:\n        - '''a'\n  p: '''a'\n",
  ],
  [
    "\u22123",
    "- k: \u22123\n  l:\n    - \u22123\n    - m: \u22123\n      l2:\n        - \u22123\n  p: \u22123\n",
  ],
  [
    "\u00a0nbsp",
    "- k: \u00a0nbsp\n  l:\n    - \u00a0nbsp\n    - m: \u00a0nbsp\n      l2:\n        - \u00a0nbsp\n  p: \u00a0nbsp\n",
  ],
  [
    "a\u2028b",
    "- k: 'a\u2028    b'\n  l:\n    - 'a\u2028      b'\n    - m: 'a\u2028        b'\n      l2:\n        - 'a\u2028          b'\n  p: 'a\u2028    b'\n",
  ],
  [
    "\u0007bell",
    '- k: "\\abell"\n  l:\n    - "\\abell"\n    - m: "\\abell"\n      l2:\n        - "\\abell"\n  p: "\\abell"\n',
  ],
  [
    "\u0085nel",
    '- k: "\\Nnel"\n  l:\n    - "\\Nnel"\n    - m: "\\Nnel"\n      l2:\n        - "\\Nnel"\n  p: "\\Nnel"\n',
  ],
  [
    "\ufeffbom",
    '- k: "\\uFEFF\\x62\\x6F\\x6D"\n  l:\n    - "\\uFEFF\\x62\\x6F\\x6D"\n    - m: "\\uFEFF\\x62\\x6F\\x6D"\n      l2:\n        - "\\uFEFF\\x62\\x6F\\x6D"\n  p: "\\uFEFF\\x62\\x6F\\x6D"\n',
  ],
  [
    "\ud83d\ude00",
    '- k: "\\U0001F600"\n  l:\n    - "\\U0001F600"\n    - m: "\\U0001F600"\n      l2:\n        - "\\U0001F600"\n  p: "\\U0001F600"\n',
  ],
  [
    "line one\nline two",
    "- k: |-\n    line one\n    line two\n  l:\n    - |-\n      line one\n      line two\n    - m: |-\n        line one\n        line two\n      l2:\n        - |-\n          line one\n          line two\n  p: |-\n    line one\n    line two\n",
  ],
  [
    "line one\nline two\n",
    "- k: |\n    line one\n    line two\n  l:\n    - |\n      line one\n      line two\n    - m: |\n        line one\n        line two\n      l2:\n        - |\n          line one\n          line two\n  p: |\n    line one\n    line two\n",
  ],
  [
    "line one\n\nline three",
    "- k: |-\n    line one\n\n    line three\n  l:\n    - |-\n      line one\n\n      line three\n    - m: |-\n        line one\n\n        line three\n      l2:\n        - |-\n          line one\n\n          line three\n  p: |-\n    line one\n\n    line three\n",
  ],
  [
    "  Indented first line,\nthen a second; # not a comment",
    "- k: |2-\n      Indented first line,\n    then a second; # not a comment\n  l:\n    - |2-\n        Indented first line,\n      then a second; # not a comment\n    - m: |2-\n          Indented first line,\n        then a second; # not a comment\n      l2:\n        - |2-\n            Indented first line,\n          then a second; # not a comment\n  p: |2-\n      Indented first line,\n    then a second; # not a comment\n",
  ],
  [
    "a\n",
    "- k: |\n    a\n  l:\n    - |\n      a\n    - m: |\n        a\n      l2:\n        - |\n          a\n  p: |\n    a\n",
  ],
  [
    "\n",
    "- k: |2+\n\n  l:\n    - |2+\n\n    - m: |2+\n\n      l2:\n        - |2+\n\n  p: |2+\n\n",
  ],
  [
    "\na",
    "- k: |2-\n\n    a\n  l:\n    - |2-\n\n      a\n    - m: |2-\n\n        a\n      l2:\n        - |2-\n\n          a\n  p: |2-\n\n    a\n",
  ],
  [
    "a\n\n",
    "- k: |+\n    a\n\n  l:\n    - |+\n      a\n\n    - m: |+\n        a\n\n      l2:\n        - |+\n          a\n\n  p: |+\n    a\n\n",
  ],
  [
    "trailing \nspace",
    '- k: "trailing \\nspace"\n  l:\n    - "trailing \\nspace"\n    - m: "trailing \\nspace"\n      l2:\n        - "trailing \\nspace"\n  p: "trailing \\nspace"\n',
  ],
  [
    "x\n  y",
    "- k: |-\n    x\n      y\n  l:\n    - |-\n      x\n        y\n    - m: |-\n        x\n          y\n      l2:\n        - |-\n          x\n            y\n  p: |-\n    x\n      y\n",
  ],
  [
    "a\r\nb",
    '- k: "a\\r\\nb"\n  l:\n    - "a\\r\\nb"\n    - m: "a\\r\\nb"\n      l2:\n        - "a\\r\\nb"\n  p: "a\\r\\nb"\n',
  ],
  [
    "2026-11-07",
    '- k: "2026-11-07"\n  l:\n    - "2026-11-07"\n    - m: "2026-11-07"\n      l2:\n        - "2026-11-07"\n  p: 2026-11-07\n',
  ],
  [
    "12:30",
    "- k: 12:30\n  l:\n    - 12:30\n    - m: 12:30\n      l2:\n        - 12:30\n  p: 12:30\n",
  ],
  [
    "1:20",
    "- k: 1:20\n  l:\n    - 1:20\n    - m: 1:20\n      l2:\n        - 1:20\n  p: 1:20\n",
  ],
  [
    "0b101",
    '- k: "0b101"\n  l:\n    - "0b101"\n    - m: "0b101"\n      l2:\n        - "0b101"\n  p: 0b101\n',
  ],
  [
    "+12",
    '- k: "+12"\n  l:\n    - "+12"\n    - m: "+12"\n      l2:\n        - "+12"\n  p: +12\n',
  ],
  [
    "1_000",
    '- k: "1_000"\n  l:\n    - "1_000"\n    - m: "1_000"\n      l2:\n        - "1_000"\n  p: 1_000\n',
  ],
  [
    "1/2",
    "- k: 1/2\n  l:\n    - 1/2\n    - m: 1/2\n      l2:\n        - 1/2\n  p: 1/2\n",
  ],
  [
    "10+",
    "- k: 10+\n  l:\n    - 10+\n    - m: 10+\n      l2:\n        - 10+\n  p: 10+\n",
  ],
  [
    "4/5",
    "- k: 4/5\n  l:\n    - 4/5\n    - m: 4/5\n      l2:\n        - 4/5\n  p: 4/5\n",
  ],
  [
    "a\u2028",
    "- k: 'a\u2028'\n  l:\n    - 'a\u2028'\n    - m: 'a\u2028'\n      l2:\n        - 'a\u2028'\n  p: 'a\u2028'\n",
  ],
  [
    "\u2028a",
    "- k: '\u2028    a'\n  l:\n    - '\u2028      a'\n    - m: '\u2028        a'\n      l2:\n        - '\u2028          a'\n  p: '\u2028    a'\n",
  ],
  [
    "a\u2029\u2029b",
    "- k: 'a\u2029\u2029    b'\n  l:\n    - 'a\u2029\u2029      b'\n    - m: 'a\u2029\u2029        b'\n      l2:\n        - 'a\u2029\u2029          b'\n  p: 'a\u2029\u2029    b'\n",
  ],
  [
    "x\n\u2028y",
    "- k: |-\n    x\n\u2028    y\n  l:\n    - |-\n      x\n\u2028      y\n    - m: |-\n        x\n\u2028        y\n      l2:\n        - |-\n          x\n\u2028          y\n  p: |-\n    x\n\u2028    y\n",
  ],
  [
    " \n",
    '- k: " \\n"\n  l:\n    - " \\n"\n    - m: " \\n"\n      l2:\n        - " \\n"\n  p: " \\n"\n',
  ],
  [
    "a\n b",
    "- k: |-\n    a\n     b\n  l:\n    - |-\n      a\n       b\n    - m: |-\n        a\n         b\n      l2:\n        - |-\n          a\n           b\n  p: |-\n    a\n     b\n",
  ],
  [
    "2001-02-29",
    "- k: 2001-02-29\n  l:\n    - 2001-02-29\n    - m: 2001-02-29\n      l2:\n        - 2001-02-29\n  p: 2001-02-29\n",
  ],
  [
    "2000-02-29",
    '- k: "2000-02-29"\n  l:\n    - "2000-02-29"\n    - m: "2000-02-29"\n      l2:\n        - "2000-02-29"\n  p: 2000-02-29\n',
  ],
  [
    "2026-01-01 24:00:00",
    "- k: 2026-01-01 24:00:00\n  l:\n    - 2026-01-01 24:00:00\n    - m: 2026-01-01 24:00:00\n      l2:\n        - 2026-01-01 24:00:00\n  p: 2026-01-01 24:00:00\n",
  ],
  [
    "2026-01-01T10:00:00+24:60",
    '- k: "2026-01-01T10:00:00+24:60"\n  l:\n    - "2026-01-01T10:00:00+24:60"\n    - m: "2026-01-01T10:00:00+24:60"\n      l2:\n        - "2026-01-01T10:00:00+24:60"\n  p: 2026-01-01T10:00:00+24:60\n',
  ],
  [
    "2026-01-01T10:00:00.Z",
    "- k: 2026-01-01T10:00:00.Z\n  l:\n    - 2026-01-01T10:00:00.Z\n    - m: 2026-01-01T10:00:00.Z\n      l2:\n        - 2026-01-01T10:00:00.Z\n  p: 2026-01-01T10:00:00.Z\n",
  ],
  [
    "0x1g",
    "- k: 0x1g\n  l:\n    - 0x1g\n    - m: 0x1g\n      l2:\n        - 0x1g\n  p: 0x1g\n",
  ],
  [
    "0xFF",
    '- k: "0xFF"\n  l:\n    - "0xFF"\n    - m: "0xFF"\n      l2:\n        - "0xFF"\n  p: 0xFF\n',
  ],
  [
    "0777",
    '- k: "0777"\n  l:\n    - "0777"\n    - m: "0777"\n      l2:\n        - "0777"\n  p: 0777\n',
  ],
  [
    "0b-1",
    '- k: "0b-1"\n  l:\n    - "0b-1"\n    - m: "0b-1"\n      l2:\n        - "0b-1"\n  p: 0b-1\n',
  ],
  [
    "-0b-1",
    "- k: -0b-1\n  l:\n    - -0b-1\n    - m: -0b-1\n      l2:\n        - -0b-1\n  p: -0b-1\n",
  ],
  [
    "9223372036854775808",
    '- k: "9223372036854775808"\n  l:\n    - "9223372036854775808"\n    - m: "9223372036854775808"\n      l2:\n        - "9223372036854775808"\n  p: 9223372036854775808\n',
  ],
  [
    "18446744073709551616",
    '- k: "18446744073709551616"\n  l:\n    - "18446744073709551616"\n    - m: "18446744073709551616"\n      l2:\n        - "18446744073709551616"\n  p: 18446744073709551616\n',
  ],
  [
    "1e309",
    "- k: 1e309\n  l:\n    - 1e309\n    - m: 1e309\n      l2:\n        - 1e309\n  p: 1e309\n",
  ],
  [
    "1.",
    '- k: "1."\n  l:\n    - "1."\n    - m: "1."\n      l2:\n        - "1."\n  p: 1.\n',
  ],
  [
    ".5_0",
    '- k: ".5_0"\n  l:\n    - ".5_0"\n    - m: ".5_0"\n      l2:\n        - ".5_0"\n  p: .5_0\n',
  ],
  [
    "1__0",
    '- k: "1__0"\n  l:\n    - "1__0"\n    - m: "1__0"\n      l2:\n        - "1__0"\n  p: 1__0\n',
  ],
  [
    "_1",
    "- k: _1\n  l:\n    - _1\n    - m: _1\n      l2:\n        - _1\n  p: _1\n",
  ],
  [
    "a\u0000b",
    '- k: "a\\0b"\n  l:\n    - "a\\0b"\n    - m: "a\\0b"\n      l2:\n        - "a\\0b"\n  p: "a\\0b"\n',
  ],
  [
    "\ufffe",
    '- k: "\\uFFFE"\n  l:\n    - "\\uFFFE"\n    - m: "\\uFFFE"\n      l2:\n        - "\\uFFFE"\n  p: "\\uFFFE"\n',
  ],
  [
    "a\u0085",
    '- k: "a\\N"\n  l:\n    - "a\\N"\n    - m: "a\\N"\n      l2:\n        - "a\\N"\n  p: "a\\N"\n',
  ],
  [
    "\u007f",
    '- k: "\\x7F"\n  l:\n    - "\\x7F"\n    - m: "\\x7F"\n      l2:\n        - "\\x7F"\n  p: "\\x7F"\n',
  ],
  [
    "|'?|\u2028\n",
    "- k: |+\n    |'?|\u2028\n  l:\n    - |+\n      |'?|\u2028\n    - m: |+\n        |'?|\u2028\n      l2:\n        - |+\n          |'?|\u2028\n  p: |+\n    |'?|\u2028\n",
  ],
  [
    "Z}\u2028Z['",
    "- k: 'Z}\u2028    Z['''\n  l:\n    - 'Z}\u2028      Z['''\n    - m: 'Z}\u2028        Z['''\n      l2:\n        - 'Z}\u2028          Z['''\n  p: 'Z}\u2028    Z['''\n",
  ],
  [
    ".5__0",
    "- k: .5__0\n  l:\n    - .5__0\n    - m: .5__0\n      l2:\n        - .5__0\n  p: .5__0\n",
  ],
  [
    ".5e+_1",
    "- k: .5e+_1\n  l:\n    - .5e+_1\n    - m: .5e+_1\n      l2:\n        - .5e+_1\n  p: .5e+_1\n",
  ],
  [
    "+_1",
    '- k: "+_1"\n  l:\n    - "+_1"\n    - m: "+_1"\n      l2:\n        - "+_1"\n  p: +_1\n',
  ],
  [
    "0_8",
    '- k: "0_8"\n  l:\n    - "0_8"\n    - m: "0_8"\n      l2:\n        - "0_8"\n  p: 0_8\n',
  ],
];

test("TestScalars", () => {
  const failures: string[] = [];
  for (const [s, want] of cases) {
    const got = written(s);
    if (got !== want)
      failures.push(`${JSON.stringify(s)}:\n${got}----\n${want}`);
  }
  assert.deepEqual(failures, [], "each text written as yaml.v3 writes it");
});
