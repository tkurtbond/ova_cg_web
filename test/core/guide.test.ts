// src/core/guide.ts: the guide's subset of Markdown, its links and its
// refusals, and the real guide, src/guide/guide.md. The page's own
// (PLAN.md, "The guide"): ova_cg_go has no counterpart.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as guide from "../../src/core/guide.ts";
import * as rules from "../../src/core/rules.ts";

const GUIDE = "src/guide/guide.md";

/** The item a name finds, which must be there. */
function item(name: string): rules.Item {
  const it = rules.find(name);
  assert.ok(it !== undefined, name);
  return it;
}

function page(name: string): guide.Page {
  const p = guide.findPage(name);
  assert.ok(p !== undefined, name);
  return p;
}

test("the subset, parsed", () => {
  const g = guide.parse(
    [
      "# The *title*",
      "",
      "<!-- a comment,",
      "     over two lines -->",
      "## First",
      "",
      "A paragraph",
      "over **two** lines, with `code`, \\*, [](item:Attack) and",
      "[Limiting](page:LimitsPage).",
      "- one,",
      "  going on",
      "- [Show me](show:abilities)",
      "",
      "## Second",
      "1. *a*",
      "2. [](item:Vehicle (Mecha))",
    ].join("\n") + "\n",
  );
  assert.deepEqual(g, {
    title: [
      { kind: "text", text: "The " },
      { kind: "emphasis", content: [{ kind: "text", text: "title" }] },
    ],
    steps: [
      {
        title: [{ kind: "text", text: "First" }],
        line: 5,
        blocks: [
          {
            kind: "paragraph",
            line: 7,
            content: [
              { kind: "text", text: "A paragraph over " },
              { kind: "strong", content: [{ kind: "text", text: "two" }] },
              { kind: "text", text: " lines, with " },
              { kind: "code", text: "code" },
              { kind: "text", text: ", *, " },
              { kind: "item", item: item("Attack") },
              { kind: "text", text: " and " },
              { kind: "page", text: "Limiting", page: page("LimitsPage") },
              { kind: "text", text: "." },
            ],
          },
          {
            kind: "list",
            ordered: false,
            line: 10,
            items: [
              [{ kind: "text", text: "one, going on" }],
              [{ kind: "show", text: "Show me", target: "abilities" }],
            ],
          },
        ],
      },
      {
        title: [{ kind: "text", text: "Second" }],
        line: 14,
        blocks: [
          {
            kind: "list",
            ordered: true,
            line: 15,
            items: [
              [{ kind: "emphasis", content: [{ kind: "text", text: "a" }] }],
              [{ kind: "item", item: item("Vehicle (Mecha)") }],
            ],
          },
        ],
      },
    ],
  });
});

