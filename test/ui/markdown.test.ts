// Phase 12's Markdown tab on happy-dom: ova_cg_go's TestMarkdown
// (internal/ui/markdown_test.go), with its labels. The tab shows core's
// sheet of the character shown, after every kind of change (a name
// typed, an Ability added, Background text typed, a file opened); Copy
// puts it on the clipboard; Save Markdown... downloads it under the name
// the user gives, the character's suggested; Inline, checked, shows the
// inline paragraph instead, kept current too, and saves it as
// NAME-inline.md. That the sheet is ova_fmt_po -M's, and the paragraph
// its -i's, is test/files.sh's.
//
// Where the page differs: Save Markdown... downloads, so Go's "a file
// that can't be written" has no counterpart; and copyToClipboard's
// fallback, which Go doesn't need, is checked here with the browser's
// parts replaced (test/browser/markdown.spec.ts copies for real).
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import { inline } from "../../src/core/inline.ts";
import * as markdown from "../../src/core/markdown.ts";
import { ProseBackground } from "../../src/ui/background.ts";
import {
  CantCopy,
  copyToClipboard,
  markdownName,
} from "../../src/ui/markdowntab.ts";
import { Discard, type Window } from "../../src/ui/window.ts";
import {
  checker,
  load,
  newDocument,
  newWindow,
  settled,
  typeIn,
} from "./setup.ts";

/**
 * markdownShown says whether the tab shows the sheet of the character
 * shown, as core's markdown makes it.
 */
function markdownShown(w: Window): boolean {
  const want = markdown.sheet(w.character);
  return (
    want !== "" &&
    w.markdown.sheet === want &&
    w.markdown.text.textContent === want
  );
}

/** inlineShown says the same of its inline paragraph. */
function inlineShown(w: Window): boolean {
  const want = inline(w.character);
  return (
    want !== "" &&
    w.markdown.sheet === want &&
    w.markdown.text.textContent === want
  );
}

/** setInline checks or unchecks Inline as a click would. */
function setInline(w: Window, on: boolean): void {
  if (w.markdown.inline.checked !== on) w.markdown.inline.click();
}

test("TestMarkdown: the Markdown tab", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  const sheet = () => w.markdown.sheet;
  const m = w.markdown;

  w.tabs[4]!.click();
  check(
    w.tabShown === 4 &&
      w.tabs[4]!.textContent === "Markdown" &&
      w.panels[4]!.hidden === false &&
      w.panels[4]!.contains(m.text),
    "the Markdown tab",
  );
  check(markdownShown(w), "a new character's sheet");

  // ---- Kept current ----
  typeIn(w.nameIn, "Kiri");
  check(
    markdownShown(w) && sheet().includes("# Kiri"),
    "a name typed: the sheet's title",
  );
  w.abilities.pick("Attack");
  w.abilities.spinner.setValue(3);
  w.abilities.addButton.click();
  check(
    markdownShown(w) && sheet().includes("Attack +3"),
    "an Ability added: listed",
  );
  typeIn(w.background.prose[ProseBackground]!, "Kiri grew up by the sea.");
  check(
    markdownShown(w) && sheet().includes("Kiri grew up by the sea."),
    "Background typed: in the sheet",
  );
  let ok = load(w, "Ai.yaml");
  check(
    ok &&
      !w.modified &&
      markdownShown(w) &&
      sheet().includes("# Ai (Amnesiatic ESPer)"),
    "a file opened: its character's sheet",
  );

  // ---- Copy ----
  f.copied = undefined;
  m.copy.click();
  check(f.copied === sheet(), "Copy: the whole sheet on the clipboard");

  // ---- Save Markdown... ----
  f.texts = 0;
  f.tells = 0;
  f.downloads = [];
  f.typed = "Ai.md";
  m.save.click();
  check(
    f.texts === 1 && f.suggested === "Ai.md",
    "Save Markdown...: the character's name suggested",
  );
  let d = f.downloads.at(-1);
  check(
    f.downloads.length === 1 &&
      d!.name === "Ai.md" &&
      d!.text === sheet() &&
      f.tells === 0 &&
      !w.modified,
    "the sheet written where chosen, the character not marked changed",
  );
  f.typed = undefined;
  m.save.click();
  check(
    f.texts === 2 && f.downloads.length === 1 && f.tells === 0,
    "cancelled: nothing written, nothing said",
  );
  w.newItem.action!();
  f.typed = "markdown-tab";
  m.save.click();
  d = f.downloads.at(-1);
  check(
    f.suggested === "" &&
      f.downloads.length === 2 &&
      d!.name === "markdown-tab.md" &&
      d!.text === sheet(),
    "a character with no name: nothing suggested, the sheet saved",
  );
  // The page's own: a name given as Save As... takes one.
  f.typed = "  ";
  m.save.click();
  check(
    f.downloads.length === 2 &&
      f.tells === 1 &&
      f.told === "The file needs a name.",
    "no name typed: nothing saved, and said why",
  );
  f.typed = "notes/Kiri.markdown";
  m.save.click();
  check(
    f.downloads.at(-1)!.name === "notes_Kiri.markdown",
    "a name ending in .markdown kept, its directory not",
  );

  // ---- Inline ----
  ok = load(w, "Ai.yaml");
  check(
    ok && !m.inline.checked && markdownShown(w),
    "Inline starts unchecked: the sheet",
  );
  setInline(w, true);
  check(
    inlineShown(w) &&
      sheet().includes("**Ai.** An amnesiac") &&
      !sheet().includes("# Ai") &&
      !w.modified,
    "Inline checked: the inline paragraph",
  );
  typeIn(w.nameIn, "Aiko");
  check(
    inlineShown(w) && sheet().includes("**Aiko.**"),
    "Inline: kept current",
  );
  m.copy.click();
  check(f.copied === inline(w.character), "Inline: Copy copies the paragraph");
  f.typed = "Aiko-inline.md";
  m.save.click();
  d = f.downloads.at(-1);
  check(
    f.suggested === "Aiko-inline.md" &&
      d!.name === "Aiko-inline.md" &&
      d!.text === sheet(),
    "Inline: Save Markdown... suggests NAME-inline.md, saves the paragraph",
  );
  setInline(w, false);
  check(
    markdownShown(w) && sheet().includes("# Aiko"),
    "Inline unchecked: the sheet again",
  );
  done();
});

