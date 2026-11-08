# PLAN.md - ova_cg_web, the OVA character generator, in a web page

`ova_cg_web` is a port of `ova_cg_go` (`~/Repos/RPG/Tools/ova_cg_go`,
Go with Fyne), itself a port of `ova_cg_po` (`~/Repos/RPG/Tools/ova_cg_po`,
Oberon-2 with FLTK), to TypeScript, running in a web browser. It builds
a character for OVA, the Open Versatile Anime engine, on a page laid out
like ova_cg_po's window, which is laid out like the official character
sheet: the user picks Abilities and Weaknesses by name and level, builds
attacks from Perks and Flaws, and the page works out each attack's and
Ability's Endurance cost and the sheet's ROLL, DX, Defense, Health,
Endurance and TV as the character changes. It holds no rulebook text:
every name shows its rulebook page, and **?** opens the rulebook's PDF,
which the user chooses, at that page. It loads and saves YAML in
ova_fmt's format, the same YAML ova_cg_po and ova_cg_go write, so
ova_fmt_po and the Ada ova_fmt print what it makes.

It is **one HTML file**, built from TypeScript modules, with everything
it needs inlined. A user downloads it and opens it from disk; it needs
no server and loads nothing from the network. It can also be hosted as
it is.

**The port changes the language and the platform, not the program.**
The rules, the data tables, the file format, the window's contents and
behaviour, and the tests' oracles are ova_cg_po's. Its `PLAN.md` is the
design document for all of that and is not repeated here: read its
"Sources and findings", "The rules the program computes", "Limiting the
character", "Data tables", "The window" and "Files" before changing any
rule, table, key or file behaviour. ova_cg_go's `PLAN.md` says how each
Oberon module became a Go package; this file records how each Go
package becomes a TypeScript module, what a browser makes the port
decide differently and why, and the build order. DESIGN-OPTIONS.md
records why this is a hand port to TypeScript and not WebAssembly or
Fyne's web target.

## Sources

| What | Where |
|---|---|
| The Go program (the code to port) | `~/Repos/RPG/Tools/ova_cg_go/` (`internal/*`, `PLAN.md`, `AGENTS.md`) |
| Its tests (to port, check for check) | `~/Repos/RPG/Tools/ova_cg_go/internal/*/*_test.go` |
| The Oberon program (the specification) | `~/Repos/RPG/Tools/ova_cg_po/` (`PLAN.md`, `README.md`, `src/*.Mod`) |
| The fixtures (copied into `testdata/`) | `~/Repos/RPG/Tools/ova_cg_go/testdata/` (ova_cg_po's `test/data/`) |
| The golden outputs (copied into `test/golden/`) | `~/Repos/RPG/Tools/ova_cg_go/obj/files/`, written by its `make test` |
| The file oracle | ova_fmt_po, `~/Repos/RPG/Tools/ova_fmt_po/ova_fmt_po` |
| The rulebook and sheet | `~/Reference/RPG/OVA/` (see AGENTS.md: names and pages only) |

## Tools

| What | Why |
|---|---|
| TypeScript, `strict` | the port's language; types stand in for Go's |
| esbuild | bundles `src/` into one script; also bundles the tests for Node if Node's own type stripping won't do (Phase 0) |
| `yaml` (eemeli), exact version pinned | parses to nodes (line and column for errors, aliases, several documents) and writes from nodes with per-scalar style, which matching yaml.v3's output needs |
| Node 22 (`node --test`) | runs `src/core/`'s tests with no browser |
| happy-dom | a DOM for `src/ui/`'s tests under Node, as Fyne's test driver was for ova_cg_go |
| Playwright, headless Chromium and Firefox | the built page itself: loading, keys, downloads, the file input, no network requests |
| GNU make | the same targets as the sibling repos |

No UI framework. ova_cg_go's window keeps its widgets and refills them
from the character after every change (`changed`, `showAll`); the page
does the same with DOM elements it makes once, which is a direct port
and needs nothing a framework adds. (A framework would also be
inlined into every copy of the file.)

## Layout

```
package.json, package-lock.json
tsconfig.json
GNUmakefile                 make, make test, make test-browser, ...
build/build.mjs             esbuild, then inlines the script and CSS into
                            src/index.html: dist/ova_cg_web.html
src/index.html              the page's skeleton (menu bar, tabs)
src/style.css               the look (FLTK's, approximately)
src/core/rules.ts           internal/rules     (OvaRules)
src/core/calc.ts            internal/calc      (OvaCalc)
src/core/entities.ts        internal/entities  (OvaEntities, OvaText)
src/core/character.ts       internal/character (OvaCharacter)
src/core/save.ts            internal/save      (OvaSave)
src/core/markdown.ts        internal/markdown  (OvaMarkdown, OvaCommon's Markdown)
src/core/inline.ts          internal/markdown/inline.go (OvaInline)
src/core/paths.ts           internal/paths     (OvaPaths): the portrait's path
src/core/guide.ts           the guide's text parsed (the page's own; Phase 15)
src/guide/guide.md          the guide's text
src/ui/window.ts            the page: menus, tabs, title, files, keys
src/ui/widgets.ts           NumberBox, Spinner, the trait list, the name menu
src/ui/traitpanel.ts        the Abilities' and Weaknesses' panels
src/ui/attack.ts            the attack rows and the attack dialog
src/ui/linked.ts            Form, Spells, Companion and Vehicle dialogs
src/ui/background.ts        the Background and Fluff tabs
src/ui/markdowntab.ts       the Markdown tab
src/ui/settings.ts          the Limits dialog
src/ui/rulebook.ts          the chosen PDF and opening it at a page
src/ui/guide.ts             the guide's panel (Help > Guide)
src/ui/dialogs.ts           <dialog>s: tell, ask, askText, the Escape stack
src/main.ts                 makes the Window on the document
test/core/*.test.ts         ports of internal/*'s tests
test/ui/*.test.ts           ports of internal/ui's tests, on happy-dom
test/browser/*.spec.ts      Playwright, on dist/ova_cg_web.html
test/files.sh               the round trip through ova_fmt_po
test/golden/                ova_cg_go's obj/files/, copied (make golden)
testdata/                   the fixtures, copied, kept the same
tools/listrules.ts          PAGE<TAB>NAME of every item, for make check-pages
tools/rulebook-headings.py  copied from ova_cg_go
tools/rulebook-sections.py  PAGE<TAB>HEADING of the sections, for make check-pages
tools/listguide.ts          PAGE<TAB>HEADING of the guide's pages, for make check-pages
tools/checkguide.ts         the guide against the rulebook's words, for make check-guide
obj/                        test outputs (git ignores it)
dist/                       the built page (git ignores it)
```

Only `src/ui/` and `src/main.ts` touch the DOM. `src/core/` can be
tested, and could be used, with no browser at all.

## Module by module

What the TypeScript does differently from the Go; anything not said
here is ova_cg_go's.

### rules

The same table of items in the book's order, the two aliases, `find`
(ASCII case-insensitive), `count`, `get`, `offered`, `label`,
`pageText`, `pageLabel`, `labelOf`, `nameLabel`, `pdfIndex`, the small
tables and the rule pages as constants. The flags stay a bit set in a
`number` (the highest is under 32), with `has`.

### calc

`Number`, `Sheet`, `Trait`, `Mod`, `Spell`, `Attack`, `Options`,
`Warning` as classes or interfaces; `compute` and every rule in the
same order. Go's embedding with an `Owner` back pointer becomes
subclassing: `character.Trait extends calc.Trait`, so calc's lists hold
the character's own records and need no `Owner`. calc still imports
nothing of character and holds no strings. `Number.parse` and `text`
keep the override box's grammar exactly (`1/2`, `10+`).

### entities

The loader, on the `yaml` library's `Document`s (`parseAllDocuments`),
with the same records, the same two kinds of error (a recorded
`LoadError` with a path and the `name` scalar's line and column, or a
fatal message), the same sort and folding, the same trimming, and
polibfyaml's integer and boolean grammar and messages. The path syntax
is polibfyaml's (`/1/abilities/2/name`), built on the way down.

- **A file's YAML error is the library's message**, which differs from
  yaml.v3's and libfyaml's in wording, in ova_fmt_po's form
  (`NAME:LINE:COL: error: MESSAGE`) at the same line and column. The
  fixtures' expected *notices* and the loader's own errors must match
  exactly; a YAML *syntax* error (no fixture has one: `Broken.yaml`'s
  are missing keys) is compared by its file, line and column only.
- **A file comes from a `File`, not a path**: `readEntities(text,
  name)` and `loadAll(text, name)` take the text and the file's name,
  which is what a page has. The Go's "missing file" error has no
  counterpart.
- **`readEntities` is in entities**, not character as in the Go, so the
  `yaml` library's reading is in one module and Phase 3.1 can test it.
  character's `loadAll` calls it.

### character

`Character extends calc.Sheet`, with the same records and edits
(`newTrait`, `insertTrait`, `removeTrait`, `changeTrait`, `newPartner`,
`newSpell`, `removeSpell`, `newAttack`, ...), `build`, `fromEntity`
with its notices, `loadAll`, `recompute`. Optional texts are `?:
string` (AGENTS.md, "Absence is `undefined`").

- `loadAll(text, name)` and `load` take the file's text and its name,
  not a path, and return `{ok, value, notices}` or `{ok: false,
  message}`; the messages are Go's with the name for the path (`NAME
  holds no characters`, `NAME holds 2 characters, not one`). Go's
  `openError` has no counterpart: the page has already read the file.
- Go's `New` is `newCharacter()`, Go's private `newCharacter(k)` is
  `new Character(k)`; `TraitOf`, `ModOf`, `AttackOf`, `SpellOf` and
  `SheetOf` are casts. `HasNpcType` is `npcType?:`, `HasFluffField`
  the `undefined`s of `fluff`, `HasCombatNotes` `combatNotes?:`;
  `HasCombat`, `HasThreatValue`, `HasOptions`, `HasHalfTV` and
  `HasCost` stay booleans, since they aren't the absence of a text.
  `singleSlot` is a public field, for this module only.
- The edits take a user's text as Go's do, `""` for none, and store
  `undefined`; `setText(s)` returns the field's new value. A missing
  detail sorts as `""`, as the loader's sort has it.

### save

`allToText(characters)`, `toEntity`, `copy`. There is no `saveAll` to
a path: the page downloads `allToText`'s result (see "Files in the
browser"). How the text is made is the next section.

### The YAML a save writes

The aim is ova_cg_go's bytes: yaml.v3, indent 2, text tagged `!!str`
and asked for plain (quoted by the emitter wherever plain YAML can't
hold it, or where it reads as a number or boolean: `age: "15"`), text
of more than one line a literal block (`|-` when it has no final line
break, as yaml.v3 writes it), numbers and the sheet's `4/5`, `1/2`,
`10+` plain, `overrides` a flow sequence, sequences indented under
their key (`  abilities:\n    - name: ...`).

Phase 3.4 found (2026-11-07) that no setting of the `yaml` library's
gives those bytes: it picks styles its own way (`#1 fan` double-quoted
where yaml.v3 single-quotes it, `😀` left as it is where yaml.v3
writes `"\U0001F600"`, `1_000` and `2026-11-07` left plain where
yaml.v3 quotes them; seen with yaml 2.9.1). So the structure is the library's nodes (`Document`,
`YAMLSeq`, `YAMLMap`, `Pair`, `Scalar`), but every scalar's text is
written by a port of yaml.v3's, installed as the library's string
tag's `stringify` (a `customTags` that replaces the `str` tag):

