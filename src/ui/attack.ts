// The attack dialog, and the Perks and Flaws editor of an Ability, the
// port of ova_cg_go's internal/ui/attack.go (ova_cg_po's
// OvaAttackDialog).
//
// ova_cg_po's PLAN.md, "The window": an attack's name, description and
// affinity, whether it is made with Telekinesis or in the transformed
// form, its Perks and its Flaws, each a list with a name, a count (where
// it can be taken more than once) and a cost (where the user chooses
// one: Cancel, Requirement, Unique), and its ROLL, DX and END, computed
// as the Perks and Flaws change, each with its override box. An Ability
// with Perks and Flaws is edited by the same dialog, without the
// attack's fields: its END alone.
//
// The dialog changes the model as the user works, so the numbers it
// shows are calc's; Cancel puts back what was there when it opened (a
// new attack, the page added, it takes out again). It doesn't wait: it
// shows, and OK or Cancel calls done.

import * as calc from "../core/calc.ts";
import * as character from "../core/character.ts";
import * as rules from "../core/rules.ts";
import { trim } from "../core/entities.ts";
import type { Window } from "./window.ts";
import { el, NumberBox, Panel } from "./widgets.ts";

/** maxTimes is the count's bound for an item taken as often as wanted. */
export const maxTimes = 10;

/** A copy of n, its override with it (Go copies the struct). */
function copyNumber(n: calc.Number): calc.Number {
  return Object.assign(new calc.Number(), n);
}

/** What Cancel puts back of an attack (Go's savedAttack, a copy of it). */
interface SavedAttack {
  name: string;
  affinity: string | undefined;
  description: string | undefined;
  telekinetic: boolean;
  transformed: boolean;
  use: number;
  roll: calc.Number;
  dx: calc.Number;
  end: calc.Number;
}

function saveAttack(a: character.Attack): SavedAttack {
  return {
    name: a.name,
    affinity: a.affinity,
    description: a.description,
    telekinetic: a.telekinetic,
    transformed: a.transformed,
    use: a.use,
    roll: copyNumber(a.roll),
    dx: copyNumber(a.dx),
    end: copyNumber(a.end),
  };
}

function restoreAttack(a: character.Attack, s: SavedAttack): void {
  a.name = s.name;
  a.affinity = s.affinity;
  a.description = s.description;
  a.telekinetic = s.telekinetic;
  a.transformed = s.transformed;
  a.use = s.use;
  // In place, as Go's *a = saved: the boxes' targets stay a's numbers.
  Object.assign(a.roll, s.roll);
  Object.assign(a.dx, s.dx);
  Object.assign(a.end, s.end);
}

/** modCost is the cost m adds: its own, or its item's, each time. */
export function modCost(m: character.Mod): number {
  if (m.item === undefined || m.item.costKind !== rules.FixedCost) {
    return m.times * m.cost;
  }
  return m.times * m.item.cost;
}

/** ModPanel is the Perks' or the Flaws' list and editor. */
export class ModPanel extends Panel {
  private readonly d: AttackDialog;
  private readonly isFlaw: boolean;
  /** shown[i]: line i's */
  private shown: character.Mod[] = [];

  constructor(doc: Document, d: AttackDialog, isFlaw: boolean) {
    super(
      doc,
      isFlaw ? rules.Flaw : rules.Perk,
      isFlaw ? "Flaws" : "Perks",
      "times",
      "cost",
      200,
      (page) => d.w.openPage(page),
      50,
      50,
    );
    this.d = d;
    this.isFlaw = isFlaw;
    this.spinner.setBounds(1, 1);
    this.spinner.setValue(1);
  }

  protected fill(): string[][] {
    this.shown = [];
    const rows: string[][] = [];
    for (const x of this.d.mods()) {
      const m = character.modOf(x);
      if (m.isFlaw !== this.isFlaw) continue;
      this.shown.push(m);
      let name = m.name;
      if (m.detail !== undefined) name += " (" + m.detail + ")";
      if (m.times !== 1) name += " x" + String(m.times);
      const c = modCost(m);
      const cost = c > 0 ? "+" + String(c) : String(c);
      rows.push([name, cost, rules.pageText(m.item)]);
    }
    return rows;
  }

  private lineOf(m: character.Mod): number {
    let i = 0;
    for (const l of this.d.mods()) {
      if (l === m) break;
      if (character.modOf(l).isFlaw === this.isFlaw) i++;
    }
    return i;
  }

  /** chosen sets the count's bounds and the cost's field, for the item chosen. */
  protected chosen(): void {
    this.helpChosen();
    const it = this.item();
    if (it === undefined) return;
    const top = Math.min(it.maxTimes, maxTimes);
    this.spinner.setBounds(1, top);
    if (top > 1) {
      this.spinner.enable();
    } else {
      this.spinner.setValue(1);
      this.spinner.disable();
    }
    if (it.costKind === rules.FixedCost) {
      this.text.value = "";
      this.text.disabled = true;
    } else {
      this.text.disabled = false;
      if (it.costKind === rules.RangeCost && this.text.value === "") {
        this.text.value = String(it.minCost);
      }
    }
  }

