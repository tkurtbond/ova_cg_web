// A list of Abilities or Weaknesses and its editor: a character's, a
// form's, a partner's, the port of ova_cg_go's internal/ui/traitpanel.go
// (ova_cg_po's OvaTraitPanel).
//
// ova_cg_po's PLAN.md, "The window": the Abilities and the Weaknesses
// are each a list of lines ("+3 Attack (Kaze Satsujinsha)", and "p. 50"
// at the right; under Scaled Cost its points between, "4 pts") with a
// Panel's controls. The same panel edits the character's own (the
// page), a Transformation's form, and a Companion's or Vehicle's (the
// linked dialog): its list is a sheet's traits, or, given an owner, the
// owner's form.
//
// After each change the panel recomputes top, the character the list
// belongs to, so what is shown is calc's; then calls changed, the
// Window's or the dialog's. onSelect tells which trait the user chose
// (undefined after Remove), for the controls that act on one.

import * as calc from "../core/calc.ts";
import * as character from "../core/character.ts";
import * as rules from "../core/rules.ts";
import { trim } from "../core/entities.ts";
import { Panel } from "./widgets.ts";

/**
 * traitLine is t's line: "+2 Flight (on a broom)", its Scaled Cost
 * points ("2 pts", shown only under it), and its page.
 */
export function traitLine(t: character.Trait): string[] {
  let s = String(t.level);
  if (t.level > 0) s = "+" + s;
  s += " " + t.name;
  if (t.detail !== undefined) s += " (" + t.detail + ")";
  const pts = t.points === 1 ? "1 pt" : String(t.points) + " pts";
  return [s, pts, rules.pageText(t.item)];
}

/** TraitPanel is a list of Abilities or Weaknesses and its editor. */
export class TraitPanel extends Panel {
  /** Whose traits are listed, */
  private sheet: calc.Sheet | undefined = undefined;
  /** or, if not undefined, whose form */
  private owner: calc.Trait | undefined = undefined;
  private top: character.Character | undefined = undefined;
  /** shown[i]: line i's */
  private shown: character.Trait[] = [];
  onSelect: ((t: character.Trait | undefined) => void) | undefined = undefined;
  private readonly tell: (text: string) => void;

  /**
   * A panel for kind's traits: levels +1 to +5 for an Ability, -1 to -3
   * for a Weakness (Go's newTraits).
   */
  constructor(
    doc: Document,
    kind: rules.Kind,
    title: string,
    height: number,
    openPage: (page: number) => void,
    tell: (text: string) => void,
  ) {
    super(doc, kind, title, "level", "detail", height, openPage, 50, 50);
    this.tell = tell;
    if (kind === rules.Ability) {
      this.spinner.setBounds(1, 5);
      this.spinner.setValue(1);
    } else {
      this.spinner.setBounds(-3, -1);
      this.spinner.setValue(-1);
    }
  }

  private list(): calc.Trait[] {
    if (this.owner !== undefined) return this.owner.form;
    return this.sheet!.traits;
  }

  /** traitAt is the trait on line i; undefined for none. */
  traitAt(i: number): character.Trait | undefined {
    return this.shown[i];
  }

  /** selectedTrait is the selected trait; undefined for none. */
  selectedTrait(): character.Trait | undefined {
    return this.traitAt(this.selected());
  }

  /**
   * showsPoints says whether the lines show Scaled Cost's points: a
   * sheet's own traits under it, not a form's, which no total counts
   * (p. 63).
   */
  showsPoints(): boolean {
    return (
      this.sheet !== undefined &&
      this.owner === undefined &&
      this.sheet.options.scaledCost
    );
  }

  protected fill(): string[][] {
    this.shown = [];
    this.showColumn(0, this.showsPoints());
    if (this.sheet === undefined) return [];
    this.offerBoss(this.offersBoss());
    const rows: string[][] = [];
    for (const t of this.list()) {
      if (t.kind === this.kind) {
        const x = character.traitOf(t);
        this.shown.push(x);
        rows.push(traitLine(x));
      }
    }
    return rows;
  }

  /** lineOf is the line t is on. */
  private lineOf(t: calc.Trait): number {
    let i = 0;
    for (const l of this.list()) {
      if (l === t) break;
      if (l.kind === this.kind) i++;
    }
    return i;
  }

  private selectTrait(t: character.Trait | undefined): void {
    this.onSelect?.(t);
  }

  protected load(i: number): void {
    const t = this.shown[i]!;
    this.choose(t.item);
    this.spinner.setValue(t.level);
    this.text.value = t.detail ?? "";
    this.selectTrait(t);
  }

  /**
   * chosen: a Boss Ability has no level of its own (ova_cg_po's
   * PLAN.md, "Boss NPCs"), so its spinner is 1 and off.
   */
  protected chosen(): void {
    this.helpChosen();
    if (rules.has(this.item(), rules.BossOnly)) {
      this.spinner.setValue(1);
      this.spinner.disable();
    } else {
      this.spinner.enable();
    }
  }

  /** offersBoss says whether the list is a Boss's own Abilities. */
  private offersBoss(): boolean {
    return (
      this.kind === rules.Ability &&
      this.sheet !== undefined &&
      this.owner === undefined &&
      this.sheet.kind === calc.BossSheet
    );
  }

  protected add(): number {
    const it = this.item();
    if (it === undefined) {
      this.tell("Choose a name first.");
      return -1;
    }
    const t = character.newTrait(
      it,
      this.kind,
      this.spinner.value,
      "",
      trim(this.text.value),
    );
    character.insertTrait(this.list(), t);
    character.recompute(this.top!);
    return this.lineOf(t);
  }

  /** change: a name the tables don't have stays, if none is chosen. */
  protected change(i: number): number {
    const t = this.shown[i]!;
    const it = this.item() ?? t.item;
    character.changeTrait(
      this.list(),
      t,
      it,
      this.spinner.value,
      trim(this.text.value),
    );
    character.recompute(this.top!);
    return this.lineOf(t);
  }

  protected remove(i: number): boolean {
    character.removeTrait(this.list(), this.shown[i]!);
    this.selectTrait(undefined);
    character.recompute(this.top!);
    return true;
  }

  /**
   * show lists sheet's traits (owner undefined) or owner's form,
   * recomputing top after a change; nothing selected.
   */
  show(
    sheet: calc.Sheet,
    owner: calc.Trait | undefined,
    top: character.Character,
  ): void {
    this.sheet = sheet;
    this.owner = owner;
    this.top = top;
    this.refresh(-1);
    this.selectTrait(undefined);
  }

  /** listShown says whether the lines are the model's, in its order: for tests. */
  listShown(): boolean {
    const want: string[][] = [];
    for (const t of this.list()) {
      if (t.kind === this.kind) want.push(traitLine(character.traitOf(t)));
    }
    if (want.length !== this.count()) return false;
    return want.every((w, i) => {
      let line = w[0]! + "\t";
      if (this.showsPoints()) line += w[1]! + "\t";
      return this.line(i) === line + w[2]!;
    });
  }
}
