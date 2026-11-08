#!/usr/bin/env python3
# rulebook-sections.py PDF: prints "PAGE<TAB>HEADING", one line per
# section heading of the OVA rulebook (every heading set in
# ChaletComprime-HongKong, the chapters' sections and subsections, not
# the running heads), in the book's order. PAGE is the printed page
# (PDF page - 2). Only headings and page numbers are printed, never the
# rulebook's text (AGENTS.md). Needs mutool (MuPDF).
#
# make check-pages looks for each page the guide cites
# (src/core/guide.ts's pages, tools/listguide.ts) among these.
import subprocess, sys, xml.etree.ElementTree as ET

def main(pdf):
    xml = subprocess.run(['mutool', 'draw', '-q', '-F', 'stext', '-o', '-', pdf],
                         check=True, capture_output=True).stdout
    for index, page in enumerate(ET.fromstring(xml).iter('page'), start=1):
        for line in page.iter('line'):
            for font in line.iter('font'):
                if not font.get('name', '').startswith('ChaletComprime-HongKong'):
                    continue
                text = ''.join(c.get('c') for c in font.iter('char')).replace('­', '').strip()
                if text and not text.isdigit():  # the page's number is set so too
                    print(f"{index - 2}\t{text}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage: rulebook-sections.py PDF')
    main(sys.argv[1])
