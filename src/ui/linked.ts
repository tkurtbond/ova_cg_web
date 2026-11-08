// An Ability's linked content: a Transformation's form, a Magic's
// spells, a Companion or Vehicle, the port of ova_cg_go's
// internal/ui/linked.go (ova_cg_po's OvaLinkedDialog).
//
// ova_cg_po's PLAN.md, "The window": an Ability with linked content has
// a button that opens this dialog, in one of three shapes
// (rules.Item.linked):
//
//   - Form, a Transformation's (p. 63): the form's Abilities and
//     Weaknesses, worth 2 levels a level of Transformation, each line
//     with its page; the selected Ability's Perks and Flaws and END.
//   - Spells, a Magic's (p. 57-58): each spell's name, the Ability it
//     mimics, its level, and its END, computed from the Magic's level and
//     its own, with an override box. Witchcraft's spells are curses: the
//     Weakness each casts, at -1 to -3 (p. 58; rules.CastsWeaknesses).
//   - A partner's sheet, a Companion's (p. 52) or a Vehicle's (p. 64):
//     its name, whether it is a Fragment, whether it has combat stats,
//     its Abilities and Weaknesses, its attacks (edited in the attack
//     dialog) and its numbers, each with its override box.
//
// It edits the model as the user works, as the page's first tab does,
// and has Close, no Cancel: a change is in the character at once, and
// the Window's changed recomputes it and shows it. It is modal but
// doesn't wait: it shows, and Close (or Escape) calls done. An attack
// dialog opened from it is above it, and Close waits for it to close.

import * as character from "../core/character.ts";
import * as rules from "../core/rules.ts";
import { trim } from "../core/entities.ts";
import { AttackDialog } from "./attack.ts";
import { TraitPanel } from "./traitpanel.ts";
import type { Window } from "./window.ts";
import {
  bold,
  el,
  HelpButton,
  Lines,
  NumberBox,
  Placeholder,
  Spinner,
} from "./widgets.ts";

// A partner's numbers, LinkedDialog.numbers' indices: the first six are
// the Window's (Defense, Barrier, Health, Endurance, Reserve, TV, 0 to
// 5), then Incorporeal Form's Defense. Go's is TV + 1; window.ts imports
// this module, so its constants aren't set yet when this one is
// evaluated, and the number is written out (linked.test.ts checks it).
export const PartnerIncorporeal = 6;
const nPartnerNumbers = PartnerIncorporeal + 1;
const iBarrier = 1;
const iReserve = 4;

/** The partner's number boxes' labels, in numbers' order. */
const partnerLabels = [
  "DEFENSE",
  "Barrier DEFENSE",
  "HEALTH",
  "ENDURANCE",
  "Reserve",
  "TV",
  "Incorporeal DEFENSE",
] as const;

/** A checkbox labelled label, and its label. */
function check(doc: Document, label: string): [HTMLInputElement, HTMLElement] {
  const b = el(doc, "input");
  b.type = "checkbox";
  const l = el(doc, "label", "check");
  l.append(b, label);
  return [b, l];
}

/** LinkedDialog is an Ability's linked content. */
export class LinkedDialog {
  readonly w: Window;
  /** Form, Spells, Partner or Machine */
  readonly mode: rules.Link;
  readonly info: HTMLElement;
  readonly close: HTMLButtonElement;

  // A form's, or a partner's:
  abilities: TraitPanel | undefined = undefined;
  weaknesses: TraitPanel | undefined = undefined;
  /** The selected Ability's Perks and Flaws */
  mods: HTMLButtonElement | undefined = undefined;
  /** Its END */
  end: NumberBox | undefined = undefined;

