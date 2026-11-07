// The page's Background and Fluff tabs: the sheet's left half, the
// fluff, and the notes, the port of ova_cg_go's internal/ui/background.go
// (ova_cg_po's OvaBackground).
//
// ova_cg_po's PLAN.md, "The window", the third and fourth tabs.
// "Background": the Summary; Background, Appearance, Personality,
// Character Hooks and Other Notes, each a multi-line entry. "Fluff": the
// Character Portrait; the fluff fields (p. 20) in a grid; and the headed
// notes ova_fmt prints as callouts (notes:), so everything a file holds
// can be edited.
//
// The portrait differs from Go's (PLAN.md, "The portrait"): a page
// can't read a file it isn't given, so the path is kept as text and an
// image is shown only once the user has picked it, by Choose... (which
// sets the path to the image's name) or Show... (which leaves it). The
// images picked are kept for the session by path, so a character shown
// again, or its file opened again, shows its image again.
//
// The Window owns the character: it shows a character here (show), and
// is told of each change (textChanged). Every change goes into the
// character at once, as the user types; nothing here holds the only
// copy. Window.filling guards every handler.

import * as character from "../core/character.ts";
import * as entities from "../core/entities.ts";
import { trim } from "../core/entities.ts";
import { bold, el, Lines } from "./widgets.ts";

/** The prose sections, Background.prose's indices. */
export const ProseBackground = 0;
export const ProseAppearance = 1;
export const ProsePersonality = 2;
export const ProseCharacterHooks = 3;
export const ProseOtherNotes = 4;
export const NProse = 5;

const proseTitles = [
  "Background",
  "Appearance",
  "Personality",
  "Character Hooks",
  "Other Notes",
];

/** The portrait's box. */
export const PortraitW = 160;
export const PortraitH = 200;

/** The images Choose... and Show... take: Go's readImage's. */
export const imageTypes = ".png,.jpg,.jpeg,.gif,.bmp,.svg";

/** What the portrait's box says instead of an image. */
export const NoPortrait = "No portrait.";
export const NotShown = "Show... picks the image to show.";
export const CantRead = "The image can't be read.";

/** fluffLabels are the fluff fields' labels, by entities' constants. */
export const fluffLabels: readonly string[] = (() => {
  const l: string[] = [];
  l[entities.Concept] = "Concept";
  l[entities.Birthday] = "Birthday";
  l[entities.Age] = "Age";
  l[entities.Gender] = "Gender";
  l[entities.Height] = "Height";
  l[entities.Weight] = "Weight";
  l[entities.Hair] = "Hair";
  l[entities.Eyes] = "Eyes";
  l[entities.Association] = "Association";
  l[entities.Hobbies] = "Hobbies";
  l[entities.FavoriteFood] = "Favorite Food";
  l[entities.Allies] = "Allies";
  l[entities.Enemies] = "Enemies";
  l[entities.LoveInterests] = "Love Interests";
  return l;
})();

/** What Background needs of the Window. */
export interface Owner {
  character: character.Character;
  filling: boolean;
  textChanged(): void;
  tell(text: string): void;
  chooseFile(accept: string, then: (f: File) => void): void;
}

/** Background is the page's Background and Fluff tabs. */
export class Background {
  private readonly w: Owner;
  private readonly doc: Document;
  /** The Background tab's content */
  readonly element: HTMLElement;
  /** The Fluff tab's content */
  readonly fluff: HTMLElement;

  readonly summaryIn: HTMLInputElement;
  readonly prose: HTMLTextAreaElement[] = [];
  /** The portrait shown; hidden when there is none */
  readonly portrait: HTMLImageElement;
  /** Why there is none */
  readonly portraitText: HTMLElement;
  /** The path as saved */
  readonly portraitPath: HTMLElement;
  readonly choosePortrait: HTMLButtonElement;
  readonly showImage: HTMLButtonElement;
  readonly removePortrait: HTMLButtonElement;
  readonly fluffIn: HTMLInputElement[] = [];
  /** The notes' headers, in order */
  readonly notes: Lines;
  readonly noteHeader: HTMLInputElement;
  readonly noteText: HTMLTextAreaElement;
  readonly addNote: HTMLButtonElement;
  readonly changeNote: HTMLButtonElement;
  readonly removeNote: HTMLButtonElement;

