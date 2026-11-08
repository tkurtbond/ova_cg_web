# Making a character

<!-- The guide's text: src/core/guide.ts says what Markdown it may use,
     and PLAN.md "The guide" what it says. Write it in your own words:
     make check-guide refuses the rulebook's. Each step follows one of
     the rulebook's (pp. 17-21) and says what to do on the page; the
     rules themselves are the rulebook's, reached by each name's ?. -->

## Before you start

This guide walks you through a character on this page, one step at a
time. Keep it open while you work: **Next** and **Back** move between
the steps, and **Steps** above lists them all, to jump to any one.

Each name with a page beside it has a **?** that opens the rulebook
at that page. The page can't find your copy of the PDF by itself, so
the first **?** asks you to choose it; **Rulebook > Choose PDF...**
picks another one later.
[Show me](show:choose-pdf)

A **Show me** button, like the one above, takes you to the control a
step is talking about and marks it for a moment.

## Talk with your GM

Before you build anything, find out from your Game Master what sort
of game it is, and whether the characters have to stay within any
limits: see [Discussion](page:DiscussionPage) and
[Limiting the Character](page:LimitsPage).

If they do, open **Character > Limits...** and turn on the ones your
GM uses, with their numbers. The sheet checks the character against
them as you go. **OK** keeps your choices, and **Cancel** puts back
what was there.
[Show me](show:limits)

## Who is the character?

Start with an idea of the character rather than with numbers:
[Concept](page:ConceptPage). A rough idea is plenty for now.

On the **Character** tab, type the **Character Name**, your **Player
Name** and a **Tagline**, a short phrase that sums the character up.
[Show me](show:name)

For a character the GM runs, choose its **NPC Type** beside the
Tagline ([Creating NPCs](page:NpcTypesPage)). It changes where Health
and Endurance start, and a Boss gets the Boss Abilities at the end of
its list. Leave it at none for a player's character.
[Show me](show:npc-type)

## Choose the Abilities

The Abilities are what the character is good at:
[The Abilities](page:AbilitiesStepPage). The
[Quick List](page:QuickListPage) has all of them on two pages.

1. Under the **Abilities** list, choose an Ability's name. Each name
   shows its page, and **?** opens the rulebook there.
2. Set its level, from +1 to +5.
3. Type a detail if it needs one, such as what a Knowledge is of.
4. Press **Add**.

To change one, click its line, change the level or the detail, and
press **Change**; **Remove** takes it off.
[Show me](show:abilities)

## Abilities with more to them

A few Abilities bring a sheet of their own:
[](item:Transformation), [](item:Magic, Arcane),
[](item:Magic, Witchcraft), [](item:Companion) and
[](item:Vehicle (Mecha)).

Click such an Ability's line in the list, and the button under the
Weaknesses becomes **Form...**, **Spells...**, **Companion...** or
**Vehicle...**. It opens a dialog for the transformed form's traits,
the spells, or the partner's own sheet. Everything you do there goes
into the character as you do it; **Close** when you are done.
[Show me](show:linked)

**Character > Transformed form** shows the whole sheet as it is once
the character has transformed.
[Show me](show:transformed)

## Choose the Weaknesses

Every good character has flaws, and they balance the Abilities:
[The Weaknesses](page:WeaknessesStepPage).

Add them under the **Weaknesses** list just as you did the Abilities,
with levels from −1 to −3.
[Show me](show:weaknesses)

## Perks and Flaws of an Ability

Some Abilities can be tuned with Perks and Flaws of their own:
[Ability Perks and Flaws](page:PerksFlawsPage).

Click the Ability's line, then press **Perks and Flaws...**. Choose
each one with its name, as in the lists, and, where it can be taken
more than once, how many times. When the Ability has an END cost, it
is shown beside the button.
[Show me](show:perks-flaws)

## Attacks

On the **Attacks** tab, press **Add attack...**. In the dialog:

- give the attack a name, and if you like an
  [affinity](page:AffinitiesPage) and a description;
- tick whether it is made with Telekinesis or in the transformed
  form;
- choose its Perks and Flaws.

Its ROLL, DX and END are worked out as you choose. **OK** keeps the
attack; **Cancel** drops it. Each attack's row has **Edit** and
**Remove**. How attacks are used in play is in
[Attack!](page:RollsPage) and [Damage](page:DamagePage).
[Show me](show:attacks)

## Health, Endurance and the rest

Under the attacks are the character's DEFENSE, HEALTH, ENDURANCE and
TV, all worked out from the Abilities and Weaknesses:
[Health and Endurance](page:HealthEndurancePage) and
[Threat Value](page:ThreatValuePage). There is nothing to fill in
here.
[Show me](show:health)

If your GM rules otherwise, type a number in the empty box beside a
number to override it. The worked-out number stays beside it, and
whatever depends on it uses yours; empty the box to go back.
[Show me](show:tv)

## Check the totals and warnings

Back on the **Character** tab, under the lists, are the levels of the
Abilities and of the Weaknesses, and the **Character Total**. A total
that breaks one of your limits turns red.
[Show me](show:totals)

The **Warnings** say what the rules find wrong with the sheet, each
with its page: a level out of range, a Perk taken too often, a limit
broken. Fix them, or agree them with your GM.
[Show me](show:warnings)

## Background

Now give the character a life outside the numbers:
[Finishing Touches](page:FinishingTouchesPage).

The **Background** tab has a **Summary**, and room for the
character's background, appearance, personality, hooks for the story,
and anything else. None of it is required.
[Show me](show:background)

## Fluff and a portrait

The **Fluff** tab has the short facts about the character, such as
**Concept**, **Age** and **Hobbies**: see
[Fluffing](page:FluffingPage). Below them you can add notes of your
own, each a header and its text.
[Show me](show:fluff)

**Choose...** under **Character Portrait** picks a picture. The file
keeps only the picture's name, so keep the picture in the same folder
as the character's file.
[Show me](show:portrait)

## Save the character

**File > Save** downloads the character as a `.yaml` file, named after
the character. Your browser puts it where it puts downloads, usually
your Downloads folder, so move it to where you keep your characters.
The title shows a `*` while there are changes not yet saved.
[Show me](show:save)

**File > Open...** reads it back, or you can drop the file onto the
page.

## More than one character

One file can hold several characters, such as a villain and their
minions. **Character > Add Character** adds an empty one.
[Show me](show:add-character)

The list at the right of the menu bar shows which one you are working
on; choose another to switch to it. **Save** saves them all.
[Show me](show:characters)

The rulebook's sample characters are finished examples to compare
yours with: [Using the Characters](page:SampleCharactersPage).

## Share the sheet

The **Markdown** tab shows the whole sheet as text. **Copy** puts it
on the clipboard, and **Save Markdown...** downloads it. Tick
**Inline** for the character as a single paragraph, the way an
adventure lists its cast.
[Show me](show:markdown)

That's the whole character. Have fun playing it!
