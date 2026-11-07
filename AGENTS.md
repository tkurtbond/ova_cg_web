# AGENTS.md

Working notes for an agent in this repo, which holds `ova_cg_web`, a
character generator for OVA (Open Versatile Anime engine) that runs in
a web browser: one HTML file, downloaded and opened locally, built from
TypeScript. It is a port of ova_cg_go (`~/Repos/RPG/Tools/ova_cg_go`,
Go with Fyne), itself a port of ova_cg_po (`~/Repos/RPG/Tools/ova_cg_po`,
Oberon-2 with FLTK). PLAN.md is the port's design and build order;
DESIGN-OPTIONS.md is why it is a TypeScript port; this file is
operational notes, not a design doc.

**ova_cg_po is the specification; ova_cg_go is the code to port.**
ova_cg_po's `PLAN.md` holds the rules, the data tables, the file format
and the window. ova_cg_go's `internal/*` packages are the same program
in a language close to TypeScript, and its `*_test.go` the checks to
port. Read the Go package (and, for anything unclear, the Oberon module
it names) before writing its TypeScript module, and port its tests
check for check. Where this repo must differ (a browser, TypeScript,
the `yaml` library), PLAN.md says how and why; anything PLAN.md doesn't
mention stays as ova_cg_po has it. Where ova_cg_go and ova_cg_po
disagree, ova_cg_po wins, and the difference is a finding for PLAN.md.

## Reference material

| What | Where |
|---|---|
| The Go program, to port | `~/Repos/RPG/Tools/ova_cg_go/` (`PLAN.md`, `AGENTS.md`, `internal/`) |
| The Oberon program, the specification | `~/Repos/RPG/Tools/ova_cg_po/` (`PLAN.md`, `AGENTS.md`, `README.md`, `src/`, `test/`) |
| Golden outputs | `~/Repos/RPG/Tools/ova_cg_go/obj/files/` (`NAME.yaml`, `NAME.md`, `NAME.inline.md`, written by its `make test`), copied into `test/golden/` |
| ova_fmt_po, the file oracle | `~/Repos/RPG/Tools/ova_fmt_po/` (binary `ova_fmt_po`) |
| OVA rulebook (PDF, 170 pages) | `~/Reference/RPG/OVA/OVA_The_Anime_Role-Playing_Game.pdf` |
| Character sheet | `~/Reference/RPG/OVA/OVA-CharacterRecord-Letter.pdf` |
| Descriptions as Markdown | `~/Reference/RPG/OVA/abilities.md`, `weaknesses.md` -- **never copy into this repo** (below) |
| The YAML format | the Ada ova_fmt: `~/Repos/RPG/Tools/ova_fmt/PLAN.md` and `test-data/*.yaml` |

## The rulebook's text stays out of the program

The program knows the *names* of Abilities, Weaknesses, Perks and
Flaws, the numbers the rules attach to them, and the rulebook page each
is described on. **It holds no descriptions**: none in the source, the
data tables, tooltips (`title` attributes included), tests or docs. To
explain an item it opens the rulebook's PDF at that page. Don't paste
text from `abilities.md`, `weaknesses.md` or the rulebook into this
repo, even as a comment. **Never bundle the rulebook PDF** or any part
of it into the built page.

**Every name the page shows has its page beside it** (`Attack (p.
50)`), made by `rules.label` or `rules.pageText`, never formatted by
hand. **Page numbers are the book's printed ones**; the PDF's page
index is the printed page + 2 (`rules.pdfIndex`).

## Build / test

```sh
make                 # dist/ova_cg_web.html (npm run build: tsc --noEmit, esbuild, inline)
make test            # the unit tests under Node (node --test), then
                     #   test/files.sh (needs ova_fmt_po: OVA_FMT_PO)
make test-browser    # the built page in headless Chromium and Firefox (Playwright)
make check           # tsc on the three projects (core, ui, tests) and prettier --check
make check-pages     # rules' pages against the rulebook PDF (needs mutool)
make golden          # copy ova_cg_go's obj/files/ into test/golden/ (run its make test first)
make clean           # rm -rf obj dist
```

- `npm ci` once after cloning; `package-lock.json` is committed. Adding
  a dependency needs the user's go-ahead: the built file inlines it.
  Pin exact versions.
- **The built page loads nothing from the network**: no CDN, no web
  fonts, no analytics. Everything is inlined, so it works offline from
  `file://`. `make test-browser` checks that it makes no request.
- **`testdata/` is ova_cg_go's `testdata/`, copied** (itself ova_cg_po's
  `test/data/`, itself the Ada ova_fmt's `test-data/`). Never edit the
  copies: a fixture changes in the Ada ova_fmt first, then down the
  chain to here. Likewise `test/golden/` is only ever refreshed by
  `make golden`, never edited.
- A new YAML key goes into the Ada ova_fmt first, then ova_fmt_po,
  ova_cg_po and ova_cg_go (each in its own repo, with the user's
  go-ahead), before ova_cg_web saves it.

## Browsers and the desktop

