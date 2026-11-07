// Phase 7's tabs on happy-dom: the Character and Attacks tabs driven as
// a user would, ova_cg_go's TestWindow (internal/ui/window_test.go) from
// "A character loaded" to the NPC type and testBossAbilities, with its
// labels. A control is driven directly: a value set, then the event the
// user's action fires; a button clicked. What the browsers do themselves
// (Enter in a box, leaving it, the <select>'s placeholder) is
// test/browser/sheet.spec.ts's.
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md):
// each check is a boolean and its label.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as calc from "../../src/core/calc.ts";
import * as character from "../../src/core/character.ts";
import * as entities from "../../src/core/entities.ts";
import * as rules from "../../src/core/rules.ts";
import {
  AbilityPoints,
  Discard,
  Barrier,
  Health,
  Incorporeal,
  Points,
  Reserve,
  Title,
  type Window,
} from "../../src/ui/window.ts";
import { BossDivider, type Panel } from "../../src/ui/widgets.ts";
import { checker, chooseIn, load, newWindow, saved, typeIn } from "./setup.ts";

/**
 * allShown says whether every number box of the sheet and the Attacks
 * tab shows the model's number.
 */
function allShown(w: Window): boolean {
  const c = w.character;
  const ns = [
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
  ];
  if (!ns.every((n, i) => w.numbers[i]!.shows(n))) return false;
  return w.rows.every(
    (r) =>
      r.roll.shows(r.attack.roll) &&
      r.dx.shows(r.attack.dx) &&
      r.end.shows(r.attack.end),
  );
}

/** choiceLabelled says whether every name in p's <select> is its item's label, with its page. */
function choiceLabelled(p: Panel): boolean {
  const l = p.labels();
  const n = rules.count(p.kind);
  if (l.length !== n) return false;
  for (let i = 0; i < n; i++) {
    if (l[i] !== rules.label(rules.get(p.kind, i))) return false;
  }
  // The <select>'s own options: the placeholder, then these.
  const o = [...p.choice.options].map((x) => x.textContent);
  return o.length === n + 1 && l.every((s, i) => o[i + 1] === s);
}

/** optionsHave says whether p's names from i on begin with want. */
function optionsHave(p: Panel, i: number, ...want: string[]): boolean {
  const l = p.labels();
  return want.every((s, j) => l[i + j] === s);
}

function traitNamed(w: Window, name: string): character.Trait | undefined {
  for (const t of w.character.traits) {
    const x = character.traitOf(t);
    if (x.name === name) return x;
  }
  return undefined;
}

