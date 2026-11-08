// Phase 10's dialog on happy-dom: ova_cg_go's TestLimits
// (internal/ui/limits_test.go), its Character > Limits... half, with its
// labels. Its other half, the rulebook and the viewer kept, is Phase
// 13's. The Boss Abilities' divider and warning are sheet.test.ts's
// bossAbilities, from Go's testBossAbilities.
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as character from "../../src/core/character.ts";
import * as rules from "../../src/core/rules.ts";
import type { SettingsDialog } from "../../src/ui/settings.ts";
import type { TraitPanel } from "../../src/ui/traitpanel.ts";
import {
  AbilityLevels,
  AbilityPoints,
  Discard,
  Points,
  Total,
  type Window,
} from "../../src/ui/window.ts";
import { checker, load, newWindow, press, saved } from "./setup.ts";

/**
 * reds is which of the Abilities' levels, the Total, the points and the
 * Abilities' points are red: "ATPa" for all four, "-T--" for the Total
 * alone.
 */
function reds(w: Window): string {
  const n = w.numbers;
  return (
    (n[AbilityLevels]!.red ? "A" : "-") +
    (n[Total]!.red ? "T" : "-") +
    (n[Points]!.red ? "P" : "-") +
    (n[AbilityPoints]!.red ? "a" : "-")
  );
}

function addTrait(p: TraitPanel, name: string, level: number): void {
  p.pick(name);
  p.spinner.setValue(level);
  p.text.value = "";
  p.addButton.click();
}

/**
 * lineListed says whether one of p's lines is head, a tab, points and a
 * tab if any are given, and name's page.
 */
function lineListed(
  p: TraitPanel,
  head: string,
  points: string,
  name: string,
): boolean {
  let want = head + "\t";
  if (points !== "") want += points + "\t";
  want += rules.pageText(rules.find(name));
  for (let i = 0; i < p.count(); i++) if (p.line(i) === want) return true;
  return false;
}

function warned(w: Window, text: string): boolean {
  return w.warnings.find(text) >= 0;
}

function modified(w: Window): boolean {
  return w.doc.title.includes(" *");
}

/** turn sets a checkbox as the user does: a change event. */
function turn(b: HTMLInputElement, on: boolean): void {
  b.checked = on;
  b.dispatchEvent(new b.ownerDocument.defaultView!.Event("change"));
}

