// What would wait for the user, done with <dialog>s: the Window's tell,
// ask, confirm and askText unless a test sets its own (ova_cg_go's
// internal/ui/dialogs.go). Each dialog is modal (showModal) and answers
// through its callback; nothing blocks, and alert, confirm and prompt
// are never called.
//
// Escape cancels the top dialog only, through the Escape stack, as
// ova_cg_go's Window.Escape does: a keydown listener on the document,
// in the capture phase, takes Escape while a dialog is open and calls
// preventDefault, which keeps the browser from cancelling the dialog
// itself (no cancel event follows: seen in headless Chromium and Firefox
// with Playwright 1.65, 2026-11-07). A cancel event that comes another
// way is routed to the same stack. happy-dom (21.0.4) neither cancels a
// dialog on Escape nor moves the focus into it, so the focus is moved
// here, and put back where it was on closing, which both browsers also
// do of themselves (seen as above).

/** The page's title, before the file's name; each dialog's too. */
export const Title = "OVA Character Generator";

/** ask's answers: save first, don't save, or do nothing. */
export type Answer = 0 | 1 | 2;
export const SaveFirst: Answer = 0;
export const Discard: Answer = 1;
export const Cancel: Answer = 2;

/** An open dialog, and what Escape does to it. */
interface Open {
  dialog: HTMLDialogElement;
  esc: () => void;
}

export class Dialogs {
  readonly doc: Document;
  /** The open dialogs, the top one last. */
  readonly escapes: Open[] = [];

  constructor(doc: Document) {
    this.doc = doc;
    doc.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && this.escape()) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true,
    );
  }

  /** Whether a dialog is open. */
  get open(): boolean {
    return this.escapes.length > 0;
  }

  /**
   * The Escape key: the top dialog cancelled or closed, if one is open;
   * false if none is.
   */
  escape(): boolean {
    const top = this.escapes[this.escapes.length - 1];
    if (top === undefined) return false;
    top.esc();
    return true;
  }

  /**
   * modal shows a dialog of body and a row of buttons, the focus on
   * focus, Escape doing esc while it is the top dialog. It returns what
   * closes it: off the stack, out of the page, and the focus back where
   * it was.
   */
  modal(
    body: Node[],
    buttons: HTMLButtonElement[],
    focus: HTMLElement,
    esc: () => void,
  ): () => void {
    const doc = this.doc;
    const back = doc.activeElement;
    const d = doc.createElement("dialog");
    d.className = "dialog";
    const title = doc.createElement("div");
    title.className = "dialog-title";
    title.textContent = Title;
    const main = doc.createElement("div");
    main.className = "dialog-body";
    main.append(...body);
    const row = doc.createElement("div");
    row.className = "dialog-buttons";
    row.append(...buttons);
    d.append(title, main, row);
    const open: Open = { dialog: d, esc };
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      if (this.escapes[this.escapes.length - 1] === open) esc();
    });
    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      const i = this.escapes.indexOf(open);
      if (i >= 0) this.escapes.splice(i, 1);
      d.close();
      d.remove();
      if (back !== null && back.isConnected && "focus" in back) {
        (back as HTMLElement).focus();
      }
    };
    this.escapes.push(open);
    doc.body.append(d);
    d.showModal();
    focus.focus();
    return close;
  }

  /** A button labelled label doing act; the default one, if dflt. */
  button(label: string, act: () => void, dflt = false): HTMLButtonElement {
    const b = this.doc.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (dflt) b.classList.add("default");
    b.addEventListener("click", act);
    return b;
  }

  /** A paragraph of text, its line breaks kept. */
  private text(s: string): HTMLElement {
    const p = this.doc.createElement("p");
    p.className = "dialog-text";
    p.textContent = s;
    return p;
  }

  /** tell shows text, with OK. */
  tell(text: string): void {
    const ok = this.button("OK", () => close(), true);
    const close = this.modal([this.text(text)], [ok], ok, () => close());
  }

  /**
   * confirm asks question, with a button yes, which does it, and Cancel,
   * the default; then(true) for yes.
   */
  confirm(question: string, yes: string, then: (ok: boolean) => void): void {
    const answer = (ok: boolean) => () => {
      close();
      then(ok);
    };
    const cancel = this.button("Cancel", answer(false), true);
    const close = this.modal(
      [this.text(question)],
      [this.button(yes, answer(true)), cancel],
      cancel,
      answer(false),
    );
  }

  /** ask asks whether to save first: Save, the default, Don't save, Cancel. */
  ask(question: string, answer: (a: Answer) => void): void {
    const by = (a: Answer) => () => {
      close();
      answer(a);
    };
    const save = this.button("Save", by(SaveFirst), true);
    const close = this.modal(
      [this.text(question)],
      [
        save,
        this.button("Don't save", by(Discard)),
        this.button("Cancel", by(Cancel)),
      ],
      save,
      by(Cancel),
    );
  }

  /**
   * askText asks for a line of text, prompt above it, text in it to
   * begin with: then(text, true) on OK or Enter, then("", false) on
   * Cancel or Escape.
   */
  askText(
    prompt: string,
    text: string,
    then: (text: string, ok: boolean) => void,
  ): void {
    const input = this.doc.createElement("input");
    input.type = "text";
    input.className = "dialog-input";
    input.value = text;
    const ok = this.button(
      "OK",
      () => {
        close();
        then(input.value, true);
      },
      true,
    );
    const cancel = (): void => {
      close();
      then("", false);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ok.click();
      }
    });
    const label = this.doc.createElement("label");
    label.className = "dialog-text";
    label.append(prompt, input);
    const close = this.modal(
      [label],
      [ok, this.button("Cancel", cancel)],
      input,
      cancel,
    );
  }
}