test("refusals, each with its line", () => {
  const ok = "# T\n\n## S\n\n";
  for (const [text, line, want] of [
    ["", 1, "no title"],
    ["## S\n\nx\n", 1, "begins with its title"],
    ["# T\n", 1, "no steps"],
    ["# T\nx\n## S\ny\n", 2, "text before the first step"],
    ["# T\n## S\n## U\nx\n", 2, "a step with nothing in it"],
    ["# T\n# U\n", 2, 'only one "# " title'],
    [ok + "### x\n", 5, 'only one "# " title'],
    [ok + "x \n", 5, "ends in a space"],
    [ok + "\tx\n", 5, "a tab"],
    [ok + "x\n  y\n", 6, "an indented line in a paragraph"],
    [ok + "  x\n", 5, "an indented line outside a list"],
    [ok + "- a\n\n  b\n", 7, "an indented line outside a list"],
    [ok + "- a\nb\n", 6, "goes on in indented lines"],
    [ok + "- a\n1. b\n", 6, "mixes - and numbered"],
    [ok + "1. a\n3. b\n", 6, "item 2 numbered 3"],
    [ok + "2. a\n", 5, "item 1 numbered 2"],
    [ok + "* a\n", 5, "not in the guide's Markdown"],
    [ok + "> a\n", 5, "not in the guide's Markdown"],
    [ok + "```\n", 5, "not in the guide's Markdown"],
    [ok + "| a |\n", 5, "not in the guide's Markdown"],
    [ok + "<!-- a\nb\n", 5, "never ends"],
    [ok + "a **b\n", 5, "no closing **"],
    [ok + "a *b\n", 5, "no closing *"],
    [ok + "a `b\n", 5, "no closing `"],
    [ok + "a `` b\n", 5, "empty code"],
    [ok + "a ** **\n", 5, "a space just inside"],
    [ok + "a ****\n", 5, "or empty"],
    [ok + "a * b *\n", 5, "a space just inside"],
    [ok + "a *b *\n", 5, "a space just inside"],
    [ok + "a **b *c** d*\n", 5, "no closing *"],
    [ok + "a \\b\n", 5, "isn't punctuation"],
    [ok + "a b_c\n", 5, "a _ on its own"],
    [ok + "a <b>\n", 5, "a < on its own"],
    [ok + "a ] b\n", 5, "a ] on its own"],
    [ok + "a [b] c\n", 5, "isn't a link"],
    [ok + "[a](https://example.com)\n", 5, "item:, page: or show:"],
    [ok + "[a](b)\n", 5, "item:, page: or show:"],
    [ok + "[a](item:Attack)\n", 5, "text is empty"],
    [ok + "[](item:Nothing)\n", 5, 'no item "Nothing"'],
    [ok + "[](item:attack)\n", 5, "item:Attack"],
    [ok + "[](page:LimitsPage)\n", 5, "needs its text"],
    [ok + "[a](page:LimitsPag)\n", 5, 'no page "LimitsPag"'],
    [ok + "[a](page:21)\n", 5, 'no page "21"'],
    [ok + "[](show:abilities)\n", 5, "needs its text"],
    [ok + "[a](show:Abilities)\n", 5, "lower-case words"],
    [ok + "[**a**](show:x)\n", 5, "plain text"],
    [ok + "[a [b](show:x)](show:y)\n", 5, "[ inside a link's text"],
    [ok + "[a](show:x\n", 5, "no closing )"],
  ] as [string, number, string][]) {
    assert.throws(
      () => guide.parse(text),
      (e: unknown) =>
        e instanceof guide.GuideError &&
        e.line === line &&
        e.message.startsWith(`guide.md:${String(line)}: `) &&
        e.message.includes(want),
      `${JSON.stringify(text)}: line ${String(line)}, ${want}`,
    );
  }
});

test("what the subset takes that it might seem not to", () => {
  for (const text of [
    "a **b *c* d**", // emphasis in strong
    "*a **b** c*", // strong in emphasis
    "a\\_b \\<c\\> \\[d\\]", // escaped
    "`a_b <c> *d* [e]`", // in code, as written
    "a (b) c: d, e.", // parentheses on their own
  ])
    assert.doesNotThrow(() => guide.parse("# T\n## S\n" + text + "\n"), text);
});

test("stripComments keeps every line's number", () => {
  const text = "# T\n<!-- a\nb -->\n## S\n<!-- c -->\nx\n";
  assert.equal(guide.stripComments(text), "# T\n\n\n## S\n\nx\n");
  assert.equal(guide.stripComments("a\r\nb\r\n"), "a\nb\n");
  // The page's script mustn't hold the comment's opening (inline.mjs).
  assert.ok(!guide.stripComments(readFileSync(GUIDE, "utf8")).includes("<!--"));
});

test("pages: each its constant's page in rules.ts, once", () => {
  const r = rules as unknown as Record<string, unknown>;
  const names = new Set<string>();
  for (const p of guide.pages) {
    assert.equal(r[p.name], p.page, p.name);
    assert.ok(!names.has(p.name), `${p.name} twice`);
    names.add(p.name);
    assert.notEqual(p.heading, "", p.name);
  }
});

test("targets, plainText and paragraphs", () => {
  const g = guide.parse(
    "# T\n## S *[Show](show:a)*\n[Limits](page:LimitsPage), [](item:Attack)\n\n- [b](show:b)\n- [Again](show:a)\n",
  );
  assert.deepEqual(guide.targets(g), ["a", "b"]);
  assert.deepEqual(guide.paragraphs(g), [
    { line: 2, text: "S Show" },
    { line: 3, text: "Limits (p. 21), Attack (p. 50)" },
    { line: 5, text: "b" },
    { line: 5, text: "Again" },
  ]);
});

test("the guide, src/guide/guide.md", () => {
  const g = guide.parse(readFileSync(GUIDE, "utf8"));
  assert.ok(g.steps.length >= 2, "steps");
  assert.notEqual(guide.plainText(g.title), "");
  for (const s of g.steps)
    assert.notEqual(guide.plainText(s.title).trim(), "", `line ${s.line}`);
});
