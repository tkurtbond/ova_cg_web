# ova_cg_web - an OVA character generator in one web page

`ova_cg_web` builds a character for OVA, the Open Versatile Anime
engine, on a page laid out like the official character sheet, as
[ova_cg_po](../ova_cg_po) (Oberon-2, FLTK) and
[ova_cg_go](../ova_cg_go) (Go, Fyne) do in a window. It is one HTML
file: download it, open it in Firefox or a Chromium-based browser, and
it works from your disk with nothing else, loading nothing from the
network. Characters are loaded and saved as the same YAML the other two
write, which [ova_fmt_po](../ova_fmt_po) and the Ada
[ova_fmt](../ova_fmt) format.

**Status: Phase 2 of [PLAN.md](PLAN.md)**: the rules tables and the
calculations. The page so far says only its name.
[DESIGN-OPTIONS.md](DESIGN-OPTIONS.md) says why it is built this way.

## Building

You need Node 22 or later and GNU make.

```sh
npm ci               # once: the pinned dependencies
make                 # dist/ova_cg_web.html
make test            # the unit tests, under Node
make test-browser    # the page in headless Chromium and Firefox
                     #   (once first: npx playwright install chromium firefox)
make check           # the type checks and prettier
```

AGENTS.md has the rest.
