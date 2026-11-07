// Phase 8's tabs on happy-dom: ova_cg_go's TestBackground
// (internal/ui/background_test.go), with its labels where the page does
// as Go does. The Background and Fluff tabs, driven as a user would, and
// what they save: the text, the fluff, the notes and the portrait shown
// from a character, each change made as the user makes it, and checked
// in the model, in the title, and in what is saved.
//
// The portrait is the page's own (PLAN.md, "The portrait"): an image is
// shown once picked, its path is its name and isn't rebased, and Show...
// shows an image for a path a file gave. happy-dom never loads an image,
// so whether the browsers show it is test/browser/background.spec.ts's.
//
// Never compare DOM nodes with assert.equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as entities from "../../src/core/entities.ts";
import { trim } from "../../src/core/entities.ts";
import {
  CantRead,
  imageTypes,
  NoPortrait,
  NotShown,
  ProseAppearance,
  ProseBackground,
  ProseCharacterHooks,
  ProseOtherNotes,
  ProsePersonality,
} from "../../src/ui/background.ts";
import { Discard, type Window } from "../../src/ui/window.ts";
import { checker, load, newWindow, saved, typeIn } from "./setup.ts";

/**
 * bgShown says whether every field of the tabs shows the character's
 * text, trimmed as the tabs trim it.
 */
function bgShown(w: Window): boolean {
  const b = w.background;
  const c = w.character;
  const is = (e: { value: string }, s: string | undefined) =>
    trim(e.value) === (s ?? "");
  return (
    is(b.summaryIn, c.summary) &&
    is(b.prose[ProseBackground]!, c.background) &&
    is(b.prose[ProseAppearance]!, c.appearance) &&
    is(b.prose[ProsePersonality]!, c.personality) &&
    is(b.prose[ProseCharacterHooks]!, c.characterHooks) &&
    is(b.prose[ProseOtherNotes]!, c.otherNotes) &&
    b.portraitPath.textContent === (c.portrait ?? "") &&
    b.fluffIn.every((e, i) => is(e, c.fluff[i]))
  );
}

/** notesShown says whether the notes' list is the character's notes' headers. */
function notesShown(w: Window): boolean {
  const n = w.character.notes;
  const l = w.background.notes;
  return n.length === l.count() && n.every((x, i) => l.line(i) === x.header);
}

/** marked says whether the character is modified, and the title says so. */
function marked(w: Window): boolean {
  return w.modified && w.doc.title.endsWith(" *");
}

function click(b: HTMLButtonElement): void {
  b.click();
}

