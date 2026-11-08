// The page's last tab: the character's sheet in Markdown, to copy or
// save, the port of ova_cg_go's internal/ui/markdown.go (ova_cg_po's
// OvaMarkdownTab).
//
// The sheet core's markdown.sheet makes, shown in a <pre> the user can
// select, with Copy, which puts all of it on the clipboard, and Save
// Markdown..., which downloads it. Inline, checked, shows the inline
// paragraph instead (inline.inline), as an adventure's cast lists the
// character. The Window shows the character here again after each
// change (show), so the text is always the character's.
//
// Where the page differs from Go's: Save Markdown... asks for the name
// with the Window's askText and downloads, as Save As... does, so
// there is no file that can't be written; and Copy goes through the
// Window's copyText, which a test replaces, since the clipboard may be
// refused (copyToClipboard, PLAN.md, "Phase 12").

import type * as character from "../core/character.ts";
import { inline } from "../core/inline.ts";
import * as markdown from "../core/markdown.ts";
import type { Window } from "./window.ts";
import { button, el } from "./widgets.ts";

/** What Copy says when the browser won't copy. */
export const CantCopy =
  "The browser won't let the page copy: select the sheet and copy it.";

/** MarkdownView is the Markdown tab's content. */
export class MarkdownView {
  readonly element: HTMLElement;
  /** The text shown. */
  sheet = "";
  /** Selectable, monospaced. */
  readonly text: HTMLPreElement;
  readonly copy: HTMLButtonElement;
  readonly save: HTMLButtonElement;
  /** Checked: the inline paragraph. */
  readonly inline: HTMLInputElement;
  /** The character's, for the suggested file name. */
  private name = "";
  private readonly w: Window;

  constructor(doc: Document, w: Window) {
    this.w = w;
    this.copy = button(doc, "Copy", () => this.copySheet());
    this.save = button(doc, "Save Markdown...", () => this.saveSheet());
    this.inline = el(doc, "input");
    this.inline.type = "checkbox";
    // The character shown again, the other way.
    this.inline.addEventListener("change", () => {
      if (this.w.filling) return;
      this.show(this.w.character);
    });
    const label = el(doc, "label", "check");
    label.append(this.inline, doc.createTextNode("Inline"));
    const buttons = el(doc, "div", "row");
    buttons.append(this.copy, this.save, label);
    this.text = el(doc, "pre", "markdown-sheet");
    this.text.tabIndex = 0;
    this.text.setAttribute("aria-label", "Markdown sheet");
    this.element = el(doc, "div", "markdown-tab");
    this.element.append(buttons, this.text);
  }

  /** show shows c's sheet, or its inline paragraph if Inline is checked. */
  show(c: character.Character): void {
    this.sheet = this.inline.checked ? inline(c) : markdown.sheet(c);
    this.name = c.name;
    this.text.textContent = this.sheet;
  }

  /** copySheet is Copy: the whole sheet on the clipboard. */
  private copySheet(): void {
    this.w.copyText(this.sheet);
  }

  /**
   * saveSheet is Save Markdown...: the sheet downloaded under the name
   * the user gives, the character's suggested: NAME.md, or
   * NAME-inline.md for the inline paragraph. Cancelled, nothing is
   * saved and nothing said; saved, the character isn't changed.
   */
  private saveSheet(): void {
    let suggested = "";
    if (this.name !== "" && this.inline.checked) {
      suggested = markdownName(this.name + "-inline");
    } else if (this.name !== "") {
      suggested = markdownName(this.name);
    }
    const sheet = this.sheet;
    this.w.askText("Save the sheet as:", suggested, (text, ok) => {
      if (!ok) return;
      const name = markdownName(text);
      if (name === "") {
        this.w.tell("The file needs a name.");
        return;
      }
      this.w.download(name, sheet);
    });
  }
}

/**
 * markdownName is the file name text gives for a sheet, as fileName
 * gives a character file's: trimmed, without a directory (a "/" or "\\"
 * becomes "_"), ending in .md unless it ends in .md or .markdown
 * already; "" for no text.
 */
export function markdownName(text: string): string {
  const t = text.trim().replace(/[/\\]/g, "_");
  if (t === "") return "";
  return /\.(md|markdown)$/i.test(t) ? t : t + ".md";
}

/**
 * copyToClipboard puts text on the clipboard, calling failed if the
 * browser won't. It tries navigator.clipboard.writeText, then, refused,
 * a hidden <textarea> holding text, focused and selected, and
 * document.execCommand("copy"). On file://, after a click, headless
 * Firefox 159 and Chromium 158's full build take writeText (Firefox's
 * readText gives the text back, Chromium's is refused); Chromium 158's
 * headless shell refuses writeText (NotAllowedError, "Write permission
 * denied"). With writeText refused, the fallback works in all three:
 * execCommand gives true and a copy event fires with the text
 * selected. Seen under Playwright.
 */
export function copyToClipboard(
  doc: Document,
  text: string,
  failed: () => void,
): void {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (clipboard?.writeText === undefined) {
    if (!copyBySelection(doc, text)) failed();
    return;
  }
  clipboard.writeText(text).then(
    () => {},
    () => {
      if (!copyBySelection(doc, text)) failed();
    },
  );
}

/** copyBySelection is copyToClipboard's fallback; it says whether it copied. */
function copyBySelection(doc: Document, text: string): boolean {
  const t = el(doc, "textarea", "copy-buffer");
  t.value = text;
  t.readOnly = true;
  const focused = doc.activeElement;
  doc.body.append(t);
  t.focus();
  t.select();
  let ok = false;
  try {
    ok = doc.execCommand("copy");
  } catch {
    ok = false;
  }
  t.remove();
  if (focused instanceof doc.defaultView!.HTMLElement) focused.focus();
  return ok;
}
