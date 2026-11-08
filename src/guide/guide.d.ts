// What importing a .md file gives: its text, by esbuild's text loader
// (build/build.mjs). Only main.ts imports one; the tests read the file.
declare module "*.md" {
  const text: string;
  export default text;
}
