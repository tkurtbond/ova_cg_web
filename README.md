# ova_cg_web - an OVA character generator in one web page

`ova_cg_web` builds a character for OVA, the Open Versatile Anime
engine, on a page laid out like the official character sheet: pick
Abilities and Weaknesses by name and level, build attacks from Perks
and Flaws, and it works out Endurance costs, ROLL, DX, Defense,
Health, Endurance and Threat Value as you go. It holds no rules text:
each name shows its rulebook page, and **?** opens the rulebook's PDF,
which you choose, at that page. Characters are loaded and saved as the
same YAML that [ova_cg_po](../ova_cg_po) (Oberon-2, FLTK) and
[ova_cg_go](../ova_cg_go) (Go, Fyne) write, which
[ova_fmt_po](../ova_fmt_po) and the Ada [ova_fmt](../ova_fmt) format.

It is one HTML file, `ova_cg_web.html`. Download it and open it from
your disk in Firefox or a Chromium-based browser (Chrome, Chromium,
Edge, Brave). It needs no server and no installation, and loads
nothing from the network, so it works offline. Safari isn't tested.

**Status: complete** (the phases of [PLAN.md](PLAN.md)).
[DESIGN-OPTIONS.md](DESIGN-OPTIONS.md) says why it is built this way.

## Getting it

