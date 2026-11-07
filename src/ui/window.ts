// The page: its menus, tabs, title and characters, the port of ova_cg_go's
// internal/ui/window.go (ova_cg_po's OvaWindow).
//
// One column, at least 544 px wide, as ova_cg_po's window is 640 x 800
// at least: the title line, the menu bar with the characters' <select>
// at its right, and five tabs, Character, Attacks, Background, Fluff and
// Markdown, the first shown when the page opens (ova_cg_po's PLAN.md,
// "The window").
//
// A file holds one character or several: characters, in the file's
// order, of which one, character, is shown. Every change marks the file
// modified (changed), and the title says so with " *".
//
// What would wait for the user (a message, a question, a file chooser, a
// line of text, a download, the rulebook) goes through a function field
// (tell, ask, confirm, chooseFile, askText, download, openPage), each
// taking a callback for its answer, so a test can answer it.
//
// Files (PLAN.md, "Files in the browser"): Open... reads a file the user
// chooses, or drops on the page; Save and Save As... download, and a
// download counts as saved. New, Open... and a drop ask first whether to
// save changes (mayLeave), and closing the tab with changes gets the
// browser's own question (beforeunload).
//
// The tabs are empty until Phase 7, and a menu item whose phase hasn't
// come has no action and stays disabled (PLAN.md, "Build order").

import * as character from "../core/character.ts";
import * as save from "../core/save.ts";
import * as dialogs from "./dialogs.ts";
import { keyMatches, MenuBar, MenuItem, Separator, type Key } from "./menu.ts";

export const Title = dialogs.Title;
export type Answer = dialogs.Answer;
export const { SaveFirst, Discard, Cancel } = dialogs;

/** The characters' <select>'s width, ova_cg_go's CharacterW. */
export const CharacterW = 230;

/** The tabs, in order. */
export const tabNames = [
  "Character",
  "Attacks",
  "Background",
  "Fluff",
  "Markdown",
] as const;

/**
 * The menus' keys (PLAN.md, "Keys"): ova_cg_po's where the browsers
 * let a page have them, else Alt+Shift with the same key.
 */
function ctrl(code: string, shift = false): Key {
  return { code, ctrl: true, alt: false, shift };
}
function altShift(code: string): Key {
  return { code, ctrl: false, alt: true, shift: true };
}
export const keys = {
  new: altShift("KeyN"),
  open: ctrl("KeyO"),
  save: ctrl("KeyS"),
  saveAs: ctrl("KeyS", true),
  limits: ctrl("KeyE"),
  transformed: altShift("KeyT"),
  next: altShift("PageDown"),
  previous: altShift("PageUp"),
} as const;

export class Window {
  readonly doc: Document;
  readonly dialogs: dialogs.Dialogs;

  readonly menu: MenuBar;
  readonly newItem: MenuItem;
  readonly openItem: MenuItem;
  readonly saveItem: MenuItem;
  readonly saveAsItem: MenuItem;
  readonly limitsItem: MenuItem;
  readonly transformedItem: MenuItem;
  readonly addCharacterItem: MenuItem;
  readonly duplicateItem: MenuItem;
  readonly removeCharacterItem: MenuItem;
  readonly moveUpItem: MenuItem;
  readonly moveDownItem: MenuItem;
  readonly nextItem: MenuItem;
  readonly previousItem: MenuItem;
  readonly rulebookItem: MenuItem;
  readonly choosePdfItem: MenuItem;

  /** The file's characters, by number and name; current chosen. */
  readonly characterIn: HTMLSelectElement;
  readonly titleLine: HTMLElement;
  /** The tabs' buttons and panels, in tabNames' order. */
  readonly tabs: HTMLButtonElement[] = [];
  readonly panels: HTMLElement[] = [];

  /**
   * The file's characters, in order, and the one shown,
   * characters[current]; the name of the file they came from or were
   * saved to (Go's Path: a page knows a file's name, not where it is),
   * undefined for none; and whether any has changed since.
   */
  characters: character.Character[] = [];
  current = 0;
  character!: character.Character;
  file: string | undefined = undefined;
  modified = false;

  /**
   * What would wait for the user; a test sets its own. tell shows a
   * message; ask asks whether to save first; confirm asks question, yes
   * naming the button that does it; chooseFile asks for a file of the
   * types accept names, calling then only if one is chosen; askText
   * asks for a line of text, showing text to begin with (ok false:
   * cancelled); download
   * hands text to the browser as the file name; openPage opens the
   * rulebook at a printed page.
   */
  tell: (text: string) => void;
  ask: (question: string, answer: (a: Answer) => void) => void;
  confirm: (question: string, yes: string, then: (ok: boolean) => void) => void;
  chooseFile: (accept: string, then: (f: File) => void) => void;
  askText: (
    prompt: string,
    text: string,
    then: (text: string, ok: boolean) => void,
  ) => void;
  download: (name: string, text: string) => void;
  openPage: (page: number) => void;

