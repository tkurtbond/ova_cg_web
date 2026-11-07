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
src/ui/window.ts            the page: menus, tabs, title, files, keys
src/ui/widgets.ts           NumberBox, Spinner, the trait list, the name menu
src/ui/traitpanel.ts        the Abilities' and Weaknesses' panels
src/ui/attack.ts            the attack rows and the attack dialog
src/ui/linked.ts            Form, Spells, Companion and Vehicle dialogs
src/ui/background.ts        the Background and Fluff tabs
src/ui/markdowntab.ts       the Markdown tab
src/ui/settings.ts          the Limits dialog
src/ui/rulebook.ts          the chosen PDF and opening it at a page
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
  yaml.v3's and libfyaml's in wording. The fixtures' expected *notices*
  must match ova_cg_go's exactly; a YAML *syntax* error need only be
  reported with its line, since `Broken.yaml` is the only fixture that
  has one, and the test says which part it compares.
- **A file comes from a `File`, not a path**: `loadAll(text, name)`
  takes the text and the file's name, which is what a page has. The
  Go's "missing file" error has no counterpart.

### character

`Character extends calc.Sheet`, with the same records and edits
(`newTrait`, `insertTrait`, `removeTrait`, `changeTrait`, `newPartner`,
`newSpell`, `removeSpell`, `newAttack`, ...), `build`, `fromEntity`
with its notices, `loadAll`, `recompute`. Optional texts are `?:
string` (AGENTS.md, "Absence is `undefined`").

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

The `yaml` library's emitter is configured (indentation, `indentSeq`,
line width off, `defaultStringType`, per-node `type`) and, where that
isn't enough, its scalars' style is chosen by a port of libyaml's
`analyze_scalar`, the function yaml.v3 decides with. Phase 3.4 finds
out which. **If some case can't be made byte-identical**, the fallback
oracle is ova_cg_po's and ova_cg_go's: ova_fmt_po formats the saved
copy as it formats the fixture, and the copy reloads with no notices
and saves the same bytes again. Any such case is a finding, here.

Comments in a loaded file are not kept, as in ova_cg_po and ova_cg_go.

### markdown and inline

`sheet(character)`, `entity(entity)`, `inline(...)`: the same
formatters, writing to an array of strings joined at the end. The
minus sign is U+2212; the inline paragraph fills to 70 columns
counting code points (`[...s].length`). `save` (a file) is gone: the
Markdown tab downloads.

### paths

`normalize`, `isAbsolute`, `absolute`, `dir`, `relative`, `rebase`,
text only, as in Go. Used for the portrait's path only (see "The
portrait").

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
- Whether each browser honours `#page=` on a Blob URL, and whether a
  second **?** reuses the tab (`window.open(url, "ova-rulebook")`),
  are checked in Phase 13.

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
and what the page does with each (to be confirmed in Phase 5.2 in
headless Chromium and Firefox, and by the user in a real browser):

| ova_cg_po | Page | Why |
|---|---|---|
| Ctrl+O, Ctrl+S, Ctrl+Shift+S | the same | a page can take them (`preventDefault`) |
| Ctrl+E (Limits...) | the same, if the browsers give it up; else Alt+Shift+E | Chromium and Firefox use it for the search box |
| Ctrl+N (New), Ctrl+T (Transformed form) | an Alt+Shift key, chosen in Phase 5.2 | the browsers keep them (new window, new tab) |
| Ctrl+Q (Quit) | none | no Quit |
| Ctrl+PgDn, Ctrl+PgUp (next, previous character) | an Alt+Shift key, chosen in Phase 5.2 | the browsers keep them (next, previous tab) |

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

## Build order

Each phase ends with its tests passing (`make test`; `make
test-browser` from Phase 5 on) and its heading marked `[done]`, with
what was found written under it.

## Phase 0 Skeleton

### Phase 0.1 The toolchain

