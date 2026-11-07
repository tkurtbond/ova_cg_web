// File paths: made absolute, a file's directory, and one path relative
// to a directory.
//
// ova_cg_go's internal/paths, the port of ova_cg_po's OvaPaths (its
// PLAN.md, "The second tab"): a character's portrait is saved as a path
// relative to its YAML file. Paths here are text alone: no file is
// looked at, and symbolic links aren't followed, so "a/../b" is "b"
// even where a is a link. A path is "/"-separated; "" is none.
//
// A page has no working directory: where Go's would be used, "/" is,
// as Go's own cwd falls back to when it can't get one (PLAN.md,
// "paths").

// split is path's parts between "/"s, without empty ones and ".", each
// ".." taking out the part before it (one at the start of an absolute
// path is dropped; of a relative one, kept).
function split(path: string): string[] {
  const abs = isAbsolute(path);
  const parts: string[] = [];
  for (const part of path.split("/")) {
    const n = parts.length;
    if (part === "" || part === ".") continue;
    if (part === ".." && n > 0 && parts[n - 1] !== "..") parts.pop();
    else if (part === ".." && abs) continue;
    else parts.push(part);
  }
  return parts;
}

function join(parts: readonly string[], abs: boolean): string {
  const r = parts.join("/");
  return abs ? "/" + r : r;
}

/** Whether path starts at the root. */
export function isAbsolute(path: string): boolean {
  return path.startsWith("/");
}

/**
 * path without "." parts, doubled "/"s, a "/" at the end, or ".." after
 * a name: "a/./b//../c/" is "a/c". "." for a relative path that comes
 * to nothing.
 */
export function normalize(path: string): string {
  const r = join(split(path), isAbsolute(path));
  return r === "" ? "." : r;
}

// cwd is the working directory: the page has none (above).
const cwd = "/";

/**
 * path made absolute against directory base (itself made absolute
 * against the working directory), and normalized; "" for "".
 */
export function absolute(path: string, base: string): string {
  if (path === "") return "";
  let r = path;
  if (!isAbsolute(path)) {
    if (!isAbsolute(base)) base = base !== "" ? cwd + "/" + base : cwd;
    r = base + "/" + path;
  }
  return normalize(r);
}

/** The absolute directory file is in. */
export function dir(file: string): string {
  const abs = absolute(file, "");
  const slash = abs.lastIndexOf("/");
  return slash <= 0 ? "/" : abs.slice(0, slash);
}

/**
 * path (made absolute as absolute does, against the working directory)
 * relative to directory d: "../images/a.png". "." for d itself.
 */
export function relative(path: string, d: string): string {
  const p = split(absolute(path, ""));
  const q = split(absolute(d, ""));
  let k = 0;
  while (k < p.length && k < q.length && p[k] === q[k]) k++;
  const r: string[] = [];
  for (let i = k; i < q.length; i++) r.push("..");
  r.push(...p.slice(k));
  return r.length === 0 ? "." : r.join("/");
}

/**
 * path, given relative to directory from, rewritten relative to
 * directory to: a portrait's path when its YAML file moves. An absolute
 * path is made relative to to: a character never saved (from "") holds
 * the absolute path it was given until its first save. A relative path
 * with no from to resolve it against stays as it is.
 */
export function rebase(path: string, from: string, to: string): string {
  if (path === "") return "";
  if (from === "" && !isAbsolute(path)) return path;
  return relative(absolute(path, from), to);
}
