import { createJiti } from "jiti";

import { loadConfig, type ResolvedConfig } from "./config";
import { PACKAGE_BANNER_NAME, writeCssFile } from "./css-output";
import { resolveFromRoot } from "./paths";
import {
  collectTokenKeys,
  formatTailwindThemeBlock,
} from "./tailwind-theme";

export type TokensLike = {
  css: () => string;
  themes?: Record<string, { tokens?: Record<string, string> }>;
};

export async function loadTokensExport(
  tokensFile: string,
  exportName: string,
): Promise<TokensLike> {
  const jiti = createJiti(import.meta.url);
  const mod: unknown = await jiti.import(tokensFile);

  if (!mod || typeof mod !== "object") {
    throw new Error(`Failed to load tokens module: ${tokensFile}`);
  }

  const record = mod as Record<string, unknown>;
  const exported = record[exportName];

  if (!exported || typeof exported !== "object") {
    throw new Error(`Export "${exportName}" not found in ${tokensFile}`);
  }

  const api = exported as Partial<TokensLike>;
  if (typeof api.css !== "function") {
    throw new Error(
      `Export "${exportName}" in ${tokensFile} does not have a css() method`,
    );
  }

  return api as TokensLike;
}

export async function runBuild(
  cwd: string = process.cwd(),
  config?: ResolvedConfig,
): Promise<{ outputPath: string }> {
  const resolved = config ?? (await loadConfig(cwd));
  const tokensFile = resolveFromRoot(resolved.root, resolved.tokens.file);
  const outputPath = resolveFromRoot(resolved.root, resolved.output.css);

  const tokens = await loadTokensExport(tokensFile, resolved.tokens.export);
  let themeBlock: string | undefined;

  if (resolved.output.tailwindTheme) {
    const keys = collectTokenKeys(tokens.themes ?? {});
    themeBlock = formatTailwindThemeBlock(keys);
  }

  writeCssFile(outputPath, tokens.css(), {
    packageName: PACKAGE_BANNER_NAME,
    themeBlock,
  });

  return { outputPath };
}
