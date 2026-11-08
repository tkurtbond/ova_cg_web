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
// The Character tab is the names, the Abilities and Weaknesses, the
// chosen Ability's END and Perks and Flaws, the totals, the warnings and
// the combat notes; the Attacks tab the attacks, each a row with its
// ROLL, DX and END, and the sheet's numbers under them. Every number
// shown is a NumberBox on a calc.Number: computed, with its override
// beside it. A change goes into the character, which is computed again
// (changed), and the numbers shown again.
//
// The chosen Ability's linked content, a Transformation's form, a
// Magic's spells, a Companion's or Vehicle's sheet, is linked.ts's
// dialog, opened by the button beside its END; Character > Transformed
// form shows the sheet as the form's, or not; Character > Limits... is
// settings.ts's dialog.
//
// The Background and Fluff tabs are background.ts's, the Markdown tab
// markdowntab.ts's, shown again after every change. A menu item whose
// phase hasn't come has no action and stays disabled (PLAN.md, "Build
// order").

import * as calc from "../core/calc.ts";
import * as character from "../core/character.ts";
import * as entities from "../core/entities.ts";
import * as rules from "../core/rules.ts";
import * as save from "../core/save.ts";
import { AttackDialog } from "./attack.ts";
import { Background } from "./background.ts";
import { LinkedDialog } from "./linked.ts";
import { CantCopy, copyToClipboard, MarkdownView } from "./markdowntab.ts";
import { SettingsDialog } from "./settings.ts";
import * as dialogs from "./dialogs.ts";
import { TraitPanel } from "./traitpanel.ts";
import { bold, el, Lines, NumberBox, notANumber } from "./widgets.ts";
import { keyMatches, MenuBar, MenuItem, Separator, type Key } from "./menu.ts";

export const Title = dialogs.Title;
export type Answer = dialogs.Answer;
export const { SaveFirst, Discard, Cancel } = dialogs;

/** The characters' <select>'s width, ova_cg_go's CharacterW. */
export const CharacterW = 230;

/** The sheet's numbers, Window.numbers' indices. */
export const Defense = 0;
export const Barrier = 1;
export const Health = 2;
export const Endurance = 3;
export const Reserve = 4;
export const TV = 5;
export const AbilityLevels = 6;
export const WeaknessLevels = 7;
export const Total = 8;
export const Points = 9;
export const Incorporeal = 10;
export const AbilityPoints = 11;
export const NSheetNumbers = 12;

/** AttackRow is one attack's row on the Attacks tab. */
export interface AttackRow {
  attack: character.Attack;
  element: HTMLElement;
  name: HTMLElement;
  roll: NumberBox;
  dx: NumberBox;
  end: NumberBox;
  edit: HTMLButtonElement;
  remove: HTMLButtonElement;
}