test("TestLimits: Character > Limits...", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  check(w.limitsItem.label === "Limits...", "Character > Limits...");

  // fresh is a new character with Attack +3, unmodified; Limits...
  // opened.
  const fresh = (): SettingsDialog => {
    w.newItem.action!();
    addTrait(w.abilities, "Attack", 3);
    w.adopt(character.one(w.character), "", []);
    w.limitsItem.action!();
    if (w.settings === undefined) throw new Error("Limits...: no dialog");
    return w.settings;
  };

  // ---- Limits... ----
  let d = fresh();
  let c = w.character;
  check(
    !d.baseZero.checked &&
      !d.powerCeiling.checked &&
      !d.startingLevels.checked &&
      !d.scaledCost.checked &&
      !d.halfCost.checked &&
      !d.combined.checked,
    "a new character: no limits",
  );
  check(
    d.baseZeroRange.value === 5 &&
      d.starting.value === 5 &&
      d.ceiling.value === 15 &&
      d.baseZeroRange.disabled &&
      d.ceiling.disabled &&
      d.starting.disabled &&
      d.halfCost.disabled,
    "their numbers p. 21's example, inactive; half cost inactive with none of its rules",
  );
  check(
    c.total.value === 3 && reds(w) === "----" && !modified(w),
    "Attack +3: a total of 3, nothing red",
  );

  turn(d.baseZero, true);
  check(
    c.options.baseZero &&
      c.options.baseZeroRange === 5 &&
      c.hasOptions &&
      !d.baseZeroRange.disabled &&
      !d.halfCost.disabled &&
      modified(w) &&
      saved(w).includes("base-zero: 5") &&
      reds(w) === "----",
    "Base Zero on: its range 5, saved, the title marked; 3 within it",
  );
  d.baseZeroRange.spin(2);
  check(
    c.options.baseZeroRange === 2 &&
      reds(w) === "-T--" &&
      warned(w, "Base Zero") &&
      saved(w).includes("base-zero: 2"),
    "range 2: the Total red, and the warning",
  );
  d.baseZeroRange.spin(3);
  check(reds(w) === "----" && !warned(w, "Base Zero"), "range 3: not red");
  turn(d.scaledCost, true);
  check(
    c.options.scaledCost &&
      c.points.value === 4 &&
      w.numbers[Points]!.visible &&
      reds(w) === "--P-" &&
      saved(w).includes("scaled-cost: true"),
    "Scaled Cost: 4 points, shown, beyond 3: the points red, not the Total",
  );
  check(
    c.abilityPoints.value === 4 && w.numbers[AbilityPoints]!.visible,
    "and the Abilities' 4 points shown",
  );
  turn(d.powerCeiling, true);
  d.ceiling.spin(3);
  check(
    reds(w) === "--Pa" && warned(w, "Power Ceiling"),
    "Power Ceiling 3 on Scaled Cost: the Abilities' points red, not their levels",
  );
  d.ceiling.spin(15);
  turn(d.powerCeiling, false);
  turn(d.scaledCost, false);
  turn(d.baseZero, false);
  check(
    !c.options.baseZero &&
      d.baseZeroRange.disabled &&
      d.halfCost.disabled &&
      d.baseZeroRange.value === 3 &&
      reds(w) === "----" &&
      !saved(w).includes("base-zero"),
    "Base Zero off: its number kept, inactive, not saved",
  );

  turn(d.powerCeiling, true);
  check(
    c.options.powerCeiling &&
      c.options.ceiling === 15 &&
      reds(w) === "----" &&
      saved(w).includes("power-ceiling: 15"),
    "Power Ceiling 15: 3 under it",
  );
  d.ceiling.spin(2);
  check(
    reds(w) === "A---" && warned(w, "Power Ceiling"),
    "Power Ceiling 2: the Abilities red, and the warning",
  );
  turn(d.powerCeiling, false);
  turn(d.startingLevels, true);
  check(
    c.options.startingLevels &&
      c.options.starting === 5 &&
      reds(w) === "----" &&
      saved(w).includes("starting-levels: 5"),
    "5 starting levels: 3 within them",
  );
  d.starting.spin(2);
  check(
    reds(w) === "A---" && warned(w, "starting levels"),
    "2 starting levels: the Abilities red",
  );
  turn(d.startingLevels, false);

  addTrait(w.abilities, "Knowledge", 3);
  turn(d.powerCeiling, true);
  turn(d.halfCost, true);
  check(
    c.options.halfCostKnowledge &&
      c.abilityLevels.value === 5 &&
      saved(w).includes("half-cost-knowledge: true"),
    "half cost: Knowledge +3 counts 2 (p. 57)",
  );
  turn(d.powerCeiling, false);
  check(
    c.options.halfCostKnowledge &&
      d.halfCost.disabled &&
      c.abilityLevels.value === 6,
    "with none of its rules: kept, inactive, and Knowledge counts 3",
  );
  turn(d.combined, true);
  check(
    c.options.combinedEffectiveness &&
      saved(w).includes("combined-effectiveness: true"),
    "Combined Effectiveness on, saved",
  );
  check(
    lineListed(w.abilities, "+3 Attack", "", "Attack"),
    "no points in the lists without Scaled Cost",
  );
  turn(d.scaledCost, true);
  check(
    lineListed(w.abilities, "+3 Attack", "4 pts", "Attack") &&
      lineListed(w.abilities, "+3 Knowledge", "2 pts", "Knowledge"),
    "Scaled Cost: each Ability's points listed, Knowledge +3's halved",
  );
  addTrait(w.weaknesses, "Weak", -1);
  check(
    lineListed(w.weaknesses, "-1 Weak", "1 pt", "Weak"),
    "and each Weakness's",
  );
  turn(d.scaledCost, false);
  check(
    lineListed(w.abilities, "+3 Attack", "", "Attack") &&
      lineListed(w.weaknesses, "-1 Weak", "", "Weak"),
    "Scaled Cost off: the points gone from the lists",
  );

  d.cancel.click();
  check(
    w.settings === undefined &&
      !c.hasOptions &&
      !c.options.halfCostKnowledge &&
      !c.options.combinedEffectiveness &&
      !c.options.powerCeiling &&
      !saved(w).includes("options:") &&
      reds(w) === "----" &&
      c.abilityLevels.value === 6 &&
      !modified(w),
    "Cancel: no limits again, nothing saved, the title unmarked",
  );

  d = fresh();
  c = w.character;
  turn(d.baseZero, true);
  d.baseZeroRange.spin(1);
  d.ok.click();
  check(
    w.settings === undefined &&
      c.options.baseZero &&
      saved(w).includes("base-zero: 1") &&
      modified(w) &&
      reds(w) === "-T--",
    "OK: kept, saved, the title marked, the Total red",
  );
  w.limitsItem.action!();
  d = w.settings!;
  check(
    d.baseZero.checked &&
      d.baseZeroRange.value === 1 &&
      !d.baseZeroRange.disabled,
    "opened again: as left",
  );
  turn(d.baseZero, false);
  d.cancel.click();
  check(
    w.settings === undefined &&
      c.options.baseZero &&
      reds(w) === "-T--" &&
      modified(w),
    "Cancel: as before, the title still marked from before",
  );

  w.newItem.action!();
  c = w.character;
  c.hasOptions = true; // as a file with an empty options: block loads
  w.limitsItem.action!();
  d = w.settings!;
  turn(d.baseZero, true);
  turn(d.baseZero, false);
  check(
    c.hasOptions && saved(w).includes("options:"),
    "an empty options: block, changed and changed back: kept",
  );
  turn(d.combined, true);
  turn(d.combined, false);
  turn(d.baseZero, true);
  d.ok.click();
  const ok = load(w, "Sheet.yaml");
  w.limitsItem.action!();
  d = w.settings!;
  check(
    ok &&
      !d.baseZero.checked &&
      d.powerCeiling.checked &&
      d.ceiling.value === 30 &&
      d.startingLevels.checked &&
      d.starting.value === 20 &&
      d.halfCost.checked &&
      !d.halfCost.disabled &&
      !d.scaledCost.checked,
    "Sheet's: Power Ceiling 30, 20 starting levels, half cost",
  );
  d.cancelEdit();
  done();
});

