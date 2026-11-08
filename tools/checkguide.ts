// checkguide.ts GUIDE REFERENCE...: refuses a guide sharing a run of
// Run or more words with the rulebook, so that its text stays the
// guide's own (AGENTS.md, PLAN.md "The guide"). The rulebook's text
// comes on standard input (make check-guide pipes mutool's, so it is
// never written to disk); each REFERENCE is another file of it
// (abilities.md, weaknesses.md). Words are compared lower-case, letters
// and digits alone; each run found is printed with the guide's line.
// For make check-guide; not part of make test, which can't count on the
// rulebook.
import { readFileSync } from "node:fs";
import * as guide from "../src/core/guide.ts";

/** The shortest run of words that counts as the rulebook's. */
const Run = 8;

/** text's words: lower-case, letters, digits and inner apostrophes. */
function words(text: string): string[] {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/­/g, "") // soft hyphens
      .replace(/-\n\s*/g, "") // a word hyphenated at a line's end
      .replace(/[‘’]/g, "'")
      .match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? []
  );
}

/** Every run of Run words in ws, joined by spaces. */
function runs(ws: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + Run <= ws.length; i++)
    out.push(ws.slice(i, i + Run).join(" "));
  return out;
}

const [file, ...references] = process.argv.slice(2);
if (file === undefined) {
  console.error(
    "usage: node tools/checkguide.ts GUIDE [REFERENCE...] < RULEBOOK.txt",
  );
  process.exit(2);
}
const book = new Set<string>();
const sources = [
  readFileSync(0, "utf8"),
  ...references.map((r) => readFileSync(r, "utf8")),
];
for (const text of sources) for (const r of runs(words(text))) book.add(r);
if (book.size < 10000) {
  // The rulebook is some 64,000 words: this few means its text is missing.
  console.error(
    `checkguide: only ${String(book.size)} runs of the rulebook's: is its text there?`,
  );
  process.exit(2);
}

const g = guide.parse(readFileSync(file, "utf8"));
let found = 0;
for (const { line, text } of guide.paragraphs(g)) {
  const seen = new Set<string>();
  for (const r of runs(words(text)))
    if (book.has(r) && !seen.has(r)) {
      seen.add(r);
      console.log(`${file}:${String(line)}: the rulebook's words: "${r}"`);
      found++;
    }
}
if (found > 0) {
  console.log(
    `FAIL - ${file} shares ${String(found)} runs of ${String(Run)} words with the rulebook: say it in the guide's own words`,
  );
  process.exit(1);
}
console.log(
  `ok   - ${file} shares no run of ${String(Run)} words with the rulebook (${String(book.size)} runs)`,
);