  // A Magic's:
  spells: Lines | undefined = undefined;
  spellName: HTMLInputElement | undefined = undefined;
  /** Option 0 is Placeholder, so Go's index i is option i+1 */
  spellAbility: HTMLSelectElement | undefined = undefined;
  /** spellAbility's label: Ability, or Weakness */
  spellKind: HTMLElement | undefined = undefined;
  spellLevel: Spinner | undefined = undefined;
  spellHelp: HelpButton | undefined = undefined;
  addSpell: HTMLButtonElement | undefined = undefined;
  changeSpell: HTMLButtonElement | undefined = undefined;
  removeSpell: HTMLButtonElement | undefined = undefined;
  spellEnd: NumberBox | undefined = undefined;
  /** What the spells mimic: Ability, or Weakness for Witchcraft */
  castKind: rules.Kind = rules.Ability;

  // A partner's:
  partnerName: HTMLInputElement | undefined = undefined;
  fragment: HTMLInputElement | undefined = undefined;
  combat: HTMLInputElement | undefined = undefined;
  attacks: Lines | undefined = undefined;
  addAttack: HTMLButtonElement | undefined = undefined;
  editAttack: HTMLButtonElement | undefined = undefined;
  removeAttack: HTMLButtonElement | undefined = undefined;
  readonly numbers: NumberBox[] = [];

  /** The Window's, recomputed after a change */
  private readonly character: character.Character;
  /** The Ability whose content this is */
  private readonly trait: character.Trait;
  /** Its partner's sheet, in Partner and Machine */
  private partner: character.Character | undefined = undefined;
  private readonly done: (() => void) | undefined;
  private filling = false;
  private hide: () => void = () => {};

  private constructor(
    w: Window,
    c: character.Character,
    t: character.Trait,
    done: (() => void) | undefined,
  ) {
    this.w = w;
    this.character = c;
    this.trait = t;
    this.done = done;
    this.mode = t.item!.linked;
    this.info = el(w.doc, "p", "dialog-text linked-info");
    this.close = w.dialogs.button("Close", () => this.closeDialog(), true);
  }

  /**
   * changed follows a change here: the character recomputed and shown,
   * here and in the page.
   */
  private changed(): void {
    this.w.changed();
    this.showAll();
  }

  private numberChanged(b: NumberBox, ok: boolean): void {
    if (!ok) {
      this.w.tell(
        "Not a number for " + b.label + ". The computed number is used.",
      );
    }
    this.changed();
  }

  private numberBox(label: string, above: boolean): NumberBox {
    const b = new NumberBox(this.w.doc, label, above);
    b.changed = (b, ok) => this.numberChanged(b, ok);
    return b;
  }

  // ---- Abilities and Weaknesses: a form's or a partner's ----

  /** showAbility shows the selected Ability's END and Perks and Flaws. */
  private showAbility(t: character.Trait | undefined): void {
    const end = this.end!;
    if (t === undefined) {
      end.target = undefined;
      end.disable();
      this.mods!.disabled = true;
    } else {
      end.target = t.end;
      if (t.hasEnd) end.enable();
      else end.disable();
      this.mods!.disabled = false;
    }
    end.display();
  }

  private editMods(): void {
    const panel = this.abilities!;
    const t = panel.selectedTrait();
    if (t === undefined || this.w.attack !== undefined) return;
    const c = this.partner ?? this.character;
    AttackDialog.editMods(this.w, c, t, (changed) => {
      if (changed) this.changed();
      panel.refresh(panel.selected());
    });
  }

  /** panels is the two panels, each list h high, and the Ability's controls under them. */
  private panels(h: number): HTMLElement[] {
    const doc = this.w.doc;
    const openPage = (page: number): void => this.w.openPage(page);
    const tell = (text: string): void => this.w.tell(text);
    this.mods = this.w.dialogs.button("Perks and Flaws...", () =>
      this.editMods(),
    );
    this.end = this.numberBox("END", false);
    const a = new TraitPanel(
      doc,
      rules.Ability,
      "Abilities",
      h,
      openPage,
      tell,
    );
    a.onSelect = (t) => this.showAbility(t);
    a.changed = () => this.changed();
    const wk = new TraitPanel(
      doc,
      rules.Weakness,
      "Weaknesses",
      h,
      openPage,
      tell,
    );
    wk.changed = () => this.changed();
    this.abilities = a;
    this.weaknesses = wk;
    const columns = el(doc, "div", "columns");
    columns.append(a.element, wk.element);
    const row = el(doc, "div", "row");
    row.append(this.mods, this.end.element);
    return [columns, row];
  }

