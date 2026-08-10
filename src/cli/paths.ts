import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type TokenPaths = {
  tokensPath: string;
  cssPath: string;
};

export function defaultThemeDir(cwd: string): string {
  return existsSync(join(cwd, 'src')) ? join(cwd, 'src', 'theme') : join(cwd, 'theme');
}

export function resolveTokenPaths(cwd: string, args: string[]): TokenPaths {
  if (args.length === 0) {
    const dir = defaultThemeDir(cwd);
    return {
      tokensPath: join(dir, 'tokens.ts'),
      cssPath: join(dir, 'tokens.css'),
    };
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
      '  npx design-tokens init\n' +
      '  npx design-tokens init ./path/to/tokens.ts ./path/to/tokens.css\n' +
      '  npx design-tokens build\n' +
      '  npx design-tokens build ./path/to/tokens.ts ./path/to/tokens.css',
  );
}
