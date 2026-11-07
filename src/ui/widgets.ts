// What the page and its dialogs share: the number boxes, the ? buttons,
// a spinner, and the list editors, the port of ova_cg_go's
// internal/ui/widgets.go (ova_cg_po's OvaWidgets).
//
// ova_cg_po's PLAN.md, "Overriding a computed number": beside every
// number the program computes is an empty entry box. A NumberBox is
// both: the computed number, shown read-only, and the box, whose text is
// the override in effect ("" for none). Where its number lives is its
// target, a calc.Number in the model, so the box reads and sets the
// model, never a copy.
//
// A HelpButton, "?", opens the rulebook at a page (PLAN.md, "Page
// numbers beside names"), through the Window's openPage.
//
// A Panel is a list and its editor, the shape PLAN.md gives the
// Abilities and Weaknesses and the attack dialog's Perks and Flaws: a
// list of lines, under it a <select> of every name of one kind
// (rules.label: "Attack (p. 50)"), a Spinner, a text field, and Add,
// Change, Remove and ? buttons. What the lines are, and what the
// buttons do to the model, are its subclass's hooks.

import * as calc from "../core/calc.ts";
import * as rules from "../core/rules.ts";

/** An element of doc, of class cls, holding text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (cls !== undefined) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A heading's label, bold (Go's bold). */
export function bold(doc: Document, text: string): HTMLElement {
  return el(doc, "div", "heading", text);
}

/** A button labelled label doing act. */
export function button(
  doc: Document,
  label: string,
  act: () => void,
): HTMLButtonElement {
  const b = el(doc, "button", undefined, label);
  b.type = "button";
  b.addEventListener("click", act);
  return b;
}

// ---- Spinner ----

/**
 * Spinner is a bounded integer: an <input type=number>, its value kept
 * within min and max.
 */
export class Spinner {
  readonly input: HTMLInputElement;
  min: number;
  max: number;
  private v = 0;
  /** After the user changes it */
  onChanged: ((v: number) => void) | undefined = undefined;

  /** A spinner from min to max showing value. */
  constructor(doc: Document, min: number, max: number, value: number) {
    this.min = min;
    this.max = max;
    this.input = el(doc, "input", "spinner");
    this.input.type = "number";
    this.input.step = "1";
    this.input.addEventListener("change", () => this.typed());
    this.setBounds(min, max);
    this.setValue(value);
  }

  /** The user's text, or a step of its arrows, taken. */
  private typed(): void {
    const v = Number.parseInt(this.input.value, 10);
    if (Number.isNaN(v)) this.setValue(this.v);
    else this.spin(v);
  }

  /** spin sets the value, as the user does: for tests. */
  spin(v: number): void {
    const old = this.v;
    this.setValue(v);
    if (this.v !== old) this.onChanged?.(this.v);
  }

  /** The spinner's value. */
  get value(): number {
    return this.v;
  }

  /** setValue sets the value, kept within the bounds. */
  setValue(v: number): void {
    this.v = Math.max(this.min, Math.min(this.max, v));
    this.input.value = String(this.v);
  }

  /** setBounds sets the bounds, the value kept within them. */
  setBounds(min: number, max: number): void {
    this.min = min;
    this.max = max;
    this.input.min = String(min);
    this.input.max = String(max);
    this.setValue(this.v);
  }

  enable(): void {
    this.input.disabled = false;
  }

  disable(): void {
    this.input.disabled = true;
  }

  /** Whether the user can't change it. */
  get disabled(): boolean {
    return this.input.disabled;
  }
}

// ---- NumberBox ----

/** A computed number and the box for its override. */
export class NumberBox {
  /** What the number is, for a message: "HEALTH" */
  label: string;
  readonly element: HTMLElement;
  /** The computed number */
  readonly shown: HTMLElement;
  /** The override: "" for none */
  readonly entry: HTMLInputElement;
  /** undefined: none */
  target: calc.Number | undefined = undefined;
  /** A DX's 1/2 */
  allowHalf = false;
  /** An END's 10+ */
  allowPlus = false;
  /**
   * After the user leaves the box having changed it: the override set
   * from its text, or (ok false) the text refused, and the box emptied.
   */
  changed: ((b: NumberBox, ok: boolean) => void) | undefined = undefined;
  /** The box's text as display last set it */
  private taken = "";