test("TestBackground: the Background and Fluff tabs", () => {
  const { w, f, happy } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  const b = w.background;
  const has = (s: string) => saved(w).includes(s);
  const says = (s: string) => b.portraitSays() === s;
  /** An image to choose: what's in it doesn't matter to happy-dom. */
  const image = (name: string) =>
    new happy.File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, {
      type: "image/png",
    }) as unknown as File;

  check(w.tabShown === 0, "the Character tab first");
  w.tabs[2]!.click();
  check(
    w.tabShown === 2 &&
      w.panels[2]!.hidden === false &&
      w.panels[3]!.hidden === true,
    "the Background tab, shown",
  );
  check(
    bgShown(w) &&
      notesShown(w) &&
      says(NoPortrait) &&
      !b.imageShown() &&
      b.removePortrait.disabled &&
      b.showImage.disabled,
    "a new character: every field empty, no portrait",
  );

  // ---- Shown from a file ----
  let ok = load(w, "Sheet.yaml");
  let c = w.character;
  check(
    ok && bgShown(w),
    "Sheet.yaml: the summary, the prose sections, the fluff and the portrait's path shown",
  );
  check(
    c.background !== undefined &&
      c.appearance !== undefined &&
      c.personality !== undefined &&
      c.otherNotes !== undefined &&
      c.summary !== undefined &&
      c.fluff[entities.Concept] !== undefined,
    "and it has each",
  );
  check(
    b.portraitPath.textContent === "images/hana.png" &&
      !b.imageShown() &&
      says(NotShown) &&
      !b.removePortrait.disabled &&
      !b.showImage.disabled,
    "its portrait, not picked: the path, and how to show it",
  );
  ok = load(w, "Jiro.yaml");
  check(
    ok && bgShown(w) && w.character.characterHooks !== undefined,
    "Jiro.yaml: his Character Hooks shown",
  );
  ok = load(w, "Raine.yaml");
  check(
    ok && w.character.notes.length > 0 && notesShown(w),
    "Raine.yaml: the notes' headers listed",
  );
  check(b.notes.line(0) === "Nightmares", "the first, Nightmares");
  b.notes.select(0);
  c = w.character;
  check(
    trim(b.noteHeader.value) === c.notes[0]!.header &&
      trim(b.noteText.value) === c.notes[0]!.text,
    "a note selected: its header and text to edit",
  );

  // ---- Text typed ----
  load(w, "Sheet.yaml");
  c = w.character;
  check(!w.modified, "loaded: nothing changed");
  const e = b.prose[ProseAppearance]!;
  typeIn(e, e.value + " She hums.");
  check(
    (c.appearance ?? "").includes("coat that never stops moving. She hums.") &&
      marked(w),
    "typing in Appearance: the character's, and the title marked",
  );
  check(has("She hums."), "and saved");
  typeIn(e, "  " + e.value);
  check(
    c.appearance?.[0] === "S",
    "blanks at the ends are trimmed, as the loader trims them",
  );
  typeIn(e, "   ");
  check(
    c.appearance === undefined && !has("appearance:"),
    "emptied: not saved",
  );
  typeIn(b.prose[ProseOtherNotes]!, "Owes two favors now.");
  check(has("other-notes: Owes two favors now."), "Other Notes saved");
  typeIn(b.prose[ProseCharacterHooks]!, "Needs a courier.");
  check(
    c.characterHooks !== undefined && has("character-hooks: Needs a courier."),
    "Character Hooks saved",
  );
  typeIn(b.summaryIn, "A schoolgirl and a storm.");
  check(
    c.summary === "A schoolgirl and a storm." &&
      has("summary: A schoolgirl and a storm."),
    "the summary typed and saved",
  );

  // ---- The fluff ----
  typeIn(b.fluffIn[entities.Hair]!, "Black");
  check(
    c.fluff[entities.Hair] !== undefined && has("hair: Black"),
    "Hair typed: saved in fluff:",
  );
  typeIn(b.fluffIn[entities.FavoriteFood]!, "Melon bread");
  check(
    has("favorite-food: Melon bread"),
    "Favorite Food: its key, favorite-food",
  );
  for (const e of b.fluffIn) typeIn(e, " ");
  check(!c.hasFluff && !has("fluff:"), "every field emptied: no fluff: block");
  typeIn(b.fluffIn[entities.Age]!, "15");
  // Text that plain YAML would read as a number is quoted: libfyaml
  // wrote it plain.
  check(
    c.hasFluff && has("fluff:") && has('age: "15"'),
    "one field again: the block again",
  );
  check(bgShown(w), "and every field still shows the character's");

  // ---- The notes ----
  f.tells = 0;
  typeIn(b.noteHeader, "Rivals");
  typeIn(b.noteText, "");
  click(b.addNote);
  check(
    f.tells === 1 && c.notes.length === 0,
    "a note with no text: said so, not added",
  );
  typeIn(b.noteText, "The track team's captain.");
  click(b.addNote);
  typeIn(b.noteHeader, "Secrets");
  typeIn(b.noteText, "Nobody knows about the Gale.");
  click(b.addNote);
  check(
    c.notes.length === 2 && notesShown(w) && b.notes.selected() === 1,
    "two added, in order, the last selected",
  );
  let text = saved(w);
  check(
    text.includes("header: Rivals") &&
      text.includes("The track team's captain.") &&
      text.includes("header: Secrets"),
    "and saved",
  );
  b.notes.select(0);
  typeIn(b.noteHeader, "Rival");
  click(b.changeNote);
  check(
    c.notes[0]!.header === "Rival" && notesShown(w) && b.notes.selected() === 0,
    "Change: the header changed, in its place",
  );
  click(b.removeNote);
  check(
    c.notes.length === 1 && c.notes[0]!.header === "Secrets" && notesShown(w),
    "Remove",
  );
  click(b.removeNote);
  check(c.notes.length === 1, "Remove with nothing selected removes nothing");

  // ---- The portrait ----
  // Sheet.yaml's images/hana.png, shown with Show...: the path stays,
  // and showing is no change.
  f.file = image("hana.png");
  w.saveTo("Sheet.yaml");
  click(b.showImage);
  check(
    f.accepted === imageTypes &&
      c.portrait === "images/hana.png" &&
      b.imageShown() &&
      says("") &&
      !w.modified,
    "Show...: the image shown for the path, which stays; no change",
  );
  f.file = image("face.png");
  click(b.choosePortrait);
  check(
    c.portrait === "face.png" && bgShown(w),
    "an image chosen: its path its name, beside the character's file",
  );
  check(
    b.imageShown() && says("") && !b.removePortrait.disabled && marked(w),
    "and shown",
  );
  check(has("portrait: face.png"), "and saved so");
  f.typed = "bg.yaml";
  w.saveAs(() => {});
  check(
    c.portrait === "face.png" &&
      w.doc.title === "OVA Character Generator - bg.yaml" &&
      b.imageShown() &&
      bgShown(w),
    "Save As: the path as it was, the image still shown",
  );
  text = saved(w);
  ok = w.load(text, "bg.yaml");
  c = w.character;
  check(
    ok &&
      c.portrait === "face.png" &&
      b.imageShown() &&
      bgShown(w) &&
      notesShown(w),
    "loaded again: the image picked this session shown again",
  );
  check(saved(w) === text, "and everything the tabs set, the same");
  f.file = undefined;
  f.chosen = undefined;
  click(b.choosePortrait);
  click(b.showImage);
  check(
    c.portrait === "face.png" && b.imageShown() && !w.modified,
    "the chooser cancelled: nothing changes",
  );
  b.portrait.dispatchEvent(new happy.Event("error") as unknown as Event);
  check(
    c.portrait === "face.png" && !b.imageShown() && says(CantRead),
    "an image the browser can't show: said so, the path kept",
  );
  w.load(text, "bg.yaml");
  check(says(NotShown), "and forgotten: Show... asked for again");
  click(b.removePortrait);
  c = w.character;
  check(
    c.portrait === undefined &&
      !has("portrait:") &&
      says(NoPortrait) &&
      !b.imageShown() &&
      b.removePortrait.disabled &&
      b.showImage.disabled &&
      marked(w),
    "Remove: no portrait",
  );

  // ---- New ----
  w.newCharacter();
  check(
    bgShown(w) && notesShown(w) && !b.imageShown() && says(NoPortrait),
    "New: every field empty again",
  );
  check(!w.modified, "and nothing changed");
  done();
});

test("filling: showing a character's tabs is no change", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  for (const name of ["Sheet.yaml", "Jiro.yaml", "Raine.yaml"]) {
    load(w, name);
    w.background.show();
    check(!w.modified, name + ": shown again, no change");
  }
  done();
});
