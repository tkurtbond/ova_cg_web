// Phase 11's several characters in a file, on happy-dom: ova_cg_go's
// testSeveral (internal/ui/window_test.go), with its labels.
//
// Where the page differs: Save As... downloads the file, which is read
// back from the download, and a portrait's path is saved as it is, not
// rebased (PLAN.md, "The portrait"), so Go's rebasing check is left out.
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as save from "../../src/core/save.ts";
import {
  Cancel,
  Discard,
  Health,
  Title,
  type Window,
} from "../../src/ui/window.ts";
import {
  allShown,
  checker,
  chooseIn,
  load,
  newWindow,
  press,
  typeIn,
} from "./setup.ts";

/**
 * listed says whether the <select> lists labels, "|" between them, the
 * shown character chosen.
 */
function listed(w: Window, labels: string): boolean {
  const options = [...w.characterIn.options].map((o) => o.textContent);
  return (
    options.join("|") === labels &&
    w.characterIn.selectedIndex === w.current &&
    w.character === w.characters[w.current]
  );
}

/** shownNow says whether the page shows the character shown: its name, and every number. */
function shownNow(w: Window, name: string): boolean {
  return w.nameIn.value === name && allShown(w);
}

test("testSeveral: several characters in a file", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  const title = () => doc.title;

  f.tells = 0;
  let ok = load(w, "Acacia.yaml");
  check(
    ok &&
      f.tells === 1 &&
      w.characters.length === 3 &&
      w.current === 0 &&
      title() === Title + " - Acacia.yaml (1 of 3)" &&
      shownNow(w, "Acacia"),
    "Acacia.yaml: her and her demons, the first shown, the title saying which of how many",
  );
  check(
    listed(w, "1. Acacia|2. Sazza and Fraz|3. High Fructo Cezar"),
    "the Select beside the tabs lists them, by number and name, the first chosen",
  );
  check(
    w.previousItem.disabled &&
      w.moveUpItem.disabled &&
      !w.nextItem.disabled &&
      !w.moveDownItem.disabled &&
      !w.removeCharacterItem.disabled,
    "Previous and Move Up inactive at the first; Next, Move Down and Remove active",
  );
  chooseIn(w.characterIn, 2);
  check(
    w.current === 2 &&
      shownNow(w, "High Fructo Cezar") &&
      !w.modified &&
      title() === Title + " - Acacia.yaml (3 of 3)" &&
      w.nextItem.disabled &&
      w.moveDownItem.disabled &&
      !w.previousItem.disabled,
    "the third chosen: shown, nothing changed, Next and Move Down inactive at the last",
  );
  w.previousItem.action!();
  check(
    w.current === 1 &&
      shownNow(w, "Sazza and Fraz") &&
      listed(w, "1. Acacia|2. Sazza and Fraz|3. High Fructo Cezar"),
    "Character > Previous Character: the second",
  );
  w.nextItem.action!();
  check(
    w.current === 2 && shownNow(w, "High Fructo Cezar"),
    "Next Character: the third again",
  );
  typeIn(w.nameIn, "Cezar");
  check(
    listed(w, "1. Acacia|2. Sazza and Fraz|3. Cezar") &&
      w.modified &&
      title() === Title + " - Acacia.yaml (3 of 3) *",
    "renamed: the Select follows, the file modified",
  );

  w.addCharacterItem.action!();
  check(
    w.characters.length === 4 &&
      w.current === 3 &&
      shownNow(w, "") &&
      w.abilities.count() === 0 &&
      w.rows.length === 0 &&
      listed(w, "1. Acacia|2. Sazza and Fraz|3. Cezar|4. (no name)"),
    "Character > Add Character: a new one, last, shown",
  );
  typeIn(w.nameIn, "Imp & Co");
  check(
    listed(w, "1. Acacia|2. Sazza and Fraz|3. Cezar|4. Imp & Co"),
    "an & in a name shown as it is",
  );

  chooseIn(w.characterIn, 0);
  w.duplicateItem.action!();
  const c = w.character;
  check(
    w.characters.length === 5 &&
      w.current === 4 &&
      shownNow(w, "Acacia") &&
      c !== w.characters[0] &&
      save.toText(c) === save.toText(w.characters[0]!),
    "Duplicate Character: a copy of Acacia, last, shown, the same when saved",
  );
  w.numbers[Health]!.type("55");
  check(
    c.health.overridden && !w.characters[0]!.health.overridden,
    "the copy's HEALTH overridden, the first's not: they share nothing",
  );
  w.moveUpItem.action!();
  check(
    w.current === 3 &&
      w.characters[3] === c &&
      title() === Title + " - Acacia.yaml (4 of 5) *" &&
      listed(w, "1. Acacia|2. Sazza and Fraz|3. Cezar|4. Acacia|5. Imp & Co") &&
      shownNow(w, "Acacia"),
    "Move Up: the copy fourth, still shown",
  );
  w.moveDownItem.action!();
  check(
    w.current === 4 &&
      w.characters[4] === c &&
      listed(w, "1. Acacia|2. Sazza and Fraz|3. Cezar|4. Imp & Co|5. Acacia"),
    "Move Down: last again",
  );

  f.confirmed = 0;
  f.yes = false;
  w.removeCharacterItem.action!();
  check(
    f.confirmed === 1 &&
      f.question === "Remove Acacia from the file?" &&
      w.characters.length === 5,
    "Remove Character...: asked first; Cancel removes nothing",
  );
  f.yes = true;
  w.removeCharacterItem.action!();
  check(
    w.characters.length === 4 &&
      w.current === 3 &&
      shownNow(w, "Imp & Co") &&
      listed(w, "1. Acacia|2. Sazza and Fraz|3. Cezar|4. Imp & Co"),
    "removed, the last: the one before it shown",
  );
  chooseIn(w.characterIn, 1);
  w.removeCharacterItem.action!();
  check(
    w.current === 1 &&
      shownNow(w, "Cezar") &&
      listed(w, "1. Acacia|2. Cezar|3. Imp & Co"),
    "removed from the middle: the one after it shown",
  );

  // Saved: every character, in order.
  f.typed = "several.yaml";
  w.saveAsItem.action!();
  const d = f.downloads.at(-1)!;
  check(
    !w.modified &&
      d.name === "several.yaml" &&
      title() === Title + " - several.yaml (2 of 3)",
    "Save As: saved, all three",
  );
  const text = save.allToText(w.characters);
  check(d.text === text, "the download is them all, in order");
  f.tells = 0;
  ok = w.load(d.text, "several.yaml");
  check(
    ok &&
      f.tells === 0 &&
      title() === Title + " - several.yaml (1 of 3)" &&
      listed(w, "1. Acacia|2. Cezar|3. Imp & Co") &&
      save.allToText(w.characters) === text,
    "loaded again: all three, in order, the same, with nothing to say",
  );
  typeIn(w.nameIn, "Acacia II");
  f.answer = Cancel;
  f.asked = 0;
  w.newItem.action!();
  check(
    f.asked === 1 && f.question === "Save the changes to several.yaml first?",
    "New with changes: the question names the file",
  );
  f.yes = true;
  w.removeCharacterItem.action!();
  w.removeCharacterItem.action!();
  check(
    w.characters.length === 1 &&
      w.removeCharacterItem.disabled &&
      title() === Title + " - several.yaml *" &&
      listed(w, "1. Imp & Co"),
    "down to one: Remove inactive, and the title without a count",
  );
  f.confirmed = 0;
  w.removeCharacterItem.action!();
  check(
    f.confirmed === 0 && w.characters.length === 1,
    "and Remove does nothing: a file holds at least one",
  );
  f.answer = Discard;
  w.newItem.action!();
  check(
    w.characters.length === 1 && listed(w, "1. (no name)"),
    "New: one new character",
  );
  done();
});

