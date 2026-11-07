#!/bin/bash
# The round trip through ova_fmt_po (PLAN.md, Phase 3.5), ova_cg_go's
# test/files.sh on this repo's obj/files/: each fixture
# test/core/save.test.ts loaded and saved (obj/files/NAME.yaml) must
# format exactly as the fixture does (testdata/NAME.yaml), in every
# format ova_fmt_po has, and with -O, which shows the options: block.
# make test runs it after the unit tests.
#
# A fixture that loaded with notices (numbers that differ from the rules
# without its overrides: listing them) saves with those numbers listed,
# so its copy prints them with ova_fmt_po's "*" (or "\*") after them.
# For such a fixture (named here, as the save tests expect their
# notices), the two outputs are compared with that mark taken out of
# both; the save tests check that the copy lists every such number,
# since it reloads with no notices. Every other fixture's copy must
# format exactly the same, so an override listed wrongly shows.
#
# Each fixture's Markdown sheet (obj/files/NAME.md) must be exactly what
# ova_fmt_po -M makes of its saved copy, and its inline paragraphs
# (obj/files/NAME.inline.md) what ova_fmt_po -i makes of it. Phase 4's
# tests write them; until any is there, those checks are skipped.
#
# usage: test/files.sh OVA_FMT_PO
set -u
fmt=${1:?usage: files.sh OVA_FMT_PO}
cd "$(dirname "$0")/.." || exit 1
if [ ! -x "$fmt" ]; then
  echo "FAIL - $fmt isn't there: build ova_fmt_po (make in its repo), or set OVA_FMT_PO"
  exit 1
fi
# Takes out the override mark: a "\*", or a "*" after a number but
# not before another (a bold "**DX 4**" keeps its stars), or the first
# of three after one (a mark inside bold: "**DX 4***").
unmark() { sed -E 's/\\\*//g; s/([0-9+])\*(\*\*)/\1\2/g; s/([0-9+])\*([^*]|$)/\1\2/g'; }
# The same for -i, whose paragraphs are filled: a mark takes a column,
# so each paragraph is joined onto one line first.
unmark_inline() { awk 'BEGIN { RS = ""; ORS = "\n\n" } { gsub(/\n/, " "); print }' | unmark; }
failed=0; n=0
markdown=yes
if ! ls obj/files/*.md >/dev/null 2>&1; then
  markdown=
  echo "skip - the Markdown checks: no obj/files/*.md until Phase 4"
fi
for saved in obj/files/*.yaml; do
  name=$(basename "$saved" .yaml)
  orig=testdata/$name.yaml
  [ -f "$orig" ] || continue
  n=$((n + 1))
  for ext in ${markdown:+md inline.md}; do
    case $ext in
      md) opt=-M; label="$name: the Markdown sheet is ova_fmt_po -M's of its copy" ;;
      *) opt=-i; label="$name: the inline paragraphs are ova_fmt_po -i's of its copy"; n=$((n + 1)) ;;
    esac
    if [ ! -f obj/files/$name.$ext ]; then
      echo "FAIL - $label (no obj/files/$name.$ext)"; failed=$((failed + 1))
    elif diff <("$fmt" $opt "$saved" 2>&1; echo "status ${PIPESTATUS[0]}") \
            <(cat obj/files/$name.$ext; echo "status 0") > obj/files/$name.$ext.diff; then
      echo "ok   - $label"; rm -f obj/files/$name.$ext.diff
    else
      echo "FAIL - $label (obj/files/$name.$ext.diff)"; failed=$((failed + 1))
    fi
  done
  case $name in
    # Its copy gains Incorporeal Form's Defense, which the file left out
    # (save_test's TestDefenses checks it).
    defense-two) continue ;;
    Escaping|Unsorted|Vehicle|Acacia|Nazo|Group|defense-best-differs) filter=unmark; but=", but for its overrides' marks" ;;
    *) filter=cat; but= ;;
  esac
  for opt in "" -H -G -M -g -m -O -i; do
    n=$((n + 1))
    f=$filter; [ "$opt" = -i ] && [ "$f" = unmark ] && f=unmark_inline
    label="$name ${opt:-(terse)} formats the same as the fixture$but"
    if diff <("$fmt" $opt "$orig" 2>&1 | $f; echo "status ${PIPESTATUS[0]}") \
            <("$fmt" $opt "$saved" 2>&1 | $f; echo "status ${PIPESTATUS[0]}") \
         > obj/files/$name$opt.diff; then
      echo "ok   - $label"; rm -f obj/files/$name$opt.diff
    else
      echo "FAIL - $label (obj/files/$name$opt.diff)"; failed=$((failed + 1))
    fi
  done
done
if [ $n -eq 0 ]; then echo "FAIL - no saved files: run the unit tests (npm test) first"; exit 1; fi
if [ $failed -eq 0 ]; then echo "All checks passed."; else echo "$failed check(s) failed."; exit 1; fi