  /** The fields being set from the character: no change to report. */
  filling = false;

  /** The Window on doc, in its #app, with a new character. */
  constructor(doc: Document) {
    this.doc = doc;
    const app = doc.getElementById("app");
    if (app === null) throw new Error("the page has no #app");
    const d = new dialogs.Dialogs(doc);
    this.dialogs = d;
    this.tell = (text) => d.tell(text);
    this.ask = (q, answer) => d.ask(q, answer);
    this.confirm = (q, yes, then) => d.confirm(q, yes, then);
    this.askText = (p, text, then) => d.askText(p, text, then);
    this.chooseFile = (accept, then) => this.fileDialog(accept, then);
    this.download = (name, text) => this.downloadText(name, text);
    this.openPage = () => {}; // Phase 13: the rulebook

    const item = (label: string, key?: Key, action?: () => void) =>
      new MenuItem(doc, label, key, action);
    this.newItem = item("New", keys.new, () => this.newCharacter());
    this.openItem = item("Open...", keys.open, () => this.open());
    this.saveItem = item("Save", keys.save, () => this.save(() => {}));
    this.saveAsItem = item("Save As...", keys.saveAs, () =>
      this.saveAs(() => {}),
    );
    this.limitsItem = item("Limits...", keys.limits); // Phase 10
    this.transformedItem = item("Transformed form", keys.transformed); // Phase 9
    this.addCharacterItem = item("Add Character"); // Phase 11, and below
    this.duplicateItem = item("Duplicate Character");
    this.removeCharacterItem = item("Remove Character...");
    this.moveUpItem = item("Move Up");
    this.moveDownItem = item("Move Down");
    this.nextItem = item("Next Character", keys.next);
    this.previousItem = item("Previous Character", keys.previous);
    this.rulebookItem = item("Open"); // Phase 13
    this.choosePdfItem = item("Choose PDF..."); // Phase 13
    this.menu = new MenuBar(doc, [
      {
        label: "File",
        items: [this.newItem, this.openItem, this.saveItem, this.saveAsItem],
      },
      {
        label: "Character",
        items: [
          this.limitsItem,
          this.transformedItem,
          Separator,
          this.addCharacterItem,
          this.duplicateItem,
          this.removeCharacterItem,
          Separator,
          this.moveUpItem,
          this.moveDownItem,
          Separator,
          this.nextItem,
          this.previousItem,
        ],
      },
      {
        label: "Rulebook",
        items: [this.rulebookItem, Separator, this.choosePdfItem],
      },
    ]);

    this.titleLine = doc.createElement("div");
    this.titleLine.className = "title-line";
    this.titleLine.setAttribute("aria-hidden", "true"); // document.title says it

    this.characterIn = doc.createElement("select");
    this.characterIn.className = "characters";
    this.characterIn.setAttribute("aria-label", "Character shown");
    this.characterIn.addEventListener("change", () => this.characterChosen());
    const bar = doc.createElement("header");
    bar.className = "bar";
    bar.append(this.menu.element, this.characterIn);

    const tablist = doc.createElement("div");
    tablist.className = "tabs";
    tablist.setAttribute("role", "tablist");
    const panels = doc.createElement("div");
    panels.className = "panels";
    tabNames.forEach((name, i) => {
      const t = doc.createElement("button");
      t.type = "button";
      t.className = "tab";
      t.id = "tab-" + name.toLowerCase();
      t.setAttribute("role", "tab");
      t.textContent = name;
      const p = doc.createElement("section");
      p.className = "panel";
      p.id = "panel-" + name.toLowerCase();
      p.setAttribute("role", "tabpanel");
      p.setAttribute("aria-labelledby", t.id);
      t.setAttribute("aria-controls", p.id);
      t.addEventListener("click", () => this.showTab(i));
      t.addEventListener("keydown", (e) => this.tabKey(i, e));
      tablist.append(t);
      panels.append(p);
      this.tabs.push(t);
      this.panels.push(p);
    });

    app.replaceChildren(this.titleLine, bar, tablist, panels);
    doc.addEventListener("keydown", (e) => this.key(e));
    doc.addEventListener("dragover", (e) => this.dragOver(e));
    doc.addEventListener("drop", (e) => this.drop(e));
    doc.defaultView?.addEventListener("beforeunload", (e) =>
      this.beforeUnload(e),
    );
    this.showTab(0);
    this.take(character.one(character.newCharacter()), undefined);
  }

  // ---- Title and changes ----

