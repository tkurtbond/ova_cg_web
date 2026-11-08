// Phase 13's rulebook on happy-dom: ova_cg_go's rulebook checks
// (internal/ui/limits_test.go's second half, and window_test.go's
// "Rulebook > Open opens it at page 1"), with their labels where they
// apply. Rulebook > Choose PDF... keeps the PDF for the session; ? and
// Rulebook > Open open a fresh blob: URL of it at #page=N, N the PDF's
// index of the printed page, in the tab named "ova-rulebook"; with none
// chosen they ask first.
//
// Where the page differs: there is no path to keep between sessions and
// no viewer to choose, so Go's "kept, absolute" and its Viewer... checks
// have no counterpart; the question asked first is the page's confirm,
// where Go's opens the chooser at once. That the browsers show the page
// asked for, and reuse the tab, is test/browser/rulebook.spec.ts's.
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as rules from "../../src/core/rules.ts";
import { isPdf, pdfTypes } from "../../src/ui/rulebook.ts";
import { NoRulebook, TabBlocked } from "../../src/ui/window.ts";
import { checker, newWindow } from "./setup.ts";

type Happy = ReturnType<typeof newWindow>["happy"];

/**
 * rulebookWindow is newWindow with ? going to the Window's own
 * openRulebook, and the browser's URLs and timers watched: made, and let
 * go, the timers run when the test says.
 */
function rulebookWindow() {
  const n = newWindow();
  const { w, happy } = n;
  w.openPage = (p) => w.openRulebook(p);
  const urls = { made: 0, revoked: [] as string[] };
  const timers: { run: () => void; ms: number }[] = [];
  const view = happy as unknown as {
    URL: typeof URL;
    setTimeout: (run: () => void, ms: number) => number;
  };
  const make = view.URL.createObjectURL.bind(view.URL);
  view.URL.createObjectURL = (b: Blob) => {
    urls.made++;
    return make(b);
  };
  view.URL.revokeObjectURL = (u: string) => {
    urls.revoked.push(u);
  };
  view.setTimeout = (run, ms) => timers.push({ run, ms });
  const pdf = (name: string, type = "application/pdf") =>
    new happy.File(["%PDF-1.4\n"], name, { type }) as unknown as File;
  return { ...n, urls, timers, pdf };
}

/** page is the page number a URL opened asks for. */
function page(url: string | undefined): number {
  const m = /#page=(\d+)$/.exec(url ?? "");
  return m === null ? -1 : Number(m[1]);
}

/** base is a URL without its #page. */
function base(url: string | undefined): string {
  return (url ?? "").replace(/#page=\d+$/, "");
}

test("the rulebook: Choose PDF..., Open, and ?", () => {
  const { w, f, urls, timers, pdf } = rulebookWindow();
  const { check, done } = checker();
  const open = (): string | undefined => f.tabs.at(-1);

  // ---- Not chosen ----
  check(!w.rulebook.chosen, "a new page: no rulebook chosen");
  f.yes = false;
  w.rulebookItem.action!();
  check(
    f.confirmed === 1 &&
      f.question === NoRulebook &&
      f.chooses === 0 &&
      f.tabs.length === 0,
    "the rulebook not found: asked for, and cancelled, nothing opened",
  );
  f.yes = true;
  f.file = undefined;
  f.chosen = undefined;
  w.rulebookItem.action!();
  check(
    f.confirmed === 2 &&
      f.chooses === 1 &&
      f.accepted === pdfTypes &&
      f.tabs.length === 0 &&
      !w.rulebook.chosen,
    "asked for, and the chooser cancelled: nothing opened",
  );
  f.file = pdf("OVA.pdf");
  w.rulebookItem.action!();
  check(
    f.confirmed === 3 &&
      f.chooses === 2 &&
      w.rulebook.chosen &&
      f.tabs.length === 1 &&
      page(open()) === rules.pdfIndex(1) &&
      page(open()) === 3 &&
      open()!.startsWith("blob:"),
    "chosen: opened, at page 1 (the PDF's page 3)",
  );

  // ---- Chosen ----
  w.rulebookItem.action!();
  check(
    f.confirmed === 3 && f.chooses === 2 && f.tabs.length === 2,
    "found the next time: not asked again",
  );
  check(page(open()) === 3, "Rulebook > Open opens it at page 1");
  check(
    base(f.tabs[0]) !== base(f.tabs[1]) && urls.made === 2,
    "each opening a fresh URL",
  );
  check(
    timers.length === 1 &&
      timers[0]!.ms === 60_000 &&
      urls.revoked.length === 0,
    "the URL before let go later, not at once",
  );
  timers[0]!.run();
  check(
    urls.revoked.length === 1 && urls.revoked[0] === base(f.tabs[0]),
    "and then the one before, not the one open",
  );

  // ---- ? ----
  w.abilities.pick("Flight");
  w.abilities.help.button.click();
  check(
    f.tabs.length === 3 && page(open()) === rules.pdfIndex(54),
    "? opens it at the item's page (54: the PDF's 56)",
  );

  // ---- Choose PDF... ----
  const before = w.rulebook.file;
  f.file = pdf("notes.txt", "text/plain");
  f.tells = 0;
  w.choosePdfItem.action!();
  check(
    f.tells === 1 &&
      f.told === "notes.txt isn't a PDF: choose the rulebook's PDF." &&
      w.rulebook.file === before,
    "a file that isn't a PDF: refused, said, the PDF before kept",
  );
  f.file = pdf("OVA-2.PDF", "");
  w.choosePdfItem.action!();
  check(
    f.tells === 1 &&
      w.rulebook.file === f.file &&
      f.tabs.length === 3 &&
      f.confirmed === 3,
    "Choose PDF...: used from now on, nothing opened, nothing asked",
  );
  f.file = undefined;
  w.choosePdfItem.action!();
  check(
    w.rulebook.chosen && w.rulebook.file?.name === "OVA-2.PDF",
    "Choose PDF... cancelled: the PDF before kept",
  );

  // ---- A blocked tab ----
  f.blocked = true;
  w.abilities.help.button.click();
  check(f.tells === 2 && f.told === TabBlocked, "the tab blocked: said so");
  check(!w.modified, "none of it a change to the character");
  done();
});

test("the rulebook: asked for from ?, then opened there", () => {
  const { w, f, pdf } = rulebookWindow();
  const { check, done } = checker();
  f.yes = true;
  f.file = pdf("OVA.pdf");
  w.weaknesses.pick("Easily Distracted");
  const p = w.weaknesses.help.page;
  w.weaknesses.help.button.click();
  check(
    p > 0 &&
      f.confirmed === 1 &&
      f.chooses === 1 &&
      f.tabs.length === 1 &&
      page(f.tabs[0]) === rules.pdfIndex(p),
    "? with none chosen: asked, chosen, opened at its page",
  );
  done();
});

test("isPdf", () => {
  const { check, done } = checker();
  const { happy } = newWindow();
  const file = (name: string, type: string) =>
    new (happy as Happy).File([""], name, { type }) as unknown as File;
  for (const [name, type, want] of [
    ["OVA.pdf", "application/pdf", true],
    ["OVA.PDF", "", true],
    ["rulebook", "application/pdf", true],
    ["OVA.pdf.txt", "text/plain", false],
    ["Ai.yaml", "", false],
  ] as const) {
    check(isPdf(file(name, type)) === want, `isPdf(${name}, "${type}")`);
  }
  done();
});