  /** The images picked this session, by the path they show: blob: URLs */
  private readonly images = new Map<string, string>();

  constructor(doc: Document, w: Owner) {
    this.doc = doc;
    this.w = w;

    // ---- The Background tab ----
    this.summaryIn = this.entry("summary");
    this.summaryIn.addEventListener("input", () => {
      if (this.w.filling) return;
      this.c().summary = character.setText(trim(this.summaryIn.value));
      this.changed();
    });
    const summary = el(doc, "div", "form");
    summary.append(this.label("Summary", this.summaryIn), this.summaryIn);
    const sections = el(doc, "div", "prose");
    proseTitles.forEach((title, i) => {
      const e = el(doc, "textarea", "prose-text");
      e.id = "prose-" + title.toLowerCase().replaceAll(" ", "-");
      // Each section's text trimmed as the loader trims it, so what is
      // saved loads the same; blank is absent.
      e.addEventListener("input", () => {
        if (this.w.filling) return;
        this.setProse(i, character.setText(trim(e.value)));
        this.changed();
      });
      this.prose.push(e);
      const s = el(doc, "div", "prose-section");
      const l = this.label(title, e);
      l.classList.add("heading");
      s.append(l, e);
      sections.append(s);
    });
    this.element = el(doc, "div", "background");
    this.element.append(summary, sections);

    // ---- The Fluff tab ----
    this.portrait = el(doc, "img", "portrait-image");
    this.portrait.alt = "The portrait";
    this.portrait.hidden = true;
    this.portrait.addEventListener("error", () => this.unreadable());
    this.portraitText = el(doc, "span", "portrait-text");
    const box = el(doc, "div", "portrait-box");
    box.style.width = PortraitW + "px";
    box.style.height = PortraitH + "px";
    box.append(this.portrait, this.portraitText);
    this.portraitPath = el(doc, "span", "portrait-path");
    this.portraitPath.id = "portrait-path";
    this.choosePortrait = this.button("Choose...", () => this.chooseImage());
    this.showImage = this.button("Show...", () => this.pickImage());
    this.removePortrait = this.button("Remove", () => this.removeImage());
    this.removePortrait.setAttribute("aria-label", "Remove the portrait");
    const about = el(
      doc,
      "span",
      undefined,
      "Image file, relative to the character's",
    );
    about.id = "portrait-about";
    this.portraitPath.setAttribute("aria-labelledby", about.id);
    const buttons = el(doc, "div", "row");
    buttons.append(this.choosePortrait, this.showImage, this.removePortrait);
    const side = el(doc, "div", "portrait-side");
    side.append(about, this.portraitPath, buttons);
    const portraitRow = el(doc, "div", "row portrait");
    portraitRow.append(box, side);

    const fields = el(doc, "div", "fluff-fields");
    fluffLabels.forEach((label, i) => {
      const e = this.entry("fluff-" + label.toLowerCase().replaceAll(" ", "-"));
      e.addEventListener("input", () => this.fluffChanged(i, e.value));
      this.fluffIn.push(e);
      const l = this.label(label, e);
      l.classList.add("fluff-label");
      fields.append(l, e);
    });

    this.notes = new Lines(doc, "Notes", 0);
    this.notes.element.classList.add("notes");
    this.notes.onSelect = (i) => this.noteSelected(i);
    this.noteHeader = this.entry("note-header");
    this.noteText = el(doc, "textarea", "note-text");
    this.noteText.setAttribute("aria-label", "Note text");
    this.addNote = this.button("Add", () => this.noteButton(this.addNote));
    this.changeNote = this.button("Change", () =>
      this.noteButton(this.changeNote),
    );
    this.removeNote = this.button("Remove", () =>
      this.noteButton(this.removeNote),
    );
    this.addNote.setAttribute("aria-label", "Add the note");
    this.changeNote.setAttribute("aria-label", "Change the note");
    this.removeNote.setAttribute("aria-label", "Remove the note");
    const header = el(doc, "div", "form");
    header.append(this.label("Header", this.noteHeader), this.noteHeader);
    const editor = el(doc, "div", "note-editor");
    editor.append(header, this.noteText);
    const notes = el(doc, "div", "columns notes-columns");
    notes.append(this.notes.element, editor);
    const noteButtons = el(doc, "div", "row");
    noteButtons.append(this.addNote, this.changeNote, this.removeNote);

    this.fluff = el(doc, "div", "fluff");
    this.fluff.append(
      bold(doc, "Character Portrait"),
      portraitRow,
      fields,
      bold(doc, "Notes"),
      notes,
      noteButtons,
    );
  }

