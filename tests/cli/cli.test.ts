import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBuild } from '../../src/cli/build';
import { runInit } from '../../src/cli/init';
import { defaultThemeDir, resolveTokenPaths } from '../../src/cli/paths';
import { emptyCssStub, tokensScaffold } from '../../src/cli/scaffold';

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'design-tokens-cli-'));
}

const roots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveTokenPaths', () => {
  it('defaults to src/theme when src exists', () => {
    const root = tempRoot();
    roots.push(root);
    mkdirSync(join(root, 'src'));

    const paths = resolveTokenPaths(root, []);
    expect(paths.tokensPath).toBe(join(root, 'src', 'theme', 'tokens.ts'));
    expect(paths.cssPath).toBe(join(root, 'src', 'theme', 'tokens.css'));
    expect(defaultThemeDir(root)).toBe(join(root, 'src', 'theme'));
  });

  it('defaults to theme at root when src is missing', () => {
    const root = tempRoot();
    roots.push(root);

    const paths = resolveTokenPaths(root, []);
    expect(paths.tokensPath).toBe(join(root, 'theme', 'tokens.ts'));
    expect(paths.cssPath).toBe(join(root, 'theme', 'tokens.css'));
  });

  it('accepts custom tokens and css paths', () => {
    const root = tempRoot();
    roots.push(root);

    const paths = resolveTokenPaths(root, [
      './src/design-system/theme.ts',
      './src/design-system/theme.css',
    ]);

    expect(paths.tokensPath).toBe(join(root, 'src', 'design-system', 'theme.ts'));
    expect(paths.cssPath).toBe(join(root, 'src', 'design-system', 'theme.css'));
  });

  it('rejects a single path argument', () => {
    const root = tempRoot();
    roots.push(root);
    expect(() => resolveTokenPaths(root, ['./only.ts'])).toThrow(/0 or 2 path/);
  });
});

describe('runInit', () => {
  it('creates scaffold tokens and empty css stub', async () => {
    const root = tempRoot();
    roots.push(root);
    mkdirSync(join(root, 'src'));
    const paths = resolveTokenPaths(root, []);

    const code = await runInit({
      cwd: root,
      paths,
      packageName: 'design-token-package',
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe(
      tokensScaffold('design-token-package'),
    );
    expect(readFileSync(paths.cssPath, 'utf8')).toBe(emptyCssStub());
  });

  it('leaves unrelated files untouched', async () => {
    const root = tempRoot();
    roots.push(root);
    const themeDir = join(root, 'theme');
    mkdirSync(themeDir, { recursive: true });
    const unrelated = join(themeDir, 'notes.md');
    writeFileSync(unrelated, 'keep me', 'utf8');

    const paths = resolveTokenPaths(root, []);
    await runInit({
      cwd: root,
      paths,
      packageName: 'design-token-package',
    });

    expect(readFileSync(unrelated, 'utf8')).toBe('keep me');
    expect(existsSync(paths.tokensPath)).toBe(true);
    expect(existsSync(paths.cssPath)).toBe(true);
  });

  it('create-missing only writes absent files', async () => {
    const root = tempRoot();
    roots.push(root);
    mkdirSync(join(root, 'src'));
    const paths = resolveTokenPaths(root, []);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'existing-tokens', 'utf8');

    const code = await runInit({
      cwd: root,
      paths,
      packageName: 'design-token-package',
      chooseConflict: async () => 'create-missing',
    });

    expect(code).toBe(0);
    expect(readFileSync(paths.tokensPath, 'utf8')).toBe('existing-tokens');
    expect(readFileSync(paths.cssPath, 'utf8')).toBe(emptyCssStub());
  });

  it('overwrite rewrites both files', async () => {
    const root = tempRoot();
    roots.push(root);
    mkdirSync(join(root, 'src'));
    const paths = resolveTokenPaths(root, []);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'old-tokens', 'utf8');
    writeFileSync(paths.cssPath, 'old-css', 'utf8');

    const code = await runInit({
      cwd: root,
      paths,
      packageName: 'design-token-package',
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
    roots.push(root);
    mkdirSync(join(root, 'src'));
    const paths = resolveTokenPaths(root, []);
    mkdirSync(join(root, 'src', 'theme'), { recursive: true });
    writeFileSync(paths.tokensPath, 'old-tokens', 'utf8');

    const code = await runInit({
      cwd: root,
      paths,
      packageName: 'design-token-package',
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
    roots.push(root);
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
    expect(readFileSync(cssPath, 'utf8')).toBe(
      ':root{--primary:red}.dark{--primary:white}\n',
    );
  });

  it('fails when tokens file is missing', async () => {
    const root = tempRoot();
    roots.push(root);
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
    roots.push(root);
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
