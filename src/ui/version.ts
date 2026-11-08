// Which build the page is: its version (package.json's) and the commit
// it was built from, which build/build.mjs puts in the bundle (esbuild's
// define). Run unbundled, as the unit tests run it, there are none, and
// the page says it is a development copy. Shown as the title line's
// tooltip (PLAN.md, Phase 14.3).

declare const OVA_VERSION: string | undefined;
declare const OVA_COMMIT: string | undefined;

/** package.json's version; "dev" unbundled. */
export const version: string =
  typeof OVA_VERSION === "string" ? OVA_VERSION : "dev";

/** The commit built from, "+" after it if the tree had changes; "" unbundled. */
export const commit: string = typeof OVA_COMMIT === "string" ? OVA_COMMIT : "";

/** about is what the title line's tooltip says of the build. */
export function about(): string {
  const built = commit === "" ? "" : `, built from ${commit}`;
  return `ova_cg_web ${version}${built}`;
}
