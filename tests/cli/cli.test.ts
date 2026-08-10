import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBuild } from '../../src/cli/build';
import { buildConflictOptions, runInit } from '../../src/cli/init';
import {
  defaultThemeDir,
  defaultTokenPaths,
  resolveTokenPaths,
  suggestCssPath,
} from '../../src/cli/paths';
import { emptyCssStub, tokensScaffold } from '../../src/cli/scaffold';

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'design-tokens-cli-'));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveTokenPaths', () => {
  it('defaults to src/theme when src exists', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));

    const paths = resolveTokenPaths(root, []);
    expect(paths.tokensPath).toBe(join(root, 'src', 'theme', 'tokens.ts'));
    expect(paths.cssPath).toBe(join(root, 'src', 'theme', 'tokens.css'));
    expect(defaultThemeDir(root)).toBe(join(root, 'src', 'theme'));
  });

  it('defaults to theme at root when src is missing', () => {
    const root = tempRoot();

    const paths = resolveTokenPaths(root, []);
    expect(paths.tokensPath).toBe(join(root, 'theme', 'tokens.ts'));
    expect(paths.cssPath).toBe(join(root, 'theme', 'tokens.css'));
  });

  it('accepts custom tokens and css paths', () => {
    const root = tempRoot();

    const paths = resolveTokenPaths(root, [
      './src/design-system/theme.ts',
      './src/design-system/theme.css',
    ]);

    expect(paths.tokensPath).toBe(join(root, 'src', 'design-system', 'theme.ts'));
    expect(paths.cssPath).toBe(join(root, 'src', 'design-system', 'theme.css'));
  });

  it('rejects a single path argument', () => {
    const root = tempRoot();
    expect(() => resolveTokenPaths(root, ['./only.ts'])).toThrow(/0 or 2 path/);
  });
});

describe('suggestCssPath', () => {
  it('replaces the tokens extension with .css', () => {
    expect(suggestCssPath('/app/src/design-system/theme.ts')).toBe(
      '/app/src/design-system/theme.css',
    );
  });
});

describe('buildConflictOptions', () => {
  it('includes create-missing only when files are missing', () => {
    expect(buildConflictOptions(true).map((o) => o.value)).toEqual([
      'create-missing',
      'overwrite',
      'exit',
    ]);
    expect(buildConflictOptions(false).map((o) => o.value)).toEqual([
      'overwrite',
      'exit',
    ]);
  });
});

