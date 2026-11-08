// The guide's text, parsed: the step-by-step guide to making a
// character on the page (Help > Guide), the page's own addition
// (PLAN.md, "The guide"); ova_cg_go has none.
//
// Its source, src/guide/guide.md, is a small subset of Markdown:
//
//   # Title                    the first line, once
//   ## A step's title          each step, in order
//   a paragraph                lines up to a blank line, joined
//   - an item                  a list; "1. ", "2. ", ... an ordered one;
//     more of it               an item goes on in its indented lines
//   <!-- a note -->            a comment for the guide's writer, on
//                              lines of its own; never shown
//
// and, inside a paragraph, an item or a title: **strong**, *emphasis*,
// `code`, \ before punctuation for itself, and links of three schemes:
//
//   [](item:Attack)            the item's label, "Attack (p. 50)"
//   [Limiting the Character](page:LimitsPage)
//                              the text with a page, "Limiting the
//                              Character (p. 21)", one of pages below
//   [Show me](show:abilities)  a Show me button for a control the
//                              Window names (src/ui/guide.ts)
//
// No page number is written by hand, and no link goes out of the page.
// Anything else is refused with its line: the guide is part of the
// page, so a mistake in it is the program's, and parse throws.

import * as rules from "./rules.ts";

/** A run of a paragraph's, an item's or a title's content. */
export type Inline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "strong"; readonly content: readonly Inline[] }
  | { readonly kind: "emphasis"; readonly content: readonly Inline[] }
  | { readonly kind: "code"; readonly text: string }
  /** An item, shown as rules.label of it. */
  | { readonly kind: "item"; readonly item: rules.Item }
  /** Text with a page, shown as rules.pageLabel(text, page.page). */
  | { readonly kind: "page"; readonly text: string; readonly page: Page }
  /** A Show me button, its text, for the control the Window calls target. */
  | { readonly kind: "show"; readonly text: string; readonly target: string };

export type Block =
  | {
      readonly kind: "paragraph";
      readonly content: readonly Inline[];
      /** Its first line, from 1. */
      readonly line: number;
    }
  | {
      readonly kind: "list";
      readonly ordered: boolean;
      readonly items: readonly (readonly Inline[])[];
      readonly line: number;
    };

export interface Step {
  readonly title: readonly Inline[];
  readonly blocks: readonly Block[];
  /** The line of its "## ", from 1. */
  readonly line: number;
}

export interface Guide {
  readonly title: readonly Inline[];
  readonly steps: readonly Step[];
}

/**
 * A page of the rules the guide may cite: the constant's name in
 * rules.ts, its page, and the heading the rulebook prints on that page
 * (a name, never its text), which make check-pages looks for.
 */
export interface Page {
  readonly name: string;
  readonly page: number;
  readonly heading: string;
}

const page = (name: string, p: number, heading: string): Page => ({
  name,
  page: p,
  heading,
});

/** The pages the guide may cite, by their constants in rules.ts. */
export const pages: readonly Page[] = [
  page("DiscussionPage", rules.DiscussionPage, "Step 0: Discussion"),
  page("ConceptPage", rules.ConceptPage, "Step 1: Concept"),
  page("AbilitiesStepPage", rules.AbilitiesStepPage, "Step 2: The Abilities"),
  page(
    "WeaknessesStepPage",
    rules.WeaknessesStepPage,
    "Step 3: The Weaknesses",
  ),
  page(
    "HealthEnduranceStepPage",
    rules.HealthEnduranceStepPage,
    "Step 4: Health and Endurance",
  ),
  page(
    "FinishingTouchesPage",
    rules.FinishingTouchesPage,
    "Step 5: Finishing Touches",
  ),
  page("FluffingPage", rules.FluffingPage, "Fluffing"),
  page("LimitsPage", rules.LimitsPage, "Limiting the Character"),
  page(
    "SampleCharactersPage",
    rules.SampleCharactersPage,
    "Using the Characters",
  ),
  page("PerksFlawsPage", rules.PerksFlawsPage, "Ability Perks and Flaws"),
  page("AffinitiesPage", rules.AffinitiesPage, "Affinities"),
  page("QuickListPage", rules.QuickListPage, "Quick List"),
  page("RollsPage", rules.RollsPage, "Attack!"),
  page("DamagePage", rules.DamagePage, "Damage"),
  page("HealthEndurancePage", rules.HealthEndurancePage, "Health & Endurance"),
  page("NpcTypesPage", rules.NpcTypesPage, "Creating NPCs"),
  page("ThreatValuePage", rules.ThreatValuePage, "Threat Value"),
];