  /**
   * A number box labelled label: beside it, or above it if above; no
   * label shown for "". name names the box for a screen reader, label
   * by default.
   */
  constructor(doc: Document, label: string, above: boolean, name = label) {
    this.label = label;
    this.element = el(doc, "span", "number-box" + (above ? " above" : ""));
    this.shown = el(doc, "span", "number-shown");
    this.entry = el(doc, "input", "number-override");
    this.entry.type = "text";
    this.entry.setAttribute("aria-label", name + " override");
    // The text is taken on Enter and on leaving the box (Go's
    // OnSubmitted and FocusLost); change comes on leaving it changed.
    this.entry.addEventListener("change", () => this.take());
    // Enter's default is stopped: a message opened by take moves the
    // focus to its OK button, and the same key press would then press
    // it, closing the message unseen (seen in Chromium and Firefox).
    this.entry.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      this.take();
    });
    const pair = el(doc, "span", "number-pair");
    pair.append(this.shown, this.entry);
    if (label !== "") {
      this.element.append(el(doc, "span", "number-label", label));
    }
    this.element.append(pair);
  }

  /** display shows the target's number: computed, and its override. */
  display(): void {
    this.taken = "";
    const n = this.target;
    if (n !== undefined) {
      this.shown.textContent = n.computedText();
      if (n.overridden) this.taken = n.text();
    } else {
      this.shown.textContent = "";
    }
    this.entry.value = this.taken;
  }

  /**
   * take reads the box's text into its target's override (an empty box
   * clears it); text that isn't a number for it is refused, and the
   * override cleared. Nothing if the text is as display left it.
   */
  take(): void {
    const n = this.target;
    if (n === undefined || this.entry.value === this.taken) return;
    const ok = n.parse(this.entry.value, this.allowHalf, this.allowPlus);
    if (!ok) n.clear();
    this.display();
    this.changed?.(this, ok);
  }

  /** type types text into the box and leaves it, as the user does: for tests. */
  type(text: string): void {
    this.entry.value = text;
    this.take();
  }

  /** setRed shows the computed number red, or not: a total a limit finds too high. */
  setRed(on: boolean): void {
    this.shown.classList.toggle("red", on);
  }

  get red(): boolean {
    return this.shown.classList.contains("red");
  }

  enable(): void {
    this.entry.disabled = false;
  }

  disable(): void {
    this.entry.disabled = true;
  }

  /** Whether the user can't override the number. */
  get disabled(): boolean {
    return this.entry.disabled;
  }

  /** Whether the user can override the number. */
  get active(): boolean {
    return !this.entry.disabled;
  }

  show(): void {
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }

  get visible(): boolean {
    return !this.element.hidden;
  }

  /**
   * shows says whether the box shows n: its computed number, and its
   * override or "": for tests.
   */
  shows(n: calc.Number): boolean {
    const want = n.overridden ? n.text() : "";
    return (
      this.shown.textContent === n.computedText() && this.entry.value === want
    );
  }
}

/** notANumber is the message for text refused in b. */
export function notANumber(b: NumberBox): string {
  let msg = "Not a number";
  if (b.label !== "") msg += " for " + b.label;
  msg += ": a whole number";
  if (b.allowHalf) msg += ", or 1/2";
  if (b.allowPlus) msg += ", which may end in +";
  return msg + ". The computed number is used.";
}

// ---- HelpButton ----

/** HelpButton is a "?" button that opens the rulebook at its page. */
export class HelpButton {
  readonly button: HTMLButtonElement;
  /** The printed page; 0: nothing to show */
  page: number;

  /** A ? button showing page (0: none yet), through openPage. */
  constructor(doc: Document, page: number, openPage: (page: number) => void) {
    this.page = page;
    this.button = button(doc, "?", () => {
      if (this.page > 0) openPage(this.page);
    });
    this.button.className = "help";
    this.button.setAttribute("aria-label", "The rulebook at this name's page");
  }
}