- the style node() asks for (a `Text`, save.go's `text()`, is quoted
  if `resolve` reads its plain text as anything but a string; text
  with a line break is a literal) and then `select_scalar_style`'s,
  from `analyze_scalar`;
- `resolve` as yaml.v3 has it: its table of booleans, nulls and
  infinities, and Go's `strconv` for integers (base prefixes, 64-bit
  range, `_` between digits) and floats, and `time.Parse` for its four
  timestamp layouts;
- the single-quoted, double-quoted (yaml.v3's escapes, uppercase hex)
  and literal (`|`, an indent hint, `-` or `+`) writers.

**ova_cg_go builds with `go.yaml.in/yaml/v3` v3.0.4**, not
`gopkg.in/yaml.v3` v3.0.1. They differ here in one way: v3.0.4 always
ends a block scalar's header with a line break, so a literal that
starts with a break has a blank line after `|2-`.

The library's own `ctx.indent` is the indent yaml.v3 writes a
scalar's continuation lines at, in a mapping's value and a sequence's
item, two levels down. `lineWidth: 0` because yaml.v3's width is -1
(it never breaks a line); the library breaks only a flow collection
longer than the width by itself, which no `overrides:` list is, so
it's a guard. `flowCollectionPadding: false` gives `[a, b]`.

Checked against 657 texts written by yaml.v3 itself (a throwaway Go
program in the scratchpad), 656 alike; 85 of them, covering each
branch, are `test/core/scalars.test.ts`. **The one difference**, not
worth matching: a literal text ending in U+2028 or U+2029 (with a
`\n` elsewhere, or it isn't a literal). yaml.v3 counts the LS as the
line's end and writes the next key straight after it; the library
always ends the line with `\n`. Both read back as the same text.

Comments in a loaded file are not kept, as in ova_cg_po and ova_cg_go.

### markdown and inline

`sheet(character)`, `entity(entity)`, `inline(...)`: the same
formatters, writing to an array of strings joined at the end. The
minus sign is U+2212; the inline paragraph fills to 70 columns
counting code points (`[...s].length`). `save` (a file) is gone: the
Markdown tab downloads. As built, `markdown.ts` exports `sheet` and
`entity`, and `inline.ts` `inline` and `inlineEntity`; the pieces the
two Go files share are `markdown.parts`. Where Go's `Sheet` and
`Inline` return "" for a character that can't be read back,
`save.toEntity` throws: a programmer's error (AGENTS.md).

### paths

`normalize`, `isAbsolute`, `absolute`, `dir`, `relative`, `rebase`,
text only, as in Go. Used for the portrait's path only (see "The
portrait").

A page has no working directory, and core uses no `process`: where
Go's `Absolute` and `Dir` take the working directory, `"/"` is used,
as Go's `cwd` falls back to when `os.Getwd` fails.

### ui

| Go / Fyne | TypeScript / DOM |
|---|---|
| `fyne.Window`, 640 x 800 | the page; its content a single column at least 544 px wide (the Fluff tab's least, in ova_cg_go), centred and stretching as the viewport widens |
| `fyne.MainMenu` (File, Character, Rulebook) | a menu bar of `<button>`s opening menus (`role="menubar"`, `menu`, `menuitem`), keyboard-navigable |
| the characters' `widget.Select` beside the tabs | a `<select>` at the menu bar's right, as in ova_cg_po |
| `container.AppTabs` | a tab strip (`role="tablist"`): Character, Attacks, Background, Fluff, Markdown |
| `widget.List` with a page column | a `<table>` of rows, selectable by click and arrow keys |
| `widget.Select` of `rules.label`s | a `<select>` of labels, with `<hr>`/a disabled divider before the Boss Abilities |
| `ui.Spinner` | `<input type="number">` with `min`, `max` and `step` |
| `widget.Entry`, multi-line | `<input>`, `<textarea>` |
| `overrideEntry` beside a label | `NumberBox`: the computed text and an `<input>` that takes its text on Enter and on `change`, refusing a bad number with a message |
| "?" `widget.Button` | `<button>?</button>` calling `openPage` |
| `dialog.NewCustomWithoutButtons` | `<dialog>` with `showModal()`; Escape is the browser's `cancel` event, routed through the same Escape stack |
| the window's title and ` *` | `document.title` and a title line at the top of the page |

## Decisions the port makes

### Browsers

**The page must work in Firefox and in Chromium-based browsers**
(Chrome, Chromium, Edge, Brave, ...), the user's requirement
(2026-11-07): every feature, in both, from `file://`. Every browser
test runs in both, and a feature that only one supports isn't used
(or has a fallback that works in the other). Safari (WebKit) is best
effort: tried in Phase 14.1, not required (it wouldn't run on Fedora
44, so isn't tested).

### Files in the browser

- **Open...** is an `<input type="file" accept=".yaml,.yml">`; a file
  dropped on the page opens too. Both read the file's text and call
  `loadAll`; its notices are shown as ova_cg_go shows them.
- **Save means download, in every browser** (the user's decision,
  2026-11-07). **Save** downloads the YAML as the file's name (a new
  file's, the first character's name with `.yaml`); **Save As...**
  first asks for a name with `askText`. The browser decides where it
  goes, and may rename it (`Acacia (1).yaml`). The File System Access
  API is not used.
- **A download counts as saved**: the page can't know whether the user
  kept it, so the ` *` goes when the download is handed to the browser.
- **Unsaved changes**: New and Open ask first (Save, Don't save,
  Cancel) as in ova_cg_po, Save downloading; closing or reloading the
  tab with unsaved changes gets the browser's own `beforeunload`
  question, whose wording the page can't set.
- **No Quit**: closing the tab is quitting. File keeps New, Open...,
  Save, Save As....

### The rulebook

- **Rulebook > Choose PDF...** is a file input for the PDF; the page
  keeps a Blob URL of it for the session. **?** and **Rulebook > Open**
  open `URL#page=N` (N the PDF index, `rules.pdfIndex`) in a new tab,
  where the browser's own PDF viewer shows it. With no PDF chosen they
  ask for it first, as ova_cg_po asks once.
- The choice is lost when the page is closed: a page can't keep a path
  to a local file. **Viewer...** has no counterpart, and spawn, viewer
  and prefs aren't ported.
- ~~Whether each browser honours `#page=` on a Blob URL, and whether a
  second **?** reuses the tab (`window.open(url, "ova-rulebook")`),
  are checked in Phase 13.~~ Both do, in Chromium and Firefox, given a
  fresh Blob URL each time (Phase 13).

### The portrait

The portrait's path is relative to the YAML file, and a page knows
neither the file's directory nor any other file. So:

- The path is kept as text and saved unchanged; Save As doesn't rebase
  it (both names are in the same unknown directory).
- **Choose...** picks an image with a file input: the portrait's path
  becomes the image's file name (assumed beside the YAML file, which
  the browser can't confirm), and the page shows it for the session.
- A loaded file's portrait shows its path, and **Show...** picks the
  image to show; nothing is embedded in the YAML.

### Keys

A page gets a key only if the browser lets it have it. ova_cg_po's keys,
and what the page does with each (`keys` in `src/ui/window.ts`). In
Phase 5.2 each reached the page in headless Chromium and Firefox and was
prevented (`test/browser/shell.spec.ts`). Headless, the browsers' own
shortcuts never act, so each key was also pressed in the real browsers
(Chromium 154, Firefox 156, 2026-11-07), windowed on a private Xvfb with
openbox, through `xdotool key` (XTEST, the server's real keymap: `wtype`
on a headless sway sends its own keymap, and every `code` came out as
`Escape`). Every key in the table reached the page with the right `key`
and `code` and was prevented, and the focus stayed in the page; no tab
or window opened. A control page that prevents nothing showed the
method sees the browser act: Ctrl+E took the focus to Chromium's
omnibox, and Ctrl+T never reached the page and opened a tab in both.
In Firefox 156 an unprevented Ctrl+E did nothing visible. Ctrl+L, which
the page doesn't use, took the focus to the address bar in both when
unprevented (the page saw the keydown, then a window `blur`, and typed
text went into the address bar). When prevented, the focus stayed in
the page in both, so the browsers give it up too.

| ova_cg_po | Page | Why |
|---|---|---|
| Ctrl+O, Ctrl+S, Ctrl+Shift+S | the same | a page can take them (`preventDefault`) |
| Ctrl+E (Limits...) | the same | Chromium uses it for the omnibox, but gives it up to `preventDefault` |
| Ctrl+N (New), Ctrl+T (Transformed form) | Alt+Shift+N, Alt+Shift+T | the browsers keep them (new window, new tab) |
| Ctrl+Q (Quit) | none | no Quit |
| Ctrl+PgDn, Ctrl+PgUp (next, previous character) | Alt+Shift+PgDn, Alt+Shift+PgUp | the browsers keep them (next, previous tab) |

A key whose item is greyed is still prevented, so it never does what
the browser would do with it instead; so is a key pressed while a
dialog is open, which does nothing (Phase 10: before that it went to
the browser, and Ctrl+S under the Limits dialog would have saved the
web page).

The menus show each item's key, so a user can find it.

### The look

ova_cg_po's layout, item for item, as ova_cg_go's screenshots and
ova_cg_po's PLAN.md, "The window", give it. The look is FLTK's default
scheme approximated with CSS: grey panels, sunken entries, raised
buttons, small sans-serif text, tight spacing, a system font (no font
is bundled). Red for a total over a limit, as there. A
`prefers-color-scheme: dark` variant is not planned (ova_cg_po has
none); an open question.

### Several characters, NPCs, Defenses

ova_cg_go reached ova_cg_po's last state in steps (its phases 10-15:
the Sample NPCs, three Defenses, the narrower window, several
characters in a file, Markdown, inline). This port starts from that
last state: `rules`, `calc`, `entities`, `character` and `save` are
ported with NPC types, Boss Abilities, Witchcraft's curses, three
Defenses, `count:` and several characters from the start, and their
tests with them.

### The guide

**The page's own addition** (the user's request, 2026-11-08): a
step-by-step guide to making an OVA character with the page, shown on
the page itself. ova_cg_po and ova_cg_go have none; it is recorded
here only, and may be carried to them later (the user's decision,
2026-11-08). Built in Phase 15.

- **Help > Guide**, a checkable item in a new Help menu after
  Rulebook, opens and closes it; **Help > About** says the version and
  commit (`about()`, now only the title line's tooltip). Neither has a
  key (the user's decision).
- **A panel beside the sheet, not a modal dialog**, so the user works
  while following it: at the right of the sheet's column when the
  viewport is wide enough for both, otherwise between the menu bar and
  the tabs, folding to its heading line. Not a `<dialog>` (it would
  block the sheet), not a sixth tab (it would hide it), not a `blob:`
  page in a browser tab (Show me couldn't reach the sheet).
- **One step at a time**: a numbered list of the steps to jump to,
  **Back**, **Next** and **Close**. The step is kept while the page is
  open, not between visits: nothing goes into `localStorage` (the
  user's decision).
- **Each step** says what to do on the page, in the guide's own words;
  gives the rulebook's pages for it as names with their pages and a
  **?** (`openPage`), never its text; and has a **Show me** button that
  shows the step's tab and focuses and briefly highlights its control.
- **The steps follow the rulebook's** (pp. 17-21): before starting
  (the PDF, the limits agreed with the GM: Step 0, p. 17; p. 21);
  Concept (Name, Tagline, Concept, NPC Type: Step 1, p. 17; p. 123);
  Abilities (Step 2, p. 18); Abilities with linked content (Form...,
  Spells..., Companion..., Vehicle..., at their items' pages);
  Weaknesses (Step 3, p. 18); attacks and an Ability's Perks and Flaws
  (pp. 83, 105, 106); Health, Endurance, Defense and TV, and overrides
  (Step 4, p. 19; pp. 107, 124); the totals and warnings (p. 21);
  finishing touches (Background, Fluff, portrait: Step 5, p. 19;
  Fluffing, p. 20); saving, several characters, and the Markdown tab.
- **Its source is `src/guide/guide.md`**, a subset of Markdown
  (headings for the steps, paragraphs, lists, bold, italic, code)
  whose references are links of the page's own schemes:
  `[](item:NAME)` is `rules.label` of the item, `[TEXT](page:CONST)`
  `rules.pageLabel` of TEXT and a page constant's page, with a **?**, and
  `[Show me](show:TARGET)` a Show me button. No page number is typed
  by hand; the pages the guide adds (17, 18, 19, 20, 23) are constants
  in `rules.ts`, beside `LimitsPage`. Anything outside the subset is an
  error, in the tests and the build, never shown wrong.
- `src/core/guide.ts` (no DOM) parses it into steps and blocks;
  `src/ui/guide.ts` makes the panel with `createElement`, never
  `innerHTML`. `main.ts` imports the text (esbuild's `text` loader)
  and gives it to the `Window`; the unit tests read the file.
- **No rulebook text, checked**: `make check-guide` refuses a guide
  sharing a run of 8 or more words with the rulebook's text (`mutool`)
  or with `abilities.md` and `weaknesses.md`, and `make check-pages`
  checks the steps' pages against the PDF's headings.
- Progress shown in the steps (a tick when the character has a name,
  an Ability, ...) is for later (the user's decision; "Open
  questions").

## Build order

Each phase ends with its tests passing (`make test`; `make
test-browser` from Phase 5 on) and its heading marked `[done]`, with
what was found written under it.

## Phase 0 Skeleton [done]

### Phase 0.1 The toolchain [done]

`package.json` with TypeScript, esbuild, `yaml`, happy-dom and
Playwright pinned; `tsconfig.json` (`strict`, ES2022, DOM types for
`src/ui` only, through a second `tsconfig` or project references so
`src/core` can't use the DOM by mistake); the `GNUmakefile` targets
of AGENTS.md; `.gitignore` (`node_modules/`, `obj/`, `dist/`). Find out
whether Node 22's type stripping runs the tests directly or esbuild
must bundle them first, and record which.

Done (2026-11-07): TypeScript 7.0.2, esbuild 0.28.2, `yaml` 2.9.1,
happy-dom 21.0.4, @playwright/test 1.65.0, prettier 3.9.10,
@types/node 22.20.5, all exact. Three projects over
`tsconfig.base.json`: `tsconfig.core.json` (`src/core`, lib ES2022, no
`types`: a probe using `document` or `process` there failed to
compile), `tsconfig.ui.json` (`src/core`, `src/ui`, `src/main.ts`, with
the DOM) and `tsconfig.json` (tests, tools, build scripts, with Node's
types). `make check` runs all three and prettier; the core project is
skipped while `src/core` is empty. **Node 22.22 runs the `.ts` tests
directly** (type stripping, no flag, no warning), so nothing bundles
the tests; that limits the source to erasable TypeScript ("Findings").

### Phase 0.2 The single-file build [done]

`build/build.mjs`: esbuild bundles `src/main.ts` (minified, one
script, no source map in the release, an inline one in a debug build),
then writes `dist/ova_cg_web.html` with the CSS in a `<style>` and the
script in a `<script>`, escaping `</script` in the bundle. A page that
says hello, opened by Playwright from `file://`, proves it: no
request, no console error.

Done (2026-11-07): `build/build.mjs` and `build/inline.mjs`, an IIFE
targeting Firefox 115 and Chrome 120; `test/build/inline.test.ts`
(placement, `$&` kept, the refusals). The hello page is 974 bytes and
passes `test/browser/build.spec.ts` in Playwright's headless Chromium
(headless shell 158) and Firefox 159 from `file://`: its title and
text, no request, no console error. Planted bugs failed the checks:
the unsafe-text check taken out and a string replacement (5 unit
tests), and a `fetch` added to the page (both browsers, through the
CSP's console errors). The Playwright browsers took 1 GB under
`~/.cache/ms-playwright/` (Chromium, its headless shell, Firefox,
ffmpeg), on Fedora as Playwright's Ubuntu 24.04 fallback builds.

### Phase 0.3 Fixtures and golden files [done]

`testdata/` copied from ova_cg_go's; `make golden` copying ova_cg_go's
`obj/files/` into `test/golden/` (after its `make test`);
`tools/rulebook-headings.py` copied; README.md, a stub. Record the
commit of ova_cg_go the golden files came from in `test/golden/SOURCE`.

Done (2026-11-07): the 57 fixtures (the same as ova_cg_po's
`test/data/`); `make golden` runs ova_cg_go's save and markdown tests
before copying, so the files are fresh: 169 of them (59 names, the 57
fixtures and two of the save tests' own) from ova_cg_go `e31a351`.

## Phase 1 rules [done]

`src/core/rules.ts` from `internal/rules/rules.go`;
`test/core/rules.test.ts` from `rules_test.go` (every Quick List entry,
of its kind, in order, at its cost; the labels; the small tables; the
Boss Abilities; `offered`). `tools/listrules.ts` and `make
check-pages`, compared with ova_cg_go's `cmd/listrules` output, which
must be identical.

Done (2026-11-07):

- **Go's constants keep their names.** `Kind`, `Flag`, `Link` and
  `CostKind` are plain exported constants (`rules.Ability`,
  `rules.RollEach`, `rules.Spells`, `rules.RangeCost`), with numeric
  literal union types for `Kind`, `Link` and `CostKind`, so a reader
  finds `rules.Ability` where Go has `rules.Ability`. `rules.kinds`
  stands in for Go's `for k := Ability; k <= Flaw; k++`.
- **Items and flags.** `Item` is a frozen class with `has(f)`. Go's
  nil-safe `(*Item).Has` becomes the free function
  `rules.has(it | undefined, f)`, and `Flags.Has` becomes
  `hasFlag(s, f)`.
- **Panics become `RangeError`s**: `get`, `getBoss`, `offered` and the
  small tables throw out of range rather than give `undefined` or
  `NaN`. The tables also refuse a level that isn't an integer. A
  seventh check, "tables out of range", tests this; ova_cg_go needs no
  such check, since Go panics on its own.
- **Ported checks.** The six checks of `rules_test.go` keep their
  labels. Their Quick List rows were converted from the Go file by a
  sed script, not retyped.
- **Compared with ova_cg_go, three ways:**
  - `tools/listrules.ts` prints exactly what ova_cg_go's
    `cmd/listrules` prints (173 lines, compared with `cmp`).
  - The 179 table lines (items, aliases, Boss Abilities) are identical
    to `rules.go`'s once leading space, `;` and comments are stripped.
  - `make check-pages` reports all 173 pages matching the rulebook's
    headings.
- **The checks can fail.** Four planted bugs failed 6 of the 17 tests:
  Ammunition at most twice, Short-Tempered on p. 78, Tough +5 as 50,
  and the aliases ignored.

## Phase 2 calc [done]

`src/core/calc.ts` from `internal/calc/calc.go`;
`test/core/calc.test.ts` from `calc_test.go`: every hand-made case and
`Number.parse`'s grammar. ~~The samples are built by hand in the test,
as the Go test builds them, since entities doesn't exist yet.~~ The Go
test doesn't build the samples: `calc_test.go` holds only the hand-made
cases, and the samples, every number their files hold and the two
rulings as overrides are checked in `character_test.go`, from their
files. They move to Phase 3.2, as in ova_cg_go.

Done (2026-11-07):

- **Classes, without `Owner`.** `Number`, `Mod`, `Spell`, `Trait`,
  `Attack`, `Options` and `Sheet` are classes, and `Warning` an
  interface. Go's `NewSheet`, `InitTrait`, `InitMod`, `InitSpell` and
  `InitAttack` became the constructors, so `character`'s records can
  extend them. A Trait still starts marked for TV from its item's
  `HalfTV` flag, as `InitTrait` does. Nothing holds an `Owner`.
- **`calc.Number` shadows the global `Number`** inside the module. The
  module never uses the global, and callers import it as a namespace
  (`calc.Number`), so Go's name is kept.
- **Kinds and codes.** `SheetKind` (`Character` … `BossSheet`) and
  `Code` (`UnknownItem` … `NotBoss`) are plain consts with literal
  union types, as rules' kinds are.
- **Go's integer arithmetic.** Go's truncating `/` is `quo`
  (`Math.trunc`), in `halfTVLevel` and `halfUp`. `%` already takes the
  dividend's sign in both languages, so the cost-step check is the
  same.
- **The rules run in Go's order**, which sets the order of the
  warnings: each trait and its form, then the partners, the totals,
  the attacks, Defense, Health and TV.
- **Ported checks.** The 11 tests of `calc_test.go` keep their labels.
  As with Go's `t.Errorf`, a failed check doesn't stop its test; the
  test reports every failure at its end.
- **The checks can fail.** Planted bugs each failed a test:
  - a marked Ability's half rounded down;
  - no 5-point cost step;
  - a Companion's TV not floored at 1;
  - TV's roll keeping Accurate;
  - `halfUp` wrong for negatives;
  - seven digits accepted;
  - no 1/2 DX at 0;
  - Boss Abilities' levels counted.

  One planted bug passed at first: `RedirectableAlone` ignoring
  Ranged, Strength-Powered. Neither `calc_test.go` nor ova_cg_po's
  TestCalc has an attack with Redirectable and only Ranged,
  Strength-Powered. That attack is a real one, a thrown weapon or a
  bow drawn by strength (the user, 2026-11-07), so "limits" now has a
  check of its own, not in ova_cg_go's: such an attack isn't warned
  of. The planted bug fails it.

## Phase 3 Files [done]

### Phase 3.1 entities [done]

`src/core/entities.ts` from `internal/entities`: the loader on `yaml`
`Document`s, polibfyaml's scalars, the paths, the sort, the errors.
Its tests load every fixture as ova_cg_go's do, with `Broken.yaml`'s
errors listed (compared as "Module by module", entities, says). Find out how
the `yaml` library reports line and column, aliases, and a stream of
several documents (`two-documents`), and record it.

Done (2026-11-07):

- **The `yaml` library's options.** `parseAllDocuments(text, {schema:
  "failsafe", lineCounter, prettyErrors: false})` (yaml 2.9.1). With
  the failsafe schema every scalar's value is its source text (`~`,
  `0x10`, `true` stay strings), for `parseInt` and `parseBool`; an
  unknown tag (`!!int`) is only a warning, and warnings are ignored.
  It never throws: errors are in each document's `errors`, and an
  empty or comments-only file is an `EmptyStream`, an empty array with
  `empty` set, holding no documents (so no entities).
- **Absence.** An empty `key:` is a scalar with value `""`, type
  `PLAIN` and no tag (yaml.v3's style 0, `!!null`), so that is what
  counts as no value; `? key` gives a value of `null`, which counts as
  none too. An empty sequence item (`- `) is the same empty scalar,
  as in yaml.v3. Quoted `''` and a bare `!!str` are present.
- **Line and column.** A node's `range[0]` is its start, and the
  `LineCounter`'s `linePos` gives its line and column, both 1-based:
  `Broken.yaml`'s 24:13, 27:13, 34:15 and 34:15, as ova_fmt_po prints
  them, and a syntax error's 3:1 as libfyaml's. The columns count
  UTF-16 units; libfyaml's may count characters, which differ only
  after an astral character on the line, untested.
- **Aliases** are `isAlias` nodes, resolved with `resolve(doc)`.
  Merge keys (`<<`) are not applied, as yaml.v3's nodes don't. No
  fixture has an alias; the test has one.
- **Several documents** come in order, and each document's errors
  are reported before its entities are read, as yaml.v3's decoder and
  libfyaml's stream do it, document by document.
- **A duplicate key** is a document error ("Map keys must be unique"),
  as in libfyaml ("duplicate key"), and kept so.
- **Finding: the quoted text in polibfyaml's messages is not
  escaped.** ova_fmt_po says `not a valid integer: "a<TAB>b"` and
  `"a"b\\c"`, the text as it is in plain double quotes; ova_cg_go's
  Go `%q` escapes it (`"a\tb"`). ova_cg_po wins, so `quoted` writes
  ova_fmt_po's. The difference is ova_cg_go's, for its PLAN.md.
- **Records** are interfaces, with Go's `HasX`/`X` pairs as an
  optional `x?:` (absent fields are left out of the object, not set
  to `undefined`); `HasCombat` and `HasFluff` stay, since a block can
  be present and empty, and `fluff` is an array of `string |
  undefined`. `Overrides` is a bit set in a `number` with `has` and
  `withKey` (`with` is reserved).
- **A fatal error is thrown** inside the loader, as a private `Fatal`,
  rather than returned from every function, and `Loader.load` turns it
  back into a result; nothing else throws for bad input.
- **Folding is bytewise, by UTF-8**, as the Go's: `foldCI` gives a
  string of one character per byte, so `===` and `<` compare as Go's
  strings do. The UTF-8 is encoded by hand: core's library (ES2022)
  has no `TextEncoder`.
- **Integers** are converted exactly with `BigInt`, so a long one is
  "out of range", as Go's `ParseInt` overflowing is.
- **The checks.** There is no `entities_test.go` (ova_cg_go tests the
  loader through character's and save's tests); `entities.test.ts`
  loads every fixture, lists `Broken.yaml`'s errors with their lines
  and columns, reads `two-documents`, compares 13 malformed cases with
  ova_fmt_po's output for them, and checks absence, the fields, the
  grammar, the sort and `trim`. Planted bugs each failed a test: an
  empty value present; no sort; the location taken from the missing
  key; 2^31 accepted; `__` accepted; Combat Notes untrimmed; no
  `barrier`; no Latin-1 fold; a later document's errors ignored;
  `npc-type` untrimmed; aliases unresolved; `True` refused.

### Phase 3.2 character [done]

`src/core/character.ts` from `internal/character`: the records, the
edits, `build`, `fromEntity` and its notices, `loadAll`, `one`,
`recompute`, `bestDefense`, `singleDefense`, `setNpcType`;
`character.test.ts` from `character_test.go`, which also checks the
samples: every number their files hold, and the two rulings as
overrides (moved here from Phase 2, as in ova_cg_go).

Done (2026-11-07):

- The port is as "character" above says. `adopt` copies a
  `calc.Number` with `Object.assign` where Go copies the struct.
- The checks are Go's, with its labels: `TestSamples/NAME` for each
  of the twelve samples (every number its file holds comes out of
  `calc`, with no warnings, and Braun's and Natsuki's rulings computed
  first, then as overrides), `TestLoadNotices`, `TestModel` and
  `TestLoadBoss`. All pass on the first run: the samples are
  reproduced by Phase 2's `calc` through this loader. Go's missing
  file check is replaced by an empty text, which holds no characters.
- Planted bugs, each failing a test: no Endurance Use link to an
  Ability; none to an attack; `counts-as` ignored; a listed override
  not adopted; no notice for an unlisted one; `transformed` dropped; a
  Companion built as a character's sheet; a Boss as an Extra;
  Weaknesses sorted first; `copyMods` sharing the mods; a detail
  matched case-sensitively. One passed and is equivalent: dropping the
  last `recompute` in `adoptNumbers`, after TV is adopted, changes
  nothing, since nothing calc computes depends on TV.

### Phase 3.3 paths [done]

`src/core/paths.ts` from `internal/paths`; `paths.test.ts` from
`paths_test.go`.

Done (2026-11-07): a line-for-line port, with the working directory
`"/"` ("paths" above). `TestPaths` has Go's 21 checks with its labels,
the three that used the working directory expecting `"/"`, and one
more for a relative base. Planted bugs, each failing it: a leading
`..` of a relative path dropped; a `..` at the root kept; a name's
prefix taken for a directory; `""` for nothing left, not `"."`; a
relative path rebased with no `from`; `Dir` at the root `""`.

### Phase 3.4 save [done]

`src/core/save.ts` from `internal/save`. First a scratch experiment:
the `yaml` library's options against yaml.v3's output for the awkward
texts of `save_test.go` (`#1 fan`, a leading quote, `- `, `? `, `|`,
`>`, `%`, `@`, a backquote, blanks at either end, `15`, `true`,
several lines with and without a final line break, non-ASCII); then
the emitter's settings, or a port of `analyze_scalar` where they fall
short, recorded under "The YAML a save writes".

`save.test.ts` from `save_test.go`: each fixture loaded with its
expected notices, saved (into `obj/files/NAME.yaml`), equal to
`test/golden/NAME.yaml` byte for byte, loaded again with none, saved
the same; the refused files; `count:`; awkward text; several
characters (Acacia, Zurkrieg, Fragment, Options, `two-documents`);
`copy`.

Done (2026-11-07): the writer is "The YAML a save writes"; the node
builders are save.go's, in its order. Every fixture saves as
`test/golden/NAME.yaml`, byte for byte. `save.test.ts` has Go's checks
with their labels, but its save to a missing directory and load of a
missing file, which the page can't do (it downloads, and is handed a
file's text). `scalars.test.ts` checks the writer against yaml.v3's
outputs. Planted bugs, each failing a check: no timestamps in
`resolve` (`"2026-11-07"` written plain); no `+` chomp; a `'` not
doubled in single quotes. Without `lineWidth: 0` nothing fails: no
real list is long enough (above).

### Phase 3.5 The round trip through ova_fmt_po [done]

`test/files.sh`, ova_cg_go's adapted to read this repo's `obj/files/`:
every saved copy formats as its fixture does in all seven ova_fmt_po
formats and with `-O`, with the override mark taken out for the
fixtures that load with notices.

Done (2026-11-07): ova_cg_go's script, reading this repo's
`obj/files/`; `make test` runs it after the unit tests that write
them. Its Markdown checks (each `obj/files/NAME.md` and
`NAME.inline.md` against ova_fmt_po `-M` and `-i` of the saved copy)
are skipped, saying so, until Phase 4's tests write any `.md`; from
then on a missing one fails. All 432 checks pass: 54 fixtures, each in
eight formats. Planted in a saved copy, each failing it: a level
changed; `overrides: [health]` added where the fixture has none
(ova_fmt_po marks the number).

## Phase 4 Markdown [done]

### Phase 4.1 The sheet [done]

`src/core/markdown.ts` from `internal/markdown/markdown.go`;
`markdown.test.ts`: each fixture's sheet written to
`obj/files/NAME.md` and equal to `test/golden/NAME.md`; `files.sh`
compares each with `ova_fmt_po -M` of the saved copy.

### Phase 4.2 The inline paragraph [done]

`src/core/inline.ts` from `inline.go`: `obj/files/NAME.inline.md`
equal to the golden file and to `ova_fmt_po -i`; the round trip of
`-i` as `files.sh` does it in ova_cg_go. Check the fill's column count
with a fixture holding non-ASCII text.

Done (2026-11-07), 4.1 and 4.2 together, as the Go has them in one
package: `test/core/markdown.test.ts` ports `TestFixtures` (its 55
fixtures, each sheet and inline file equal to the golden one, byte for
byte); `TestSave` has nothing to check, since nothing is written to a
path. `files.sh`'s Markdown checks now run: 542 pass (54 fixtures in
eight formats, and 55 sheets and inline files against ova_fmt_po `-M`
and `-i`). Finding: no fixture can check the fill's column count. Its
non-ASCII characters (−, — and …) are each one UTF-16
unit, so a fill by `s.length` passes every fixture; only text outside
the Basic Multilingual Plane tells the two apart, and changing a
fixture starts in the Ada ova_fmt. So `TestFillCountsCharacters`
checks the fill directly, with "😀" beside "é" and "−", and
`TestFillKeepsBlocksOff` checks `opensBlock` and the words it keeps
together. Planted, each failing: the fill counting `length` (the fill
test); the override mark `\*` never written (12 fixtures); the
setext and thematic-break test left out of `opensBlock` (Raine,
Fragment and the fill test).

## Phase 5 The page's shell [done]

### Phase 5.1 The look and the layout [done]

`src/index.html` and `src/style.css`: the menu bar with the
characters' `<select>` at its right, the five tabs, the title line,
the single column at least 544 px wide. Compare by eye with ova_cg_po
(a screenshot the user provides, or one made with its
`tools/with-sway.sh` headless) and with Playwright screenshots at 640
x 800 and at a wider size; the user judges the look.

Written (2026-11-07): `make test-browser`'s screenshots test writes
`obj/screenshots/{chromium,firefox}-{544x700,640x800,1280x800,menu,tell}.png`
for the user to judge; the user found the look fine (2026-11-07).

### Phase 5.2 Menus and keys [done]

The menus (File, Character, Rulebook) with their items greyed where
they can do nothing; keyboard navigation of the menu bar; the keys of
"Keys", each tried in headless Chromium and Firefox (does the page
receive it, and does `preventDefault` keep the browser from acting?),
with the table updated from what was seen.

Done (2026-11-07): `src/ui/menu.ts`; `test/ui/window.test.ts` ports
`TestShortcuts` and checks the menu bar's and the tabs' keys on
happy-dom; `shell.spec.ts` drives the menus by mouse and keyboard in
both browsers, and presses every key of "Keys" with the real keyboard.
Every key reached the page in both and was prevented; the table above
has the keys chosen. Planted, failing in both browsers: a greyed item's
key not prevented.

### Phase 5.3 Dialogs and the test harness [done]

`src/ui/dialogs.ts`: `tell`, `ask` (Save, Don't save, Cancel),
`askText`, `confirm`-like Remove, the Escape stack, focus returned to
where it was. The `Window` class with its function fields; happy-dom
set up for `test/ui/`, with fakes for every field; a Playwright helper
that loads a fixture into the built page through the file input.
Find out whether happy-dom's `<dialog>` is good enough for the dialog
tests, or whether they belong in Playwright, and record it.

Done (2026-11-07). happy-dom (21.0.4) is good enough for the dialogs'
logic, though not for what the browser does: its `<dialog>` neither
cancels on Escape nor moves the focus in, so `dialogs.ts` moves the
focus itself and its keydown handler takes Escape (both browsers then
send no `cancel` of their own). `test/ui/dialogs.test.ts` checks the
Escape stack (ova_cg_go's `TestEscape`), each dialog's default and the
focus put back, on happy-dom. `shell.spec.ts` checks a real Escape
and the focus in both browsers. `test/browser/page.ts`'s `openFile`
loads a fixture, or given text, through File > Open... and the file
chooser. Planted, failing: the focus not put back.

Finding: **never compare DOM nodes with `assert.equal` or
`deepEqual`** in `test/ui/`. On a failure node:test prints `actual`
and `expected`, and printing a happy-dom node walks its whole window.
That took the test run to about 20 GB, and the OOM killer stopped it
twice (2026-11-07). Use `assert.ok(a === b, label)`. Likewise
TypeScript narrows a variable that a callback or a key changes once an
assert or a comparison has tested it, so the tests read such values
through a function (`answer()`, `tab()`). And `HTMLElement.hidden` is
`boolean | "until-found"` in TypeScript 7's DOM types, so a check
compares it with `=== true`.

## Phase 6 Files on the page [done]

New, Open... (input and drop), Save and Save As... (downloads, the
name, the ` *`), the save-first question, `beforeunload`, the notices
on opening, a file that can't be read or holds mistakes reported in a
dialog and nothing else changed. Playwright checks a download's bytes
against `allToText` and that a downloaded file opens again.

Done (2026-11-07). `Window.save`, `saveAs` and `mayLeave` port
ova_cg_go's, with `download` in place of a file written. Decisions:

- **The name a new file saves as** is `fileName` of the first
  character's name: trimmed, `/` and `\` made `_`, `.yaml` added unless
  it ends in `.yaml` or `.yml` (any case). With no name, Save is Save
  As..., suggesting nothing; an empty name typed there is told ("The
  file needs a name.") and nothing is saved.
- **The save-first question** names the file, else "the characters"
  for several, else the character's name, else "the character", as
  ova_cg_go's does. Save there, cancelled at the name, leaves
  everything as it was.
- **A drop** must be exactly one file (two or more are told "Drop one
  file on the page to open it."), asks first like Open..., and does
  nothing under a dialog. A drag of files always has its default
  prevented, so a missed drop never makes the browser open the file in
  place of the page. A drag of anything else (text) is left to the
  browser.
- **`globalThis.ova` is the `Window`**, so a browser test can mark a
  change before Phase 7 gives the page fields to change.

`test/ui/files.test.ts` ports the "Files" checks of ova_cg_go's
`TestWindow` and `testSeveral` on happy-dom. `test/browser/files.spec.ts`
checks the following in headless Chromium 158 and Firefox 159:

- a download's name and bytes (`test/golden/`), and that it opens again
  with no dialog;
- Save As... and Ctrl+S;
- Group.yaml's notices, and a bad file told with the title unchanged;
- after the save-first `<dialog>`, the file chooser still opens and a
  download is still made (the click on the dialog's button is the
  user's activation);
- a `DragEvent` drop;
- `beforeunload`.

In both browsers `preventDefault()` alone brought up the beforeunload
question once the page had had a click, so the deprecated
`returnValue` isn't set. Planted, failing:

- beforeunload never prevented;
- every drag taken (only the browser test sees it);
- only the shown character saved;
- a drop under a dialog opened (only the unit test sees it).

Finding: `openFile` in `test/browser/page.ts` returns once the file is
chosen, but the page reads the file after that. A change marked at once
was then cleared by the load, and the test failed only under the full
run's load. `files.spec.ts`'s `opens` waits for the title first.

## Phase 7 The Character and Attacks tabs [done]

### Phase 7.1 The Character tab [done]

The names, the tagline and NPC Type (each type with its page); the
Abilities' and Weaknesses' panels (list, name menu with pages, level,
detail, Add, Change, Remove, ?); the selected Ability's END and its
**Perks and Flaws...** button; the totals and warnings; Combat Notes.
`test/ui/window.test.ts` ports `window_test.go`'s checks for these.

### Phase 7.2 The Attacks tab and the attack dialog [done]

The combat box and its numbers, the attack rows (add, remove, edit),
the attack dialog with its Perks and Flaws, END and DX.

### Phase 7.3 Overrides [done]

Every computed number's `NumberBox`: the computed text beside the box,
an override used by everything computed from it, `1/2` and `10+`
where allowed, anything else refused with a message, emptying the box
to go back; a file's numbers that differ from the rules' kept as
overrides and said on opening. The Incorporeal DEFENSE box shown only
with Incorporeal Form.

### Phase 7: decisions and findings

- The checks are in `test/ui/sheet.test.ts`, not `window.test.ts`
  (Phase 5's shell has that name). Its first test ports Go's
  `TestWindow` with Go's labels. The second checks that showing a
  character is no change. `test/browser/sheet.spec.ts` covers what
  happy-dom can't, in Chromium and Firefox:
  - Enter, and leaving the box;
  - the `<select>`'s placeholder;
  - the list's keys;
  - the attack dialog's OK, Cancel and Escape.
- A Panel's name `<select>` starts on a disabled, hidden placeholder
  option, "(choose a name)", as Fyne's Select shows nothing chosen.
  So `choiceIndex()` is `selectedIndex - 1`.
- `NumberBox` takes its text on `change` (leaving the box changed) and
  on Enter (Go's OnSubmitted and FocusLost). `taken` holds the text
  `display` last set, so the second of the two takes nothing: one
  message, not two.
- **Finding:** Enter's default must be prevented in a `NumberBox`.
  Otherwise refused text's message took the focus to its OK button,
  and the same key press pressed it, so the message closed unseen. This
  was seen in Chromium and Firefox; `sheet.spec.ts` fails without the
  fix.
- The selected Ability's linked-content button (`abilityLinked`) stayed
  disabled until Phase 9.
- Go's `addAttack` method is `newAttack` here, since `addAttack` is
  the button's field.
- Cancel in the attack dialog puts the attack back *in place*
  (`Object.assign` into the same `calc.Number`s), since the rows and
  boxes hold those objects. The unit test adds a check Go lacks, that
  Cancel also takes back an END override made in the dialog. A planted
  bug proved it was needed.
- The attack dialog's message for refused text is Go's own ("Not a
  number for ROLL. The computed number is used."), not `notANumber`'s
  longer one, as in Go's `attack.go` and `linked.go`. This is a small
  inconsistency carried over from Go, left as it is.
- Planted, failing:
  - Cancel keeps the mods;
  - Cancel keeps the END;
  - Barrier's box shown inverted;
  - no refresh after NPC Type;
  - no `taken` guard;
  - a row's DX refusing 1/2;
  - OK taking a nameless attack;
  - Enter's default not prevented (browser test only).
- `files.spec.ts`'s `changed` now types over the Character Name and
  puts it back, instead of setting `modified` by hand.

## Phase 8 The Background and Fluff tabs [done]

Summary, Background, Appearance, Personality, Character Hooks and
Other Notes; the portrait as "The portrait" decides; the fluff fields;
the notes (header and text, added, changed and removed as the traits
are). `test/ui/background.test.ts` from `background_test.go`.

### Phase 8: decisions and findings

- The tabs are `src/ui/background.ts`'s `Background`, which builds
  both panels. `test/ui/background.test.ts` ports Go's
  `TestBackground` with Go's labels where the page does as Go does;
  its portrait checks are this page's (below). A second test checks
  that showing a character's tabs is no change.
  `test/browser/background.spec.ts` covers what happy-dom can't, in
  Chromium and Firefox:
  - a PNG and an SVG chosen and shown, within the 160 by 200 box;
  - a file that isn't an image, said so;
  - Show... for a loaded file's path;
  - the five prose sections sharing the tab's height;
  - the fields and a note typed in.
- Go's `Background.filling` is `Window.filling` here, as every other
  handler's guard.
- The portrait, as "The portrait" decides:
  - **Choose...** sets the path to the image's file name, and is a
    change.
  - **Show...** shows an image for the path as it is, and is no change.
  - Images are kept for the session in a map from path to a `blob:`
    URL, so a file loaded again (or another character with the same
    path) shows the image picked before.
  - An `<img>` `error` event forgets the image and says "The image
    can't be read.", keeping the path.
  - Show... and Remove are disabled when there is no portrait.
- **Finding:** happy-dom never fires an image's `load` or `error`
  event, so the unit test fires `error` itself; whether an image is
  shown is the browser test's. Its `File` works only with its own
  window's `URL.createObjectURL`, not Node's, so the page uses
  `doc.defaultView.URL`.
- **Finding:** Chromium reports a `blob:` image's load as a request;
  Firefox doesn't. `watch()` in `test/browser/page.ts` leaves `blob:`
  and `data:` URLs out of the no-network check.
- `checker`, `saved`, `typeIn` and `chooseIn` moved from
  `sheet.test.ts` to `test/ui/setup.ts`. The `chooseFile` fake records
  the `accept` it was given, and gives `Fakes.file` when set.
- Planted, failing:
  - `hasFluff` not kept;
  - the prose not trimmed;
  - Show... counted as a change;
  - Choose... keeping no image;
  - Remove with nothing selected removing a note;
  - an unreadable image remembered;
  - Show... never disabled;
  - `background.show` not called by `showAll`;
  - Change appending instead of replacing.
- Not planted: `show()` without `filling`, since setting a value fires
  no `input` event, so that bug can't be seen.

## Phase 9 Linked content [done]

The one button under the Weaknesses and its three dialogs: Form
(two levels per level of Transformation), Spells (Witchcraft's curses
among the Weaknesses), Companion and Vehicle (the partner's own sheet,
Fragment, combat stats, its Incorporeal box); Character > Transformed
form. `test/ui/linked.test.ts` from `linked_test.go`.

### Phase 9: decisions and findings

- The dialog is `src/ui/linked.ts`'s `LinkedDialog`, Go's, with its
  three shapes. `test/ui/linked.test.ts` ports Go's `TestLinked` check
  for check, with its labels. Two more tests are this page's:
  - Escape, Transformed form's check and its key;
  - opening each kind of linked content being no change.
  `test/browser/linked.spec.ts` covers, in Chromium and Firefox:
  - the dialog modal, with the attack dialog over it, and Escape
    closing the top one first;
  - the menu item's check, by click and by Alt+Shift+T, and the key
    doing nothing under a dialog;
  - the three shapes with Close in view, and screenshots.
- As in Go, the dialog edits the character live and has only Close.
  Close (and Escape, through the dialogs' stack) does nothing while
  the attack dialog for a partner's attack or Perks and Flaws is open
  above it. The window's keys are ignored while any dialog is open, so
  Alt+Shift+T does nothing then.
- Focus on opening goes to the first thing to edit: the form's
  Abilities' name (Form), the spell's name (Spells), the partner's name
  (Companion, Vehicle).
- `PartnerIncorporeal` is written out as 6, not `TV + 1`, because
  `window.ts` imports `linked.ts` and a module-level use of the
  window's constants would read them before they are set. The test
  checks that it equals `TV + 1`.
- Changing a Magic to an Ability of another kind sets its spells to
  `[]`, where Go's are nil; the test checks the length.
- Transformed form is a checkable `MenuItem` (a fifth constructor
  argument): role `menuitemcheckbox`, `aria-checked`, and a ✓ drawn by
  CSS.
- **Finding:** CSS-generated content is part of an element's
  accessible name, so the item was named "✓ Transformed form…" in
  Chromium and Firefox. `content: "\2713" / ""` (empty alternative
  text) keeps it out, in both.
- **Finding:** Playwright's `getByRole` matches a string `name` as a
  substring unless `exact: true`, so the name check passed with the ✓
  in it until it was made exact.
- **Finding:** the Companion's sheet is taller than a 720-high window,
  and a too-tall `<dialog>` scrolls as a whole, so Close was off the
  bottom. An open dialog is now a flex column no taller than the
  window, whose body scrolls, keeping the title and buttons in view.
  The rule is on `.dialog[open]` only, since `display` on a shut
  `<dialog>` would show it.
- The dialog's rows use a new `field-row` class (a label, then an
  entry taking the room left), not `name-row`, whose last child is
  160px wide and would have caught the help button and checkboxes.
- `window.test.ts`'s menu test now expects Transformed form enabled;
  Right from File lands on it, and the "no item to go to" check moved
  to Rulebook.
- Planted, failing:
  - `PartnerIncorporeal` as 5;
  - Close not waiting for the attack dialog;
  - a new partner's sheet not counted as a change;
  - opening a partner counted as a change;
  - the menu item's check not following `transformed`;
  - the ✓ without its empty alternative text (browser test);
  - an open dialog not a flex column (browser test).

## Phase 10 Limits and Boss NPCs [done]

The Limits dialog, the red totals, the warnings with their pages; a
Boss's Abilities with the divider, kept with a warning when the sheet
stops being a Boss. `test/ui/limits.test.ts` from `limits_test.go`.

### Phase 10: decisions and findings

- Character > Limits... is `src/ui/settings.ts`, Go's `SettingsDialog`.
  As in Go, it edits the character's options live, so the totals,
  warnings and lists behind it follow each change (`limitsChanged`).
  Cancel and Escape put back the options and the title's mark as they
  were. A rule turned off keeps its number but doesn't use or save it
  (`same`). The options: block is saved while any rule is on, or when
  the file had one and nothing changed.
- Each rule's name carries its page (`rules.pageLabel`: "Base Zero
  (p. 21): the Character Total within"), unlike Go's plain labels,
  because every name on the page shows its page. Each row also has a ?
  at that page.
- The red totals, the Boss divider and the NotBoss warning were
  already done with the sheet in Phase 7 (`sheet.test.ts`'s
  `bossAbilities`), so this phase only drives them through the dialog.
- `limits.test.ts` ports the Limits half of `TestLimits`, with its
  labels. Its other half, the rulebook and the viewer, is Phase 13's.
  A second test adds what the page has beyond Go's:
  - Ctrl+E opens the dialog, with the focus on Base Zero;
  - each rule's name has its page;
  - Escape works as Cancel.
- A finding: the window's keys went unprevented while a dialog was
  open, so the browser got them. Ctrl+S under the Limits dialog would
  have opened the browser's Save Page. A key is now prevented first and
  then does nothing under a dialog. Phase 5's `window.test.ts` check,
  which expected the key not to be prevented, says so now. In
  `shell.spec.ts`, Ctrl+E now comes last, under the Save As dialog,
  because it opens Limits... and the keys after it would be under it.
- The window's menu test now counts Limits... as enabled. Right from
  File lands on it, Character's first item.
- `test/browser/limits.spec.ts` (Chromium and Firefox, headless):
  - Ctrl+E opens the dialog, modal and named "Limits";
  - Base Zero, clicked, with its range typed as 0, turns the Character
    Total red and marks the title;
  - OK is in view;
  - Escape puts it all back;
  - the page makes no request;
  - it takes a screenshot (`obj/screenshots/*-limits.png`).
- Planted, failing:
  - `same` ignoring Base Zero's range;
  - Cancel not putting back the options;
  - the title's mark not put back on Cancel;
  - half cost always active;
  - `limitsChanged` not refreshing the Weaknesses;
  - keys under a dialog unprevented (unit and browser tests).

## Phase 11 Several characters in a file [done]

The characters' `<select>`; Character > Add, Duplicate, Remove...,
Move Up, Move Down, Next, Previous, each greyed where it can do
nothing; the title's "(N of M)"; Save writing them all, in order.
`window_test.go`'s `testSeveral`.

### Phase 11: decisions and findings

- The `<select>`, the title's count and Save writing every character
  were already in place from Phase 6. This phase adds the Character
  menu's actions. They port ova_cg_go's `appendCharacter`,
  `duplicateCharacter`, `removeCharacter`, `moveCharacter` and
  `stepCharacter`, and `showCharacters` greys the items as Go's does:
  - Remove when there is only one character;
  - Move Up and Previous at the first;
  - Move Down and Next at the last.
- Duplicate uses `save.copy`. Go's `save.Copy` can fail and tells the
  user so; this one throws only on a programmer's error, so there is
  no message for it.
- `test/ui/several.test.ts` ports `testSeveral` with its labels. Two
  differences:
  - Save As... downloads the file, and the test loads the download
    back.
  - Go's check that Save As rebases a portrait's path is left out,
    because a portrait's path is saved as it is here ("The portrait").
- A second test adds:
  - Alt+Shift+PgDn and PgUp, which don't wrap and are prevented at the
    ends;
  - a new character's menu, where only Add and Duplicate are active;
  - each of Add, Duplicate, Remove, Move Up and Move Down marking a
    just-opened file as changed. Go's sequence missed a Remove that
    wasn't a change, because the file was already marked by then.
- `allShown` moved from `sheet.test.ts` to `setup.ts`, since both tests
  use it. The window's menu test counts Add and Duplicate as enabled.
- `test/browser/several.spec.ts` (Chromium and Firefox, headless):
  - the `<select>` chosen by the user;
  - Alt+Shift+PgUp and PgDn from the real keyboard;
  - the Character menu by click, Next greyed at the last;
  - Add, then Move Up;
  - Remove's question as a `<dialog>`, with Cancel focused and Escape
    cancelling, then Remove;
  - no requests.
- Planted, failing:
  - Duplicate sharing the character;
  - Remove showing the one before;
  - Remove taking the only character;
  - Move not following the character;
  - Next never greyed (unit and browser tests);
  - Cancel removing anyway;
  - Remove and Move not counted as a change.

## Phase 12 The Markdown tab [done]

The sheet in a read-only, selectable, monospaced `<pre>`, refreshed
after every change; **Copy** (`navigator.clipboard.writeText`, with a
fallback for a page on `file://` where the browser refuses it: find
out which do); **Save Markdown...** downloading `NAME.md`; **Inline**
showing the paragraph and suggesting `NAME-inline.md`. `test/ui/
markdown.test.ts` from `ui`'s `markdown_test.go`, with its labels.

### Phase 12: decisions and findings

- `src/ui/markdowntab.ts`'s `MarkdownView` ports ova_cg_go's
  `MarkdownView`: `sheet`, `text` (the `<pre>`, labelled "Markdown
  sheet"), `copy`, `save` and the `inline` checkbox; `show(c)`. The
  Window calls `markdown.show` where Go does: at the end of `changed`,
  `textChanged` and `showAll` (so also on opening a file, New, and
  stepping between characters).
- **The clipboard on `file://`**, seen with throwaway pages under
  Playwright, headless, after a click:
  - Firefox 159 takes `navigator.clipboard.writeText`, and `readText`
    gives the text back.
  - Chromium 158 refuses it (`NotAllowedError`, "Write permission
    denied"). The fallback works there: a hidden `<textarea>` holding
    the text, focused and selected, and `document.execCommand("copy")`,
    which returns true and fires a `copy` event with the text selected.
    Playwright can't read Chromium's clipboard back, so the `copy`
    event is the evidence.
  - (Phase 13: Chromium 158's full build, which the browser tests use
    since, takes `writeText` on `file://`, as Firefox does, but refuses
    `readText`; the headless shell above refused it. The browser test
    now also refuses `writeText` itself, so the fallback is exercised
    in both browsers.)
  - So `copyToClipboard` tries `writeText`, falls back to the selection
    when refused (or when there is no clipboard API), and, if both
    fail, tells the user to select the sheet and copy it (`CantCopy`).
    Copy goes through a new Window function field, `copyText`, which
    the tests replace (`Fakes.copied`).
- **Save Markdown...** asks for the name with `askText` ("Save the
  sheet as:"), as Save As... does, and downloads. It suggests `NAME.md`,
  or `NAME-inline.md` with Inline checked, or nothing for a character
  with no name, as Go does. `markdownName` is `fileName`'s counterpart:
  trimmed, a directory's `/` or `\` made `_`, `.md` added unless the
  name ends in `.md` or `.markdown`. An empty name is told "The file
  needs a name."; a cancel saves and says nothing. Saving doesn't mark
  the character changed. A download of a name ending in `.md` is a
  `text/markdown` Blob, otherwise `application/yaml`.
- `test/ui/markdown.test.ts` ports `TestMarkdown` with its labels.
  Go's "a file that can't be written" has no counterpart, since a
  download can't fail that way. The page's own checks:
  - an empty name;
  - a `.markdown` name with a directory;
  - Copy with Inline checked copying the paragraph (a plant that copied
    the sheet passed Go's sequence);
  - the tab following Next and Previous, a tagline and an overridden
    number, with Inline and stepping no change;
  - `markdownName`;
  - `copyToClipboard`'s three ways, with the browser's parts replaced.
    happy-dom's `select()` doesn't focus the `<textarea>` (Chromium's
    did), so the fallback focuses it first.
- `test/browser/markdown.spec.ts` (Chromium and Firefox, headless):
  - the sheet monospaced and byte for byte `test/golden/Ai.md`;
  - Copy reaching the clipboard, read back in Firefox and seen by the
    `copy` event in Chromium, with no message and the buffer gone;
  - Save Markdown... suggesting and downloading `Ai.md`;
  - Inline showing and downloading `Ai-inline.md`, byte for byte
    `test/golden/Ai.inline.md`;
  - no requests;
  - a screenshot.
- Planted, failing:
  - `textChanged`, `changed` or `showAll` not showing the tab;
  - the inline suggestion without `-inline`;
  - Save marking the character changed;
  - Inline ignored;
  - a cancel telling the user something;
  - no fallback (in the unit tests, and in the browser test in
    Chromium, while Firefox still passes);
  - the buffer left on the page;
  - Copy copying the sheet when Inline is checked;
  - the name not kept.

## Phase 13 The rulebook [done]

Rulebook > Choose PDF... and Open; every "?" button; the page
reached, in headless Chromium and Firefox, from `file://`, with a
small PDF made for the test (never the rulebook); whether a second "?"
reuses the tab. Record what each browser does under "Findings".

### Phase 13: decisions and findings

- `src/ui/rulebook.ts`'s `Rulebook` keeps the `File` chosen for the
  session (`chosen`, `choose`) and makes its URLs: `url(page)` is a
  fresh `blob:` URL of it with `#page=` `rules.pdfIndex(page)` (the
  printed page + 2), the one before revoked a minute later. `isPdf`
  takes a file whose type says PDF or whose name ends in `.pdf`.
- The Window: **Rulebook > Open** is `openPage(1)`; **Choose PDF...**
  is `chooseRulebook`, which refuses a file that isn't a PDF ("NAME
  isn't a PDF: choose the rulebook's PDF.") and keeps the one before.
  `openPage` is `openRulebook`: with a PDF chosen it opens it at once;
  with none it first asks (`confirm`, `NoRulebook`, its button "Choose
  PDF..."), Cancel ending it, and OK opening the chooser and then the
  tab. Go opens its chooser at once; a page's file chooser says
  nothing of why it opened, so the page says first. A new Window
  function field, `openTab(url)`, is `window.open(url, "ova-rulebook")`
  and says whether the browser opened it; refused, the user is told
  `TabBlocked`. The tests replace it (`Fakes.tabs`, `Fakes.blocked`).
- **The browsers' PDF viewers** (Playwright 1.65, headless,
  `file://`, a PDF made by `test/browser/pdf.ts`):
  - Playwright's default Chromium, the headless shell, has no PDF
    viewer (the tab's URL stays empty), and its Firefox sets
    `pdfjs.disabled`, so the PDF is downloaded. `playwright.config.ts`
    now runs Chromium's full build (`channel: "chromium"`, 158) and
    Firefox 159 with `pdfjs.disabled` false, for every browser test.
  - Both open the tab from a click and from the file chooser's change
    after the question, give it the name, and reuse it for the next
    `window.open` with the same name.
  - Both honour `#page=N` on a `blob:` URL.
  - **Chromium ignores a fragment-only change in the reused tab**: a
    tab showing `blob:X#page=3`, sent `blob:X#page=5`, changes its
    address but stays at page 3. A fresh `blob:` URL of the same file
    shows its page. Firefox goes to the page either way. Hence a fresh
    URL each time.
  - Firefox's pdf.js says the page it shows
    (`PDFViewerApplication.page`); Chromium's viewer says it in its
    "Page number" field, in a `chrome-extension:` frame Playwright can
    read. Firefox shows page 1 for a page beyond the PDF's end.
  - The full Chromium build takes `navigator.clipboard.writeText` on
    `file://` (Phase 12's finding was the headless shell's).
- `test/ui/rulebook.test.ts` ports Go's rulebook checks
  (`limits_test.go`'s second half, and "Rulebook > Open opens it at
  page 1") with their labels where they apply: asked for and
  cancelled; the chooser cancelled; chosen, opened at page 1 (the
  PDF's 3); found the next time, not asked again; a fresh URL each
  time, the one before revoked after a minute; ? at the item's page;
  a file that isn't a PDF refused; Choose PDF... used from then on,
  and kept when cancelled; a blocked tab told; ? asking first with none
  chosen; `isPdf`. Go's path kept between sessions and its Viewer...
  have no counterpart.
- `test/browser/rulebook.spec.ts` (Chromium and Firefox): ? with none
  chosen asks, Choose PDF... in the dialog opens the chooser, and the
  PDF opens in a new tab at page 56 (Flight, p. 54); Rulebook > Open
  shows page 3 in the same tab; Choose PDF... takes another PDF, and ?
  shows its page 52 (Attack, p. 50), still in that tab; the question
  cancelled opens nothing; no requests, no errors; screenshots.
- Planted, failing:
  - in the unit tests: the page offset left out; the URL reused;
    revoked at once; Open not at page 1; a blocked tab not told; a
    non-PDF accepted; Cancel ignored; asked every time; not asked;
  - in the browser test: the URL reused (Chromium stays at its page;
    Firefox keeps the first PDF); the tab not named (both open a tab
    each time).

## Phase 14 Release [done]

### Phase 14.1 Browsers and size [done]

The Playwright suite in Chromium and Firefox (required) and WebKit
(best effort, "Browsers"), from `file://` and from a local `http://`
server; the built file's size recorded
here and a budget set; no network request, no console error, on every
fixture.

Done (2026-11-07):

- **`http://`**: `test/browser/serve.ts` serves `dist/ova_cg_web.html`
  (and nothing else, 404) at `http://127.0.0.1:8713/ova_cg_web.html`.
  With `OVA_HTTP` set, `test/browser/page.ts`'s `PAGE_URL` is that URL
  and `playwright.config.ts` starts the server (`webServer`) and writes
  to `obj/playwright-http`. `make test-browser` runs the whole suite
  twice, from `file://` and from `http://`, in both browsers.
- **Finding: Firefox 159, from `http://`, asks for `/favicon.ico`**,
  which the CSP refuses with a console error that failed every Firefox
  test; from `file://` it asks for none, and Chromium 158 asks for none
  either way. `src/index.html` now has `<link rel="icon" href="data:,">`,
  an empty icon, and Firefox asks for nothing.
- **Every fixture**: `test/browser/fixtures.spec.ts` opens each of
  `testdata/*.yaml` (57; a check that there are more than 50 catches a
  glob gone wrong), in both browsers, from both URLs. Each must open,
  except `Broken.yaml`, which must be refused with a message; a dialog
  of notices (Acacia, Escaping, Group, Nazo, Unsorted, Vehicle,
  defense-best-differs: overrides found) must say something, and is
  closed. Then every character in the file is shown in turn, with the
  title saying which, and every tab is clicked and shown. The title
  must not end in ` *` (opening and looking are no change); no request,
  no console error. Planted, failing: a throw in `MarkdownView.show`
  for one character of `two-documents.yaml` failed that fixture in
  both browsers.
- **WebKit: not run.** Playwright 1.65's WebKit for Linux is built for
  Ubuntu 24.04; `npx playwright install webkit` (the user's go-ahead)
  falls back to it on Fedora 44, and it won't start there: it needs
  `libicu*.so.74` (Fedora has ICU 77), `libjpeg.so.8` (Fedora's
  libjpeg-turbo gives `.so.62`), `libjxl.so.0.8`, `libbacktrace.so.0`
  and `libWPEWebKit-2.0.so.1`, none of which Fedora packages. Recorded
  and skipped (the user's decision, 2026-11-07); Safari stays
  untested. The download is in `~/.cache/ms-playwright/webkit-2388`.
- **The size**, release build, 2026-11-07: 227,953 bytes (70,844
  gzipped with `-9`). Of the minified script, the `yaml` library is
  97,445 bytes, `src/core` 52,368 and `src/ui` 64,626; the CSS is
  12,363. The debug build (`make debug`, unminified, with source maps)
  is 1,697,233. **The budget is 256 KiB** (`budget` in
  `build/build.mjs`): a release build larger than that fails the build.
  Planted, failing: a budget of 200 KiB failed `make`.

### Phase 14.2 The user guide [done]

README.md: what the page is, how to get and open it, ova_cg_po's
user guide adapted (the menus and their keys, the tabs, files as
downloads, the rulebook, the portrait), and how to build it.

Done (2026-11-07): ova_cg_go's README "Using the window", adapted:
the keys the page uses in place of the browsers' (Alt+Shift), no Quit,
files as downloads and where they go, the portrait as a path with the
image chosen, the rulebook as a PDF chosen for the session and shown
in the browser's viewer, and no Viewer.... Escape closes a dialog even
from a text field, as `dialogs.ts` does (ova_cg_go's README says
otherwise of its own window).

### Phase 14.3 Distribution [done]

How users get the file (~~open question: a GitHub release asset,
GitHub Pages, or both~~ a release asset, the user's decision,
2026-11-07), and a version and the build's commit shown in the page
(the title line's tooltip).

Done (2026-11-07):

- **The version and commit.** `build/build.mjs` reads the version from
  `package.json` and the commit from `git rev-parse --short=12 HEAD`,
  with `+` after it when tracked files have uncommitted changes
  (`unknown` without git), and gives them to esbuild as `define`s,
  `OVA_VERSION` and `OVA_COMMIT`. `src/ui/version.ts` reads them
  (`dev` and none when not built, as under the unit tests), and the
  title line's `title` is `about()`: `ova_cg_web 0.0.0, built from
  ba692e3abcde`. `test/ui/version.test.ts` checks the unbuilt values;
  `test/browser/build.spec.ts` checks the built page's tooltip against
  `package.json` and a 12-digit commit.
- **`make release`** refuses a tree with uncommitted (tracked)
  changes, a version already tagged (after `git fetch --tags origin`,
  so a tag on GitHub counts) and a HEAD not on `origin/main`. Then it
  builds the page, writes `dist/SHA256SUMS` (`sha256sum`, run in
  `dist/` so the name is bare) and signs it with gpg
  (`dist/SHA256SUMS.asc`, armored, detached, verified at once), makes
  a signed annotated tag `vVERSION` (`git tag -s`) and pushes it, and
  runs `gh release create vVERSION --verify-tag` with the page and
  both files (the user's request, 2026-11-08). `GPG_KEY` picks the
  key; `DRY=1` shows the tag, the push and the gh command instead of
  running them; `GH=echo` runs all but gh. Tried in a scratch clone,
  with a local bare repository as origin and a throwaway ed25519 key
  in a scratch `GNUPGHOME`: each refusal; `DRY=1` signing and making
  no tag; `GH=echo` pushing a tag whose signature `git verify-tag`
  takes, a `SHA256SUMS` that `sha256sum -c` and `gpg --verify` take,
  and the gh command; a second run refused as tagged; a page changed
  after failing `sha256sum -c`. README.md, "Making a release", gives
  the steps, and how to check a download.
- The version is set with `make version V=X.Y.Z`, which refuses
  anything else and runs `npm version --no-git-tag-version` (tried on
  copies: an empty, two-part, `v`-prefixed and pre-release version
  refused; 0.1.0 set in both files; the same again refused by npm). The
  first release is 0.1.0 (the user's choice, 2026-11-08). The repository is private, so its releases are visible only
  to those it is shared with.

## Phase 15 The guide

The guide of "The guide", in four steps. The release's size budget
(256 KiB, Phase 14.1) is measured with it; raising it is the user's
decision.

### Phase 15.1 The guide's source and parser [done]

`src/core/guide.ts`: the subset of Markdown parsed into steps and
blocks, and the `item:`, `page:` and `show:` links, refusing anything
else with its line. The page constants the steps need in `rules.ts`.
esbuild's `text` loader for `src/guide/*.md`, and `main.ts` handing
the text to the `Window`. `test/core/guide.test.ts`: the parser on
small texts, each refusal; on the real guide, every `item:` found by
`rules.find`, every `page:` a known constant, every step with a title.
`make check-guide` (the 8-word check, with `mutool`), and the steps'
pages added to `make check-pages`. A placeholder `guide.md` of two
steps, so the parser and panel are built against a real file.

Done (2026-11-08):

- **`src/core/guide.ts`**: `parse(text)` gives a `Guide` (its title,
  and its `Step`s, each a title and `Block`s: paragraphs and lists,
  bulleted or numbered, of `Inline` runs: text, strong, emphasis,
  code, item, page, show), or throws `GuideError` with the line
  (`guide.md:18: no item "Atack"`). Lines are joined with a space; an
  item goes on in its indented lines; a blank line ends a paragraph or
  a list. Refused: a tab, a space at a line's end, an indented line
  outside a list item, a list mixing `-` and numbers or numbered out
  of order, `*`, `+`, `>`, `|` and fences at a line's start, `###`,
  text before the first step, a step with nothing in it; unclosed or
  empty `**`, `*` and code, `**`/`*` with a space just inside (so a
  loose `*` must be `\*`), `*` in `*` and `**` in `**`, `\` before
  anything but ASCII punctuation, a bare `_`, `<` or `]`, a `[...]`
  that isn't a link, a link of any other scheme (no link leaves the
  page), formatting in a link's text, an `item:` with text or not
  written as `rules` names it (`item:attack`), an unknown `page:`, a
  `show:` target not lower-case words joined by `-`.
- **`item:` takes an item's name with its parentheses**, `[](item:
  Vehicle (Mecha))`: the destination ends at the `)` that balances.
- **`page:` names an entry of `guide.pages`**: the constant's name in
  `rules.ts`, its page and the heading the rulebook prints there.
  `rules.ts` gains `DiscussionPage` and `ConceptPage` (17),
  `AbilitiesStepPage` and `WeaknessesStepPage` (18),
  `HealthEnduranceStepPage` and `FinishingTouchesPage` (19),
  `FluffingPage` (20) and `SampleCharactersPage` (23, "Using the
  Characters"); the table also lists the rule pages there before
  (`LimitsPage`, `PerksFlawsPage`, `AffinitiesPage`, `QuickListPage`,
  `RollsPage` "Attack!", `DamagePage`, `HealthEndurancePage`,
  `NpcTypesPage` "Creating NPCs", `ThreatValuePage`). `SpellCostPage`
  and `HalfCostPage` are in no section's heading (they are entries'
  pages, which `make check-pages` already checks), so aren't offered.
  The page is shown with `rules.pageLabel`, not `rules.pageText`
  (which takes an item).
- **Comments, `<!-- ... -->` on lines of their own, are taken out by
  the build**: `build/inline.mjs` refuses a script holding `<!--`, and
  the guide's text is a string in the script. An esbuild plugin loads
  `src/guide/*.md` as text through `guide.stripComments`, which makes
  each comment's lines empty, so the other lines keep their numbers.
  The parser's own test for a comment is the regular expression
  `/^<!-{2}/`, since the string `"<!--"` in `guide.ts` would be in the
  script too (the first build refused both).
- **The build parses the guide first** (`build/build.mjs` imports
  `src/core/guide.ts`, which Node 22.22 runs by stripping types), so a
  mistake fails `make` with its line, not the page as it opens.
  `main.ts` imports the text (`src/guide/guide.d.ts` declares `*.md`
  as a string) and gives `parse` of it to `new Window(doc, guide)`,
  which keeps it (`Window.guide`) for Phase 15.2; the tests' Window has
  none.
- **`make check-pages`** also runs `tools/rulebook-sections.py` (each
  heading in ChaletComprime-HongKong, the face of the chapters' 16-
  and 13-point section headings, across the whole PDF: 286) and
  `tools/listguide.ts` (`guide.pages`), and fails for a page the
  sections don't have at that page: all 17 match.
- **`make check-guide`**: `tools/checkguide.ts` reads the rulebook's
  text from mutool on standard input (never written to disk), and
  `abilities.md` and `weaknesses.md` (`REFERENCE_MD`), and refuses a
  guide any of whose paragraphs, items or titles, as the page shows
  them (an item as its label), shares a run of 8 words (lower-case,
  letters and digits; soft hyphens and line-end hyphens joined) with
  them. The rulebook gives some 64,000 words; a source of under 10,000
  runs is refused as missing.
- `test/core/guide.test.ts`: the subset parsed into its tree; each
  refusal with its line and message; what it takes that might seem
  not (emphasis in strong and strong in emphasis, escapes, code as
  written, parentheses); `stripComments` keeping lines, and the real
  guide holding no `<!--` once stripped; each entry of `pages` its
  constant's page, once; `targets`, `plainText`, `paragraphs`; the
  real guide parsed, every step titled.
- Planted, failing: in the unit tests, `**` with spaces taken, an
  item's name not checked exactly, comments' lines kept, numbering
  not checked, lines joined with no space, an empty step taken, a
  target's text taken for its name; a guide naming `item:Atack`
  failing `make` and the tests; in `make check-pages`, `FluffingPage`
  19 and a heading misspelled; in `make check-guide`, a run of the
  rulebook's PDF and one of `abilities.md` alone (each found), and an
  empty rulebook refused.
- The size: 234,001 bytes, from 227,953 (the parser and the
  placeholder).

### Phase 15.2 The panel

The Help menu (Guide, checkable; About); the panel at both widths,
folding when narrow; the step list, Back, Next and Close; each step's
names with pages and **?** buttons through `openPage`; Show me through
a list of targets the `Window` keeps (a name, its tab, its element),
every `show:` in the guide naming one. Escape doesn't close the panel
(it isn't a dialog). Opening and stepping through the guide is no
change to the character (no ` *`). `test/ui/guide.test.ts` on
happy-dom: the menu item's check following the panel; Back and Next
at the ends; the list jumping; the step kept when closed and opened;
? calling `openPage` with the step's page; every target in the guide
showing its tab and focusing its element; no change.

### Phase 15.3 Writing the guide

The steps of "The guide", in the guide's own words, in
`src/guide/guide.md`, passing `make check-guide` and `make
check-pages`; checked against the page as it is (each control a step
names exists and is called what the page calls it).

### Phase 15.4 Browsers and release

`test/browser/guide.spec.ts`, in Chromium and Firefox, from `file://`
and `http://`: Help > Guide opening and closing it; every step shown;
every Show me showing its tab and its control focused; a **?** opening
the test PDF at its page; the panel beside the sheet when wide and
above the tabs when narrow; screenshots of both; no requests, no
console errors. The built size recorded here, against the budget.
README.md, "Using the page": Help > Guide and Help > About.

## Testing

- `make test`: `src/core` under Node against `testdata/` and
  `test/golden/`; `src/ui` on happy-dom; then `test/files.sh` (needs
  ova_fmt_po at `OVA_FMT_PO`).
- `make test-browser`: the built page, headless, in Chromium and
  Firefox, both required, from `file://` and then from `http://`
  (`test/browser/serve.ts`). WebKit won't run on Fedora 44 (Phase
  14.1), so isn't tested.
- `make check-pages`: rules' pages against the PDF's headings, and
  the guide's against its sections' headings.
- `make check-guide`: the guide shares no run of 8 words with the
  rulebook.
- `make check`: `tsc --noEmit` for both projects, and the linter.
- The oracle for calculations is the sample characters; the oracle for
  files is ova_cg_go's saved copies and ova_fmt_po.

## Findings

What the port finds out about TypeScript, the `yaml` library, esbuild
and the browsers that ova_cg_go's design didn't have to know.

- **Only erasable TypeScript** (2026-11-07). Node runs the tests by
  stripping types, which can't do what needs code generated: no
  `enum`, no `namespace` with values, no constructor parameter
  properties. `erasableSyntaxOnly` makes `tsc` refuse them. Go's
  `iota` constants become `as const` objects or plain `const`s, and an
  import names the `.ts` file (`allowImportingTsExtensions`), which
  esbuild accepts too.
- **esbuild escapes `</script` but not `<!--` or `<script`** (0.28.2,
  in strings, template literals and regular expressions, minified or
  not). `build/inline.mjs` refuses a bundle holding any of the three
  rather than rewriting it.
- **The page's Content-Security-Policy forbids fetching** anything
  (`default-src 'none'`, with inline script and style, and `blob:` and
  `data:` images for the portrait), so the no-network rule is enforced
  by the browser as well as tested.
- **The rulebook's tab** (Phase 13, headless Chromium 158's full build
  and Firefox 159 with pdf.js on): both open `window.open(blobURL +
  "#page=N", "ova-rulebook")` at page N and reuse the named tab; but
  Chromium's viewer ignores a change of the fragment alone, so each
  opening makes a fresh `blob:` URL. Playwright's defaults have no PDF
  viewer (the headless shell; Firefox's `pdfjs.disabled`), so the
  tests run the full Chromium build and turn pdf.js on.
- **Firefox asks a page served over `http://` for `/favicon.ico`**
  (159, headless; not from `file://`, and Chromium 158 never), and the
  CSP's refusal is a console error. An empty `data:,` icon stops it
  (Phase 14.1).
- **Playwright's WebKit doesn't run on Fedora 44**: its Ubuntu 24.04
  build needs libraries Fedora doesn't have (Phase 14.1).

## Open questions

- Is a later Draft autosave wanted: the characters kept in
  `localStorage` as they change, offered back when the page opens
  after being closed unsaved? Storage on `file://` is per-browser and
  can be lost, so it would be a convenience, not saving.
- A dark colour scheme (`prefers-color-scheme: dark`)?
- ~~Distribution: a GitHub release asset, GitHub Pages, or both?~~ A
  release asset (the user's decision, 2026-11-07; Phase 14.3).
- Is a dropped file's or chosen image's name enough for the portrait,
  or should **Choose...** ask for the path as text too?
  (Phase 8 uses the name alone, as "The portrait" decides.)
- Should the guide's steps show progress, a tick when the character
  has what the step asks for (a name, an Ability, ...)? Later (the
  user's decision, 2026-11-08; "The guide").
