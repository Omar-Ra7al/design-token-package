import { readFileSync, writeFileSync } from "node:fs";

import { relativeImportPath } from "./paths";

function normalizeImportTarget(specifier: string): string {
  return specifier.replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Returns true if `stylesheetPath` already imports `tokensCssPath`. */
export function hasTokensImport(
  stylesheetPath: string,
  tokensCssPath: string,
  contents?: string,
): boolean {
  const source = contents ?? readFileSync(stylesheetPath, "utf8");
  const expected = normalizeImportTarget(
    relativeImportPath(stylesheetPath, tokensCssPath),
  );

  const importRe = /@import\s+(?:url\()?["']([^"']+)["']\)?\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source)) !== null) {
    const imported = match[1];
    if (!imported) continue;
    if (normalizeImportTarget(imported) === expected) {
      return true;
    }
  }
  return false;
}

export type InjectResult =
  | { status: "added"; importPath: string }
  | { status: "exists"; importPath: string };

export function injectTokensImport(
  stylesheetPath: string,
  tokensCssPath: string,
): InjectResult {
  const importPath = relativeImportPath(stylesheetPath, tokensCssPath);
  const contents = readFileSync(stylesheetPath, "utf8");

  if (hasTokensImport(stylesheetPath, tokensCssPath, contents)) {
    return { status: "exists", importPath };
  }

  const line = `@import ${JSON.stringify(importPath)};\n`;
  const next =
    contents.length === 0 || contents.endsWith("\n")
      ? `${line}${contents}`
      : `${line}\n${contents}`;

  writeFileSync(stylesheetPath, next, "utf8");
  return { status: "added", importPath };
}