Each release on the repository's GitHub page has `ova_cg_web.html`
attached: download it, keep it anywhere, and open it with your browser
(double-click it, or File > Open File..., or drag it onto a browser
window). To build it yourself, see [Building](#building).

The page's version, and the commit it was built from, are in the
tooltip of the title line at the top of the page (`ova_cg_web 0.1.0,
built from 1a2b3c4d5e6f`; a `+` after the commit means it was built
with uncommitted changes).

## Using the page

The page is the character sheet in four tabs: **Character** and
**Attacks**, the sheet's right half, and **Background** and **Fluff**,
its left; and a fifth, **Markdown**, the sheet as text. Every change
goes into the character at once and every number is recomputed as you
work. The title (the browser tab's, and the line at the top of the
page) shows the file's name, with ` *` after it while there are
unsaved changes.

### Menus and keys

| Menu | Item | Key |
|---|---|---|
| File | New | Alt+Shift+N |
| File | Open... | Ctrl+O |
| File | Save, Save As... | Ctrl+S, Ctrl+Shift+S |
| Character | Limits... | Ctrl+E |
| Character | Transformed form | Alt+Shift+T |
| Character | Add Character, Duplicate Character, Remove Character... | |
| Character | Move Up, Move Down | |
| Character | Next Character, Previous Character | Alt+Shift+PgDn, Alt+Shift+PgUp |
| Rulebook | Open, Choose PDF... | |
| Help | Guide, About | |

The menus show each item's key. A browser keeps some keys for itself
(Ctrl+N opens a window, Ctrl+T a tab, Ctrl+PgDn and Ctrl+PgUp switch
tabs), so the page uses Alt+Shift where ova_cg_po and ova_cg_go use
Ctrl. There is no Quit: closing the browser tab is quitting.

The dialogs open inside the page. Escape cancels or closes the one on
top.

### The guide

**Help > Guide** opens a step-by-step guide to making a character,
following the rulebook's own steps. It sits beside the sheet when the
window is wide, and above the tabs when it is narrow, where ▾ folds it
out of the way. It shows one step at a time: **Back** and **Next** move
through them, and **Steps** unfolds a list of all of them to jump to
any one. A step's **Show me** takes you to the control it is talking
about, on its tab or in its menu, and marks it for a moment; each name
in a step has a **?** for its page in the rulebook. **Close**, or
**Help > Guide** again, puts it away; it opens where you left it until
the page is closed.

### Files

A web page can read only the files you give it, and can write files
only as downloads. So:

- **Open...** (or dropping a `.yaml` file on the page) reads the file
  you choose. A file that can't be read, or holds mistakes, is
  reported, and nothing changes. A file whose numbers differ from the
  rules' keeps them as overrides, and says which when it opens.
- **Save** downloads the characters as a YAML file named as the file
  you opened, or, for a new one, after the first character's name
  (`Ai.yaml`). **Save As...** asks for the name first. Your browser
  decides where a download goes (usually your Downloads folder, unless
  it is set to ask), and may rename it if a file of that name is
  already there (`Ai (1).yaml`). Move it where you keep your
  characters.
- The page counts a download as saved, so the ` *` goes when the
  browser takes it, whether or not you keep the file.
- **New** and **Open...** ask first whether to save unsaved changes
  (Save, Don't save, Cancel). Closing or reloading the tab with
  unsaved changes gets your browser's own question instead.

### Several characters in a file

A file can hold several characters, such as an NPC and their minions.
The page shows one at a time. The menu at the right of the tabs lists
them by number and name: choose one to show it. The title says which
is shown, of how many (`Acacia.yaml (1 of 3)`).

- **Add Character** puts a new, empty character last, and
  **Duplicate Character** a copy of the one shown.
- **Remove Character...** asks first. A file keeps at least one
  character, so it is greyed out when there is only one.
- **Move Up** and **Move Down** change the order. ova_fmt sets every
  character after the first as a subentry, so put the main one first.
- **Next Character** and **Previous Character** step through them.

**Save** writes every character to the file, in order, and the
question about unsaved changes covers all of them.

### The Character tab

**NPC Type**, beside the Tagline, is none for a player's character, or
Heroic, Secondary, Extra or Boss for an NPC (p. 123). It sets where
Health and Endurance start (40, 20 or 10; a Boss has a character's 40)
and the TV's last step (4 less for a Secondary NPC, always 1 for an
Extra), and is saved with the character.

A Boss's Abilities offer the four Boss Abilities (p. 123) as well,
below a "Boss Abilities" row at the end of the list. Each adds 5 to
the TV (p. 124), and, since a Boss applies and removes them as needed,
none counts in the levels or points; its level stays 1. A sheet that
stops being a Boss keeps them, with a warning, until they are removed.

**Abilities and Weaknesses.** Each list shows a trait's level, name
and detail, its points when Scaled Cost is on, and the rulebook page
its name is on. To add one, choose its name from the menu under the
list (each name shows its page), set its level and its detail, and
press **Add**. Clicking a line puts it back in those controls: change
them and press **Change** to replace it, or **Remove** to take it out.
**?** opens the rulebook at the chosen name's page.

With an Ability selected, **Perks and Flaws...** opens the attack
dialog for its Perks and Flaws, without the attack's own fields; its
END, when it has one, is beside the button. An Ability with linked
content turns the button under the Weaknesses into one for it:

- **Form...**, a Transformation's: the transformed form's Abilities
  and Weaknesses, two levels for each level of Transformation.
- **Spells...**, a Magic's: each spell's name, the Ability it mimics,
  its level, and its END. Witchcraft's spells are curses: each casts a
  Weakness, at -1 to -3, and costs by the Weakness's size (p. 58).
- **Companion...** or **Vehicle...**: the partner's own sheet: its
  name, whether it is a Fragment, whether it has combat stats, and its
  Abilities, Weaknesses, attacks and numbers.

These dialogs change the character as you work, and **Close** closes
them.

**Totals and warnings.** Under the lists are the Abilities' and
Weaknesses' levels and the Character Total (and, when Scaled Cost is
on, the Abilities' points and the Scaled Cost points, the Abilities'
less the Weaknesses'). Warnings say what the rules find wrong, with
the pages of the rules: a name the rulebook doesn't have (shown with
`p. ?`), a level out of range, a Perk taken too often, a Perk or Flaw
the rules don't allow with the others, a limit broken. A total a limit
finds too high turns red.

**Overrides.** Beside every computed number is an empty box. Type a
number there to override it, for a GM's ruling, a house rule, or a
case the rules here don't cover: the computed number stays shown
beside it, and anything computed from it uses the override. A number
is an integer, except that an attack's DX may be `1/2` and a spell's
END may end in `+` (`10+`); anything else is refused with a message.
Empty the box to go back to the computed number.

**Character > Transformed form** shows and computes the sheet in the
Transformation's form (p. 63), and is saved with the character.

**Character > Limits...** turns on the rules of p. 21 and 57: Base
Zero (the Character Total within so many points of zero), starting
levels, a Power Ceiling, Scaled Cost, Knowledge and Ineptitude at half
cost, and Combined Effectiveness. Each number is active only while its
rule is on, and each rule has a **?**. The page follows each change;
**OK** keeps them, and **Cancel** or Escape puts them back. They are
saved with the character.

### The Attacks tab

**Attacks.** Each attack is a row with its ROLL, DX and END. **Add
attack...** and **Edit** open the attack dialog: the attack's name,
affinity and description, whether it is made with Telekinesis or in
the transformed form, and its Perks and Flaws, chosen as the traits
are, with how many times (for one that can be taken more than once)
and a cost (for one whose cost you choose: Cancel, Requirement,
Unique). Its ROLL, DX and END follow each change. **OK** keeps it;
**Cancel** puts it back as it was, and takes out an attack just added.
**Remove** deletes the row's attack.

Below the attacks are DEFENSE, HEALTH, ENDURANCE and TV, with
Barrier's and Incorporeal Form's alternate DEFENSE and an Endurance
Reserve when the character has them.

### The Background tab

The Summary, and the Background, Appearance, Personality, Character
Hooks and Other Notes.

### The Fluff tab

The Character Portrait; the sheet's fluff (Concept, Age, Birthday and
the rest); and the notes, each a header and text, added, changed and
removed as the traits are.