test("TestWindow: the Character and Attacks tabs", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();

  // ---- The frame ----
  check(
    w.panels[1]!.contains(w.addAttack) && !w.panels[0]!.contains(w.addAttack),
    "the attacks on the Attacks tab",
  );
  check(
    choiceLabelled(w.abilities) && choiceLabelled(w.weaknesses),
    "every name in the Selects has its page: Attack (p. 50)",
  );

  // ---- A character loaded ----
  check(
    load(w, "Ai.yaml") && f.tells === 0,
    "Ai.yaml loads, with nothing to say",
  );
  check(w.nameIn.value === "Ai", "the name is shown");
  check(
    w.abilities.listShown() && w.weaknesses.listShown(),
    "every Ability and Weakness is listed with its page",
  );
  check(allShown(w), "every number shown is the model's");
  check(
    w.numbers[Barrier]!.visible &&
      !w.numbers[Reserve]!.visible &&
      !w.numbers[Points]!.visible &&
      !w.numbers[Incorporeal]!.visible &&
      !w.numbers[AbilityPoints]!.visible,
    "Barrier DEFENSE shown, for Barrier; the Reserve, the Scaled Cost points and Incorporeal DEFENSE not",
  );
  check(w.rows.length === 2, "a row in the combat box for each attack");
  let r = w.rows[0]!;
  check(
    r.name.textContent === "Telekinetic Push",
    "the first is Telekinetic Push",
  );

  // ---- Overrides ----
  let c = w.character;
  let n = c.health.value;
  check(
    !c.health.overridden && !saved(w).includes("overrides"),
    "Ai has no overrides",
  );
  w.numbers[Health]!.type("55");
  check(
    c.health.overridden && c.health.get() === 55 && c.health.value === n,
    "an override: HEALTH 55, the computed number kept",
  );
  check(allShown(w), "and shown, beside the computed number");
  check(w.modified, "a change marks the character modified");
  check(w.doc.title === Title + " - Ai.yaml *", "and the title says so");
  check(
    saved(w).includes("health: 55") && saved(w).includes("overrides"),
    "saved: health 55, in overrides",
  );
  w.numbers[Health]!.type("");
  check(
    !c.health.overridden && c.health.get() === n && allShown(w),
    "an empty box: the computed number again",
  );
  check(!saved(w).includes("overrides"), "and no override saved");
  w.numbers[Health]!.type("55");
  f.tells = 0;
  w.numbers[Health]!.type("lots");
  check(
    f.tells === 1 && !c.health.overridden && allShown(w),
    "text that isn't a number: said so, and the box emptied",
  );
  r.dx.type("1/2");
  check(
    r.attack.dx.overridden && r.attack.dx.isHalf() && allShown(w),
    "a DX may be 1/2",
  );
  f.tells = 0;
  w.numbers[Health]!.type("1/2");
  check(f.tells === 1 && !c.health.overridden, "HEALTH may not");
  r.dx.type("");
  const m = w.modified;
  w.modified = false;
  w.numbers[Health]!.take();
  check(!w.modified, "leaving a box unchanged changes nothing");
  w.modified = m;

  // An override counts in what is computed from it: Braun's TV comes
  // from his ROLL, overridden to -2.
  let ok = load(w, "Braun.yaml");
  c = w.character;
  r = w.rows[0]!;
  check(
    ok &&
      r.attack.roll.overridden &&
      r.attack.roll.get() === -2 &&
      c.tv.get() === 0,
    "Braun: ROLL -2, overridden, and TV 0",
  );
  r.roll.type("");
  check(
    !r.attack.roll.overridden && c.tv.get() !== 0 && allShown(w),
    "ROLL's override cleared: TV computed from the rules' ROLL",
  );
  r.roll.type("-2");
  check(c.tv.get() === 0 && allShown(w), "and set again: TV 0 again");

  // A name the rulebook's lists don't have: "p. ?", and a warning that
  // says so.
  character.insertTrait(
    c.traits,
    character.newTrait(undefined, rules.Ability, 1, "Magic, Testing", ""),
  );
  w.adopt(character.one(c), "Braun.yaml", []);
  let i = w.abilities.find("Magic, Testing");
  check(
    w.abilities.line(i) === "+1 Magic, Testing\tp. ?" &&
      w.abilities.listShown(),
    "an unknown name: listed with p. ?",
  );
  i = w.warnings.find("Magic, Testing");
  check(
    w.warnings.line(i) ===
      "Magic, Testing (p. ?) isn't in the rulebook's lists",
    "and a warning, with p. ?",
  );

  f.tells = 0;
  ok = load(w, "Wisp.yaml");
  check(
    ok &&
      f.tells === 0 &&
      w.numbers[Incorporeal]!.visible &&
      !w.numbers[Barrier]!.visible &&
      allShown(w),
    "Wisp.yaml: Incorporeal DEFENSE shown, its 6, and Barrier DEFENSE not",
  );

  // ---- Abilities and Weaknesses ----
  load(w, "Ai.yaml");
  c = w.character;
  const before = c.abilityLevels.value;
  w.abilities.pick("Flight");
  check(
    w.abilities.help.page === 54,
    "choosing Flight turns ? to its page, 54",
  );
  w.abilities.help.button.click();
  check(f.page === 54, "and ? opens the rulebook there");
  w.abilities.spinner.setValue(2);
  w.abilities.text.value = "on a broom";
  w.abilities.addButton.click();
  check(
    w.abilities.selectedLine() === "+2 Flight (on a broom)\tp. 54",
    "Add: its line selected, with its page",
  );
  check(
    c.abilityLevels.value === before + 2 && allShown(w),
    "and counted: the Abilities' levels +2",
  );
  check(w.abilities.listShown(), "the list in the model's order");
  w.abilities.spinner.setValue(4);
  w.abilities.changeButton.click();
  check(
    w.abilities.selectedLine() === "+4 Flight (on a broom)\tp. 54" &&
      c.abilityLevels.value === before + 4 &&
      w.abilities.listShown(),
    "Change: Flight +4",
  );
  w.abilities.removeButton.click();
  check(
    c.abilityLevels.value === before &&
      w.abilities.listShown() &&
      w.abilities.selected() === -1 &&
      traitNamed(w, "Flight") === undefined,
    "Remove",
  );
  n = w.abilities.count();
  w.abilities.removeButton.click();
  check(
    w.abilities.count() === n,
    "Remove with nothing selected removes nothing",
  );

  w.weaknesses.pick("Endurance Use");
  w.weaknesses.spinner.setValue(-2);
  w.weaknesses.text.value = "Telekinesis";
  w.weaknesses.addButton.click();
  check(
    w.weaknesses.selectedLine() === "-2 Endurance Use (Telekinesis)\tp. 70" &&
      w.weaknesses.listShown(),
    "a Weakness added: Endurance Use -2 on Telekinesis",
  );
  const tk = traitNamed(w, "Telekinesis")!;
  w.abilities.select(w.abilities.find("Telekinesis"));
  check(
    w.abilityEnd.shown.textContent === "10" &&
      w.abilityEnd.active &&
      w.abilityEnd.shows(tk.end),
    "Telekinesis selected: its END, 10, shown, with its box",
  );
  check(w.abilities.help.page === 62, "and ? at its page, 62");
  w.abilityEnd.type("15");
  check(
    tk.end.overridden && tk.end.get() === 15 && w.abilityEnd.shows(tk.end),
    "its END overridden",
  );
  w.abilityEnd.type("");

  // ---- An Ability's Perks and Flaws ----
  w.abilityMods.click();
  let d = w.attack;
  assert.ok(d !== undefined, "Perks and Flaws... opens the dialog");
  check(
    choiceLabelled(d.perks) && choiceLabelled(d.flaws),
    "every Perk and Flaw in its Select has its page",
  );
  d.perks.pick("Area Effect");
  d.perks.addButton.click();
  n = tk.end.get();
  check(
    tk.mods.length > 0 && n > 10 && d.end.shows(tk.end),
    "a Perk: the Ability's END goes up, shown in the dialog",
  );
  d.cancel.click();
  check(
    w.attack === undefined &&
      tk.mods.length === 0 &&
      tk.end.get() === 10 &&
      w.abilityEnd.shows(tk.end),
    "Cancel: the Perk taken out again",
  );
  // Not in ova_cg_go's test: Cancel puts back the END's override too.
  w.abilityMods.click();
  w.attack!.end.type("20");
  check(
    tk.end.overridden && tk.end.get() === 20,
    "the END overridden in the dialog",
  );
  w.attack!.cancel.click();
  check(
    !tk.end.overridden && tk.end.get() === 10 && w.abilityEnd.shows(tk.end),
    "Cancel: the END's override taken out again",
  );
  w.abilityMods.click();
  d = w.attack!;
  d.perks.pick("Area Effect");
  d.perks.addButton.click();
  d.ok.click();
  check(
    w.attack === undefined &&
      tk.end.get() === n &&
      w.abilityEnd.shows(tk.end) &&
      allShown(w),
    "OK: kept, and shown in the window",
  );

  // ---- Attacks ----
  n = w.rows.length;
  w.addAttack.click();
  d = w.attack!;
  assert.ok(d !== undefined, "Add attack... opens the dialog");
  d.nameIn.value = "Wind Lance";
  d.perks.pick("Accurate");
  d.perks.spinner.setValue(2);
  d.perks.addButton.click();
  check(
    d.perks.selectedLine() === "Accurate x2\t+10\tp. 83",
    "a Perk listed: its count, cost and page",
  );
  d.flaws.pick("Cancel");
  check(d.flaws.text.value === "-20", "Cancel's cost offered: its least, -20");
  d.flaws.text.value = "-15";
  d.flaws.addButton.click();
  check(
    d.flaws.selectedLine() === "Cancel\t-15\tp. 87",
    "a Flaw listed, with the cost chosen",
  );
  const a = character.attackOf(c.attacks[c.attacks.length - 1]!); // its row comes with OK
  check(
    d.roll.shows(a.roll) && d.end.shows(a.end),
    "the dialog's numbers are the attack's, as it changes",
  );
  f.tells = 0;
  d.flaws.text.value = "a lot";
  d.flaws.changeButton.click();
  check(f.tells === 1, "a cost that isn't a number: said so");
  d.ok.click();
  check(w.rows.length === n + 1, "OK: a row for the new attack");
  r = w.rows[w.rows.length - 1]!;
  check(
    r.name.textContent === "Wind Lance" && allShown(w),
    "its name and numbers",
  );
  const text = saved(w);
  check(
    text.includes("Wind Lance") &&
      text.includes("counts-as: 2") &&
      text.includes("cost: -15"),
    "saved with its Perks and Flaws",
  );
  r.edit.click();
  d = w.attack!;
  d.perks.select(0);
  d.perks.removeButton.click();
  check(
    d.perks.count() === 0 && !saved(w).includes("counts-as: 2"),
    "Edit: a Perk removed",
  );
  d.cancel.click();
  check(
    saved(w) === text && w.rows.length === n + 1 && allShown(w),
    "Cancel: the attack as it was",
  );
  w.addAttack.click();
  w.attack!.cancel.click();
  check(
    w.rows.length === n + 1 && saved(w) === text,
    "Cancel on a new attack: no attack added",
  );
  w.addAttack.click();
  w.attack!.nameIn.value = " ";
  f.tells = 0;
  w.attack!.ok.click();
  check(
    f.tells === 1 && w.attack !== undefined,
    "OK with no name: said so, and the dialog stays",
  );
  w.attack!.cancel.click();
  w.rows[w.rows.length - 1]!.remove.click();
  check(
    w.rows.length === n && !saved(w).includes("Wind Lance") && allShown(w),
    "Remove: the row and the attack gone",
  );

  // ---- Names and notes ----
  typeIn(w.playerIn, "Sam");
  typeIn(w.combatNotes, "Down to 10 HEALTH.");
  check(
    saved(w).includes("player: Sam") && saved(w).includes("Down to 10 HEALTH."),
    "the player and Combat Notes saved",
  );

  // ---- The NPC type (p. 123-124) ----
  c = w.character;
  const options = [...w.npcTypeIn.options].map((o) => o.textContent);
  check(
    w.npcTypeIn.selectedIndex === 0 &&
      options[0] === "none" &&
      options[2] === "Secondary (p. 123)",
    "the NPC type: none, each type with its page",
  );
  chooseIn(w.npcTypeIn, 1 + entities.Secondary);
  check(
    c.npcType === entities.Secondary &&
      c.kind === calc.CompanionSheet &&
      c.health.get() < 40 &&
      allShown(w) &&
      saved(w).includes("npc-type: Secondary"),
    "Secondary chosen: a Companion's sheet, shown, and saved",
  );
  chooseIn(w.npcTypeIn, 1 + entities.Extra);
  check(
    c.kind === calc.ExtraSheet &&
      c.tv.get() === 1 &&
      allShown(w) &&
      saved(w).includes("npc-type: Extra"),
    "Extra chosen: TV 1",
  );
  chooseIn(w.npcTypeIn, 0);
  check(
    c.npcType === undefined &&
      c.kind === calc.Character &&
      allShown(w) &&
      !saved(w).includes("npc-type"),
    "none chosen: a character's sheet, no npc-type saved",
  );
  bossAbilities(w, check);

  // ---- New ----
  f.answer = Discard;
  w.newItem.action!();
  check(
    w.character.name === "" &&
      w.abilities.count() === 0 &&
      w.rows.length === 0 &&
      allShown(w),
    "New: an empty sheet",
  );
  typeIn(w.nameIn, "Someone");
  check(w.character.name === "Someone" && w.modified, "a name typed");

  // ---- A Sample NPC loaded ----
  f.tells = 0;
  ok = load(w, "Jiro.yaml");
  check(
    ok &&
      f.tells === 0 &&
      w.npcTypeIn.selectedIndex === 1 + entities.Secondary &&
      allShown(w),
    "Jiro.yaml: his type shown, and his numbers the rules' for it, so nothing to say",
  );
  done();
});