// What the page adds: the tab follows every way a character is shown,
// and showing it is no change.
test("the Markdown tab: kept current, and no change of its own", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  load(w, "Acacia.yaml");
  w.nextItem.action!();
  check(
    markdownShown(w) &&
      w.markdown.sheet.includes("Sazza and Fraz") &&
      !w.markdown.sheet.includes("# Acacia"),
    "the next character: its sheet",
  );
  w.markdown.inline.click();
  w.previousItem.action!();
  check(
    inlineShown(w) && w.markdown.sheet.includes("**Acacia"),
    "the one before, Inline checked: its paragraph",
  );
  check(!w.modified, "Inline and stepping are no change");
  w.markdown.inline.click();
  typeIn(w.taglineIn, "A witch of the woods");
  check(
    markdownShown(w) && w.markdown.sheet.includes("A witch of the woods"),
    "a tagline typed: in the sheet",
  );
  w.numbers[0]!.type("55");
  check(markdownShown(w), "a number overridden: the sheet again");
  done();
});

test("markdownName", () => {
  const { check, done } = checker();
  for (const [text, want] of [
    ["Ai", "Ai.md"],
    [" Ai ", "Ai.md"],
    ["Ai.md", "Ai.md"],
    ["Ai.MD", "Ai.MD"],
    ["Ai.markdown", "Ai.markdown"],
    ["Ai-inline", "Ai-inline.md"],
    ["a/b\\c", "a_b_c.md"],
    ["", ""],
    ["   ", ""],
  ] as const) {
    check(markdownName(text) === want, `markdownName(${JSON.stringify(text)})`);
  }
  done();
});

test("copyToClipboard: writeText, else the selection copied, else said", async () => {
  const { check, done } = checker();
  const { doc } = newDocument();
  const view = doc.defaultView!;
  let written: string | undefined;
  let refuse = false;
  Object.defineProperty(view.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText(text: string): Promise<void> {
        if (refuse) return Promise.reject(new Error("NotAllowedError"));
        written = text;
        return Promise.resolve();
      },
    },
  });
  let execs = 0;
  let selected = "";
  let execOk = true;
  doc.execCommand = (command: string): boolean => {
    execs++;
    const t = doc.activeElement;
    if (command === "copy" && t instanceof view.HTMLTextAreaElement) {
      selected = t.value.slice(t.selectionStart, t.selectionEnd);
    }
    return execOk;
  };
  let fails = 0;
  const failed = () => fails++;
  const text = "# Ai\n\nline − two\n";

  copyToClipboard(doc, text, failed);
  await settled();
  check(
    written === text && execs === 0 && fails === 0,
    "writeText taken: the text, nothing else tried",
  );
  refuse = true;
  copyToClipboard(doc, text, failed);
  await settled();
  check(
    execs === 1 &&
      selected === text &&
      fails === 0 &&
      doc.querySelector(".copy-buffer") === null,
    "writeText refused: the text selected and copied, the buffer gone",
  );
  execOk = false;
  copyToClipboard(doc, text, failed);
  await settled();
  check(execs === 2 && fails === 1, "both refused: failed called");
  Object.defineProperty(view.navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  execOk = true;
  copyToClipboard(doc, text, failed);
  check(
    execs === 3 && fails === 1 && selected === text,
    "no clipboard API: the selection copied at once",
  );
  check(
    CantCopy.includes("select the sheet"),
    "what's said tells the user what to do instead",
  );
  done();
});
