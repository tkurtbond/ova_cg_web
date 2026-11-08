// Phase 9's dialog on happy-dom: ova_cg_go's TestLinked
// (internal/ui/linked_test.go), with its labels: a Transformation's
// form, a Magic's spells, a Companion's and a Vehicle's sheets. Each
// kind of linked content opened from the page's button, as the user
// opens it; shown with each name's page; edited, live, and checked in
// the model, in the numbers computed from it, and in what is saved; and
// the page's Character > Transformed form.
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as calc from "../../src/core/calc.ts";
import * as character from "../../src/core/character.ts";
import * as rules from "../../src/core/rules.ts";
import { LinkedDialog, PartnerIncorporeal } from "../../src/ui/linked.ts";
import type { Lines } from "../../src/ui/widgets.ts";
import {
  Barrier,
  Discard,
  Health,
  Reserve,
  TV,
  type Window,
} from "../../src/ui/window.ts";
import { checker, load, newWindow, press, saved, typeIn } from "./setup.ts";

/** click selects l's last line holding text, as a click does. */
function click(l: Lines, text: string): void {
  l.select(l.find(text));
}

function named(list: calc.Trait[], name: string): character.Trait | undefined {
  for (const t of list) {
    const x = character.traitOf(t);
    if (x.name === name) return x;
  }
  return undefined;
}

function partnerShown(d: LinkedDialog, p: character.Character): boolean {
  return [
    p.defense,
    p.barrier,
    p.health,
    p.endurance,
    p.reserve,
    p.tv,
    p.incorporeal,
  ].every((n, i) => d.numbers[i]!.shows(n));
}

/** modified says whether the character is modified, and the title says so. */
function modified(w: Window): boolean {
  return w.modified && w.doc.title.endsWith(" *");
}

/** setChecked sets a checkbox as the user does: a change event. */
function setChecked(b: HTMLInputElement, on: boolean): void {
  b.checked = on;
  b.dispatchEvent(new b.ownerDocument.defaultView!.Event("change"));
}