/** Go's testBossAbilities. */
function bossAbilities(
  w: Window,
  check: (ok: boolean, label: string) => void,
): void {
  const p = w.abilities;
  const c = w.character;
  const n = rules.count(rules.Ability);
  const lines = p.count();
  const health = c.health.get();
  check(!p.withBoss && p.labels().length === n, "no type: the Abilities alone");
  check(
    w.npcTypeIn.options[1 + entities.Boss]!.textContent === "Boss (p. 123)",
    "Boss among the types, with its page",
  );
  chooseIn(w.npcTypeIn, 1 + entities.Boss);
  check(
    c.kind === calc.BossSheet &&
      c.health.get() === health &&
      allShown(w) &&
      saved(w).includes("npc-type: Boss"),
    "Boss chosen: its own sheet, shown, and saved",
  );
  check(
    p.withBoss &&
      p.labels().length === n + 5 &&
      optionsHave(
        p,
        n,
        BossDivider,
        "Health Reserve (p. 123)",
        "Extra Actions (p. 123)",
        "Scale Advantage (p. 123)",
        "Escape Plan (p. 123)",
      ),
    "a Boss: the divider, then the Boss Abilities, each with its page",
  );
  check(
    optionsHave(p, 0, rules.label(rules.get(rules.Ability, 0))) &&
      w.weaknesses.labels().length === rules.count(rules.Weakness),
    "the Abilities first, and the Weaknesses offer nothing new",
  );
  p.pick("Attack");
  chooseIn(p.choice, 1 + n);
  check(
    p.item() === undefined && p.choiceIndex() < 0,
    "the divider can't stay chosen",
  );
  const tv = c.tv.get();
  const total = c.abilityLevels.get();
  chooseIn(p.choice, 1 + n + 3);
  check(
    p.item() === rules.find("Scale Advantage") &&
      p.help.page === 123 &&
      p.spinner.disabled &&
      p.spinner.value === 1,
    "a Boss Ability chosen: its page, the level 1 and off",
  );
  p.text.value = "Attack";
  p.addButton.click();
  check(
    p.count() === lines + 1 &&
      c.tv.get() === tv + 5 &&
      c.abilityLevels.get() === total &&
      saved(w).includes("Scale Advantage") &&
      p.listShown() &&
      allShown(w),
    "added: 5 TV, no levels, saved, shown",
  );
  p.pick("Attack");
  check(!p.spinner.disabled, "another name: the level on again");
  p.select(p.find("Scale Advantage"));
  chooseIn(w.npcTypeIn, 0);
  check(
    !p.withBoss &&
      p.labels().length === n &&
      c.warned(calc.NotBoss) &&
      saved(w).includes("Scale Advantage") &&
      w.warnings.find("only a Boss") >= 0,
    "no longer a Boss: not offered, kept, and warned of",
  );
  p.select(p.find("Scale Advantage"));
  check(
    p.item() === undefined && p.choiceIndex() < 0 && !p.spinner.disabled,
    "its line selected: nothing chosen, and nothing fails",
  );
  p.removeButton.click();
  check(
    p.count() === lines &&
      !c.warned(calc.NotBoss) &&
      !saved(w).includes("Scale Advantage") &&
      w.warnings.find("only a Boss") < 0,
    "removed: the warning gone",
  );
}

test("filling: showing a character is no change", () => {
  const { w } = newWindow();
  load(w, "Ai.yaml");
  assert.ok(!w.modified, "loaded: not modified");
  w.showAll();
  assert.ok(!w.modified, "shown again: still not modified");
});
