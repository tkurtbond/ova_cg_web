// The page's own dialogs on happy-dom: Escape cancels the top one only
// (ova_cg_go's TestEscape, with its labels, on the dialogs Phase 5
// has), each one's default, and the focus put back. The browsers' own
// Escape and focus are test/browser/shell.spec.ts's.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Cancel,
  Dialogs,
  SaveFirst,
  type Answer,
} from "../../src/ui/dialogs.ts";
import { newDocument, press } from "./setup.ts";

function setup(): { d: Dialogs; doc: Document; back: HTMLButtonElement } {
  const { doc } = newDocument();
  const d = new Dialogs(doc);
  const back = doc.createElement("button");
  doc.body.append(back);
  back.focus();
  return { d, doc, back };
}

const shown = (doc: Document) => doc.querySelectorAll("dialog").length;

test("TestEscape", () => {
  const { d, doc } = setup();
  const e = press(doc, { key: "Escape" });
  assert.ok(!e.defaultPrevented && !d.open, "no dialog: nothing");

  d.tell("first");
  let answer = -1 as Answer | -1; // "as": a callback sets it
  d.ask("Save?", (a) => (answer = a));
  assert.equal(shown(doc), 2, "a question above a message");
  press(doc, { key: "Escape" });
  assert.ok(
    answer === Cancel && shown(doc) === 1 && d.open,
    "Escape: the question above cancelled, the message open",
  );
  press(doc, { key: "Escape" });
  assert.ok(shown(doc) === 0 && !d.open, "Escape again: the message closed");
  answer = -1;
  const last = press(doc, { key: "Escape" });
  assert.ok(
    answer === -1 && d.escapes.length === 0 && !last.defaultPrevented,
    "and then nothing",
  );
});

test("tell: OK focused, the focus back after", () => {
  const { d, doc, back } = setup();
  d.tell("a\nb");
  const ok = doc.querySelector("dialog .default") as HTMLButtonElement;
  okDefault(doc, ok);
  assert.equal(doc.querySelector(".dialog-text")?.textContent, "a\nb");
  ok.click();
  assert.ok(!d.open && shown(doc) === 0, "OK closes it");
  assert.ok(doc.activeElement === back, "the focus back where it was");
});

function okDefault(doc: Document, ok: HTMLButtonElement | null): void {
  assert.ok(ok !== null && ok.textContent === "OK", "OK is the default");
  assert.ok(doc.activeElement === ok, "OK focused");
}

test("ask: Save the default, each answer", () => {
  for (const [label, want] of [
    ["Save", SaveFirst],
    ["Don't save", 1],
    ["Cancel", Cancel],
  ] as const) {
    const { d, doc } = setup();
    let got = -1 as Answer | -1; // "as": a callback sets it
    d.ask("Save?", (a) => (got = a));
    const def = doc.querySelector("dialog .default");
    assert.equal(def?.textContent, "Save", "Save is the default");
    assert.ok(doc.activeElement === def, "and focused");
    const b = [...doc.querySelectorAll("dialog button")].find(
      (x) => x.textContent === label,
    ) as HTMLButtonElement;
    b.click();
    assert.ok(got === want && !d.open, label + " answers " + want);
  }
});

test("confirm: Cancel the default; Escape is Cancel", () => {
  const { d, doc } = setup();
  let got: boolean | undefined;
  // Read through a function: an assert on got itself would narrow it for
  // the checks after, though the callback sets it again.
  const answer = (): boolean | undefined => got;
  d.confirm("Remove?", "Remove", (ok) => (got = ok));
  const def = doc.querySelector("dialog .default");
  assert.ok(
    def?.textContent === "Cancel" && doc.activeElement === def,
    "Cancel the default, focused",
  );
  press(doc, { key: "Escape" });
  assert.ok(answer() === false && !d.open, "Escape: false");
  d.confirm("Remove?", "Remove", (ok) => (got = ok));
  (
    [...doc.querySelectorAll("dialog button")].find(
      (x) => x.textContent === "Remove",
    ) as HTMLButtonElement
  ).click();
  assert.ok(answer() === true && !d.open, "Remove: true");
});

test("askText: Enter is OK, Escape and Cancel give nothing", () => {
  const { d, doc } = setup();
  let got: [string, boolean] | undefined;
  d.askText("Name:", "Ai", (t, ok) => (got = [t, ok]));
  const input = doc.querySelector("dialog input") as HTMLInputElement;
  assert.ok(
    doc.activeElement === input && input.value === "Ai",
    "the text in the input, focused",
  );
  input.value = "Bo";
  press(doc, { key: "Enter" }, input);
  assert.deepEqual(got, ["Bo", true], "Enter: the text");
  assert.ok(!d.open, "and closed");
  d.askText("Name:", "Ai", (t, ok) => (got = [t, ok]));
  press(doc, { key: "Escape" });
  assert.deepEqual(got, ["", false], "Escape: nothing");
  d.askText("Name:", "Ai", (t, ok) => (got = [t, ok]));
  got = undefined;
  (
    [...doc.querySelectorAll("dialog button")].find(
      (x) => x.textContent === "Cancel",
    ) as HTMLButtonElement
  ).click();
  assert.deepEqual(got, ["", false], "Cancel: nothing");
});