// ---- Lists ----

/**
 * Lines is a list of lines, each of columns: the first the name, the
 * others right of it, at widths; a column right of the name may be
 * hidden. A listbox: a click selects a line, and so do Up, Down, Home
 * and End once the list has the focus.
 */
export class Lines {
  readonly element: HTMLElement;
  private readonly doc: Document;
  private rows: string[][] = [];
  private readonly widths: number[];
  private readonly hidden: boolean[];
  private sel = -1;
  /** After the user selects line i */
  onSelect: ((i: number) => void) | undefined = undefined;

  /** A list of height px (0: as tall as its lines), its columns at widths. */
  constructor(
    doc: Document,
    label: string,
    height: number,
    ...widths: number[]
  ) {
    this.doc = doc;
    this.widths = widths;
    this.hidden = widths.map(() => false);
    this.element = el(doc, "div", "lines");
    this.element.setAttribute("role", "listbox");
    this.element.setAttribute("aria-label", label);
    this.element.tabIndex = 0;
    if (height > 0) this.element.style.height = height + "px";
    this.element.addEventListener("keydown", (e) => this.key(e));
  }

  private key(e: KeyboardEvent): void {
    const n = this.rows.length;
    if (n === 0) return;
    let i: number;
    switch (e.key) {
      case "ArrowDown":
        i = Math.min(n - 1, this.sel + 1);
        break;
      case "ArrowUp":
        i = this.sel < 0 ? 0 : Math.max(0, this.sel - 1);
        break;
      case "Home":
        i = 0;
        break;
      case "End":
        i = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.select(i);
  }

  /** set shows rows, line sel selected (-1: none), without calling onSelect. */
  set(rows: string[][], sel: number): void {
    const doc = this.doc;
    this.rows = rows;
    this.element.replaceChildren(
      ...rows.map((row, i) => {
        const line = el(doc, "div", "line");
        line.setAttribute("role", "option");
        line.append(el(doc, "span", "line-name", row[0]));
        this.widths.forEach((w, j) => {
          const c = el(doc, "span", "line-column", row[j + 1] ?? "");
          c.style.width = w + "px";
          c.hidden = this.hidden[j]!;
          line.append(c);
        });
        line.addEventListener("click", () => this.select(i));
        return line;
      }),
    );
    this.mark(sel >= 0 && sel < rows.length ? sel : -1);
  }

  /** mark shows line i selected (-1: none). */
  private mark(i: number): void {
    this.sel = i;
    [...this.element.children].forEach((line, j) => {
      line.setAttribute("aria-selected", String(i === j));
    });
    const line = this.element.children[i];
    if (line !== undefined && "scrollIntoView" in line) {
      line.scrollIntoView({ block: "nearest" });
    }
  }

  /** How many lines there are. */
  count(): number {
    return this.rows.length;
  }

  /** The line selected; -1 for none. */
  selected(): number {
    return this.sel;
  }

  /** showColumn shows or hides the column at widths[i], from the next set. */
  showColumn(i: number, on: boolean): void {
    this.hidden[i] = !on;
  }

  /** line is line i's columns shown joined by tabs; "" past the end: for tests. */
  line(i: number): string {
    const row = this.rows[i];
    if (row === undefined) return "";
    const cols = [row[0]!];
    row.slice(1).forEach((s, j) => {
      if (j >= this.hidden.length || !this.hidden[j]) cols.push(s);
    });
    return cols.join("\t");
  }

  /** The selected line's text; "" for none: for tests. */
  selectedLine(): string {
    return this.line(this.sel);
  }

  /**
   * select selects line i, as a click does; onSelect runs even if it
   * was selected already, as FLTK's callback did.
   */
  select(i: number): void {
    if (i < 0 || i >= this.rows.length) return;
    this.mark(i);
    this.onSelect?.(i);
  }

  /** find is the last line holding text; -1 if none: for tests. */
  find(text: string): number {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.line(i).includes(text)) return i;
    }
    return -1;
  }
}