  /**
   * showFormLevels shows the form's levels, against what the
   * Transformation pays for: 2 a level (p. 63); red if over.
   */
  private showFormLevels(): void {
    const t = this.trait;
    let n = 0;
    for (const f of t.form) n += f.level;
    const levels = n > 0 ? "+" + String(n) : String(n);
    this.info.textContent =
      "The form's Abilities and Weaknesses come to " +
      levels +
      " levels; Transformation +" +
      String(t.level) +
      " pays for " +
      String(2 * t.level) +
      " (p. 63).";
    this.info.classList.toggle("red", n > 2 * t.level);
  }

  /** infoRed says whether the info is shown red (Go's DangerImportance). */
  infoRed(): boolean {
    return this.info.classList.contains("red");
  }

  // ---- Spells ----

  /** spellAt is the spell on line i; undefined for none. */
  private spellAt(i: number): character.Spell | undefined {
    const sp = this.trait.spells[i];
    return sp === undefined ? undefined : character.spellOf(sp);
  }

  /** showSpells lists the spells again, line sel selected (-1: none), and its END. */
  private showSpells(sel: number): void {
    const rows = this.trait.spells.map((sp) => {
      const x = character.spellOf(sp);
      const sign = x.level > 0 ? "+" : "";
      return [
        x.name,
        x.ability +
          " " +
          sign +
          String(x.level) +
          " (" +
          rules.pageText(x.item) +
          ")",
        "END " + x.end.text(),
      ];
    });
    this.spells!.set(rows, sel);
    const end = this.spellEnd!;
    const x = this.spellAt(sel);
    if (x !== undefined) {
      end.target = x.end;
      end.enable();
    } else {
      end.target = undefined;
      end.disable();
    }
    end.display();
  }

  /** spellAbilityIndex is the row chosen in spellAbility; -1 for none (Go's SelectedIndex). */
  spellAbilityIndex(): number {
    return this.spellAbility!.selectedIndex - 1;
  }

  /** spellItem is the Ability (or Weakness) chosen; undefined for none. */
  private spellItem(): rules.Item | undefined {
    const i = this.spellAbilityIndex();
    if (i < 0 || i >= rules.count(this.castKind)) return undefined;
    return rules.get(this.castKind, i);
  }

  /**
   * chooseSpellItem chooses it in the <select>; none for undefined, or an
   * item it doesn't offer (a spell the Magic can't cast, from a file).
   */
  private chooseSpellItem(it: rules.Item | undefined): void {
    this.filling = true;
    const i = rules.offerIndex(it, this.castKind, false);
    this.spellAbility!.selectedIndex = i >= 0 ? i + 1 : 0;
    this.filling = false;
    this.spellHelp!.page = it?.page ?? 0;
  }

  /** pickSpellAbility chooses the Ability (or Weakness) named name, as the user does: for tests. */
  pickSpellAbility(name: string): void {
    const s = this.spellAbility!;
    s.selectedIndex = rules.index(rules.find(name)) + 1;
    s.dispatchEvent(new s.ownerDocument.defaultView!.Event("change"));
  }

  private spellSelected(i: number): void {
    const x = this.spellAt(i);
    if (x === undefined) return;
    this.spellName!.value = x.name;
    this.chooseSpellItem(x.item);
    this.spellLevel!.setValue(x.level);
    this.showSpells(i);
  }

