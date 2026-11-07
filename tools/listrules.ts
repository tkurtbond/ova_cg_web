// Prints every item of src/core/rules.ts as "PAGE<TAB>NAME", in the
// book's order, for make check-pages, which compares it with the
// rulebook PDF's headings (tools/rulebook-headings.py). The port of
// ova_cg_go's cmd/listrules, whose output it must equal.
import * as rules from "../src/core/rules.ts";

let out = "";
for (const k of rules.kinds)
  for (let i = 0; i < rules.count(k); i++) {
    const it = rules.get(k, i);
    out += `${it.page}\t${it.name}\n`;
  }
process.stdout.write(out);
