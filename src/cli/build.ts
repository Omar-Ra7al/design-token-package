import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { createJiti } from 'jiti';
import type { TokenPaths } from './paths';

export type BuildOptions = {
  cwd: string;
  paths: TokenPaths;
};

function displayPath(cwd: string, absolutePath: string): string {
  const rel = relative(cwd, absolutePath);
  return rel.startsWith('..') ? absolutePath : rel || '.';
}

type TokensExport = {
  tokens?: {
    css?: () => string;
  };
};

export async function runBuild(options: BuildOptions): Promise<number> {
  const { cwd, paths } = options;

  if (!existsSync(paths.tokensPath)) {
    console.error(`Tokens file not found: ${displayPath(cwd, paths.tokensPath)}`);
    console.error('Run `npx design-tokens init` first, or pass custom paths.');
    return 1;
  }

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
  });

  let mod: TokensExport;
  try {
    mod = (await jiti.import(paths.tokensPath)) as TokensExport;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load tokens file: ${message}`);
    return 1;
  }

  const tokens = mod.tokens;
  if (tokens == null || typeof tokens.css !== 'function') {
    console.error(
      `Expected a named export \`tokens\` with a \`.css()\` method from ${displayPath(cwd, paths.tokensPath)}`,
    );
    return 1;
  }

  const css = tokens.css();
  mkdirSync(dirname(paths.cssPath), { recursive: true });
  writeFileSync(paths.cssPath, `${css}\n`, 'utf8');

  console.log(`✓ Wrote ${displayPath(cwd, paths.cssPath)}`);
  return 0;
}
