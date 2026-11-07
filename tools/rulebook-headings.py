#!/usr/bin/env python3
# rulebook-headings.py PDF: prints "PAGE<TAB>NAME", one line per entry of
# the OVA rulebook's Abilities & Weaknesses chapter, in the book's order:
# every heading set in Calluna-Bold on printed pages 49-89 (PDF pages
# 51-91), with a Perk's or Flaw's cost, "(+5)", taken off. PAGE is the
# printed page (PDF page - 2). Only names and page numbers are printed,
# never the rulebook's text (AGENTS.md). Needs mutool (MuPDF).
#
# make check-pages compares this with OvaRules' pages (test/ListRules).
import re, subprocess, sys, xml.etree.ElementTree as ET

def main(pdf):
    for index in range(51, 92):
        xml = subprocess.run(['mutool', 'draw', '-q', '-F', 'stext', '-o', '-', pdf, str(index)],
                             check=True, capture_output=True).stdout
        for line in ET.fromstring(xml).iter('line'):
            for font in line.iter('font'):
                if font.get('name') != 'Calluna-Bold':
                    continue
                text = ''.join(c.get('c') for c in font.iter('char')).replace('­', '').strip()
                if text:
                    print(f"{index - 2}\t{re.sub(r' [(][^)]*[)]$', '', text) if index >= 85 else text}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage: rulebook-headings.py PDF')
    main(sys.argv[1])
