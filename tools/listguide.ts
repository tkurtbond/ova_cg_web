// Prints every page the guide may cite (src/core/guide.ts's pages) as
// "PAGE<TAB>HEADING", for make check-pages, which looks for each among
// the rulebook PDF's section headings (tools/rulebook-sections.py).
import { pages } from "../src/core/guide.ts";

let out = "";
for (const p of pages) out += `${String(p.page)}\t${p.heading}\n`;
process.stdout.write(out);
