# DESIGN-OPTIONS.md - how to make a web ova_cg

The question (2026-11-07): a web version of ova_cg_po
(`~/Repos/RPG/Tools/ova_cg_po`, Oberon-2 with FLTK) that lets people
build OVA characters and save and load them as the same YAML, preferably
as a single HTML file users download and open locally, and preferably
looking like ova_cg_po. This file is the survey of the options, and the
user's choices at the end. PLAN.md is the design that follows from them.

What there is to port: ova_cg_po's logic (rules, calc, entities,
character, save, Markdown) is about 4-5k lines, and its window about as
much again. ova_cg_go (`~/Repos/RPG/Tools/ova_cg_go`) is a complete
port of it to Go with Fyne, whose logic packages import no GUI. There
are 57 fixtures in `test/data/`.

## Where the rules logic comes from

### A. Hand port to TypeScript, UI in HTML/CSS

Port from the Go version, not the Oberon: Go is closer to TypeScript,
and its packages (`rules`, `calc`, `entities`, `character`, `save`,
`markdown`) are already separate from its UI.

- **Pros:** a small file (a few hundred KB with a YAML library
  inlined); native browser behaviour (text selection, find in page,
  accessibility, copy and paste); easy to debug; readable for anyone
  who forks it.
- **Cons:** a fourth copy of the rules, which can drift.
- **Mitigation:** golden files. ova_cg_go's tests already write each
  fixture's saved YAML, Markdown sheet and inline paragraphs
  (`obj/files/`), and ova_fmt_po formats any saved file; the TypeScript
  must produce the same bytes under Node. That holds the copies
  together mechanically.

### B. ova_cg_go's logic compiled to WebAssembly, UI in HTML/JS

- **Pros:** one rules engine, already tested, shared by the desktop and
  the web.
- **Cons:** a Go-JS bridge (`syscall/js`) for every recompute; two
  languages in one program; size (standard Go wasm for these packages
  is probably several MB once base64-inlined, unmeasured; TinyGo is
  smaller, but its support for the reflection the YAML library uses is
  uncertain); harder debugging.
- Worth it if the rules are expected to keep changing.

### C. Fyne's web target for the whole of ova_cg_go

Fyne's modules already pull in `gl-js` and `glfw-js`, so this is
nearly free to try.

- **Pros:** the same UI with almost no new code.
- **Cons:** it looks like ova_cg_go (Fyne), not ova_cg_po (FLTK); it
  draws on a canvas (no native text selection, find or accessibility);
  tens of MB; Fyne's file dialogs in the browser are weak. Not checked
  by experiment, but unlikely to meet "a single HTML file that looks
  like ova_cg_po".

### D. Reuse the Oberon

Not realistic: poc has no JavaScript back end, and pofltk ties the code
to FLTK.

## Packaging as a single file

- **A build step** (esbuild or Vite and an inlining step): normal
  modules in, one `.html` with everything inlined out. Better for
  testing, and needed at 5k+ lines.
- **A hand-written single file, no build:** simpler to begin with,
  worse to test and to grow.
- **YAML:** `yaml` (eemeli) or `js-yaml`, inlined. `yaml` has a node
  API, which matters for writing the same YAML as ova_cg_go (styles,
  quoting, flow sequences); it can also keep comments, though ova_cg_po
  and ova_cg_go don't, so the web version shouldn't either.
- The same file can also be hosted (GitHub Pages) at no cost.

## Save and load

| Way | Where it works | Notes |
|---|---|---|
| `<input type=file>` to open, a Blob download to save | everywhere, `file://` included | "Save" is "download a copy": it can't overwrite in place |
| File System Access API | Chromium only | a real Save to the same file; progressive enhancement |
| Drag and drop a `.yaml` onto the page | everywhere | cheap, pleasant |
| localStorage autosave of the working draft | mostly | protects against closing the tab; storage on `file://` is unreliable in some browsers, so a convenience only |
| `beforeunload` | everywhere | stands in for "save unsaved changes?" (its wording is the browser's) |

## What the browser forces

- **The rulebook:** a page can't start okular or evince. The user
  chooses the PDF once a session (`<input type=file>`); **?** opens a
  Blob URL of it in a new tab at `#page=N+2`, which Chrome's and
  Firefox's built-in viewers are believed to honour. Never bundle the
  PDF.
- **The portrait** is a path relative to the YAML file, which a page
  can't resolve. Keep the path as text and save it unchanged; let the
  user pick the image to *show* it. Embedding it as a data URI would
  change the file format.
- **Keys:** Ctrl+S and Ctrl+O can be taken; Ctrl+N, Ctrl+T, Ctrl+W,
  Ctrl+Q and Ctrl+PgUp/PgDn (switching tabs) mostly can't be. Some menu
  items will have other keys or none.
- **Dialogs** (Perks and Flaws, Form, Spells, Companion, Limits) become
  `<dialog>` elements.
- **Copy** through `navigator.clipboard`, with a fallback; **Save
  Markdown...** a download.

## How like ova_cg_po it can look

The layout entirely: the menu bar, the five tabs, the trait lists with
their page column, the name menus, an override box beside every
computed number, the characters' menu at the menu bar's right, ` *` in
the title, red totals. The widgets' look approximately: CSS can come
close to FLTK's flat grey scheme; pixel matching isn't worth it. The
window isn't fixed at 640 x 800; it should keep a narrow single column
that sits beside the PDF and stretch as ova_cg_po's does.

## Decided (2026-11-07)

- **Option A**: a hand port to TypeScript, from ova_cg_go's code, with
  ova_cg_po's PLAN.md as the specification.
- **A build step is fine**: the source is modules; the build makes one
  HTML file.
- **The same YAML** as ova_cg_po and ova_cg_go: ova_fmt_po must format
  a saved file as it formats the file it was loaded from, and the bytes
  should be ova_cg_go's (PLAN.md, "The YAML a save writes").
- **Save means download**, in every browser. No File System Access
  API.