  /**
   * spellButton is what Add, Change and Remove do: Add puts the spell
   * last; Change and Remove need one selected. A spell needs a name and
   * an Ability (a Weakness, Witchcraft's); one changed keeps one the
   * <select> doesn't have if none is chosen.
   */
  private spellButton(b: HTMLButtonElement): void {
    let line = this.spells!.selected();
    const x = this.spellAt(line);
    const name = trim(this.spellName!.value);
    const it = this.spellItem();
    if (b === this.removeSpell) {
      if (x === undefined) return;
      character.removeSpell(this.trait, x);
      line = -1;
    } else if (
      name === "" ||
      (it === undefined &&
        (b === this.addSpell || x === undefined || x.item !== undefined))
    ) {
      if (this.castKind === rules.Weakness) {
        this.w.tell("A curse needs a name and the Weakness it casts.");
      } else {
        this.w.tell("A spell needs a name and the Ability it mimics.");
      }
      return;
    } else if (b === this.addSpell) {
      const sp = character.newSpell(name, it!.name, it, this.spellLevel!.value);
      this.trait.spells.push(sp);
      line = this.trait.spells.length - 1;
    } else if (x === undefined) {
      return;
    } else {
      x.name = name;
      if (it !== undefined) {
        x.item = it;
        x.ability = it.name;
      }
      x.level = this.spellLevel!.value;
    }
    this.w.changed();
    this.showSpells(line);
  }

  // ---- A partner's sheet ----

  /** attackAt is the partner's attack on line i; undefined for none. */
  private attackAt(i: number): character.Attack | undefined {
    const a = this.partner!.attacks[i];
    return a === undefined ? undefined : character.attackOf(a);
  }

  private showAttacks(sel: number): void {
    const rows = this.partner!.attacks.map((a) => [
      character.attackOf(a).name,
      "ROLL " + a.roll.text(),
      "DX " + a.dx.text(),
      "END " + a.end.text(),
    ]);
    this.attacks!.set(rows, sel);
  }

  private attackButton(b: HTMLButtonElement): void {
    if (this.w.attack !== undefined) return;
    const p = this.partner!;
    const done = (): void => this.changed();
    if (b === this.addAttack) {
      const a = character.newAttack("New attack");
      p.attacks.push(a);
      character.recompute(this.character);
      AttackDialog.editAttack(this.w, p, a, true, done);
      return;
    }
    const a = this.attackAt(this.attacks!.selected());
    if (a === undefined) return;
    if (b === this.editAttack) {
      AttackDialog.editAttack(this.w, p, a, false, done);
    } else {
      character.removeAttack(p, a);
      this.changed();
    }
  }

  // ---- Everything shown ----

  showAll(): void {
    if (this.w.linked !== this) return;
    switch (this.mode) {
      case rules.Form:
        this.showFormLevels();
        this.end!.display();
        break;
      case rules.Spells:
        this.showSpells(this.spells!.selected());
        break;
      case rules.Partner:
      case rules.Machine: {
        const p = this.partner!;
        this.end!.display();
        this.showAttacks(this.attacks!.selected());
        for (const b of this.numbers) b.display();
        // With no combat stats, nothing of combat is saved: all of it
        // inactive. Barrier's and Incorporeal Form's Defense and the
        // Reserve only with them.
        for (const b of [this.addAttack, this.editAttack, this.removeAttack]) {
          b!.disabled = !p.hasCombat;
        }
        this.numbers.forEach((b, i) => {
          const on =
            p.hasCombat &&
            (i !== iBarrier || p.hasBarrier) &&
            (i !== PartnerIncorporeal || p.hasIncorporeal) &&
            (i !== iReserve || p.hasReserve);
          if (on) b.enable();
          else b.disable();
        });
        break;
      }
    }
  }

  // ---- Opening and closing ----

  /** closeDialog is Close: an attack dialog above this one closes first. */
  closeDialog(): void {
    if (this.w.attack !== undefined) return;
    this.hide();
    this.w.linked = undefined;
    this.done?.();
  }

  private buildForm(): HTMLElement[] {
    const o = this.panels(300);
    const c = this.character;
    this.abilities!.show(c, this.trait, c);
    this.weaknesses!.show(c, this.trait, c);
    return o;
  }