  protected load(i: number): void {
    const m = this.shown[i]!;
    this.choose(m.item);
    this.spinner.setValue(m.times);
    if (m.item === undefined || m.item.costKind !== rules.FixedCost) {
      this.text.value = String(m.cost);
    } else {
      this.text.value = "";
    }
  }

  /**
   * read is the controls' count and cost; undefined, said why, if the
   * cost isn't an integer where one is needed.
   */
  private read(it: rules.Item): { times: number; cost: number } | undefined {
    const times = this.spinner.value;
    if (it.costKind === rules.FixedCost) return { times, cost: 0 };
    const n = new calc.Number();
    if (!n.parse(this.text.value, false, false) || !n.overridden) {
      this.d.w.tell("The cost must be a whole number, such as -10.");
      return undefined;
    }
    return { times, cost: n.get() };
  }

  protected add(): number {
    const it = this.item();
    if (it === undefined) {
      this.d.w.tell("Choose a name first.");
      return -1;
    }
    const r = this.read(it);
    if (r === undefined) return -1;
    const m = character.newMod(it, this.isFlaw, r.times, r.cost);
    character.insertMod(this.d.mods(), m);
    this.d.recompute();
    return this.lineOf(m);
  }

  protected change(i: number): number {
    const m = this.shown[i]!;
    const it = this.item() ?? m.item;
    if (it === undefined) return -1; // a name the tables don't have: only Remove
    const r = this.read(it);
    if (r === undefined) return -1;
    const list = this.d.mods();
    character.removeMod(list, m);
    if (it !== m.item) {
      m.item = it;
      m.name = it.name;
      m.detail = undefined;
    }
    m.times = r.times;
    m.cost = r.cost;
    m.hasCost = it.costKind !== rules.FixedCost;
    character.insertMod(list, m);
    this.d.recompute();
    return this.lineOf(m);
  }

  protected remove(i: number): boolean {
    character.removeMod(this.d.mods(), this.shown[i]!);
    this.d.recompute();
    return true;
  }
}

/** AttackDialog is the attack dialog, or an Ability's Perks and Flaws. */
export class AttackDialog {
  readonly w: Window;
  readonly nameIn: HTMLInputElement;
  readonly affinityIn: HTMLInputElement;
  readonly descriptionIn: HTMLTextAreaElement;
  readonly telekinetic: HTMLInputElement;
  readonly transformedCheck: HTMLInputElement;
  readonly perks: ModPanel;
  readonly flaws: ModPanel;
  readonly roll: NumberBox;
  readonly dx: NumberBox;
  readonly end: NumberBox;
  readonly ok: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;

  private readonly character: character.Character;
  /** What is edited: an attack, */
  private readonly attack: character.Attack | undefined;
  /** or an Ability's Perks and Flaws */
  private readonly trait: character.Trait | undefined;
  private readonly isNew: boolean;
  private savedAttack: SavedAttack | undefined = undefined;
  private savedEnd: calc.Number | undefined = undefined;
  private savedMods: calc.Mod[] = [];
  private readonly done: ((changed: boolean) => void) | undefined;
  private filling = false;
  private close: () => void = () => {};
  private readonly content: Node[];

  private constructor(
    w: Window,
    c: character.Character,
    attack: character.Attack | undefined,
    trait: character.Trait | undefined,
    isNew: boolean,
    done: ((changed: boolean) => void) | undefined,
  ) {
    this.w = w;
    this.character = c;
    this.attack = attack;
    this.trait = trait;
    this.isNew = isNew;
    this.done = done;
    const doc = w.doc;

    this.nameIn = el(doc, "input");
    this.nameIn.type = "text";
    this.affinityIn = el(doc, "input");
    this.affinityIn.type = "text";
    this.descriptionIn = el(doc, "textarea", "description");
    const flags = (): void => {
      if (!this.filling && this.attack !== undefined) {
        this.attack.telekinetic = this.telekinetic.checked;
        this.attack.transformed = this.transformedCheck.checked;
        this.recompute();
      }
    };
    const check = (label: string): [HTMLInputElement, HTMLElement] => {
      const b = el(doc, "input");
      b.type = "checkbox";
      b.addEventListener("change", flags);
      const l = el(doc, "label", "check");
      l.append(b, label);
      return [b, l];
    };
    const [tk, tkLabel] = check("made with Telekinesis");
    const [tf, tfLabel] = check("made in the transformed form");
    this.telekinetic = tk;
    this.transformedCheck = tf;
    this.perks = new ModPanel(doc, this, false);
    this.flaws = new ModPanel(doc, this, true);
    this.roll = this.numberBox("ROLL");
    this.dx = this.numberBox("DX");
    this.dx.allowHalf = true;
    this.end = this.numberBox("END");
    this.ok = w.dialogs.button("OK", () => this.okClicked(), true);
    this.cancel = w.dialogs.button("Cancel", () => this.cancelEdit());

    const content: Node[] = [];
    const numbers = el(doc, "div", "row numbers");
    if (attack !== undefined) {
      const field = (
        form: HTMLElement,
        text: string,
        input: HTMLElement,
      ): void => {
        const l = el(doc, "label", undefined, text);
        input.id = "attack-" + text.toLowerCase();
        l.htmlFor = input.id;
        form.append(l, input);
      };
      const form = el(doc, "div", "form");
      field(form, "Name", this.nameIn);
      field(form, "Affinity", this.affinityIn);
      const checks = el(doc, "div", "checks");
      checks.append(tkLabel, tfLabel);
      const top = el(doc, "div", "columns");
      top.append(form, checks);
      const description = el(doc, "div", "form");
      field(description, "Description", this.descriptionIn);
      content.push(top, description);
      numbers.append(this.roll.element, this.dx.element, this.end.element);
    } else {
      numbers.append(this.end.element);
    }
    const mods = el(doc, "div", "columns");
    mods.append(this.perks.element, this.flaws.element);
    content.push(mods, numbers);
    this.content = content;
  }

