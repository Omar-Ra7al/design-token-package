import { existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const STYLESHEET_CANDIDATES = [
  "src/app/globals.css",
  "src/styles/globals.css",
  "src/index.css",
  "src/global.css",
  "src/styles.css",
  "app/globals.css",
  "styles/globals.css",
] as const;

export function findProjectRoot(cwd: string = process.cwd()): string {
  let dir = resolve(cwd);

  while (true) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return resolve(cwd);
    }
    dir = parent;
  }
}

export function defaultThemeDir(root: string): string {
  return existsSync(join(root, "src")) ? "src/theme" : "theme";
}

export function findStylesheetCandidates(root: string): string[] {
  return STYLESHEET_CANDIDATES.filter((candidate) =>
    existsSync(join(root, candidate)),
  );
}

/** Relative POSIX-style path from `fromFile` to `toFile` for use in CSS `@import`. */
export function relativeImportPath(fromFile: string, toFile: string): string {
  let rel = relative(dirname(fromFile), toFile).split(sep).join("/");
  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }
  return rel;
}

export function resolveFromRoot(root: string, path: string): string {
  return resolve(root, path);
}
