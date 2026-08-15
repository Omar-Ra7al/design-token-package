import { existsSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

export type TokenPaths = {
  tokensPath: string;
  cssPath: string;
};

export function defaultThemeDir(cwd: string): string {
  return existsSync(join(cwd, 'src')) ? join(cwd, 'src', 'theme') : join(cwd, 'theme');
}

export function defaultTokenPaths(cwd: string): TokenPaths {
  const dir = defaultThemeDir(cwd);
  return {
    tokensPath: join(dir, 'tokens.ts'),
    cssPath: join(dir, 'tokens.css'),
  };
}

/** Suggest a CSS path beside a tokens file (same basename, .css). */
export function suggestCssPath(tokensPath: string): string {
  const ext = extname(tokensPath);
  if (ext) {
    return tokensPath.slice(0, -ext.length) + '.css';
  }
  return `${tokensPath}.css`;
}

export function resolvePathArg(cwd: string, input: string): string {
  return resolve(cwd, input.trim());
}

export function displayPath(cwd: string, absolutePath: string): string {
  const rel = relative(cwd, absolutePath);
  return rel.startsWith('..') ? absolutePath : rel || '.';
}

/** Resolve paths for `build` (0 = defaults, 2 = custom). */
export function resolveTokenPaths(cwd: string, args: string[]): TokenPaths {
  if (args.length === 0) {
    return defaultTokenPaths(cwd);
  }

  if (args.length === 2) {
    const [tokensArg, cssArg] = args;
    if (tokensArg == null || cssArg == null) {
      throw new Error('Expected tokens and css paths');
    }
    return {
      tokensPath: resolve(cwd, tokensArg),
      cssPath: resolve(cwd, cssArg),
    };
  }

  throw new Error(
    'Expected 0 or 2 path arguments: [tokens.ts] [tokens.css]\n' +
      '  npx define-tokens build\n' +
      '  npx define-tokens build ./path/to/tokens.ts ./path/to/tokens.css',
  );
}