  /** mods is the list edited: the attack's or the Ability's. */
  mods(): calc.Mod[] {
    if (this.attack !== undefined) return this.attack.mods;
    return this.trait!.mods;
  }

  private showNumbers(): void {
    if (this.attack !== undefined) {
      this.roll.display();
      this.dx.display();
    }
    this.end.display();
  }

  /** recompute computes the character again, and shows the numbers. */
  recompute(): void {
    character.recompute(this.character);
    this.showNumbers();
  }

  private numberChanged(b: NumberBox, ok: boolean): void {
    if (!ok) {
      this.w.tell(
        "Not a number for " + b.label + ". The computed number is used.",
      );
    }
    this.recompute();
  }

  private numberBox(label: string): NumberBox {
    const b = new NumberBox(this.w.doc, label, true);
    b.changed = (b, ok) => this.numberChanged(b, ok);
    return b;
  }

  // ---- Opening and closing ----

  private finish(changed: boolean): void {
    this.close();
    this.w.attack = undefined;
    this.done?.(changed);
  }

  /**
   * okClicked is OK (Go's Ok): the attack's fields taken, the dialog
   * closed. An attack needs a name: without one, said so, and the
   * dialog stays.
   */
  okClicked(): void {
    const a = this.attack;
    if (a !== undefined) {
      const name = trim(this.nameIn.value);
      if (name === "") {
        this.w.tell("The attack needs a name.");
        return;
      }
      a.name = name;
      a.affinity = character.setText(trim(this.affinityIn.value));
      a.description = character.setText(this.descriptionIn.value);
      a.telekinetic = this.telekinetic.checked;
      a.transformed = this.transformedCheck.checked;
    }
    character.recompute(this.character);
    this.finish(true);
  }

  /** cancelEdit is Cancel: everything put back as it was. */
  cancelEdit(): void {
    const a = this.attack;
    if (a !== undefined) {
      if (this.isNew) {
        character.removeAttack(this.character, a);
      } else {
        restoreAttack(a, this.savedAttack!);
        a.mods = this.savedMods;
      }
    } else {
      const t = this.trait!;
      t.mods = this.savedMods;
      Object.assign(t.end, this.savedEnd!);
    }
    character.recompute(this.character);
    this.finish(false);
  }

  private show(title: string, focus: HTMLElement): void {
    this.perks.refresh(-1);
    this.flaws.refresh(-1);
    character.recompute(this.character);
    this.showNumbers();
    this.close = this.w.dialogs.modal(
      this.content,
      [this.ok, this.cancel],
      focus,
      () => this.cancelEdit(),
      title,
      "attack-dialog",
    );
  }

  /**
   * editAttack edits a, an attack of c; isNew if it has just been
   * added, so that Cancel takes it out again. done is called after OK
   * or Cancel, changed true for OK.
   */
  static editAttack(
    w: Window,
    c: character.Character,
    a: character.Attack,
    isNew: boolean,
    done: (changed: boolean) => void,
  ): AttackDialog {
    const d = new AttackDialog(w, c, a, undefined, isNew, done);
    d.savedAttack = saveAttack(a);
    d.savedMods = character.copyMods(a.mods);
    w.attack = d;
    d.roll.target = a.roll;
    d.dx.target = a.dx;
    d.end.target = a.end;
    d.filling = true;
    d.nameIn.value = a.name;
    d.affinityIn.value = a.affinity ?? "";
    d.descriptionIn.value = a.description ?? "";
    d.telekinetic.checked = a.telekinetic;
    d.transformedCheck.checked = a.transformed;
    d.filling = false;
    d.show("Attack", d.nameIn);
    return d;
  }

  /** editMods edits t's Perks and Flaws, and its END: an Ability of c. */
  static editMods(
    w: Window,
    c: character.Character,
    t: character.Trait,
    done: (changed: boolean) => void,
  ): AttackDialog {
    const d = new AttackDialog(w, c, undefined, t, false, done);
    d.savedEnd = copyNumber(t.end);
    d.savedMods = character.copyMods(t.mods);
    w.attack = d;
    d.end.target = t.end;
    d.show(
      t.item !== undefined ? rules.label(t.item) : "an Ability",
      d.perks.choice,
    );
    return d;
  }
}
