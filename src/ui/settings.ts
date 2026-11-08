// Character > Limits...: the rules that limit a character, saved in its
// options (ova_cg_go's SettingsDialog, internal/ui/settings.go; ova_cg_po's
// OvaSettings).
//
// ova_cg_po's PLAN.md, "Limiting the character (p. 21)": Base Zero, a
// Power Ceiling, starting levels, Scaled Cost, Knowledge and Ineptitude
// at half cost, Combined Effectiveness, each turned on here and saved in
// the character's options: block. calc applies them; this dialog only
// sets them.
//
// It edits the character as the user works, as the attack dialog does,
// so the totals and warnings behind it follow each change (the window's
// limitsChanged); Cancel (and Escape) puts back the options there were.
// It is modal but doesn't wait: OK and Cancel call done.
//
// A number turned off keeps what it was, so turning it on again brings
// it back; one never set starts at p. 21's example: Base Zero's 5, 5
// starting levels and a Power Ceiling of 15.

import * as calc from "../core/calc.ts";
import type * as character from "../core/character.ts";
import * as rules from "../core/rules.ts";
import type { Window } from "./window.ts";
import { el, HelpButton, Spinner } from "./widgets.ts";

const baseZeroDefault = 5;
const ceilingDefault = 15;
const startingDefault = 5;

/**
 * same says whether a and b are the same limits: a rule's number counts
 * only while the rule is on, since only then is it used or saved.
 */
export function same(a: calc.Options, b: calc.Options): boolean {
  return (
    a.baseZero === b.baseZero &&
    (!a.baseZero || a.baseZeroRange === b.baseZeroRange) &&
    a.powerCeiling === b.powerCeiling &&
    (!a.powerCeiling || a.ceiling === b.ceiling) &&
    a.startingLevels === b.startingLevels &&
    (!a.startingLevels || a.starting === b.starting) &&
    a.scaledCost === b.scaledCost &&
    a.halfCostKnowledge === b.halfCostKnowledge &&
    a.combinedEffectiveness === b.combinedEffectiveness
  );
}

/** A copy of o: Go copies the struct by value. */
function copy(o: calc.Options): calc.Options {
  return Object.assign(new calc.Options(), o);
}

/** SettingsDialog is Character > Limits.... */
export class SettingsDialog {
  readonly w: Window;
  readonly baseZero: HTMLInputElement;
  readonly powerCeiling: HTMLInputElement;
  readonly startingLevels: HTMLInputElement;
  readonly scaledCost: HTMLInputElement;
  readonly halfCost: HTMLInputElement;
  readonly combined: HTMLInputElement;
  readonly baseZeroRange: Spinner;
  readonly ceiling: Spinner;
  readonly starting: Spinner;
  readonly ok: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  private readonly character: character.Character;
  /** As they were, for Cancel */
  private readonly old: calc.Options;
  private readonly oldHas: boolean;
  private readonly done: ((ok: boolean) => void) | undefined;
  private hide: () => void = () => {};

  private constructor(
    w: Window,
    c: character.Character,
    done: ((ok: boolean) => void) | undefined,
  ) {
    this.w = w;
    this.character = c;
    this.done = done;
    this.old = copy(c.options);
    this.oldHas = c.hasOptions;
    const o = c.options;
    // Built before their handlers can run: no change while building.
    this.baseZero = this.check(o.baseZero);
    this.baseZeroRange = this.spinner(
      0,
      99,
      o.baseZero,
      o.baseZeroRange,
      baseZeroDefault,
    );
    this.startingLevels = this.check(o.startingLevels);
    this.starting = this.spinner(
      0,
      999,
      o.startingLevels,
      o.starting,
      startingDefault,
    );
    this.powerCeiling = this.check(o.powerCeiling);
    this.ceiling = this.spinner(
      1,
      999,
      o.powerCeiling,
      o.ceiling,
      ceilingDefault,
    );
    this.scaledCost = this.check(o.scaledCost);
    this.halfCost = this.check(o.halfCostKnowledge);
    this.combined = this.check(o.combinedEffectiveness);
    this.ok = w.dialogs.button("OK", () => this.okClicked(), true);
    this.cancel = w.dialogs.button("Cancel", () => this.cancelEdit());
  }

  /**
   * showActive makes the spinners active only with their rule, half cost
   * only with one of the rules it applies under (p. 57).
   */
  private showActive(): void {
    this.baseZeroRange.input.disabled = !this.baseZero.checked;
    this.ceiling.input.disabled = !this.powerCeiling.checked;
    this.starting.input.disabled = !this.startingLevels.checked;
    this.halfCost.disabled = !(
      this.baseZero.checked ||
      this.powerCeiling.checked ||
      this.scaledCost.checked
    );
  }

