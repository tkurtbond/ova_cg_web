// The page's entry point: makes the Window on the document. Until
// Phase 5, a placeholder that proves the build (PLAN.md, Phase 0.2).

const app = document.getElementById("app");
if (app === null) throw new Error("the page has no #app");
app.textContent = "OVA Character Generator";