  private c(): character.Character {
    return this.w.character;
  }

  private changed(): void {
    if (!this.w.filling) this.w.textChanged();
  }

  private entry(id: string): HTMLInputElement {
    const e = el(this.doc, "input");
    e.type = "text";
    e.id = id;
    return e;
  }

  private label(text: string, of: HTMLElement): HTMLLabelElement {
    const l = el(this.doc, "label", undefined, text);
    l.htmlFor = of.id;
    return l;
  }

  private button(text: string, action: () => void): HTMLButtonElement {
    const b = el(this.doc, "button", undefined, text);
    b.type = "button";
    b.addEventListener("click", action);
    return b;
  }

  // ---- The prose sections ----

  /** proseOf is section which's text: Go's proseOf. */
  private proseOf(which: number): string | undefined {
    const c = this.c();
    switch (which) {
      case ProseBackground:
        return c.background;
      case ProseAppearance:
        return c.appearance;
      case ProsePersonality:
        return c.personality;
      case ProseCharacterHooks:
        return c.characterHooks;
    }
    return c.otherNotes;
  }

  private setProse(which: number, s: string | undefined): void {
    const c = this.c();
    switch (which) {
      case ProseBackground:
        c.background = s;
        return;
      case ProseAppearance:
        c.appearance = s;
        return;
      case ProsePersonality:
        c.personality = s;
        return;
      case ProseCharacterHooks:
        c.characterHooks = s;
        return;
    }
    c.otherNotes = s;
  }

  // ---- The portrait ----

  /** showPortrait shows the character's portrait, or says why it can't. */
  private showPortrait(): void {
    const p = this.c().portrait;
    this.portraitPath.textContent = p ?? "";
    this.portraitPath.title = p ?? "";
    const url = p === undefined ? undefined : this.images.get(p);
    if (url !== undefined) {
      if (this.portrait.getAttribute("src") !== url) this.portrait.src = url;
      this.portrait.hidden = false;
      this.portraitText.textContent = "";
    } else {
      this.portrait.removeAttribute("src");
      this.portrait.hidden = true;
      this.portraitText.textContent = p === undefined ? NoPortrait : NotShown;
    }
    this.showImage.disabled = p === undefined;
    this.removePortrait.disabled = p === undefined;
  }

  /** imageShown says whether an image is shown: for tests. */
  imageShown(): boolean {
    return !this.portrait.hidden && this.portrait.hasAttribute("src");
  }

  /** portraitSays is what the box says instead of an image: for tests. */
  portraitSays(): string {
    return this.portraitText.textContent ?? "";
  }

  /** keep keeps f's image as path's for the session. */
  private keep(path: string, f: File): void {
    const URL = (this.doc.defaultView as unknown as typeof globalThis).URL;
    const old = this.images.get(path);
    if (old !== undefined) URL.revokeObjectURL(old);
    this.images.set(path, URL.createObjectURL(f));
  }