- **The page must work in Firefox and in Chromium-based browsers**
  (the user's requirement, 2026-11-07). Every browser test runs in
  both; never use a feature only one of them has without a fallback
  that works in the other (PLAN.md, "Browsers").

- **An agent never opens windows on the user's desktop** (the user's
  rule for ova_cg_po, 2026-10-06, which holds here): not the page in
  the user's browser, not through the Claude in Chrome extension, not a
  headed Playwright browser, not a PDF viewer. Browser tests run
  headless (`make test-browser`). Opening the page in the user's own
  browser happens only when the user asks for it.
- **Never write into the user's browser profile.** Playwright's
  browsers use their own temporary profiles; `npx playwright install`
  downloads browsers into `~/.cache/ms-playwright/` and needs the
  user's go-ahead the first time.
- **Nothing on the page waits for the user** in a way a test can't
  answer: a message, the save-first question, the file choosers, a
  line of text, the download and the rulebook go through the
  `Window`'s function fields (`tell`, `ask`, `chooseFile`, `askText`,
  `download`, `openPage`), as ova_cg_go's do, and a test replaces them
  with synchronous fakes. Never call `alert`, `confirm` or `prompt`:
  they block, and the page uses its own `<dialog>`s.

## TypeScript here

- **The rules and the page are separate.** `src/core/` (`rules`,
  `calc`, `entities`, `character`, `save`, `markdown`, `paths`) uses no
  DOM and no browser global; its tests run under plain Node. Only
  `src/ui/` touches the DOM. Every number on the page comes from
  `calc.compute`; no event handler does arithmetic of its own.
- **Only erasable TypeScript**: Node runs the tests by stripping
  types, so no `enum`, no value `namespace`, no constructor parameter
  properties (`erasableSyntaxOnly` refuses them). Imports name the
  `.ts` file.
- **Port names and order faithfully.** Go's `Compute` applies the
  rules in an order that sets the order of the warnings; keep it.
  Go's exported `CamelCase` becomes `camelCase` functions and
  `PascalCase` types; keep the names otherwise, so a reader can find
  the Go (and the Oberon) behind each one.
- **Absence is `undefined`, never `""`.** Go keeps `HasX bool` beside
  `X string`, since "" and absent save differently; here an optional
  text is `x?: string`, and `""` is a present, empty text. Never test
  absence with `!x`.
- **Integers and booleans in a file are read with polibfyaml's grammar**
  (`entities.parseInt`, `parseBool`, ported from Go's), not the `yaml`
  library's resolver, so the page reads exactly what ova_fmt_po reads.
  Integers stay within 32 bits, as there; check range explicitly, since
  JavaScript numbers won't overflow.
- **Save through the `yaml` library's nodes, never YAML text by hand**,
  set up to write what yaml.v3 writes for ova_cg_go (PLAN.md, "The YAML
  a save writes"). Check a change against `test/golden/` and with
  `test/files.sh`.
- **Text is Unicode code points where the Go counts runes**: the inline
  paragraph's 70 columns count characters, and `"−"` (U+2212) is one.
  Use `[...s].length`, not `s.length`, wherever Go uses
  `utf8.RuneCountInString`.
- **Fill the page with `filling` set**: setting an input's value
  doesn't fire `input`, but code that calls a handler while filling
  mustn't count as a change; `Window.filling` guards every handler, as
  in ova_cg_go.
- **Keys:** the page takes only keys the browser lets it have (PLAN.md,
  "Keys"). Never bind Ctrl+A, C, V, X, Z or Y.
- A programmer error throws; bad input or a cancelled dialog comes back
  as a result with a message, shown in a dialog. Never let an
  exception from a loaded file escape to the console unreported.

## Testing policy

- Run `make test` after any change, and `make test-browser` after a
  change to `src/ui/`, the build or the page's CSS.
- **The sample characters are the oracle for the calculations**, as in
  ova_cg_go: every derived number on a sample character's sheet must
  come out of `calc` from its Abilities, Weaknesses, Perks and Flaws
  alone. A sample the rules can't reproduce is a finding for
  ova_cg_po's PLAN.md, not a test to loosen.
- **ova_cg_go's outputs are the oracle for the files**: each fixture
  loaded and saved must be byte for byte `test/golden/NAME.yaml`, its
  Markdown sheet `NAME.md`, its inline paragraphs `NAME.inline.md`. A
  saved file must also load in ova_fmt_po and format as the fixture
  does (`test/files.sh`), and load here again with no notices, saving
  the same bytes.
- Port each Go check with the same label where it makes sense, so a
  failure can be compared with ova_cg_go's and ova_cg_po's.
- **Prove a new check can fail**: plant the bug it targets and watch it
  fail.

## Conventions

- Prettier-formatted TypeScript, `strict` on. Comments explain why and
  only claim what has been verified; a comment about how a browser,
  the `yaml` library or esbuild behaves is checked with a throwaway
  script in the scratchpad (or a headless browser) first, and says in
  which browsers it was seen.
- A rule in the code cites its rulebook page (`// p. 83`), never its
  text.
- Record decisions and findings in PLAN.md as they happen. Mark a
  finished phase or subphase `[done]` in its heading and strike through
  an open question once it's decided.
- Commit only when the user asks.