  showTitle(): void {
    let t = Title;
    if (this.file !== undefined) t += " - " + this.file;
    if (this.characters.length > 1) {
      t += ` (${this.current + 1} of ${this.characters.length})`;
    }
    if (this.modified) t += " *";
    this.doc.title = t;
    this.titleLine.textContent = t;
  }

  // ---- Tabs ----

  /** The tab shown, an index into tabNames. */
  get tabShown(): number {
    return this.tabs.findIndex(
      (t) => t.getAttribute("aria-selected") === "true",
    );
  }

  showTab(i: number): void {
    this.tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(i === j));
      t.tabIndex = i === j ? 0 : -1;
      this.panels[j]!.hidden = i !== j;
    });
  }

  /** The tab bar's keys: Left, Right, Home and End choose a tab. */
  private tabKey(i: number, e: KeyboardEvent): void {
    const n = this.tabs.length;
    let j: number;
    switch (e.key) {
      case "ArrowRight":
        j = (i + 1) % n;
        break;
      case "ArrowLeft":
        j = (i + n - 1) % n;
        break;
      case "Home":
        j = 0;
        break;
      case "End":
        j = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.showTab(j);
    this.tabs[j]!.focus();
  }

  // ---- Keys ----

  /**
   * key is a key pressed anywhere on the page: a menu item's, which it
   * does if it can. The browser's own use of the key is prevented even
   * when the item is disabled, so the key never does something else
   * there. While a dialog is open the page's keys are the dialog's.
   */
  private key(e: KeyboardEvent): void {
    if (e.defaultPrevented || this.dialogs.open) return;
    for (const it of this.menu.items()) {
      if (it.key === undefined || !keyMatches(it.key, e)) continue;
      e.preventDefault();
      this.menu.close(false);
      if (!it.disabled) it.action?.();
      return;
    }
  }

  // ---- Several characters ----

  /** characterLabel is character i's label in the <select>: "1. Ai". */
  characterLabel(i: number): string {
    const name = this.characters[i]!.name;
    return `${i + 1}. ${name === "" ? "(no name)" : name}`;
  }

  /** showCharacters lists the characters again, current chosen. */
  showCharacters(): void {
    const doc = this.doc;
    const options = this.characters.map((_, i) => {
      const o = doc.createElement("option");
      o.textContent = this.characterLabel(i);
      return o;
    });
    const filling = this.filling;
    this.filling = true;
    this.characterIn.replaceChildren(...options);
    this.characterIn.selectedIndex = this.current;
    this.filling = filling;
  }

  /** showCharacter shows character i. */
  showCharacter(i: number): void {
    this.current = i;
    this.character = this.characters[i]!;
    character.recompute(this.character);
    this.showAll();
  }

  private characterChosen(): void {
    if (this.filling) return;
    const i = this.characterIn.selectedIndex;
    if (i >= 0 && i !== this.current) this.showCharacter(i);
  }

  /** showAll shows the character again, everywhere. */
  showAll(): void {
    this.showCharacters();
    this.showTitle();
  }

  // ---- Files ----

  /** take shows the characters cs, from the file named file, the first. */
  take(cs: character.Character[], file: string | undefined): void {
    this.characters = cs;
    this.current = 0;
    this.character = cs[0]!;
    this.file = file;
    this.modified = false;
    character.recompute(this.character);
    this.showAll();
  }

  /**
   * adopt shows cs, just loaded from the file named file, and says what
   * the file gives that the rules compute differently (each is kept as
   * an override): notices.
   */
  adopt(cs: character.Character[], file: string, notices: string[]): void {
    this.take(cs, file);
    if (notices.length > 0) {
      this.tell(
        "Numbers the file gives differently from the rules, kept as overrides:\n" +
          notices.join("\n"),
      );
    }
  }

  /**
   * load opens the characters in text, the file named file's contents;
   * false, said why, if it can't, and nothing else changes.
   */
  load(text: string, file: string): boolean {
    const r = character.loadAll(text, file);
    if (!r.ok) {
      this.tell(r.message);
      return false;
    }
    this.adopt(r.value, file, r.notices);
    return true;
  }

  /** loadFile opens f, as load; false, said why, if it can't be read. */
  async loadFile(f: File): Promise<boolean> {
    let text: string;
    try {
      text = await f.text();
    } catch (e) {
      this.tell(`${f.name} couldn't be read: ${String(e)}`);
      return false;
    }
    return this.load(text, f.name);
  }

  /**
   * saveTo downloads the characters as the file named name, which they
   * are then saved as. The portrait's path is kept as it is (PLAN.md,
   * "The portrait"): the page knows no directory to rebase it from or
   * to.
   */
  saveTo(name: string): void {
    this.download(name, save.allToText(this.characters));
    this.file = name;
    this.modified = false;
    this.showTitle();
  }

  /**
   * saveAs asks for a file name and saves as it; then(saved). It
   * suggests the file's name, else the first character's.
   */
  saveAs(then: (saved: boolean) => void): void {
    this.askText(
      "Save the characters as:",
      this.file ?? fileName(this.characters[0]!.name),
      (text, ok) => {
        if (!ok) {
          then(false);
          return;
        }
        const name = fileName(text);
        if (name === "") {
          this.tell("The file needs a name.");
          then(false);
          return;
        }
        this.saveTo(name);
        then(true);
      },
    );
  }

  /**
   * save saves as the file's name; a new file as the first character's
   * name, or, with no name, asks for one; then(saved).
   */
  save(then: (saved: boolean) => void): void {
    const name = this.file ?? fileName(this.characters[0]!.name);
    if (name === "") {
      this.saveAs(then);
      return;
    }
    this.saveTo(name);
    then(true);
  }

  /**
   * mayLeave calls then once the characters may be put away: saved, or
   * the user doesn't want them saved; never if the user cancels.
   */
  mayLeave(then: () => void): void {
    if (!this.modified) {
      then();
      return;
    }
    let name: string;
    if (this.file !== undefined) name = this.file;
    else if (this.characters.length > 1) name = "the characters";
    else if (this.character.name !== "") name = this.character.name;
    else name = "the character";
    this.ask("Save the changes to " + name + " first?", (a) => {
      switch (a) {
        case SaveFirst:
          this.save((ok) => {
            if (ok) then();
          });
          break;
        case Discard:
          then();
          break;
      }
    });
  }

  newCharacter(): void {
    this.mayLeave(() =>
      this.take(character.one(character.newCharacter()), undefined),
    );
  }

  open(): void {
    this.mayLeave(() =>
      this.chooseFile(".yaml,.yml", (f) => {
        void this.loadFile(f);
      }),
    );
  }

  /**
   * dropped opens files, dropped on the page, as Open... would; one
   * file only. While a dialog is open a drop does nothing.
   */
  dropped(files: readonly File[]): void {
    if (this.dialogs.open) return;
    if (files.length !== 1) {
      this.tell("Drop one file on the page to open it.");
      return;
    }
    const f = files[0]!;
    this.mayLeave(() => {
      void this.loadFile(f);
    });
  }

  /**
   * A drag bringing files is taken, for drop. Dropped files are always
   * taken, so the browser never opens one in place of the page.
   */
  private dragOver(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = this.dialogs.open ? "none" : "copy";
  }

  private drop(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    this.dropped([...e.dataTransfer!.files]);
  }

  /**
   * Closing or reloading the page with changes: the browser asks, in
   * its own words.
   */
  private beforeUnload(e: BeforeUnloadEvent): void {
    if (!this.modified) return;
    // preventDefault alone brings up the browser's question in headless
    // Chromium 158 and Firefox 159, once the page has had a click
    // (test/browser/files.spec.ts); the old returnValue isn't needed.
    e.preventDefault();
  }

  // ---- What would wait for the user, done by the browser ----

  /**
   * fileDialog is chooseFile's: a file input, never put in the page,
   * clicked; then(f) once a file is chosen. A cancelled choice calls
   * nothing: Firefox fires the input's cancel event even before a
   * change that brings a file (headless Firefox with Playwright 1.65's
   * file chooser, 2026-11-07), so cancel can't be taken as an answer.
   * An input out of the page opens the chooser and gets its change in
   * headless Chromium and Firefox (seen as above).
   */
  private fileDialog(accept: string, then: (f: File) => void): void {
    const input = this.doc.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f !== undefined) then(f);
    });
    input.click();
  }

  /**
   * downloadText is download's: a link to a Blob of text, clicked, the
   * Blob let go a minute later. In headless Chromium 158 and Firefox 159
   * it downloads the text under the name, byte for byte, and also after
   * the save-first <dialog> (test/browser/files.spec.ts).
   */
  private downloadText(name: string, text: string): void {
    const view = this.doc.defaultView;
    if (view === null) throw new Error("the document has no window");
    const url = view.URL.createObjectURL(
      new view.Blob([text], { type: "application/yaml" }),
    );
    const a = this.doc.createElement("a");
    a.href = url;
    a.download = name;
    a.hidden = true;
    this.doc.body.append(a);
    a.click();
    a.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 60_000);
  }
}

/**
 * fileName is the file name text gives: trimmed, without a directory
 * (a "/" or "\\" becomes "_"), ending in .yaml unless it ends in .yaml
 * or .yml already; "" for no text.
 */
export function fileName(text: string): string {
  const t = text.trim().replace(/[/\\]/g, "_");
  if (t === "") return "";
  return /\.ya?ml$/i.test(t) ? t : t + ".yaml";
}

/** hasFiles says whether a drag brings files. */
function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes("Files") ?? false;
}
