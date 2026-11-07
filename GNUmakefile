# ova_cg_web -- an OVA character generator in one web page, built from
# TypeScript: the port of ova_cg_go (Go, Fyne), itself the port of
# ova_cg_po (Oberon-2, FLTK). See AGENTS.md and PLAN.md.
#
# npm and esbuild do the work; make only names the steps, keeps test
# outputs in obj/, and the page in dist/.

SHELL = bash

NPM  ?= npm
NODE ?= node
PAGE := dist/ova_cg_web.html

# ova_fmt_po, the oracle for files (test/files.sh, from Phase 3.5).
OVA_FMT_PO ?= $(HOME)/Repos/RPG/Tools/ova_fmt_po/ova_fmt_po
# ova_cg_go, whose saved copies and Markdown are the golden files.
OVA_CG_GO ?= $(HOME)/Repos/RPG/Tools/ova_cg_go
GO        ?= go

.PHONY: all build debug test test-browser check check-pages golden clean
.NOTPARALLEL:

all: build

obj:
	mkdir -p $@

# The build takes well under a second, so it always runs.
build: node_modules
	$(NPM) run -s build

debug: node_modules
	$(NPM) run -s build:debug

node_modules: package.json package-lock.json
	$(NPM) ci
	@touch $@

# What needs no browser: the unit tests under Node; then, once it
# exists (Phase 3.5), test/files.sh. Fail at the end if any failed.
test: node_modules | obj
	@status=0; \
	echo "== node --test"; $(NPM) run -s test || status=1; \
	if [ -x test/files.sh ]; then \
	  echo "== files.sh"; test/files.sh $(OVA_FMT_PO) || status=1; fi; \
	exit $$status

# The built page in headless Chromium and Firefox (Playwright). Needs
# the browsers once: npx playwright install chromium firefox.
test-browser: build | obj
	$(NPM) run -s test:browser

check: node_modules
	$(NPM) run -s check

# Every page in src/core/rules.ts against the rulebook: the entries'
# headings, found by their font in the PDF (tools/rulebook-headings.py,
# which needs mutool). From Phase 1; not part of make test, which can't
# count on the PDF.
RULEBOOK ?= $(HOME)/Reference/RPG/OVA/OVA_The_Anime_Role-Playing_Game.pdf
check-pages: node_modules | obj
	@tools/rulebook-headings.py $(RULEBOOK) > obj/headings.txt
	@$(NODE) tools/listrules.ts > obj/rules.txt
	@if diff obj/headings.txt obj/rules.txt; then \
	  echo "ok   - all $$(wc -l < obj/rules.txt) pages match the rulebook's headings"; \
	else echo "FAIL - src/core/rules.ts (>) differs from the rulebook's headings (<)"; exit 1; fi

# The golden files (AGENTS.md): ova_cg_go's save and markdown tests
# write each fixture's saved copy, sheet and inline paragraphs into its
# obj/files/; they are copied into test/golden/ with the commit they
# came from. Never edit test/golden/ by hand.
golden:
	cd $(OVA_CG_GO) && $(GO) test -count=1 ./internal/save ./internal/markdown
	rm -rf test/golden
	mkdir -p test/golden
	cp $(OVA_CG_GO)/obj/files/* test/golden/
	@{ echo "ova_cg_go $$(git -C $(OVA_CG_GO) rev-parse HEAD)$$(git -C $(OVA_CG_GO) diff --quiet HEAD -- internal testdata || echo ' (with uncommitted changes)')"; \
	   echo "made by: make golden, $$(date +%F)"; } > test/golden/SOURCE
	@echo "test/golden: $$(ls test/golden | wc -l) files"

clean:
	rm -rf obj dist test-results playwright-report