/** warningText is wn as the Warnings list says it. */
export function warningText(wn: calc.Warning): string {
  let r = "";
  if (wn.attack !== undefined) r = character.attackOf(wn.attack).name + ": ";
  if (wn.trait !== undefined) {
    const t = character.traitOf(wn.trait);
    r += rules.nameLabel(t.item, t.name);
  }
  if (wn.mod !== undefined) {
    const m = character.modOf(wn.mod);
    if (wn.trait !== undefined) r += ": ";
    r += rules.nameLabel(m.item, m.name);
  }
  switch (wn.code) {
    case calc.UnknownItem:
      r += " isn't in the rulebook's lists";
      break;
    case calc.LevelRange:
      if (wn.trait!.kind === rules.Ability) {
        r += ": an Ability is +1 to +5 (p. 18)";
      } else {
        r += ": a Weakness is -1 to -3 (p. 18)";
      }
      break;
    case calc.TooOften:
      r += " is taken more often than it may be (p. 83)";
      break;
    case calc.CostRange:
      r += "'s cost is outside its range, or not in steps of 5 (p. 87)";
      break;
    case calc.NoDamageIneffective:
      r += "No Damage with Ineffective (p. 88)";
      break;
    case calc.RedirectableAlone:
      r += "Redirectable without Ranged (p. 86)";
      break;
    case calc.SpellRange:
      r +=
        ": a spell's level isn't 1 to 5 (or -1 to -3, a Weakness), or its Magic's isn't 1 to 5: no cost (p. 58)";
      break;
    case calc.TableRange:
      r += "Tough, Vigorous or Endurance Reserve past +5, counted as +5";
      break;
    case calc.BaseZeroBroken:
      r += "The Character Total is beyond Base Zero's range (p. 21)";
      break;
    case calc.StartingBroken:
      r +=
        "The Abilities are beyond the starting levels and the Weaknesses (p. 21)";
      break;
    case calc.CeilingBroken:
      r += "The Abilities are beyond the Power Ceiling (p. 21)";
      break;
    case calc.OverFive:
      if (wn.attack === undefined) r += "DEFENSE: ";
      r += "Abilities give the roll more than +5 (p. 21)";
      break;
    case calc.NotBoss:
      r += ": only a Boss has Boss Abilities (p. 123)";
      break;
  }
  return r;
}

/** linkedLabel is the linked content's button's label. */
export function linkedLabel(l: rules.Link): string {
  switch (l) {
    case rules.Spells:
      return "Spells...";
    case rules.Form:
      return "Form...";
    case rules.Partner:
      return "Companion...";
    case rules.Machine:
      return "Vehicle...";
  }
  return "Linked...";
}

