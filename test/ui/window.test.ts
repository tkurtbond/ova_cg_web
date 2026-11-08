// Phase 5's shell on happy-dom: the menus' keys (ova_cg_go's
// TestShortcuts, with its labels), what the keys and the menus do, the
// title and the characters' <select>, the tabs, and a file that won't
// load. What the browsers do themselves (focus, the file chooser, a
// real Escape) is test/browser/shell.spec.ts's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyText } from "../../src/ui/menu.ts";
import { keys, Title } from "../../src/ui/window.ts";
import { load, newWindow, press } from "./setup.ts";

function checks(cases: [boolean, string][]): void {
  const failures = cases.filter(([ok]) => !ok).map(([, label]) => label);
  assert.deepEqual(failures, []);
}

test("TestShortcuts", () => {
  const { w } = newWindow();
  const cases: [boolean, string][] = [];
  const seen = new Set<string>();
  const reserved = ["A", "C", "V", "X", "Z", "Y"];
  // Keys the browsers keep for themselves, whatever a page does
  // (PLAN.md, "Keys").
  const browsers = [
    "Ctrl+N",
    "Ctrl+T",
    "Ctrl+W",
    "Ctrl+Q",
    "Ctrl+PgDn",
    "Ctrl+PgUp",
    "Ctrl+Shift+N",
    "Ctrl+Shift+T",
    "Ctrl+Shift+W",
  ];
  for (const it of w.menu.items()) {
    if (it.key === undefined) continue;
    const name = keyText(it.key);
    cases.push([!seen.has(name), "no two items share a key: " + name]);
    seen.add(name);
    for (const k of reserved) {
      cases.push([
        !(it.key.ctrl && name.endsWith("+" + k)) || it.key.shift,
        "no item takes an entry's key: " + name,
      ]);
    }
    cases.push([
      !browsers.includes(name),
      "no item takes a browser's key: " + name,
    ]);
  }
  cases.push([
    w.limitsItem.key !== undefined && w.transformedItem.key !== undefined,
    "Limits and Transformed have keys",
  ]);
  checks(cases);
});

test("the keys do the menus' items", () => {
  const { w, f, doc } = newWindow();
  f.chosen = "Ai.yaml";
  const o = press(doc, { key: "o", code: "KeyO", ctrlKey: true });
  assert.ok(o.defaultPrevented, "Ctrl+O: the browser's Open prevented");
  // chooseFile's fake answers at once; loadFile reads the File later.
  return new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
    assert.equal(doc.title, Title + " - Ai.yaml", "Ctrl+O opens Ai.yaml");
    const meta = press(doc, {
      key: "n",
      code: "KeyN",
      altKey: true,
      shiftKey: true,
    });
    assert.ok(meta.defaultPrevented, "Alt+Shift+N prevented");
    assert.equal(doc.title, Title, "Alt+Shift+N: a new character");
    assert.equal(w.file, undefined, "and no file");
    const s = press(doc, { key: "s", code: "KeyS", ctrlKey: true });
    assert.ok(s.defaultPrevented, "Ctrl+S prevented, though Save is disabled");
    const cmd = press(doc, { key: "s", code: "KeyS", metaKey: true });
    assert.ok(cmd.defaultPrevented, "Command+S is Ctrl+S");
    const plain = press(doc, { key: "s", code: "KeyS" });
    assert.ok(!plain.defaultPrevented, "S alone is left alone");
    const extra = press(doc, {
      key: "O",
      code: "KeyO",
      ctrlKey: true,
      shiftKey: true,
    });
    assert.ok(!extra.defaultPrevented, "Ctrl+Shift+O is not Ctrl+O");
    assert.equal(f.tells, 0, "nothing told");
  });
});

test("the keys wait while a dialog is open", () => {
  const { w, doc } = newWindow();
  load(w, "Ai.yaml");
  w.dialogs.tell("a message");
  const n = press(doc, {
    key: "n",
    code: "KeyN",
    altKey: true,
    shiftKey: true,
  });
  assert.ok(
    n.defaultPrevented && w.file === "Ai.yaml",
    "Alt+Shift+N does nothing under a dialog, but is prevented",
  );
  press(doc, { key: "Escape" });
  assert.ok(!w.dialogs.open, "Escape closes the dialog");
  press(doc, { key: "n", code: "KeyN", altKey: true, shiftKey: true });
  assert.equal(w.file, undefined, "then Alt+Shift+N is New");
});

test("the title and the characters", () => {
  const { w, doc } = newWindow();
  const options = () =>
    [...w.characterIn.options].map((o) => o.textContent).join("|");
  checks([
    [doc.title === Title, "a new character: the title alone"],
    [w.titleLine.textContent === Title, "the title line says the same"],
    [options() === "1. (no name)", "a new character has no name"],
  ]);
  assert.ok(load(w, "two-documents.yaml"));
  checks([
    [
      doc.title === Title + " - two-documents.yaml (1 of 2)",
      "two characters: which one is shown",
    ],
    [options() === "1. First Of Two|2. Second Of Two", "both listed"],
    [
      w.characterIn.selectedIndex === 0 && w.character === w.characters[0],
      "the first shown",
    ],
  ]);
  w.characterIn.selectedIndex = 1;
  w.characterIn.dispatchEvent(
    new (doc.defaultView as unknown as typeof globalThis).Event("change"),
  );
  checks([
    [
      doc.title === Title + " - two-documents.yaml (2 of 2)",
      "the second chosen: the title says so",
    ],
    [w.current === 1 && w.character === w.characters[1], "the second shown"],
    [!w.modified, "choosing a character changes nothing"],
  ]);
  w.modified = true;
  w.showTitle();
  assert.equal(
    doc.title,
    Title + " - two-documents.yaml (2 of 2) *",
    "a change: *",
  );
});