test("TestLinked: a form, spells, a Companion's and a Vehicle's sheets", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  const has = (s: string) => saved(w).includes(s);
  const openLinked = (name: string): LinkedDialog => {
    click(w.abilities.lines, name);
    w.abilityLinked.click();
    if (w.linked === undefined) throw new Error(name + ": no dialog");
    return w.linked;
  };

  check(PartnerIncorporeal === TV + 1, "a partner's Incorporeal box: TV + 1");

  // ---- The button ----
  let ok = load(w, "Fukiko.yaml");
  let c = w.character;
  click(w.abilities.lines, "Cute!");
  check(
    ok && w.abilityLinked.disabled,
    "an Ability with no linked content: the button inactive",
  );
  click(w.abilities.lines, "Transformation");
  check(
    !w.abilityLinked.disabled && w.abilityLinked.textContent === "Form...",
    "Transformation: Form...",
  );
  click(w.abilities.lines, "Companion");
  check(
    w.abilityLinked.textContent === "Companion...",
    "Companion: Companion...",
  );

  // ---- A Transformation's form ----
  let tr = named(c.traits, "Transformation")!;
  let d = openLinked("Transformation");
  if (d.mode !== rules.Form)
    throw new Error("Form...: the dialog, for the form");
  const fa = d.abilities!;
  const fw = d.weaknesses!;
  check(
    fa.listShown() && fw.listShown() && fa.count() === 4,
    "the form's Abilities and Weaknesses listed, with pages",
  );
  check(
    d.info.textContent ===
      "The form's Abilities and Weaknesses come to +8 levels; Transformation +4 pays for 8 (p. 63)." &&
      !d.infoRed(),
    "its levels against what Transformation +4 pays for",
  );
  let before = c.health.value;
  fa.pick("Tough");
  fa.spinner.setValue(1);
  fa.addButton.click();
  check(
    named(tr.form, "Tough") !== undefined && fa.listShown() && modified(w),
    "a form Ability added: in the form, listed, the character modified",
  );
  check(
    c.transformed && c.health.value === before + 10,
    "Fukiko shown transformed: her HEALTH counts the form's Tough",
  );
  check(
    d.info.textContent ===
      "The form's Abilities and Weaknesses come to +9 levels; Transformation +4 pays for 8 (p. 63)." &&
      d.infoRed(),
    "the levels again, over what it pays for: in red",
  );
  check(has("- name: Tough"), "saved");
  click(fa.lines, "Barrier");
  check(
    !d.mods!.disabled && d.end!.active,
    "the form's Barrier: its Perks and Flaws, its END",
  );
  d.mods!.click();
  check(w.attack !== undefined, "Perks and Flaws...: the dialog over this one");
  d.close.click();
  check(w.linked !== undefined, "Close waits for the dialog above it");
  w.attack!.cancelEdit();
  d.close.click();
  check(w.linked === undefined, "Close");

  // ---- Character > Transformed form ----
  check(
    w.transformedItem.checked,
    "Character > Transformed form: on, as Fukiko's file says",
  );
  w.transformedItem.action!();
  check(
    !c.transformed &&
      c.health.value === before &&
      w.numbers[Health]!.shows(c.health) &&
      !has("transformed: true"),
    "off: the form not counted, in the combat box too, and not saved as shown transformed",
  );
  w.transformedItem.action!();
  check(
    c.transformed &&
      c.health.value === before + 10 &&
      w.numbers[Health]!.shows(c.health) &&
      has("transformed: true"),
    "on again",
  );

  // ---- A Companion's sheet ----
  tr = named(c.traits, "Companion")!;
  let p = character.sheetOf(tr.partner!);
  d = openLinked("Companion");
  check(
    d.mode === rules.Partner &&
      d.partnerName!.value === "Azyrus" &&
      d.fragment!.checked &&
      !d.combat!.checked,
    "Companion...: Azyrus, a Fragment, no combat stats",
  );
  check(
    d.abilities!.listShown() && d.weaknesses!.listShown(),
    "its Abilities and Weaknesses, with pages",
  );
  check(
    d.addAttack!.disabled && !d.numbers[Health]!.active && partnerShown(d, p),
    "no combat stats: its attacks and numbers inactive, but computed: a Companion's 20 less Frail",
  );
  typeIn(d.partnerName!, "Azyrus II");
  check(p.name === "Azyrus II" && has("name: Azyrus II"), "renamed, and saved");
  typeIn(d.partnerName!, " ");
  check(
    p.name === "Companion",
    "a blank name: Companion, since the file needs one",
  );
  setChecked(d.combat!, true);
  check(
    p.hasCombat &&
      !d.addAttack!.disabled &&
      d.numbers[Health]!.active &&
      !d.numbers[Barrier]!.active &&
      !d.numbers[Reserve]!.active &&
      !d.numbers[PartnerIncorporeal]!.active,
    "combat stats on: its attacks and numbers, Barrier's, Incorporeal Form's and Reserve's not, having none",
  );
  before = p.health.value;
  d.abilities!.pick("Tough");
  d.abilities!.addButton.click();
  check(
    p.health.value === before + 10 && partnerShown(d, p),
    "a Companion's Tough +1: its HEALTH 10 more, shown",
  );
  d.numbers[Health]!.type("35");
  check(
    p.health.overridden && p.health.get() === 35 && partnerShown(d, p),
    "its HEALTH overridden",
  );
  check(
    has("health: 35") && has("overrides: [health]"),
    "and saved, in its combat block, listed in overrides",
  );
  d.addAttack!.click();
  if (w.attack === undefined) {
    throw new Error("Add...: the attack dialog, for the Companion");
  }
  w.attack.nameIn.value = "Claw";
  w.attack.okClicked();
  check(
    p.attacks.length === 1 &&
      d.attacks!.count() === 1 &&
      c.attacks.length === 4,
    "OK: the Companion's attack, not Fukiko's",
  );
  check(
    d.attacks!.line(0).startsWith("Claw\tROLL "),
    "listed, with its numbers",
  );
  check(has("name: Claw"), "and saved");
  d.attacks!.select(0);
  d.removeAttack!.click();
  check(p.attacks.length === 0 && !has("name: Claw"), "Remove");
  d.close.click();

  // ---- A Magic's spells ----
  load(w, "Auren.yaml");
  c = w.character;
  tr = named(c.traits, "Magic, Arcane")!;
  d = openLinked("Magic, Arcane");
  check(
    w.abilityLinked.textContent === "Spells..." &&
      d.mode === rules.Spells &&
      d.spells!.count() === tr.spells.length &&
      tr.spells.length === 6,
    "Spells...: Auren's six spells",
  );
  check(
    d.spells!.line(0) === "Mana Shield\tBarrier +2 (p. 51)\tEND 10+",
    "each with its Ability's page and its END: Barrier's 10+",
  );
  check(
    d.castKind === rules.Ability &&
      d.spellKind!.textContent === "Ability" &&
      d.spellLevel!.min === 1 &&
      d.spellLevel!.max === 5,
    "Arcane's spells: Abilities, +1 to +5",
  );
  const n = tr.spells.length;
  d.spellName!.value = "Glow";
  d.pickSpellAbility("Healer");
  check(d.spellHelp!.page === 54, "the Ability chosen: ? at its page");
  d.spellLevel!.setValue(1);
  d.addSpell!.click();
  const i = d.spells!.selected();
  check(
    tr.spells.length === n + 1 &&
      i === n &&
      d.spells!.line(i) === "Glow\tHealer +1 (p. 54)\tEND 5",
    "Add: last, selected, its END by Magic +3 and its level 1: 5 (p. 58)",
  );
  check(has("name: Glow") && has("ability: Healer") && modified(w), "saved");
  d.spellLevel!.setValue(2);
  d.changeSpell!.click();
  check(
    d.spells!.line(n) === "Glow\tHealer +2 (p. 54)\tEND 10",
    "Change: level 2, END 10",
  );
  d.spellEnd!.type("15");
  check(
    d.spells!.line(n) === "Glow\tHealer +2 (p. 54)\tEND 15" &&
      d.spellEnd!.active,
    "its END overridden: 15, listed",
  );
  f.tells = 0;
  d.spellName!.value = " ";
  d.addSpell!.click();
  check(
    f.tells === 1 && tr.spells.length === n + 1,
    "a spell with no name: said so, not added",
  );
  d.spells!.select(n);
  check(
    d.spellName!.value === "Glow",
    "a spell selected: its name, Ability and level to edit",
  );
  d.removeSpell!.click();
  check(
    tr.spells.length === n && !has("name: Glow") && d.spells!.count() === n,
    "Remove",
  );
  d.close.click();

  // A change to an Ability of another kind drops what the file couldn't
  // hold.
  click(w.abilities.lines, "Magic, Arcane");
  w.abilities.pick("Magic, Witchcraft");
  w.abilities.changeButton.click();
  check(
    tr.spells.length === n,
    "Magic, Arcane to Magic, Witchcraft: the spells kept",
  );
  w.abilities.pick("Flight");
  w.abilities.changeButton.click();
  check(
    tr.spells.length === 0 && !has("spells:"),
    "to Flight: the spells dropped",
  );

  // ---- Witchcraft's curses: Weaknesses (p. 58) ----
  ok = load(w, "Cora.yaml");
  c = w.character;
  tr = named(c.traits, "Magic, Witchcraft")!;
  d = openLinked("Magic, Witchcraft");
  check(
    ok &&
      d.castKind === rules.Weakness &&
      d.spellKind!.textContent === "Weakness" &&
      d.spellLevel!.min === -3 &&
      d.spellLevel!.max === -1 &&
      d.spellLevel!.value === -1 &&
      d.spells!.count() === 0,
    "Cora's Witchcraft: its spells are Weaknesses, -1 to -3, none yet",
  );
  d.spellName!.value = "Hex";
  d.pickSpellAbility("Frail");
  check(
    d.spellHelp!.page === 71,
    "the Weakness chosen: ? at its page, Frail's 71",
  );
  d.spellLevel!.setValue(-2);
  d.addSpell!.click();
  check(
    tr.spells.length === 1 &&
      d.spells!.line(0) === "Hex\tFrail -2 (p. 71)\tEND 20",
    "Add: Frail -2, its END by Witchcraft +2 and its size 2: 20",
  );
  check(has("ability: Frail") && has("level: -2"), "saved");
  f.tells = 0;
  d.spellName!.value = " ";
  d.addSpell!.click();
  check(
    f.tells === 1 &&
      f.told === "A curse needs a name and the Weakness it casts." &&
      tr.spells.length === 1,
    "a curse with no name: said so, not added",
  );
  d.close.click();
  d = openLinked("Magic, Witchcraft");
  d.spells!.select(0);
  check(
    d.spellName!.value === "Hex" &&
      d.spellAbilityIndex() === rules.index(rules.find("Frail")) &&
      d.spellLevel!.value === -2,
    "opened again and selected: its name, Weakness and level",
  );
  d.close.click();

  // ---- A new Companion, and a Vehicle ----
  w.newItem.action!();
  c = w.character;
  w.abilities.pick("Companion");
  w.abilities.text.value = "Rex";
  w.abilities.addButton.click();
  let nt = named(c.traits, "Companion");
  check(
    nt !== undefined && nt.partner === undefined,
    "a Companion added: no sheet yet",
  );
  w.abilityLinked.click();
  d = w.linked!;
  check(
    nt?.partner !== undefined &&
      nt.partner.kind === calc.CompanionSheet &&
      d.partnerName!.value === "Rex" &&
      d.combat!.checked,
    "Companion...: its sheet made, a Companion's, named its detail, with combat stats",
  );
  p = character.sheetOf(nt!.partner!);
  check(
    p.health.value === 20 && p.endurance.value === 20 && partnerShown(d, p),
    "a Companion's 20 and 20 (p. 52)",
  );
  check(has("companion:") && has("name: Rex"), "saved as companion:");
  d.close.click();
  w.abilities.pick("Vehicle (Mecha)");
  w.abilities.text.value = "";
  w.abilities.addButton.click();
  d = openLinked("Vehicle (Mecha)");
  nt = named(c.traits, "Vehicle (Mecha)");
  check(
    nt?.partner !== undefined &&
      nt.partner.kind === calc.Character &&
      d.mode === rules.Machine &&
      d.partnerName!.value === "Vehicle" &&
      has("vehicle:") &&
      has("name: Vehicle"),
    "a Vehicle with no detail: a character's sheet, named Vehicle, saved as vehicle:",
  );
  d.close.click();
  load(w, "Vehicle.yaml");
  c = w.character;
  d = openLinked("Vehicle");
  check(
    w.abilityLinked.textContent === "Vehicle..." &&
      d.mode === rules.Machine &&
      d.partnerName!.value === "Thunderhawk" &&
      d.attacks!.count() === 1,
    "Vehicle...: Thunderhawk's sheet, its attack",
  );
  tr = named(c.traits, "Vehicle")!;
  p = character.sheetOf(tr.partner!);
  check(
    partnerShown(d, p) && p.endurance.value === 40,
    "its numbers: a character's 40 (p. 64)",
  );
  d.close.click();
  done();
});