/** npcTypeLabels is the NPC Type's choices: none, then each type. */
export function npcTypeLabels(): string[] {
  const l = ["none"];
  for (let k = entities.Heroic; k <= entities.Boss; k++) {
    l.push(
      rules.pageLabel(
        entities.npcTypeName(k as entities.NpcType),
        rules.NpcTypesPage,
      ),
    );
  }
  return l;
}

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

  readonly nameIn: HTMLInputElement;
  readonly playerIn: HTMLInputElement;
  readonly taglineIn: HTMLInputElement;
  /**
   * The NPC type: option 0 none, then entities.Heroic, Secondary, Extra,
   * Boss, each at its constant + 1.
   */
  readonly npcTypeIn: HTMLSelectElement;
  readonly abilities: TraitPanel;
  readonly weaknesses: TraitPanel;
  /** The chosen Ability's END */
  readonly abilityEnd: NumberBox;
  /** Its Perks and Flaws */
  readonly abilityMods: HTMLButtonElement;
  /** Its linked content: "Spells...", "Form...", ... */
  readonly abilityLinked: HTMLButtonElement;
  readonly numbers: NumberBox[] = [];
  readonly warnings: Lines;
  readonly combatNotes: HTMLTextAreaElement;
  /** The Attacks tab's rows, in order */
  rows: AttackRow[] = [];
  private readonly rowBox: HTMLElement;
  readonly addAttack: HTMLButtonElement;
  /** The attack dialog; undefined when closed */
  attack: AttackDialog | undefined = undefined;
  /** The linked content's dialog; undefined when closed */
  linked: LinkedDialog | undefined = undefined;
  /** Character > Limits...'s dialog; undefined when closed */
  settings: SettingsDialog | undefined = undefined;
  /** modified, when Limits... opened */
  private wasModified = false;
  /** The Background and Fluff tabs */
  readonly background: Background;
  /** The Markdown tab */
  readonly markdown: MarkdownView;

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
   * cancelled); download hands text to the browser as the file name;
   * copyText puts text on the clipboard; openPage opens the rulebook at
   * a printed page.
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
  copyText: (text: string) => void;
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
    this.copyText = (text) =>
      copyToClipboard(doc, text, () => this.tell(CantCopy));
    this.openPage = () => {}; // Phase 13: the rulebook

    const item = (label: string, key?: Key, action?: () => void) =>
      new MenuItem(doc, label, key, action);
    this.newItem = item("New", keys.new, () => this.newCharacter());
    this.openItem = item("Open...", keys.open, () => this.open());
    this.saveItem = item("Save", keys.save, () => this.save(() => {}));
    this.saveAsItem = item("Save As...", keys.saveAs, () =>
      this.saveAs(() => {}),
    );
    this.limitsItem = item("Limits...", keys.limits, () => this.editLimits());
    this.transformedItem = new MenuItem(
      doc,
      "Transformed form",
      keys.transformed,
      () => this.toggleTransformed(),
      true,
    );
    this.addCharacterItem = item("Add Character", undefined, () =>
      this.appendCharacter(character.newCharacter()),
    );
    this.duplicateItem = item("Duplicate Character", undefined, () =>
      this.duplicateCharacter(),
    );
    this.removeCharacterItem = item("Remove Character...", undefined, () =>
      this.removeCharacter(),
    );
    this.moveUpItem = item("Move Up", undefined, () => this.moveCharacter(-1));
    this.moveDownItem = item("Move Down", undefined, () =>
      this.moveCharacter(1),
    );
    this.nextItem = item("Next Character", keys.next, () =>
      this.stepCharacter(1),
    );
    this.previousItem = item("Previous Character", keys.previous, () =>
      this.stepCharacter(-1),
    );
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

    // ---- The Character and Attacks tabs (Go's buildSheetTabs) ----
    const openPage = (page: number): void => this.openPage(page);
    const tell = (text: string): void => this.tell(text);
    this.nameIn = this.textEntry("Character Name", (s) => {
      this.character.name = entities.trim(s);
      this.showCharacters();
    });
    this.playerIn = this.textEntry("Player Name", (s) => {
      this.character.player = character.setText(entities.trim(s));
    });
    this.taglineIn = this.textEntry("Tagline", (s) => {
      this.character.tagline = character.setText(entities.trim(s));
    });
    this.combatNotes = el(doc, "textarea", "combat-notes");
    this.combatNotes.setAttribute("aria-label", "Combat Notes");
    this.combatNotes.addEventListener("input", () => {
      if (this.filling) return;
      this.character.combatNotes = character.setText(this.combatNotes.value);
      this.textChanged();
    });
    this.abilities = new TraitPanel(
      doc,
      rules.Ability,
      "Abilities",
      120,
      openPage,
      tell,
    );
    this.abilities.changed = () => this.changed();
    this.abilities.onSelect = (t) => this.showAbility(t);
    this.weaknesses = new TraitPanel(
      doc,
      rules.Weakness,
      "Weaknesses",
      120,
      openPage,
      tell,
    );
    this.weaknesses.changed = () => this.changed();
    this.abilityMods = d.button("Perks and Flaws...", () => this.editMods());
    this.abilityLinked = d.button("Linked...", () => this.editLinked());
    this.abilityEnd = new NumberBox(doc, "END", false);
    this.abilityEnd.changed = (b, ok) => this.numberChanged(b, ok);
    this.warnings = new Lines(doc, "Warnings", 65);
    this.rowBox = el(doc, "div", "attack-rows");
    this.addAttack = d.button("Add attack...", () => this.newAttack());
    this.npcTypeIn = el(doc, "select", "npc-type");
    this.npcTypeIn.id = "npc-type";
    for (const l of npcTypeLabels()) {
      this.npcTypeIn.append(el(doc, "option", undefined, l));
    }
    this.npcTypeIn.addEventListener("change", () => this.npcTypeChosen());

    const field = (label: string, input: HTMLElement): HTMLElement => {
      const l = el(doc, "label", undefined, label);
      l.htmlFor = input.id;
      return l;
    };
    const names = el(doc, "div", "names");
    const pair = (input: HTMLElement, label: string, right: HTMLElement) => {
      const r = el(doc, "div", "name-row");
      r.append(input, field(label, right), right);
      return r;
    };
    names.append(
      field("Character Name", this.nameIn),
      pair(this.nameIn, "Player Name", this.playerIn),
      field("Tagline", this.taglineIn),
      pair(this.taglineIn, "NPC Type", this.npcTypeIn),
    );
    const traits = el(doc, "div", "columns traits");
    traits.append(this.abilities.element, this.weaknesses.element);
    const ability = el(doc, "div", "row ability");
    ability.append(
      this.abilityMods,
      this.abilityEnd.element,
      el(doc, "span", "spacer"),
      this.abilityLinked,
    );
    const totals = el(doc, "div", "row totals");
    totals.append(
      this.sheetBox(AbilityLevels, "Abilities"),
      this.sheetBox(WeaknessLevels, "Weaknesses"),
      this.sheetBox(Total, "Character Total"),
      this.sheetBox(AbilityPoints, "Ability points"),
      this.sheetBox(Points, "Scaled Cost points"),
    );
    const notes = bold(doc, "Combat Notes");
    this.panels[0]!.append(
      names,
      traits,
      ability,
      totals,
      bold(doc, "Warnings"),
      this.warnings.element,
      notes,
      this.combatNotes,
    );

    const header = el(doc, "div", "attack-row attack-header");
    header.setAttribute("aria-hidden", "true"); // each box names itself
    header.append(
      el(doc, "span", "attack-name", "Name"),
      el(doc, "span", "attack-number", "ROLL"),
      el(doc, "span", "attack-number", "DX"),
      el(doc, "span", "attack-number", "END"),
      el(doc, "span", "attack-buttons"),
    );
    // Incorporeal Form's Defense under Barrier's: each is shown only
    // when the character has it.
    const alternates = el(doc, "div", "alternates");
    alternates.append(
      this.sheetBox(Barrier, "Barrier DEFENSE"),
      this.sheetBox(Incorporeal, "Incorporeal DEFENSE"),
    );
    const sheetNumbers = el(doc, "div", "row sheet-numbers");
    sheetNumbers.append(
      this.sheetBox(Defense, "DEFENSE"),
      alternates,
      this.sheetBox(Health, "HEALTH"),
      this.sheetBox(Endurance, "ENDURANCE"),
      this.sheetBox(Reserve, "Reserve"),
      this.sheetBox(TV, "TV"),
    );
    const add = el(doc, "div", "row");
    add.append(this.addAttack);
    this.panels[1]!.append(
      bold(doc, "Attacks"),
      header,
      this.rowBox,
      add,
      sheetNumbers,
    );

    // ---- The Background and Fluff tabs ----
    this.background = new Background(doc, this);
    this.panels[2]!.append(this.background.element);
    this.panels[3]!.append(this.background.fluff);

    // ---- The Markdown tab ----
    this.markdown = new MarkdownView(doc, this);
    this.panels[4]!.append(this.markdown.element);

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
   * there. While a dialog is open the keys do nothing, but are still
   * prevented: Ctrl+S under the Limits dialog mustn't save the web page.
   */
  private key(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    for (const it of this.menu.items()) {
      if (it.key === undefined || !keyMatches(it.key, e)) continue;
      e.preventDefault();
      if (this.dialogs.open) return;
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

  /**
   * showCharacters lists the characters again, current chosen, and the
   * Character menu's items are active where they can do something.
   */
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
    const n = this.characters.length;
    this.removeCharacterItem.disabled = n <= 1;
    this.moveUpItem.disabled = this.current === 0;
    this.previousItem.disabled = this.current === 0;
    this.moveDownItem.disabled = this.current === n - 1;
    this.nextItem.disabled = this.current === n - 1;
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

  /**
   * appendCharacter adds c after the last character, and shows it:
   * Character > Add Character's new one, or Duplicate's copy.
   */
  private appendCharacter(c: character.Character): void {
    this.characters.push(c);
    this.modified = true;
    this.showCharacter(this.characters.length - 1);
  }

  /**
   * duplicateCharacter is Character > Duplicate Character: a copy of the
   * one shown, last. Go's save.Copy can fail and is told; save.copy
   * can't (it throws only on a programmer's error).
   */
  private duplicateCharacter(): void {
    this.appendCharacter(save.copy(this.character));
  }

  /**
   * removeCharacter is Character > Remove Character...: the one shown,
   * once the user says so; not the only one, since a file holds at least
   * one. The one after it is shown, or the one before if it was last.
   */
  private removeCharacter(): void {
    if (this.characters.length <= 1) return;
    const name =
      this.character.name === "" ? "this character" : this.character.name;
    this.confirm("Remove " + name + " from the file?", "Remove", (ok) => {
      if (!ok) return;
      const i = this.current;
      this.characters.splice(i, 1);
      this.modified = true;
      this.showCharacter(Math.min(i, this.characters.length - 1));
    });
  }

  /**
   * moveCharacter swaps the character shown with the one d after it, and
   * it is still shown.
   */
  private moveCharacter(d: number): void {
    const j = this.current + d;
    if (j < 0 || j >= this.characters.length) return;
    const cs = this.characters;
    [cs[this.current], cs[j]] = [cs[j]!, cs[this.current]!];
    this.current = j;
    this.modified = true;
    this.showCharacters();
    this.showTitle();
  }

  /**
   * stepCharacter shows the character d after the one shown, if there is
   * one: Next and Previous, which don't wrap.
   */
  private stepCharacter(d: number): void {
    const j = this.current + d;
    if (j >= 0 && j < this.characters.length) this.showCharacter(j);
  }

  /** showAll shows the character again, everywhere. */
  showAll(): void {
    const c = this.character;
    this.filling = true;
    this.nameIn.value = c.name;
    this.playerIn.value = c.player ?? "";
    this.taglineIn.value = c.tagline ?? "";
    this.combatNotes.value = c.combatNotes ?? "";
    this.showNpcType();
    this.filling = false;
    this.pointNumbers();
    this.abilities.show(c, undefined, c);
    this.weaknesses.show(c, undefined, c);
    this.showTransformed();
    this.showRows();
    this.background.show();
    this.showCharacters();
    this.showTitle();
    this.markdown.show(c);
  }

  /**
   * textEntry is a line of text named label, set calls when the user
   * changes it.
   */
  private textEntry(label: string, set: (s: string) => void): HTMLInputElement {
    const e = el(this.doc, "input");
    e.type = "text";
    e.id = label.toLowerCase().replaceAll(" ", "-");
    e.addEventListener("input", () => {
      if (this.filling) return;
      set(e.value);
      this.textChanged();
    });
    return e;
  }

  // ---- The sheet's numbers ----

  private showWarnings(): void {
    this.warnings.set(
      this.character.warnings.map((wn) => [warningText(wn)]),
      -1,
    );
  }

  /** pointNumbers points the sheet's number boxes at the character's numbers. */
  private pointNumbers(): void {
    const c = this.character;
    [
      c.defense,
      c.barrier,
      c.health,
      c.endurance,
      c.reserve,
      c.tv,
      c.abilityLevels,
      c.weaknessLevels,
      c.total,
      c.points,
      c.incorporeal,
      c.abilityPoints,
    ].forEach((n, i) => {
      this.numbers[i]!.target = n;
    });
  }

  /**
   * showNumbers shows every number box again: Barrier's, Incorporeal
   * Form's and the Reserve's only when the character has them, Scaled
   * Cost's points (the Abilities' and the net) only under it. A total a
   * limit finds too high is red (p. 21): Base Zero's the Character
   * Total, or the net points under Scaled Cost; a Power Ceiling's or the
   * starting levels' the Abilities' levels, or their points under Scaled
   * Cost.
   */
  showNumbers(): void {
    const c = this.character;
    for (const b of this.numbers) b.display();
    const baseZero = c.warned(calc.BaseZeroBroken);
    const spent = c.warned(calc.CeilingBroken) || c.warned(calc.StartingBroken);
    const scaled = c.options.scaledCost;
    const n = this.numbers;
    n[Total]!.setRed(baseZero && !scaled);
    n[Points]!.setRed(baseZero && scaled);
    n[AbilityLevels]!.setRed(spent && !scaled);
    n[AbilityPoints]!.setRed(spent && scaled);
    const visible = (on: boolean, b: NumberBox): void => {
      if (on) b.show();
      else b.hide();
    };
    visible(c.hasBarrier, n[Barrier]!);
    visible(c.hasIncorporeal, n[Incorporeal]!);
    visible(c.hasReserve, n[Reserve]!);
    visible(scaled, n[AbilityPoints]!);
    visible(scaled, n[Points]!);
    for (const r of this.rows) {
      r.roll.display();
      r.dx.display();
      r.end.display();
    }
    this.abilityEnd.display();
    this.showWarnings();
  }

  /** changed follows any change to the character: computed again and shown. */
  changed(): void {
    character.recompute(this.character);
    this.modified = true;
    this.showTitle();
    this.showNumbers();
    this.markdown.show(this.character);
  }

  /** textChanged follows a change of text alone: nothing to compute. */
  textChanged(): void {
    this.modified = true;
    this.showTitle();
    this.markdown.show(this.character);
  }

  /** numberChanged follows a number box's text taken; refused text is said so. */
  private numberChanged(b: NumberBox, ok: boolean): void {
    if (!ok) this.tell(notANumber(b));
    this.changed();
  }

  private sheetBox(which: number, label: string): HTMLElement {
    const b = new NumberBox(this.doc, label, true);
    b.changed = (b, ok) => this.numberChanged(b, ok);
    this.numbers[which] = b;
    return b.element;
  }

  // ---- Abilities and Weaknesses ----

  /**
   * showAbility shows the selected Ability's END, Perks and Flaws, and
   * linked content: the box and buttons work only for one with them.
   */
  private showAbility(t: character.Trait | undefined): void {
    let linked: rules.Link = rules.NoLink;
    if (t === undefined) {
      this.abilityEnd.target = undefined;
      this.abilityEnd.disable();
      this.abilityMods.disabled = true;
    } else {
      this.abilityEnd.target = t.end;
      if (t.hasEnd) this.abilityEnd.enable();
      else this.abilityEnd.disable();
      this.abilityMods.disabled = false;
      if (t.item !== undefined) linked = t.item.linked;
    }
    this.abilityLinked.textContent = linkedLabel(linked);
    this.abilityLinked.disabled = linked === rules.NoLink;
    this.abilityEnd.display();
  }

  private editMods(): void {
    const t = this.abilities.selectedTrait();
    if (t === undefined || this.attack !== undefined) return;
    AttackDialog.editMods(this, this.character, t, (changed) => {
      if (changed) this.changed();
      this.abilities.refresh(this.abilities.selected());
    });
  }

  /** editLinked is the linked content's button: its dialog. */
  private editLinked(): void {
    const t = this.abilities.selectedTrait();
    if (
      t === undefined ||
      t.item === undefined ||
      t.item.linked === rules.NoLink ||
      this.linked !== undefined
    ) {
      return;
    }
    // What the linked dialog changed is in the character already.
    LinkedDialog.editLinked(this, this.character, t, () =>
      this.abilities.refresh(this.abilities.selected()),
    );
  }

  // ---- The attacks ----

  private attackDone(changed: boolean): void {
    if (changed) this.changed();
    this.showRows();
  }

  /** newAttack is Add attack... (Go's addAttack). */
  newAttack(): void {
    if (this.attack !== undefined) return;
    const a = character.newAttack("New attack");
    this.character.attacks.push(a);
    character.recompute(this.character);
    AttackDialog.editAttack(this, this.character, a, true, (ch) =>
      this.attackDone(ch),
    );
  }

  private attackBox(n: calc.Number, label: string, name: string): NumberBox {
    const b = new NumberBox(this.doc, "", false, name + " " + label);
    b.label = label;
    b.target = n;
    b.changed = (b, ok) => this.numberChanged(b, ok);
    return b;
  }

  /** showRows makes the Attacks tab's rows again, one for each attack. */
  showRows(): void {
    const doc = this.doc;
    this.rows = this.character.attacks.map((x) => {
      const a = character.attackOf(x);
      const name = el(doc, "span", "attack-name", a.name);
      name.title = a.name; // the whole name, where it is cut short
      const r: AttackRow = {
        attack: a,
        element: el(doc, "div", "attack-row"),
        name,
        roll: this.attackBox(a.roll, "ROLL", a.name),
        dx: this.attackBox(a.dx, "DX", a.name),
        end: this.attackBox(a.end, "END", a.name),
        edit: this.dialogs.button("Edit", () => {
          if (this.attack === undefined) {
            AttackDialog.editAttack(this, this.character, a, false, (ch) =>
              this.attackDone(ch),
            );
          }
        }),
        remove: this.dialogs.button("Remove", () => {
          character.removeAttack(this.character, a);
          this.changed();
          this.showRows();
        }),
      };
      r.dx.allowHalf = true;
      r.edit.setAttribute("aria-label", "Edit " + a.name);
      r.remove.setAttribute("aria-label", "Remove " + a.name);
      const buttons = el(doc, "span", "attack-buttons");
      buttons.append(r.edit, r.remove);
      r.element.append(
        name,
        r.roll.element,
        r.dx.element,
        r.end.element,
        buttons,
      );
      return r;
    });
    this.rowBox.replaceChildren(...this.rows.map((r) => r.element));
    this.showNumbers();
  }

  // ---- The NPC type ----

  /**
   * npcTypeChosen follows the NPC type chosen: the sheet's kind, so its
   * Health, Endurance and TV, follow it (p. 123-124).
   */
  private npcTypeChosen(): void {
    if (this.filling) return;
    const i = this.npcTypeIn.selectedIndex;
    character.setNpcType(
      this.character,
      i <= 0 ? undefined : ((i - 1) as entities.NpcType),
    );
    this.changed();
    this.abilities.refresh(this.abilities.selected()); // a Boss's offer the Boss Abilities too
  }

  private showNpcType(): void {
    const k = this.character.npcType;
    this.npcTypeIn.selectedIndex = k === undefined ? 0 : k + 1;
  }

  // ---- The transformed form ----

  /**
   * toggleTransformed is Character > Transformed form: the sheet shown
   * as the form's, or not, and saved so (p. 63).
   */
  toggleTransformed(): void {
    this.character.transformed = !this.character.transformed;
    this.showTransformed();
    this.changed();
  }

  private showTransformed(): void {
    this.transformedItem.checked = this.character.transformed;
  }

  /**
   * limitsChanged follows a change of the limits: changed, and the lists,
   * which show Scaled Cost's points only under it.
   */
  limitsChanged(): void {
    this.changed();
    this.abilities.refresh(this.abilities.selected());
    this.weaknesses.refresh(this.weaknesses.selected());
  }

  /**
   * editLimits is Character > Limits...: the settings dialog, which tells
   * limitsChanged each change. Cancel puts the options back, and the
   * title's mark as it was.
   */
  private editLimits(): void {
    if (this.settings !== undefined) return;
    this.wasModified = this.modified;
    SettingsDialog.editSettings(this, this.character, (ok) => {
      if (!ok) {
        this.modified = this.wasModified;
        this.showTitle();
      }
    });
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
      new view.Blob([text], {
        type: /\.(md|markdown)$/i.test(name)
          ? "text/markdown"
          : "application/yaml",
      }),
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