test("a file that won't load is told, and changes nothing", () => {
  const { w, f, doc } = newWindow();
  load(w, "Ai.yaml");
  const ok = w.load("name: [\n", "bad.yaml");
  checks([
    [!ok, "load says it failed"],
    [
      f.tells === 1 && f.told.startsWith("bad.yaml:"),
      "told, with the file's name: " + f.told,
    ],
    [
      doc.title === Title + " - Ai.yaml" && w.file === "Ai.yaml",
      "Ai.yaml still open",
    ],
  ]);
});

test("the menus: greyed until their phase, and by keyboard", () => {
  const { w, doc } = newWindow();
  const enabled = w.menu
    .items()
    .filter((it) => !it.disabled)
    .map((it) => it.label);
  assert.deepEqual(
    enabled,
    [
      "New",
      "Open...",
      "Save",
      "Save As...",
      "Limits...",
      "Transformed form",
      "Add Character",
      "Duplicate Character",
      "Open",
      "Choose PDF...",
      "About",
    ],
    "a lone new character: the rest greyed until there are more, or their phase",
  );
  const tops = [0, 1, 2].map((i) => w.menu.top(i));
  assert.deepEqual(
    tops.map((t) => t.tabIndex),
    [0, -1, -1],
    "one menu in the tab order",
  );
  tops[0]!.focus();
  press(doc, { key: "ArrowDown" });
  checks([
    [w.menu.current === 0 && !w.menu.popup(0).hidden, "Down opens File"],
    [doc.activeElement === w.newItem.button, "on New"],
  ]);
  press(doc, { key: "ArrowDown" });
  press(doc, { key: "ArrowDown" });
  press(doc, { key: "ArrowDown" });
  assert.ok(doc.activeElement === w.saveAsItem.button, "Down to Save As...");
  press(doc, { key: "ArrowDown" });
  assert.ok(doc.activeElement === w.newItem.button, "Down wraps to New");
  press(doc, { key: "ArrowUp" });
  assert.ok(
    doc.activeElement === w.saveAsItem.button,
    "Up wraps to Save As...",
  );
  press(doc, { key: "ArrowRight" });
  checks([
    [
      w.menu.current === 1 && w.menu.popup(0).hidden === true,
      "Right: Character open, File shut",
    ],
    [doc.activeElement === w.limitsItem.button, "on its first item, Limits..."],
  ]);
  press(doc, { key: "ArrowRight" });
  checks([
    [w.menu.current === 2, "Right: Rulebook open"],
    [doc.activeElement === w.rulebookItem.button, "on its first item, Open"],
    [
      tops[2]!.tabIndex === 0 && tops[0]!.tabIndex === -1,
      "and it's the one in the tab order",
    ],
  ]);
  press(doc, { key: "Escape" });
  checks([
    [
      w.menu.current === -1 && w.menu.popup(2).hidden === true,
      "Escape shuts it",
    ],
    [doc.activeElement === tops[2], "back on the bar"],
  ]);
  press(doc, { key: "ArrowLeft" });
  assert.ok(doc.activeElement === tops[1], "Left along the bar, shut");
  tops[0]!.click();
  assert.equal(w.menu.current, 0, "a click opens File");
  w.newItem.button.click();
  assert.equal(w.menu.current, -1, "an item chosen shuts the menu");
  tops[1]!.click();
  w.removeCharacterItem.button.click();
  assert.equal(w.menu.current, 1, "a disabled item does nothing");
  tops[1]!.click();
  assert.equal(w.menu.current, -1, "a second click shuts it");
});

test("the tabs", () => {
  const { w, doc } = newWindow();
  const shown = () => w.panels.map((p) => !p.hidden);
  // Through a function: an assert.equal on w.tabShown narrows it for the
  // checks after, though a key changes it.
  const tab = (): number => w.tabShown;
  checks([
    [tab() === 0, "Character first"],
    [shown().join() === "true,false,false,false,false", "its panel alone"],
  ]);
  w.tabs[3]!.click();
  assert.equal(w.tabShown, 3, "a click: Fluff");
  w.tabs[3]!.focus();
  press(doc, { key: "ArrowRight" });
  checks([
    [tab() === 4 && doc.activeElement === w.tabs[4], "Right: Markdown"],
    [shown().join() === "false,false,false,false,true", "its panel alone"],
  ]);
  press(doc, { key: "ArrowRight" });
  assert.equal(w.tabShown, 0, "Right wraps");
  press(doc, { key: "End" });
  assert.equal(w.tabShown, 4, "End");
  press(doc, { key: "Home" });
  assert.equal(w.tabShown, 0, "Home");
  assert.deepEqual(
    w.tabs.map((t) => t.tabIndex),
    [0, -1, -1, -1, -1],
    "one tab in the tab order",
  );
});

test("the keys' names", () => {
  assert.equal(keyText(keys.saveAs), "Ctrl+Shift+S");
  assert.equal(keyText(keys.next), "Alt+Shift+PgDn");
  assert.equal(keyText(keys.new), "Alt+Shift+N");
});