// What the page adds to Go's: the dialog on the Escape stack, Ctrl+E,
// every rule's name with its page, and opening it being no change.
test("Limits...: Ctrl+E, Escape as Cancel, the rules' pages", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  load(w, "Sheet.yaml");
  const c = w.character;
  check(!w.limitsItem.disabled, "Limits... enabled");
  press(doc, { code: "KeyE", ctrlKey: true }, doc.body);
  const d = w.settings;
  check(
    d !== undefined && doc.querySelector("dialog.limits-dialog") !== null,
    "Ctrl+E: the dialog shown",
  );
  check(!w.modified, "opening it: no change");
  check(doc.activeElement === d!.baseZero, "the focus on Base Zero");
  const text = doc.querySelector("dialog.limits-dialog")!.textContent ?? "";
  check(
    [
      "Base Zero (p. 21)",
      "Starting levels (p. 21)",
      "Power Ceiling (p. 21)",
      "Scaled Cost (p. 21)",
      "Knowledge and Ineptitude at half cost (p. 57)",
      "Combined Effectiveness (p. 21)",
    ].every((s) => text.includes(s)),
    "each rule's name with its page",
  );
  check(
    doc.querySelectorAll("dialog.limits-dialog button.help").length === 6,
    "and ? beside each",
  );
  const again = press(doc, { code: "KeyE", ctrlKey: true }, doc.body);
  check(
    w.settings === d &&
      doc.querySelectorAll("dialog").length === 1 &&
      again.defaultPrevented,
    "Ctrl+E while it is open: nothing more, but prevented",
  );
  const s = press(doc, { code: "KeyS", ctrlKey: true }, doc.body);
  check(
    s.defaultPrevented &&
      f.downloads.length === 0 &&
      doc.querySelectorAll("dialog").length === 1,
    "Ctrl+S under it: prevented, not the browser's, and no save",
  );
  turn(d!.scaledCost, true);
  check(c.options.scaledCost && w.modified, "Scaled Cost on: a change");
  w.dialogs.escape();
  check(
    w.settings === undefined &&
      !c.options.scaledCost &&
      !w.modified &&
      doc.querySelector("dialog.limits-dialog") === null,
    "Escape: as Cancel, the limits and the title as they were",
  );
  done();
});