// What the page adds to Go's: the dialog on the Escape stack, the menu
// item a checkbox, and the page's keys.
test("the linked dialog's Escape, and Transformed form's check and key", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  load(w, "Fukiko.yaml");
  const c = w.character;
  const it = w.transformedItem;
  check(
    it.button.getAttribute("role") === "menuitemcheckbox" &&
      it.button.getAttribute("aria-checked") === "true" &&
      !it.disabled,
    "Transformed form: a checkbox item, checked, enabled",
  );
  const alt = { code: "KeyT", altKey: true, shiftKey: true };
  press(doc, alt, doc.body);
  check(
    !c.transformed && !it.checked && w.modified,
    "Alt+Shift+T: off, the check too, and a change",
  );
  w.abilities.select(w.abilities.find("Transformation"));
  w.abilityLinked.click();
  const d = w.linked;
  check(
    d !== undefined && doc.querySelector("dialog.linked-dialog") !== null,
    "Form...: the dialog shown",
  );
  check(
    doc.activeElement === d!.abilities!.choice,
    "the focus in it, on the form's Abilities' name",
  );
  press(doc, alt, doc.body);
  check(!c.transformed, "Alt+Shift+T while it is open: nothing");
  d!.abilities!.select(0);
  d!.mods!.click();
  check(w.attack !== undefined, "Perks and Flaws... over it");
  w.dialogs.escape();
  check(
    w.attack === undefined && w.linked === d,
    "Escape: the dialog above closed, this one left",
  );
  w.dialogs.escape();
  check(
    w.linked === undefined &&
      doc.querySelector("dialog.linked-dialog") === null &&
      !w.dialogs.open,
    "Escape again: closed",
  );
  w.newCharacter();
  check(
    !it.checked && !w.modified,
    "New: not transformed, and the check says so",
  );
  done();
});

// Showing the dialog is no change: opening a Companion with a sheet, or
// a Magic, leaves the character unmodified.
test("filling: opening linked content is no change", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  for (const [file, name] of [
    ["Fukiko.yaml", "Transformation"],
    ["Fukiko.yaml", "Companion"],
    ["Auren.yaml", "Magic, Arcane"],
    ["Cora.yaml", "Magic, Witchcraft"],
    ["Vehicle.yaml", "Vehicle"],
  ] as const) {
    load(w, file);
    w.abilities.select(w.abilities.find(name));
    w.abilityLinked.click();
    const d = w.linked;
    check(d !== undefined && !w.modified, file + ", " + name + ": no change");
    d?.closeDialog();
    check(!w.modified && w.linked === undefined, "and closed: none");
  }
  done();
});