**The portrait.** A file saves the portrait as a path to an image,
relative to the YAML file, and nothing of the image itself. A page
can't see the folder the YAML file came from, so:

- **Choose...** picks an image and shows it. The portrait's path
  becomes the image's file name, so keep the image beside the YAML
  file.
- A loaded file's portrait shows its path but not the image, since
  the page can't open a file you haven't chosen. **Show...** picks the
  image to show, and leaves the path as it is.
- **Remove** takes the portrait off.

An image chosen is remembered until the page is closed, so another
file with the same path shows it again.

### The Markdown tab

The character's sheet in Markdown, the same text `ova_fmt_po -M`
makes of the saved file, kept up to date as you work. Select part of
it, or press **Copy** to put all of it on the clipboard, to paste
elsewhere; **Save Markdown...** downloads it (it suggests the
character's name, with `.md`). Saving the sheet doesn't save the
character.

Check **Inline** to see the character instead as one paragraph, as an
adventure's cast lists it, the same text `ova_fmt_po -i` makes: the
bold name and NPC type, the prose run together, the Abilities and
Weaknesses in italics as "Attack +2 (Blaster rifle)", then the attacks
and the combat numbers, filled to 70 columns. Copy and Save
Markdown... then take the paragraph (Save suggests `NAME-inline.md`).

### The rulebook

The page holds no rules text. Every name shows its page in the
rulebook, and **?** or **Rulebook > Open** opens the rulebook's PDF in
a browser tab, at that page, in your browser's own PDF viewer. The
next **?** reuses that tab.

The page can't find the PDF itself. The first time, it asks you to
choose it, and keeps it until the page is closed; **Rulebook > Choose
PDF...** chooses another. The PDF never leaves your computer, and the
page doesn't keep a copy.

A browser set to download PDFs instead of showing them (in Firefox,
Settings > General > Applications > Portable Document Format) will
download the rulebook instead of opening it at the page.

## Building

You need Node 22 or later and GNU make. For `make test`, ova_fmt_po,
built, at `OVA_FMT_PO` (default `~/Repos/RPG/Tools/ova_fmt_po/ova_fmt_po`).
For `make check-pages` and `make check-guide`, mutool and the
rulebook's PDF (and, for `check-guide`, `abilities.md` and
`weaknesses.md`, `REFERENCE_MD`).

```sh
npm ci               # once: the pinned dependencies
make                 # dist/ova_cg_web.html
make test            # the unit tests, under Node, and test/files.sh
make test-browser    # the page in headless Chromium and Firefox,
                     #   from file:// and from http://127.0.0.1
                     #   (once first: npx playwright install chromium firefox)
make check           # the type checks and prettier
make check-pages     # the rules' and the guide's pages against the rulebook's PDF
make check-guide     # the guide shares no 8 words with the rulebook
make clean
```

The build refuses a page larger than its budget (256 KiB, in
`build/build.mjs`); the page is about 250 KB.

### Making a release

1. Set the version: `make version V=0.1.0` (it changes `package.json`
   and `package-lock.json`, through `npm version`, and neither commits
   nor tags), and commit.
2. Run `make clean check test test-browser`.
3. Push.
4. `make release` (needs `gh`, logged in, and your gpg key). It refuses
   a tree with uncommitted changes, a version already tagged (here or
   on GitHub) and a commit not on `origin/main`. Then it builds the
   page, writes `dist/SHA256SUMS` and signs it (`SHA256SUMS.asc`),
   makes a signed tag `vVERSION` and pushes it, and runs `gh release
   create` for that tag with the three files attached. gpg may ask for
   your passphrase, twice. `GPG_KEY=ID` picks the key (else gpg's and
   git's default for your email); `make release DRY=1` builds and
   signs, but only shows the tag, the push and the `gh` command.

To check a downloaded page, with the release's three files in one
folder:

```sh
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

## OVA and the rulebook

OVA, *OVA: The Anime Role-Playing Game*, is © 2015 Wise Turtle. This
project is not affiliated with or endorsed by Wise Turtle. It holds
none of the rulebook's descriptions: it knows the names of the rules'
Abilities, Weaknesses, Perks and Flaws, the numbers attached to them,
and the page each is described on, and it opens your own copy of the
rulebook at that page. You need the rulebook to use it.

The test fixtures in `testdata/` (and the golden files made from them in
`test/golden/`) record the rulebook's sample
characters so that the program's numbers can be checked against them;
their backgrounds and descriptions are paraphrased, and only short
captions such as attack descriptions follow the book's wording.

## Documents

- [PLAN.md](PLAN.md): how the port maps ova_cg_go to TypeScript and a
  browser, what it decided differently, and what it found.
- [DESIGN-OPTIONS.md](DESIGN-OPTIONS.md): why it is a TypeScript port.
- [AGENTS.md](AGENTS.md): working notes on the build and the tests.
- ova_cg_po's PLAN.md: the design, and the rules the program computes.
