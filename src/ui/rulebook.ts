// The rulebook's PDF, chosen by the user, and opening it at a page: the
// page's counterpart of ova_cg_go's openRulebook and chooseRulebook
// (internal/ui/window.go) and its viewer package (PLAN.md, "The
// rulebook").
//
// A page can't keep a path to a local file, so the PDF chosen with
// Rulebook > Choose PDF... (or when ? first needs it) is kept as the
// File for the session, and lost when the page is closed. Each opening
// gets a fresh blob: URL of it, with #page=N (N the PDF's index of the
// printed page, rules.pdfIndex), opened in the tab named "ova-rulebook",
// where the browser's own PDF viewer shows it; a second ? reuses that
// tab.
//
// Why a fresh URL each time: in headless Chromium 158 (the full build,
// Playwright's channel "chromium") a tab shown a blob: PDF at #page=3,
// sent the same URL at #page=5, changes its address but its viewer
// stays at page 3; a new blob: URL of the same file at #page=7 shows
// page 7. Headless Firefox 159 with pdf.js on goes to the page either
// way. The URL before is let go a minute later, once the tab has left
// it.

import * as rules from "../core/rules.ts";

/** What a PDF chosen may be called, or typed. */
export const pdfTypes = ".pdf,application/pdf";

/** The name of the tab the rulebook opens in, so a second ? reuses it. */
export const RulebookTab = "ova-rulebook";

/** How long a URL the tab has left is kept, in milliseconds. */
const Keep = 60_000;

/** Rulebook is the PDF chosen, if any, and the URLs made of it. */
export class Rulebook {
  /** The PDF chosen; undefined: none yet. */
  file: File | undefined = undefined;
  /** The URL last made, let go when the next is made. */
  private last: string | undefined = undefined;
  /** The page's window; lib.dom's Window type lacks its URL. */
  private readonly view: Window & typeof globalThis;

  constructor(view: Window) {
    this.view = view as Window & typeof globalThis;
  }

  /** chosen says whether a PDF has been chosen. */
  get chosen(): boolean {
    return this.file !== undefined;
  }

  /** choose uses f from now on. */
  choose(f: File): void {
    this.file = f;
  }

  /**
   * url is a fresh URL of the PDF at printed page page: blob:...#page=N.
   * The one before it is let go a minute later.
   */
  url(page: number): string {
    if (this.file === undefined) throw new Error("rulebook: none chosen");
    const old = this.last;
    if (old !== undefined) {
      this.view.setTimeout(() => this.view.URL.revokeObjectURL(old), Keep);
    }
    this.last = this.view.URL.createObjectURL(this.file);
    return this.last + "#page=" + rules.pdfIndex(page);
  }
}

/** isPdf says whether f looks like a PDF, by its type or its name. */
export function isPdf(f: File): boolean {
  return /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
}
