// Phase 6: files on the page, on happy-dom with fakes for what would
// wait for the user. Ports the "Files" checks of ova_cg_go's TestWindow
// and testSeveral (internal/ui/window_test.go), with a download in place
// of a file written: Save, Save As..., loading a saved file again, New
// and Open... asking first, and the question naming what would be lost.
// What only a browser does (the download itself, the file chooser after
// a dialog, a drop, beforeunload's question) is test/browser/files.spec.ts's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as save from "../../src/core/save.ts";
import { Discard, fileName, SaveFirst, Title } from "../../src/ui/window.ts";
import { DATA_DIR, load, newWindow, settled } from "./setup.ts";

function checks(cases: [boolean, string][]): void {
  for (const [ok, label] of cases) assert.ok(ok, label);
}

const golden = (name: string) =>
  readFileSync(`test/golden/${name}.yaml`, "utf8");

test("fileName", () => {
  const cases: [string, string][] = [
    ["Ai", "Ai.yaml"],
    ["  Ai  ", "Ai.yaml"],
    ["Ai.yaml", "Ai.yaml"],
    ["Ai.YML", "Ai.YML"],
    ["Ai.txt", "Ai.txt.yaml"],
    ["Sazza/Fraz", "Sazza_Fraz.yaml"],
    ["a\\b", "a_b.yaml"],
    ["", ""],
    ["   ", ""],
  ];
  for (const [text, want] of cases) {
    assert.equal(fileName(text), want, JSON.stringify(text));
  }
});

test("Files", async () => {
  const { w, f, doc } = newWindow();
  const title = () => doc.title;

  // Save: a loaded file downloads as its name, as ova_cg_go saves it.
  assert.ok(load(w, "Ai.yaml"));
  w.modified = true;
  w.showTitle();
  w.saveItem.action!();
  checks([
    [
      f.downloads.length === 1 && f.downloads[0]!.name === "Ai.yaml",
      "Save: downloaded as the file's name",
    ],
    [f.downloads[0]!.text === golden("Ai"), "the bytes ova_cg_go saves"],
    [f.texts === 0, "nothing asked"],
    [!w.modified && title() === Title + " - Ai.yaml", "saved: no *"],
  ]);

  // Save As...: asks, suggesting the file's name.
  f.typed = undefined;
  w.saveAsItem.action!();
  checks([
    [f.texts === 1 && f.suggested === "Ai.yaml", "Save As: suggests Ai.yaml"],
    [f.downloads.length === 1, "cancelled: nothing downloaded"],
  ]);
  f.typed = "window";
  w.saveAsItem.action!();
  const saved = f.downloads.at(-1)!;
  checks([
    [
      saved.name === "window.yaml" && w.file === "window.yaml",
      "Save As: window.yaml",
    ],
    [
      !w.modified && title() === Title + " - window.yaml",
      "Save As: saved, the title its name",
    ],
  ]);
  f.typed = "   ";
  f.tells = 0;
  w.saveAsItem.action!();
  checks([
    [
      f.tells === 1 && f.downloads.length === 2,
      "Save As with no name: told, nothing downloaded",
    ],
  ]);

  const c = w.character;
  f.tells = 0;
  const ok = w.load(saved.text, saved.name);
  checks([
    [ok && f.tells === 0 && w.character !== c, "loaded again: nothing to say"],
    [save.toText(c) === save.toText(w.character), "and the same"],
  ]);

  // New and Open... ask first only with changes.
  f.asked = 0;
  w.newItem.action!();
  checks([
    [
      f.asked === 0 && w.character.name === "" && w.file === undefined,
      "New: nothing unsaved, nothing asked, a new character",
    ],
    [title() === Title, "the title alone"],
  ]);
  w.character.name = "Someone";
  w.modified = true;
  w.newItem.action!(); // f.answer is Cancel
  checks([
    [
      f.asked === 1 && w.character.name === "Someone",
      "New with changes: asked; Cancel keeps them",
    ],
    [
      f.question === "Save the changes to Someone first?",
      "the question names the character: " + f.question,
    ],
  ]);
  f.chooses = 0;
  w.openItem.action!();
  checks([
    [f.asked === 2, "Open... with changes: asked"],
    [f.chooses === 0, "Cancel: no file chosen"],
  ]);

  // Save first: a new file is saved as its character's name.
  f.answer = SaveFirst;
  f.texts = 0;
  const n = f.downloads.length;
  w.newItem.action!();
  checks([
    [
      f.downloads.length === n + 1 &&
        f.downloads.at(-1)!.name === "Someone.yaml",
      "Save: downloaded as Someone.yaml, not asked for a name",
    ],
    [f.texts === 0, "nothing asked but the question"],
    [w.character.name === "" && !w.modified, "then New"],
  ]);

  // With no name, Save asks for one; cancelled, nothing is left.
  w.modified = true;
  f.typed = undefined;
  w.newItem.action!();
  checks([
    [
      f.question === "Save the changes to the character first?",
      "no name: the character",
    ],
    [f.texts === 1 && f.suggested === "", "asked for a name, none suggested"],
    [w.modified && f.downloads.length === n + 1, "cancelled: still there"],
  ]);
  f.typed = "Nobody";
  w.newItem.action!();
  checks([
    [
      f.downloads.at(-1)!.name === "Nobody.yaml" && !w.modified,
      "named: saved, then New",
    ],
    [w.file === undefined && title() === Title, "the new one has no file"],
  ]);

  // Don't save: Open... goes on to the chooser.
  w.modified = true;
  f.answer = Discard;
  f.chosen = "two-documents.yaml";
  f.chooses = 0;
  w.openItem.action!();
  await settled();
  checks([
    [f.chooses === 1, "Don't save: the file chooser"],
    [
      title() === Title + " - two-documents.yaml (1 of 2)",
      "and the file opened",
    ],
  ]);
  w.modified = true;
  f.answer = 2; // Cancel
  w.newItem.action!();
  assert.equal(
    f.question,
    "Save the changes to two-documents.yaml first?",
    "a file's question names the file",
  );
  w.file = undefined;
  w.newItem.action!();
  assert.equal(
    f.question,
    "Save the changes to the characters first?",
    "several, no file: the characters",
  );
});