// What the page adds: Next and Previous by their keys, which don't wrap,
// and the items greyed for a new character.
test("Alt+Shift+PgDn and PgUp, and a lone character's menu", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  check(
    w.removeCharacterItem.disabled &&
      w.moveUpItem.disabled &&
      w.moveDownItem.disabled &&
      w.nextItem.disabled &&
      w.previousItem.disabled &&
      !w.addCharacterItem.disabled &&
      !w.duplicateItem.disabled,
    "a new character: only Add and Duplicate",
  );
  load(w, "Acacia.yaml");
  const next = { code: "PageDown", altKey: true, shiftKey: true };
  const previous = { code: "PageUp", altKey: true, shiftKey: true };
  press(doc, next, doc.body);
  check(
    w.current === 1 && shownNow(w, "Sazza and Fraz"),
    "Alt+Shift+PgDn: the next",
  );
  press(doc, next, doc.body);
  const e = press(doc, next, doc.body);
  check(
    w.current === 2 && e.defaultPrevented,
    "at the last, no further, and still prevented",
  );
  press(doc, previous, doc.body);
  check(w.current === 1, "Alt+Shift+PgUp: the one before");
  check(!w.modified, "stepping is no change");
  for (const [label, act] of [
    ["Add Character", () => w.addCharacterItem.action!()],
    ["Duplicate Character", () => w.duplicateItem.action!()],
    ["Remove Character...", () => w.removeCharacterItem.action!()],
    ["Move Up", () => w.moveUpItem.action!()],
    ["Move Down", () => w.moveDownItem.action!()],
  ] as const) {
    load(w, "Acacia.yaml");
    chooseIn(w.characterIn, 1);
    f.yes = true;
    act();
    check(
      w.modified && doc.title.endsWith(" *"),
      label + " from a file just opened: a change",
    );
  }
  done();
});