  /**
   * take sets the character's options from the dialog. The block is saved
   * while any rule is on, or if the file had one and nothing changed.
   */
  private take(): void {
    const o = new calc.Options();
    o.baseZero = this.baseZero.checked;
    o.baseZeroRange = this.baseZeroRange.value;
    o.powerCeiling = this.powerCeiling.checked;
    o.ceiling = this.ceiling.value;
    o.startingLevels = this.startingLevels.checked;
    o.starting = this.starting.value;
    o.scaledCost = this.scaledCost.checked;
    o.halfCostKnowledge = this.halfCost.checked;
    o.combinedEffectiveness = this.combined.checked;
    const c = this.character;
    if (same(o, c.options)) return;
    c.options = o;
    c.hasOptions =
      o.baseZero ||
      o.powerCeiling ||
      o.startingLevels ||
      o.scaledCost ||
      o.halfCostKnowledge ||
      o.combinedEffectiveness ||
      (this.oldHas && same(o, this.old));
    this.w.limitsChanged();
  }

  private changeAction(): void {
    this.showActive();
    this.take();
  }

  private finish(accepted: boolean): void {
    this.hide();
    this.w.settings = undefined;
    this.done?.(accepted);
  }

  /** okClicked is OK: the limits kept. */
  okClicked(): void {
    this.finish(true);
  }

  /** cancelEdit is Cancel: the options put back. */
  cancelEdit(): void {
    const c = this.character;
    if (!same(c.options, this.old) || c.hasOptions !== this.oldHas) {
      c.options = copy(this.old);
      c.hasOptions = this.oldHas;
      this.w.limitsChanged();
    }
    this.finish(false);
  }

  private check(on: boolean): HTMLInputElement {
    const b = el(this.w.doc, "input");
    b.type = "checkbox";
    b.checked = on;
    b.addEventListener("change", () => this.changeAction());
    return b;
  }

  /**
   * spinner is a spinner from low to high showing value, or def if the
   * rule is off.
   */
  private spinner(
    low: number,
    high: number,
    on: boolean,
    value: number,
    def: number,
  ): Spinner {
    const s = new Spinner(this.w.doc, low, high, on ? value : def);
    s.onChanged = () => this.changeAction();
    return s;
  }

  /**
   * row is a rule's line: its checkbox and its name with its page, then
   * its number's label and spinner if it has one, then ? at its page.
   */
  private row(
    b: HTMLInputElement,
    name: string,
    rest: string,
    page: number,
    unit = "",
    s?: Spinner,
  ): HTMLElement {
    const doc = this.w.doc;
    const r = el(doc, "div", "field-row");
    const l = el(doc, "label", "check limit-rule");
    l.append(b, rules.pageLabel(name, page) + rest);
    r.append(l);
    if (s !== undefined) {
      const u = el(doc, "label", "check");
      u.append(unit, s.input);
      r.append(u);
    }
    r.append(new HelpButton(doc, page, (p) => this.w.openPage(p)).button);
    return r;
  }

  /** editSettings edits c's limits; done is called on OK (ok) or Cancel. */
  static editSettings(
    w: Window,
    c: character.Character,
    done: ((ok: boolean) => void) | undefined,
  ): SettingsDialog {
    const d = new SettingsDialog(w, c, done);
    w.settings = d;
    const body = [
      d.row(
        d.baseZero,
        "Base Zero",
        ": the Character Total within",
        rules.LimitsPage,
        "+/-",
        d.baseZeroRange,
      ),
      d.row(
        d.startingLevels,
        "Starting levels",
        ", plus the Weaknesses'",
        rules.LimitsPage,
        "levels",
        d.starting,
      ),
      d.row(
        d.powerCeiling,
        "Power Ceiling",
        ": the Abilities at most",
        rules.LimitsPage,
        "levels",
        d.ceiling,
      ),
      d.row(
        d.scaledCost,
        "Scaled Cost",
        ": +1 to +5 cost 1, 2, 4, 8, 15",
        rules.LimitsPage,
      ),
      d.row(
        d.halfCost,
        "Knowledge and Ineptitude at half cost",
        "",
        rules.HalfCostPage,
      ),
      d.row(
        d.combined,
        "Combined Effectiveness",
        ": at most +5 to a roll",
        rules.LimitsPage,
      ),
    ];
    d.showActive();
    d.hide = w.dialogs.modal(
      body,
      [d.ok, d.cancel],
      d.baseZero,
      () => d.cancelEdit(),
      "Limits",
      "limits-dialog",
    );
    return d;
  }
}