  private buildSpells(): HTMLElement[] {
    const doc = this.w.doc;
    this.spells = new Lines(doc, "Spells", 300, 320, 90);
    this.spells.onSelect = (i) => this.spellSelected(i);
    this.spellName = el(doc, "input");
    this.spellName.type = "text";
    this.spellName.id = "spell-name";
    this.castKind = rules.Ability;
    let kind = "Ability";
    if (rules.has(this.trait.item, rules.CastsWeaknesses)) {
      this.castKind = rules.Weakness;
      kind = "Weakness";
    }
    const s = el(doc, "select", "choice");
    s.id = "spell-ability";
    const none = el(doc, "option", undefined, Placeholder);
    none.disabled = true;
    none.hidden = true;
    s.append(none);
    for (let i = 0; i < rules.count(this.castKind); i++) {
      s.append(
        el(doc, "option", undefined, rules.label(rules.get(this.castKind, i))),
      );
    }
    s.selectedIndex = 0;
    s.addEventListener("change", () => {
      if (!this.filling && !this.w.filling) {
        this.chooseSpellItem(this.spellItem());
      }
    });
    this.spellAbility = s;
    const kindLabel = el(doc, "label", undefined, kind);
    kindLabel.htmlFor = s.id;
    this.spellKind = kindLabel;
    this.spellHelp = new HelpButton(doc, 0, (page) => this.w.openPage(page));
    this.spellLevel =
      this.castKind === rules.Weakness
        ? new Spinner(doc, -3, -1, -1)
        : new Spinner(doc, 1, 5, 1);
    this.spellLevel.input.id = "spell-level";
    this.spellEnd = this.numberBox("END", false);
    this.spellEnd.allowPlus = true;
    const d = this.w.dialogs;
    this.addSpell = d.button("Add", () => this.spellButton(this.addSpell!));
    this.changeSpell = d.button("Change", () =>
      this.spellButton(this.changeSpell!),
    );
    this.removeSpell = d.button("Remove", () =>
      this.spellButton(this.removeSpell!),
    );

    const nameLabel = el(doc, "label", undefined, "Name");
    nameLabel.htmlFor = this.spellName.id;
    const nameRow = el(doc, "div", "field-row");
    nameRow.append(nameLabel, this.spellName);
    const kindRow = el(doc, "div", "field-row");
    kindRow.append(this.spellKind, s, this.spellHelp.button);
    const grid = el(doc, "div", "columns");
    grid.append(nameRow, kindRow);
    const levelLabel = el(doc, "label", undefined, "level");
    levelLabel.htmlFor = this.spellLevel.input.id;
    const level = el(doc, "div", "row");
    level.append(levelLabel, this.spellLevel.input, this.spellEnd.element);
    const buttons = el(doc, "div", "row");
    buttons.append(this.addSpell, this.changeSpell, this.removeSpell);
    this.showSpells(-1);
    return [bold(doc, "Spells"), this.spells.element, grid, level, buttons];
  }