  /**
   * unreadable: the browser couldn't show the image, so it's forgotten
   * and the box says so.
   */
  private unreadable(): void {
    const p = this.c().portrait;
    if (p === undefined || !this.portrait.hasAttribute("src")) return;
    const url = this.images.get(p);
    if (url !== this.portrait.getAttribute("src")) return;
    this.images.delete(p);
    const URL = (this.doc.defaultView as unknown as typeof globalThis).URL;
    URL.revokeObjectURL(url!);
    this.portrait.removeAttribute("src");
    this.portrait.hidden = true;
    this.portraitText.textContent = CantRead;
  }

  /**
   * chooseImage: the image chosen is the portrait, its path its name,
   * assumed beside the YAML file (PLAN.md, "The portrait").
   */
  private chooseImage(): void {
    this.w.chooseFile(imageTypes, (f) => {
      this.keep(f.name, f);
      this.c().portrait = character.setText(f.name);
      this.showPortrait();
      this.changed();
    });
  }

  /** pickImage: the image chosen is shown for the path, which stays. */
  private pickImage(): void {
    const p = this.c().portrait;
    if (p === undefined) return;
    this.w.chooseFile(imageTypes, (f) => {
      if (this.c().portrait !== p) return;
      this.keep(p, f);
      this.showPortrait();
    });
  }

  private removeImage(): void {
    this.c().portrait = undefined;
    this.showPortrait();
    this.changed();
  }

  // ---- The fluff ----

  private fluffChanged(i: number, s: string): void {
    if (this.w.filling) return;
    const c = this.c();
    c.fluff[i] = character.setText(trim(s));
    // The fluff: block is written while any field has text.
    c.hasFluff = c.fluff.some((x) => x !== undefined);
    this.changed();
  }

  // ---- The notes ----

  /** showNotes lists the notes' headers again, line sel selected (-1: none). */
  private showNotes(sel: number): void {
    const n = this.c().notes;
    this.notes.set(
      n.map((x) => [x.header]),
      sel,
    );
    const x = sel >= 0 ? n[sel] : undefined;
    this.noteHeader.value = x?.header ?? "";
    this.noteText.value = x?.text ?? "";
  }

  private noteSelected(i: number): void {
    const x = this.c().notes[i];
    if (x === undefined) return;
    this.noteHeader.value = x.header;
    this.noteText.value = x.text;
  }

  /**
   * noteRead is the header and text typed; undefined, said why, if
   * either is blank: the loader requires both.
   */
  private noteRead(): character.Note | undefined {
    const header = trim(this.noteHeader.value);
    const text = trim(this.noteText.value);
    if (header === "" || text === "") {
      this.w.tell("A note needs a header and some text.");
      return undefined;
    }
    return { header, text };
  }

  /**
   * noteButton is what Add, Change and Remove do: Add puts the note
   * last; Change and Remove need a line selected.
   */
  private noteButton(button: HTMLButtonElement): void {
    if (this.w.filling) return;
    const n = this.c().notes;
    let line = this.notes.selected();
    if (button === this.addNote) {
      const x = this.noteRead();
      if (x === undefined) return;
      n.push(x);
      line = n.length - 1;
    } else if (line < 0) {
      return;
    } else if (button === this.changeNote) {
      const x = this.noteRead();
      if (x === undefined) return;
      n[line] = x;
    } else {
      n.splice(line, 1);
      line = -1;
    }
    this.showNotes(line);
    this.changed();
  }

  // ---- Showing a character ----

  /** show shows the Window's character. */
  show(): void {
    const c = this.c();
    const filling = this.w.filling;
    this.w.filling = true;
    this.summaryIn.value = c.summary ?? "";
    this.prose.forEach((e, i) => (e.value = this.proseOf(i) ?? ""));
    this.fluffIn.forEach((e, i) => (e.value = c.fluff[i] ?? ""));
    this.showNotes(-1);
    this.showPortrait();
    this.w.filling = filling;
  }
}