describe('runInit', () => {
  it('css mode with defaults creates scaffold tokens and empty css stub', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));
    const paths = defaultTokenPaths(root);

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'defaults',
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe(
      tokensScaffold('design-token-package'),
    );
    expect(readFileSync(paths.cssPath, 'utf8')).toBe(emptyCssStub());
  });

  it('react mode with defaults creates tokens only', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));
    const paths = defaultTokenPaths(root);

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'react',
      choosePathMode: async () => 'defaults',
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe(
      tokensScaffold('design-token-package'),
    );
    expect(existsSync(paths.cssPath)).toBe(false);
  });

  it('custom css paths ask for tokens and css', async () => {
    const root = tempRoot();
    const tokensPath = join(root, 'src', 'design-system', 'theme.ts');
    const cssPath = join(root, 'src', 'design-system', 'theme.css');

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'custom',
      chooseCustomPaths: async () => ({ tokensPath, cssPath }),
    });

    expect(code).toBe(0);
    expect(readFileSync(tokensPath, 'utf8')).toBe(tokensScaffold('design-token-package'));
    expect(readFileSync(cssPath, 'utf8')).toBe(emptyCssStub());
  });

  it('custom react paths only create tokens', async () => {
    const root = tempRoot();
    const tokensPath = join(root, 'src', 'design-system', 'theme.ts');
    const cssPath = join(root, 'src', 'design-system', 'theme.css');

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'react',
      choosePathMode: async () => 'custom',
      chooseCustomPaths: async () => ({ tokensPath, cssPath }),
    });

    expect(code).toBe(0);
    expect(existsSync(tokensPath)).toBe(true);
    expect(existsSync(cssPath)).toBe(false);
  });

  it('react mode leaves existing css untouched', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    const paths = defaultTokenPaths(root);
    writeFileSync(paths.cssPath, 'existing-css', 'utf8');

    await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'react',
      choosePathMode: async () => 'defaults',
    });

    expect(readFileSync(paths.cssPath, 'utf8')).toBe('existing-css');
    expect(existsSync(paths.tokensPath)).toBe(true);
  });

  it('leaves unrelated files untouched', async () => {
    const root = tempRoot();
    const themeDir = join(root, 'theme');
    mkdirSync(themeDir, { recursive: true });
    const unrelated = join(themeDir, 'notes.md');
    writeFileSync(unrelated, 'keep me', 'utf8');

    await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'defaults',
    });

    expect(readFileSync(unrelated, 'utf8')).toBe('keep me');
  });

  it('create-missing only writes absent files', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));
    const paths = defaultTokenPaths(root);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'existing-tokens', 'utf8');

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'defaults',
      chooseConflict: async (ctx) => {
        expect(ctx.hasMissing).toBe(true);
        return 'create-missing';
      },
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe('existing-tokens');
    expect(readFileSync(paths.cssPath, 'utf8')).toBe(emptyCssStub());
  });

  it('reports hasMissing false when both css-mode files exist', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));
    const paths = defaultTokenPaths(root);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'old-tokens', 'utf8');
    writeFileSync(paths.cssPath, 'old-css', 'utf8');

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'defaults',
      chooseConflict: async (ctx) => {
        expect(ctx.hasMissing).toBe(false);
        return 'exit';
      },
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe('old-tokens');
    expect(readFileSync(paths.cssPath, 'utf8')).toBe('old-css');
  });

  it('overwrite rewrites both files in css mode', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));
    const paths = defaultTokenPaths(root);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'old-tokens', 'utf8');
    writeFileSync(paths.cssPath, 'old-css', 'utf8');

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'defaults',
      chooseConflict: async () => 'overwrite',
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe(
      tokensScaffold('design-token-package'),
    );
    expect(readFileSync(paths.cssPath, 'utf8')).toBe(emptyCssStub());
  });

  it('exit leaves existing files unchanged', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'src'));
    const paths = defaultTokenPaths(root);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'old-tokens', 'utf8');

    const code = await runInit({
      cwd: root,
      packageName: 'design-token-package',
      chooseUsage: async () => 'css',
      choosePathMode: async () => 'defaults',
      chooseConflict: async () => 'exit',
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe('old-tokens');
    expect(existsSync(paths.cssPath)).toBe(false);
  });
});

describe('runBuild', () => {
  it('writes css from tokens.css()', async () => {
    const root = tempRoot();
    mkdirSync(join(root, 'theme'), { recursive: true });
    const tokensPath = join(root, 'theme', 'tokens.ts');
    const cssPath = join(root, 'theme', 'tokens.css');

    writeFileSync(
      tokensPath,
      `export const tokens = {
  css() {
    return ":root{--primary:red}.dark{--primary:white}";
  },
};
`,
      'utf8',
    );

    const code = await runBuild({
      cwd: root,
      paths: { tokensPath, cssPath },
    });

    expect(code).toBe(0);
    const written = readFileSync(cssPath, 'utf8');
    expect(written).toContain('DO NOT EDIT THIS FILE');
    expect(written).toContain('npx design-tokens build');
    expect(written).toContain('npx design-tokens build theme/tokens.ts theme/tokens.css');
    expect(written).toContain(':root{--primary:red}.dark{--primary:white}');
  });

  it('fails when tokens file is missing', async () => {
    const root = tempRoot();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const code = await runBuild({
      cwd: root,
      paths: {
        tokensPath: join(root, 'theme', 'tokens.ts'),
        cssPath: join(root, 'theme', 'tokens.css'),
      },
    });

    expect(code).toBe(1);
    expect(error).toHaveBeenCalled();
  });

  it('does not touch unrelated files when writing css', async () => {
    const root = tempRoot();
    const themeDir = join(root, 'theme');
    mkdirSync(themeDir, { recursive: true });
    const unrelated = join(themeDir, 'keep.txt');
    writeFileSync(unrelated, 'safe', 'utf8');

    const tokensPath = join(themeDir, 'tokens.ts');
    const cssPath = join(themeDir, 'tokens.css');
    writeFileSync(
      tokensPath,
      `export const tokens = { css() { return ":root{--x:1}"; } };\n`,
      'utf8',
    );

    await runBuild({ cwd: root, paths: { tokensPath, cssPath } });

    expect(readFileSync(unrelated, 'utf8')).toBe('safe');
  });
});