  private buildPartner(): HTMLElement[] {
    const doc = this.w.doc;
    const p = this.partner!;
    this.partnerName = el(doc, "input");
    this.partnerName.type = "text";
    this.partnerName.id = "partner-name";
    this.partnerName.value = p.name;
    this.partnerName.addEventListener("input", () => {
      if (this.w.filling) return;
      const name = trim(this.partnerName!.value);
      p.name = name !== "" ? name : p.label; // the file needs one
      this.changed();
    });
    const [fragment, fragmentLabel] = check(doc, "a Fragment");
    fragment.checked = p.isFragment;
    fragment.addEventListener("change", () => {
      if (this.w.filling) return;
      p.isFragment = fragment.checked;
      this.changed();
    });
    const [combat, combatLabel] = check(doc, "combat stats");
    combat.checked = p.hasCombat;
    combat.addEventListener("change", () => {
      if (this.w.filling) return;
      p.hasCombat = combat.checked;
      this.changed();
    });
    this.fragment = fragment;
    this.combat = combat;
    const panels = this.panels(170);
    this.abilities!.show(p, undefined, this.character);
    this.weaknesses!.show(p, undefined, this.character);
    this.attacks = new Lines(doc, "Attacks", 100, 100, 100, 100);
    const d = this.w.dialogs;
    this.addAttack = d.button("Add...", () =>
      this.attackButton(this.addAttack!),
    );
    this.editAttack = d.button("Edit...", () =>
      this.attackButton(this.editAttack!),
    );
    this.removeAttack = d.button("Remove", () =>
      this.attackButton(this.removeAttack!),
    );
    [
      p.defense,
      p.barrier,
      p.health,
      p.endurance,
      p.reserve,
      p.tv,
      p.incorporeal,
    ].forEach((n, i) => {
      const b = this.numberBox(partnerLabels[i]!, true);
      b.target = n;
      this.numbers[i] = b;
    });
    if (this.numbers.length !== nPartnerNumbers) {
      throw new Error("a partner's numbers miscounted");
    }

    const nameLabel = el(doc, "label", undefined, "Name");
    nameLabel.htmlFor = this.partnerName.id;
    const top = el(doc, "div", "field-row");
    top.append(nameLabel, this.partnerName, fragmentLabel, combatLabel);
    const buttons = el(doc, "div", "row");
    buttons.append(this.addAttack, this.editAttack, this.removeAttack);
    // Incorporeal Form's Defense under Barrier's, as on the page.
    const n = this.numbers;
    const barriers = el(doc, "div", "number-column");
    barriers.append(n[iBarrier]!.element, n[PartnerIncorporeal]!.element);
    const boxes = el(doc, "div", "row sheet-numbers");
    boxes.append(
      n[0]!.element,
      barriers,
      n[2]!.element,
      n[3]!.element,
      n[iReserve]!.element,
      n[5]!.element,
    );
    this.showAttacks(-1);
    return [
      top,
      ...panels,
      bold(doc, "Attacks"),
      this.attacks.element,
      buttons,
      boxes,
    ];
  }

  /**
   * editLinked edits t's linked content, t an Ability of c (or of its
   * form, or its partner's) with some (t.item.linked isn't NoLink). A
   * Companion or Vehicle gets its sheet now if it has none. done is
   * called on Close.
   */
  static editLinked(
    w: Window,
    c: character.Character,
    t: character.Trait,
    done: (() => void) | undefined,
  ): LinkedDialog {
    const d = new LinkedDialog(w, c, t, done);
    if (d.mode === rules.Partner || d.mode === rules.Machine) {
      if (t.partner === undefined) {
        t.partner = character.newPartner(t);
        w.changed();
      }
      d.partner = character.sheetOf(t.partner);
    }
    w.linked = d;
    let body: HTMLElement[];
    let focus: HTMLElement;
    switch (d.mode) {
      case rules.Form:
        body = d.buildForm();
        focus = d.abilities!.choice;
        break;
      case rules.Spells:
        if (rules.has(t.item, rules.CastsWeaknesses)) {
          d.info.textContent =
            "Magic +" +
            String(t.level) +
            ": a curse casts a Weakness; its END is by the Magic's level and the Weakness's size (p. 58).";
        } else {
          d.info.textContent =
            "Magic +" +
            String(t.level) +
            ": a spell's END is by the Magic's level and its own (p. 58), more for Barrier.";
        }
        body = d.buildSpells();
        focus = d.spellName!;
        break;
      default:
        d.info.textContent =
          d.mode === rules.Partner
            ? "A Companion's sheet: a Secondary NPC's (p. 52, 123)."
            : "A Vehicle's sheet (p. 64).";
        body = d.buildPartner();
        focus = d.partnerName!;
    }
    d.showAll();
    d.hide = w.dialogs.modal(
      [d.info, ...body],
      [d.close],
      focus,
      () => d.closeDialog(),
      rules.label(t.item!),
      "linked-dialog",
    );
    return d;
  }
}