`package.json` with TypeScript, esbuild, `yaml`, happy-dom and
Playwright pinned; `tsconfig.json` (`strict`, ES2022, DOM types for
`src/ui` only, through a second `tsconfig` or project references so
`src/core` can't use the DOM by mistake); the `GNUmakefile` targets
of AGENTS.md; `.gitignore` (`node_modules/`, `obj/`, `dist/`). Find out
whether Node 22's type stripping runs the tests directly or esbuild
must bundle them first, and record which.

### Phase 0.2 The single-file build

`build/build.mjs`: esbuild bundles `src/main.ts` (minified, one
script, no source map in the release, an inline one in a debug build),
then writes `dist/ova_cg_web.html` with the CSS in a `<style>` and the
script in a `<script>`, escaping `</script` in the bundle. A page that
says hello, opened by Playwright from `file://`, proves it: no
request, no console error.

### Phase 0.3 Fixtures and golden files

`testdata/` copied from ova_cg_go's; `make golden` copying ova_cg_go's
`obj/files/` into `test/golden/` (after its `make test`);
`tools/rulebook-headings.py` copied; README.md, a stub. Record the
commit of ova_cg_go the golden files came from in `test/golden/SOURCE`.

## Phase 1 rules

`src/core/rules.ts` from `internal/rules/rules.go`;
`test/core/rules.test.ts` from `rules_test.go` (every Quick List entry,
of its kind, in order, at its cost; the labels; the small tables; the
Boss Abilities; `offered`). `tools/listrules.ts` and `make
check-pages`, compared with ova_cg_go's `cmd/listrules` output, which
must be identical.

## Phase 2 calc

`src/core/calc.ts` from `internal/calc/calc.go`;
`test/core/calc.test.ts` from `calc_test.go`: the samples, every number
their files hold, the two rulings as overrides, every hand-made case,
`Number.parse`'s grammar. The samples are built by hand in the test, as
the Go test builds them, since entities doesn't exist yet.

## Phase 3 Files

### Phase 3.1 entities

`src/core/entities.ts` from `internal/entities`: the loader on `yaml`
`Document`s, polibfyaml's scalars, the paths, the sort, the errors.
Its tests load every fixture as ova_cg_go's do, with `Broken.yaml`'s
errors listed (compared as "Module by module", entities, says). Find out how
the `yaml` library reports line and column, aliases, and a stream of
several documents (`two-documents`), and record it.

### Phase 3.2 character

`src/core/character.ts` from `internal/character`: the records, the
edits, `build`, `fromEntity` and its notices, `loadAll`, `one`,
`recompute`, `bestDefense`, `singleDefense`, `setNpcType`;
`character.test.ts` from `character_test.go`.

### Phase 3.3 paths

`src/core/paths.ts` from `internal/paths`; `paths.test.ts` from
`paths_test.go`.

### Phase 3.4 save

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

### Phase 3.5 The round trip through ova_fmt_po

`test/files.sh`, ova_cg_go's adapted to read this repo's `obj/files/`:
every saved copy formats as its fixture does in all seven ova_fmt_po
formats and with `-O`, with the override mark taken out for the
fixtures that load with notices.

## Phase 4 Markdown

### Phase 4.1 The sheet

`src/core/markdown.ts` from `internal/markdown/markdown.go`;
`markdown.test.ts`: each fixture's sheet written to
`obj/files/NAME.md` and equal to `test/golden/NAME.md`; `files.sh`
compares each with `ova_fmt_po -M` of the saved copy.

### Phase 4.2 The inline paragraph

`src/core/inline.ts` from `inline.go`: `obj/files/NAME.inline.md`
equal to the golden file and to `ova_fmt_po -i`; the round trip of
`-i` as `files.sh` does it in ova_cg_go. Check the fill's column count
with a fixture holding non-ASCII text.

## Phase 5 The page's shell

### Phase 5.1 The look and the layout

`src/index.html` and `src/style.css`: the menu bar with the
characters' `<select>` at its right, the five tabs, the title line,
the single column at least 544 px wide. Compare by eye with ova_cg_po
(a screenshot the user provides, or one made with its
`tools/with-sway.sh` headless) and with Playwright screenshots at 640
x 800 and at a wider size; the user judges the look.

### Phase 5.2 Menus and keys

The menus (File, Character, Rulebook) with their items greyed where
they can do nothing; keyboard navigation of the menu bar; the keys of
"Keys", each tried in headless Chromium and Firefox (does the page
receive it, and does `preventDefault` keep the browser from acting?),
with the table updated from what was seen.

### Phase 5.3 Dialogs and the test harness

`src/ui/dialogs.ts`: `tell`, `ask` (Save, Don't save, Cancel),
`askText`, `confirm`-like Remove, the Escape stack, focus returned to
where it was. The `Window` class with its function fields; happy-dom
set up for `test/ui/`, with fakes for every field; a Playwright helper
that loads a fixture into the built page through the file input.
Find out whether happy-dom's `<dialog>` is good enough for the dialog
tests, or whether they belong in Playwright, and record it.

## Phase 6 Files on the page

New, Open... (input and drop), Save and Save As... (downloads, the
name, the ` *`), the save-first question, `beforeunload`, the notices
on opening, a file that can't be read or holds mistakes reported in a
dialog and nothing else changed. Playwright checks a download's bytes
against `allToText` and that a downloaded file opens again.

## Phase 7 The Character and Attacks tabs

### Phase 7.1 The Character tab

The names, the tagline and NPC Type (each type with its page); the
Abilities' and Weaknesses' panels (list, name menu with pages, level,
detail, Add, Change, Remove, ?); the selected Ability's END and its
**Perks and Flaws...** button; the totals and warnings; Combat Notes.
`test/ui/window.test.ts` ports `window_test.go`'s checks for these.

### Phase 7.2 The Attacks tab and the attack dialog

The combat box and its numbers, the attack rows (add, remove, edit),
the attack dialog with its Perks and Flaws, END and DX.

### Phase 7.3 Overrides

Every computed number's `NumberBox`: the computed text beside the box,
an override used by everything computed from it, `1/2` and `10+`
where allowed, anything else refused with a message, emptying the box
to go back; a file's numbers that differ from the rules' kept as
overrides and said on opening. The Incorporeal DEFENSE box shown only
with Incorporeal Form.

## Phase 8 The Background and Fluff tabs

Summary, Background, Appearance, Personality, Character Hooks and
Other Notes; the portrait as "The portrait" decides; the fluff fields;
the notes (header and text, added, changed and removed as the traits
are). `test/ui/background.test.ts` from `background_test.go`.

## Phase 9 Linked content

The one button under the Weaknesses and its three dialogs: Form
(two levels per level of Transformation), Spells (Witchcraft's curses
among the Weaknesses), Companion and Vehicle (the partner's own sheet,
Fragment, combat stats, its Incorporeal box); Character > Transformed
form. `test/ui/linked.test.ts` from `linked_test.go`.

## Phase 10 Limits and Boss NPCs

The Limits dialog, the red totals, the warnings with their pages; a
Boss's Abilities with the divider, kept with a warning when the sheet
stops being a Boss. `test/ui/limits.test.ts` from `limits_test.go`.

## Phase 11 Several characters in a file

The characters' `<select>`; Character > Add, Duplicate, Remove...,
Move Up, Move Down, Next, Previous, each greyed where it can do
nothing; the title's "(N of M)"; Save writing them all, in order.
`window_test.go`'s `testSeveral`.

## Phase 12 The Markdown tab

The sheet in a read-only, selectable, monospaced `<pre>`, refreshed
after every change; **Copy** (`navigator.clipboard.writeText`, with a
fallback for a page on `file://` where the browser refuses it: find
out which do); **Save Markdown...** downloading `NAME.md`; **Inline**
showing the paragraph and suggesting `NAME-inline.md`. `test/ui/
markdown.test.ts` from `ui`'s `markdown_test.go`, with its labels.

## Phase 13 The rulebook

Rulebook > Choose PDF... and Open; every "?" button; the page
reached, in headless Chromium and Firefox, from `file://`, with a
small PDF made for the test (never the rulebook); whether a second "?"
reuses the tab. Record what each browser does under "Findings".

## Phase 14 Release

### Phase 14.1 Browsers and size

The Playwright suite in Chromium, Firefox and WebKit, from `file://`
and from a local `http://` server; the built file's size recorded
here and a budget set; no network request, no console error, on every
fixture.

### Phase 14.2 The user guide

README.md: what the page is, how to get and open it, ova_cg_po's
user guide adapted (the menus and their keys, the tabs, files as
downloads, the rulebook, the portrait), and how to build it.

### Phase 14.3 Distribution

How users get the file (open question: a GitHub release asset, GitHub
Pages, or both), and a version and the build's commit shown in the
page (Help > About, or the title line's tooltip).

## Testing

- `make test`: `src/core` under Node against `testdata/` and
  `test/golden/`; `src/ui` on happy-dom; then `test/files.sh` (needs
  ova_fmt_po at `OVA_FMT_PO`).
- `make test-browser`: the built page, headless, in Chromium and
  Firefox (and WebKit in Phase 14).
- `make check-pages`: rules' pages against the PDF's headings.
- `make check`: `tsc --noEmit` for both projects, and the linter.
- The oracle for calculations is the sample characters; the oracle for
  files is ova_cg_go's saved copies and ova_fmt_po.

## Findings

What the port finds out about TypeScript, the `yaml` library, esbuild
and the browsers that ova_cg_go's design didn't have to know.

None yet.

## Open questions

- Is a later Draft autosave wanted: the characters kept in
  `localStorage` as they change, offered back when the page opens
  after being closed unsaved? Storage on `file://` is per-browser and
  can be lost, so it would be a convenience, not saving.
- A dark colour scheme (`prefers-color-scheme: dark`)?
- Distribution: a GitHub release asset, GitHub Pages, or both?
- Is a dropped file's or chosen image's name enough for the portrait,
  or should **Choose...** ask for the path as text too?