// ---- Panel ----

/**
 * BossDivider is the row of a Panel's <select> between its kind's names
 * and the Boss Abilities: a disabled <option>, which can't be chosen.
 */
export const BossDivider = "── Boss Abilities ──";

/** The <select>'s first option, shown while no name is chosen. */
export const Placeholder = "(choose a name)";

/** Panel is a list and its editor; its subclass gives the hooks. */
export abstract class Panel {
  /** The <select>'s kind */
  readonly kind: rules.Kind;
  /** The <select> offers the Boss Abilities too */
  withBoss = false;
  readonly lines: Lines;
  /**
   * The names: option 0 is Placeholder, so Go's index i is option i+1
   * (index, choiceIndex)
   */
  readonly choice: HTMLSelectElement;
  readonly spinner: Spinner;
  readonly text: HTMLInputElement;
  readonly addButton: HTMLButtonElement;
  readonly changeButton: HTMLButtonElement;
  readonly removeButton: HTMLButtonElement;
  readonly help: HelpButton;
  /** After a change the panel made: the Window's or dialog's */
  changed: (() => void) | undefined = undefined;
  readonly element: HTMLElement;
  /** choose is setting the <select> */
  private choosing = false;

  // The hooks.
  /** fill is the lines, from the model, in its order. */
  protected abstract fill(): string[][];
  /** load sets the controls from line i, the one the user selected. */
  protected abstract load(i: number): void;
  /**
   * add and change (of line i) change the model from the controls, and
   * return the line the item will be on once filled again (a change can
   * move it), or -1 if they changed nothing; remove whether it removed
   * line i. Each leaves the model recomputed.
   */
  protected abstract add(): number;
  protected abstract change(i: number): number;
  protected abstract remove(i: number): boolean;
  /** chosen follows a change of the <select>: the spinner's bounds and the text field. */
  protected abstract chosen(): void;

  constructor(
    doc: Document,
    kind: rules.Kind,
    title: string,
    spinLabel: string,
    textLabel: string,
    height: number,
    openPage: (page: number) => void,
    ...widths: number[]
  ) {
    this.kind = kind;
    this.lines = new Lines(doc, title, height, ...widths);
    this.lines.onSelect = (i) => this.load(i);
    this.choice = el(doc, "select", "choice");
    this.choice.setAttribute("aria-label", title + ": name");
    this.choice.addEventListener("change", () => {
      if (this.choosing) return;
      if (this.onDivider()) this.choose(undefined);
      else this.chosen();
    });
    this.setOptions();
    this.help = new HelpButton(doc, 0, openPage);
    this.spinner = new Spinner(doc, 1, 1, 1);
    this.text = el(doc, "input", "panel-text");
    this.text.type = "text";
    this.addButton = button(doc, "Add", () => this.button(this.addButton));
    this.changeButton = button(doc, "Change", () =>
      this.button(this.changeButton),
    );
    this.removeButton = button(doc, "Remove", () =>
      this.button(this.removeButton),
    );

    const labelled = (text: string, control: HTMLElement): HTMLElement => {
      const l = el(doc, "label", "panel-label", text);
      l.append(control);
      return l;
    };
    const chooser = el(doc, "div", "panel-row");
    chooser.append(this.choice, this.help.button);
    const values = el(doc, "div", "panel-row");
    values.append(
      labelled(spinLabel, this.spinner.input),
      labelled(textLabel, this.text),
    );
    const buttons = el(doc, "div", "panel-row panel-buttons");
    buttons.append(this.addButton, this.changeButton, this.removeButton);
    this.element = el(doc, "section", "panel-editor");
    this.element.setAttribute("aria-label", title);
    this.element.append(
      bold(doc, title),
      this.lines.element,
      chooser,
      values,
      buttons,
    );
  }

  /**
   * labels is the <select>'s rows after Placeholder: the names it
   * offers, each with its page; BossDivider before the Boss Abilities,
   * if withBoss.
   */
  labels(): string[] {
    const l: string[] = [];
    const n = rules.offerCount(this.kind, this.withBoss);
    for (let i = 0; i < n; i++) {
      if (this.withBoss && i === rules.count(this.kind)) l.push(BossDivider);
      l.push(rules.label(rules.offered(this.kind, i, this.withBoss)));
    }
    return l;
  }