/** pages' entry for a constant's name, or undefined. */
export function findPage(name: string): Page | undefined {
  return pages.find((p) => p.name === name);
}

/** A show: link's target: lower-case words joined by "-". */
const targetName = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** What is wrong with the guide's text, and on which line (from 1). */
export class GuideError extends Error {
  readonly line: number;
  constructor(line: number, message: string) {
    super(`guide.md:${String(line)}: ${message}`);
    this.name = "GuideError";
    this.line = line;
  }
}

const orderedItem = /^(\d+)\. +(.*)$/;
const bulletItem = /^- +(.*)$/;

/**
 * A comment's first line. Written so, not as the string, since the
 * string would be in the page's script, which inline.mjs refuses.
 */
const commentStart = /^<!-{2}/;

/**
 * text with each comment's lines made empty, so that every other line
 * keeps its number. The build gives the page this, since build/
 * inline.mjs refuses a script holding "<!--". Throws GuideError for a
 * comment that never ends.
 */
export function stripComments(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!commentStart.test(lines[i] as string)) continue;
    const start = i;
    while (!(lines[i] as string).endsWith("-->")) {
      lines[i] = "";
      i++;
      if (i >= lines.length)
        throw new GuideError(start + 1, "a comment that never ends (-->)");
    }
    lines[i] = "";
  }
  return lines.join("\n");
}

/**
 * text, the guide's source, parsed. Throws GuideError for anything
 * outside the subset.
 */