test("several characters: all saved, in order", () => {
  const { w, f } = newWindow();
  assert.ok(load(w, "two-documents.yaml"));
  w.characterIn.selectedIndex = 1;
  w.save(() => {});
  checks([
    [
      f.downloads[0]!.text === golden("two-documents"),
      "both, as ova_cg_go saves them",
    ],
  ]);
  w.file = undefined;
  w.save(() => {});
  assert.equal(
    f.downloads[1]!.name,
    "First Of Two.yaml",
    "a new file: the first character's name",
  );
});

test("the notices on opening", () => {
  const { w, f } = newWindow();
  assert.ok(load(w, "Group.yaml"));
  checks([
    [
      f.tells === 1 &&
        f.told.startsWith(
          "Numbers the file gives differently from the rules, kept as overrides:\n",
        ),
      "Group.yaml: told its notices",
    ],
    [f.told.split("\n").length === 28, "all 27"],
    [!w.modified, "opening is no change"],
  ]);
});

test("a dropped file opens, as Open... would", async () => {
  const { w, f, happy } = newWindow();
  const file = (name: string) =>
    new happy.File(
      [readFileSync(DATA_DIR + name, "utf8")],
      name,
    ) as unknown as File;
  w.dropped([file("Ai.yaml"), file("Group.yaml")]);
  checks([
    [
      f.tells === 1 && f.told === "Drop one file on the page to open it.",
      "two files: told",
    ],
    [w.file === undefined, "neither opened"],
  ]);
  w.modified = true;
  w.dropped([file("Ai.yaml")]);
  await settled();
  checks([
    [f.asked === 1, "with changes: asked first"],
    [w.file === undefined && w.modified, "Cancel: not opened"],
  ]);
  f.answer = Discard;
  w.dropped([file("Ai.yaml")]);
  await settled();
  assert.ok(w.file === "Ai.yaml" && !w.modified, "Don't save: opened");
  w.dialogs.tell("a dialog"); // a real one: the fakes replace w.tell
  w.dropped([file("Group.yaml")]);
  await settled();
  assert.ok(w.file === "Ai.yaml", "a drop under a dialog does nothing");
});

test("beforeunload asks only with changes", () => {
  const { w, happy } = newWindow();
  const unload = () => {
    const e = new happy.Event("beforeunload", { cancelable: true });
    happy.dispatchEvent(e);
    return e.defaultPrevented;
  };
  assert.ok(!unload(), "no changes: nothing asked");
  w.modified = true;
  assert.ok(unload(), "changes: the browser asks");
  w.character.name = "Ai";
  w.save(() => {});
  assert.ok(!unload(), "saved: nothing asked");
});