  /** The <select>'s options, Placeholder and labels. */
  private setOptions(): void {
    const doc = this.choice.ownerDocument;
    const none = el(doc, "option", undefined, Placeholder);
    none.disabled = true;
    none.hidden = true;
    const options = this.labels().map((text) => {
      const o = el(doc, "option", undefined, text);
      if (text === BossDivider) o.disabled = true;
      return o;
    });
    this.choice.replaceChildren(none, ...options);
    this.choice.selectedIndex = 0;
  }

  /** The row chosen among labels; -1 for none (Go's SelectedIndex). */
  choiceIndex(): number {
    return this.choice.selectedIndex - 1;
  }

  /** onDivider says whether the <select>'s chosen row is BossDivider. */
  private onDivider(): boolean {
    return this.withBoss && this.choiceIndex() === rules.count(this.kind);
  }

  /** offerBoss offers the Boss Abilities, or stops: what is chosen stays, if it still can. */
  offerBoss(on: boolean): void {
    if (on === this.withBoss) return;
    const it = this.item();
    this.withBoss = on;
    this.setOptions();
    this.choose(it);
  }

  /** item is the name chosen; undefined for none. */
  item(): rules.Item | undefined {
    let i = this.choiceIndex();
    if (this.onDivider()) return undefined;
    if (this.withBoss && i > rules.count(this.kind)) i--; // past BossDivider
    if (i < 0 || i >= rules.offerCount(this.kind, this.withBoss)) {
      return undefined;
    }
    return rules.offered(this.kind, i, this.withBoss);
  }

  /** helpChosen turns the ? button to the chosen name's page. */
  protected helpChosen(): void {
    this.help.page = this.item()?.page ?? 0;
  }

  /**
   * choose chooses it in the <select> (none for undefined, or an item
   * the <select> doesn't offer), and follows it as the user's choice is
   * followed.
   */
  choose(it: rules.Item | undefined): void {
    this.choosing = true;
    try {
      let i = rules.offerIndex(it, this.kind, this.withBoss);
      if (i >= 0) {
        if (i >= rules.count(this.kind)) i++; // past BossDivider
        this.choice.selectedIndex = i + 1;
      } else {
        this.choice.selectedIndex = 0;
      }
    } finally {
      this.choosing = false;
    }
    this.chosen();
  }

  /** pick chooses the item named name, as the user does: for tests. */
  pick(name: string): void {
    this.choose(rules.find(name));
  }

  /**
   * refresh fills the list again, line sel selected (-1: none) and the
   * controls loaded from it.
   */
  refresh(sel: number): void {
    this.lines.set(this.fill(), sel);
    if (this.selected() >= 0) this.load(this.selected());
  }

  /**
   * button is what Add, Change and Remove do: Add and Change leave their
   * item's line selected; Remove, none. Change and Remove need a line
   * selected.
   */
  private button(b: HTMLButtonElement): void {
    let line = this.selected();
    let done = false;
    if (b === this.addButton) {
      line = this.add();
      done = line >= 0;
    } else if (line < 0) {
      // nothing selected
    } else if (b === this.changeButton) {
      line = this.change(line);
      done = line >= 0;
    } else {
      done = this.remove(line);
      line = -1;
    }
    if (done) {
      this.refresh(line);
      this.changed?.();
    }
  }

  // The list's, as Go's Panel embeds it.
  count(): number {
    return this.lines.count();
  }
  selected(): number {
    return this.lines.selected();
  }
  showColumn(i: number, on: boolean): void {
    this.lines.showColumn(i, on);
  }
  line(i: number): string {
    return this.lines.line(i);
  }
  selectedLine(): string {
    return this.lines.selectedLine();
  }
  select(i: number): void {
    this.lines.select(i);
  }
  find(text: string): number {
    return this.lines.find(text);
  }
}