export function parse(text: string): Guide {
  const lines = stripComments(text).split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  let title: readonly Inline[] | undefined;
  const steps: Step[] = [];
  let blocks: Block[] | undefined; // the step's being read
  let i = 0;
  const fail = (line: number, message: string): never => {
    throw new GuideError(line, message);
  };
  lines.forEach((l, j) => {
    if (l.includes("\t")) fail(j + 1, "a tab: indent with spaces");
    if (/\s$/.test(l)) fail(j + 1, "a line ends in a space");
  });

  while (i < lines.length) {
    const n = i + 1;
    const line = lines[i] as string;
    if (line === "") {
      i++;
      continue;
    }
    if (title === undefined) {
      if (!line.startsWith("# "))
        fail(n, 'the guide begins with its title, "# ..."');
      title = inline(line.slice(2), n);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks = [];
      steps.push({ title: inline(line.slice(3), n), blocks, line: n });
      i++;
      continue;
    }
    if (line.startsWith("#"))
      fail(n, 'only one "# " title, and "## " for each step');
    if (blocks === undefined) fail(n, 'text before the first step ("## ")');
    const into = blocks as Block[];
    if (/^ /.test(line)) fail(n, "an indented line outside a list");
    if (/^(\* |\+ |> |\||```|~~~)/.test(line))
      fail(
        n,
        "not in the guide's Markdown: " + JSON.stringify(line.slice(0, 3)),
      );

    const bullet = bulletItem.exec(line);
    const ordered = orderedItem.exec(line);
    if (bullet !== null || ordered !== null) {
      // A list: its items up to a blank line.
      const isOrdered = ordered !== null;
      const items: Inline[][] = [];
      while (i < lines.length && lines[i] !== "") {
        const m = i + 1;
        const l = lines[i] as string;
        const b = bulletItem.exec(l);
        const o = orderedItem.exec(l);
        if (b === null && o === null)
          fail(m, "a list item goes on in indented lines");
        if ((o !== null) !== isOrdered)
          fail(m, "a list mixes - and numbered items");
        if (o !== null && Number(o[1]) !== items.length + 1)
          fail(m, `item ${String(items.length + 1)} numbered ${o[1] ?? ""}`);
        const start = (b !== null ? b[1] : o?.[2]) ?? "";
        // The item's indented lines.
        let source = start;
        i++;
        while (i < lines.length && /^ +\S/.test(lines[i] as string)) {
          const c = lines[i] as string;
          source += " " + c.trim();
          i++;
        }
        items.push(inline(source, m));
      }
      into.push({ kind: "list", ordered: isOrdered, items, line: n });
      continue;
    }

    // A paragraph: lines up to a blank line, a heading or a list.
    let source = line;
    i++;
    while (i < lines.length) {
      const l = lines[i] as string;
      if (
        l === "" ||
        l.startsWith("#") ||
        bulletItem.test(l) ||
        orderedItem.test(l)
      )
        break;
      if (/^ /.test(l)) fail(i + 1, "an indented line in a paragraph");
      source += " " + l;
      i++;
    }
    into.push({ kind: "paragraph", content: inline(source, n), line: n });
  }

  if (title === undefined) fail(1, 'the guide has no title, "# ..."');
  if (steps.length === 0)
    fail(lines.length, 'the guide has no steps, "## ..."');
  for (const s of steps)
    if (s.blocks.length === 0) fail(s.line, "a step with nothing in it");
  return { title: title as readonly Inline[], steps };
}

/** The ASCII punctuation \ may escape, as in CommonMark. */
const escapable = /[!-/:-@[-`{-~]/;

/**
 * s, a paragraph's, an item's or a title's text (its lines joined),
 * parsed into runs; line is where it begins, for errors.
 */
function inline(s: string, line: number): Inline[] {
  const fail = (message: string): never => {
    throw new GuideError(line, message);
  };
  let pos = 0;

  // Runs up to close ("**", "*" or "]"), or the end if close is "".
  const runs = (close: string): Inline[] => {
    const out: Inline[] = [];
    let text = "";
    const flush = () => {
      if (text !== "") out.push({ kind: "text", text });
      text = "";
    };
    for (;;) {
      if (pos >= s.length) {
        if (close !== "") fail(`no closing ${close}`);
        flush();
        return out;
      }
      const c = s[pos] as string;
      if (close !== "" && s.startsWith(close, pos)) {
        // "*" closes emphasis, but not the first star of "**".
        if (!(close === "*" && s.startsWith("**", pos))) {
          pos += close.length;
          flush();
          return out;
        }
      }
      if (c === "\\") {
        const next = s[pos + 1];
        if (next === undefined || !escapable.test(next))
          fail("\\ before something that isn't punctuation");
        text += next;
        pos += 2;
      } else if (c === "`") {
        const end = s.indexOf("`", pos + 1);
        if (end < 0) fail("no closing `");
        if (end === pos + 1) fail("empty code, ``");
        flush();
        out.push({ kind: "code", text: s.slice(pos + 1, end) });
        pos = end + 1;
      } else if (s.startsWith("**", pos)) {
        if (close === "**") fail("** inside **");
        pos += 2;
        flush();
        const content = runs("**");
        if (spaced(content)) fail("** with a space just inside it, or empty");
        out.push({ kind: "strong", content });
      } else if (c === "*") {
        if (close === "*") fail("* inside *");
        pos += 1;
        flush();
        const content = runs("*");
        if (spaced(content)) fail("* with a space just inside it, or empty");
        out.push({ kind: "emphasis", content });
      } else if (c === "[") {
        if (close === "]") fail("[ inside a link's text");
        pos += 1;
        const label = runs("]");
        flush();
        out.push(link(label));
      } else if (c === "]" || c === "_" || c === "<") {
        fail(`a ${c} on its own: write \\${c}`);
      } else {
        text += c === "\n" ? " " : c;
        pos++;
      }
    }
  };

  // A link whose text is label, its "(scheme:argument)" next.
  const link = (label: Inline[]): Inline => {
    if (s[pos] !== "(") fail("a [...] that isn't a link: write \\[");
    // The destination up to the ) that balances its (, as "Vehicle (Mecha)".
    let depth = 0;
    let end = pos;
    for (; end < s.length; end++) {
      if (s[end] === "(") depth++;
      else if (s[end] === ")" && --depth === 0) break;
    }
    if (end >= s.length) fail("a link with no closing )");
    const dest = s.slice(pos + 1, end);
    pos = end + 1;
    const colon = dest.indexOf(":");
    const scheme = colon < 0 ? "" : dest.slice(0, colon);
    const arg = colon < 0 ? "" : dest.slice(colon + 1);
    if (label.some((r) => r.kind !== "text"))
      fail("a link's text is plain text");
    const text = label.map((r) => (r.kind === "text" ? r.text : "")).join("");
    switch (scheme) {
      case "item": {
        if (text !== "")
          fail("an item: link's text is empty: the page writes the label");
        const it = rules.find(arg);
        if (it === undefined) return fail(`no item ${JSON.stringify(arg)}`);
        if (it.name !== arg)
          fail(`write the item as the rulebook does: item:${it.name}`);
        return { kind: "item", item: it };
      }
      case "page": {
        if (text === "") fail("a page: link needs its text");
        const p = findPage(arg);
        if (p === undefined)
          return fail(`no page ${JSON.stringify(arg)} in guide.ts's pages`);
        return { kind: "page", text, page: p };
      }
      case "show": {
        if (text === "") fail("a show: link needs its text");
        if (!targetName.test(arg))
          fail(
            `a show: target is lower-case words with -: ${JSON.stringify(arg)}`,
          );
        return { kind: "show", text, target: arg };
      }
      default:
        return fail(
          `a link is item:, page: or show:, not ${JSON.stringify(dest)}`,
        );
    }
  };

  const out = runs("");
  if (out.length === 0) fail("empty text");
  return out;
}

/**
 * Whether strong or emphasis content is empty or begins or ends with a
 * space, which Markdown wouldn't take as such: "a * b" is two stars.
 */
function spaced(content: readonly Inline[]): boolean {
  const first = content[0];
  const last = content[content.length - 1];
  return (
    first === undefined ||
    last === undefined ||
    (first.kind === "text" && first.text.startsWith(" ")) ||
    (last.kind === "text" && last.text.endsWith(" "))
  );
}

/** Every show: target in g, in order, each once. */
export function targets(g: Guide): string[] {
  const seen = new Set<string>();
  const walk = (rs: readonly Inline[]) => {
    for (const r of rs)
      if (r.kind === "show") seen.add(r.target);
      else if (r.kind === "strong" || r.kind === "emphasis") walk(r.content);
  };
  walk(g.title);
  for (const s of g.steps) {
    walk(s.title);
    for (const b of s.blocks)
      if (b.kind === "paragraph") walk(b.content);
      else for (const it of b.items) walk(it);
  }
  return [...seen];
}

/**
 * The words of rs as the page shows them (an item as its label, a page
 * link as its text and page), for make check-guide.
 */
export function plainText(rs: readonly Inline[]): string {
  let out = "";
  for (const r of rs)
    switch (r.kind) {
      case "text":
      case "code":
      case "show":
        out += r.text;
        break;
      case "strong":
      case "emphasis":
        out += plainText(r.content);
        break;
      case "item":
        out += rules.label(r.item);
        break;
      case "page":
        out += rules.pageLabel(r.text, r.page.page);
        break;
    }
  return out;
}

/** Each block of g as plain text, with its line, for make check-guide. */
export function paragraphs(g: Guide): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  for (const s of g.steps) {
    out.push({ line: s.line, text: plainText(s.title) });
    for (const b of s.blocks)
      if (b.kind === "paragraph")
        out.push({ line: b.line, text: plainText(b.content) });
      else
        for (const it of b.items)
          out.push({ line: b.line, text: plainText(it) });
  }
  return out;
}
