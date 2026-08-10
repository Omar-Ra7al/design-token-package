import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import * as p from '@clack/prompts';
import { emptyCssStub, tokensScaffold } from './scaffold';
import type { TokenPaths } from './paths';

export type InitOptions = {
  cwd: string;
  paths: TokenPaths;
  packageName: string;
  /** Injected for tests; defaults to clack select. */
  chooseConflict?: () => Promise<'create-missing' | 'overwrite' | 'exit'>;
};

function displayPath(cwd: string, absolutePath: string): string {
  const rel = relative(cwd, absolutePath);
  return rel.startsWith('..') ? absolutePath : rel || '.';
}

function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

async function defaultChooseConflict(): Promise<'create-missing' | 'overwrite' | 'exit'> {
  const choice = await p.select({
    message: 'Some token files already exist. What should we do?',
    options: [
      { value: 'create-missing' as const, label: 'Create missing files only' },
      { value: 'overwrite' as const, label: 'Overwrite existing token files' },
      { value: 'exit' as const, label: 'Exit without changes' },
    ],
  });

  if (p.isCancel(choice)) {
    p.cancel('Cancelled.');
    return 'exit';
  }

  return choice;
}

function printGuide(cwd: string, paths: TokenPaths, created: string[]): void {
  for (const file of created) {
    console.log(`✓ Created ${displayPath(cwd, file)}`);
  }

  if (created.length === 0) {
    console.log('Nothing to create.');
    return;
  }

  const tokensDisplay = displayPath(cwd, paths.tokensPath);
  const cssDisplay = displayPath(cwd, paths.cssPath);

  console.log(`
Next:
  1. Define your tokens in ${tokensDisplay}
  2. Run: npx design-tokens build
  3. Import ${cssDisplay} into your global stylesheet

Custom paths:
  npx design-tokens build ./path/to/tokens.ts ./path/to/tokens.css
`);
}

export async function runInit(options: InitOptions): Promise<number> {
  const { cwd, paths, packageName } = options;
  const chooseConflict = options.chooseConflict ?? defaultChooseConflict;

  const tokensExists = existsSync(paths.tokensPath);
  const cssExists = existsSync(paths.cssPath);
  const anyExists = tokensExists || cssExists;

  let writeTokens = true;
  let writeCss = true;

  if (anyExists) {
    const choice = await chooseConflict();

    if (choice === 'exit') {
      return 0;
    }

    if (choice === 'create-missing') {
      writeTokens = !tokensExists;
      writeCss = !cssExists;

      if (!writeTokens && !writeCss) {
        console.log('Nothing to create — both files already exist.');
        return 0;
      }
    }
  }

  const created: string[] = [];

  if (writeTokens) {
    ensureParentDir(paths.tokensPath);
    writeFileSync(paths.tokensPath, tokensScaffold(packageName), 'utf8');
    created.push(paths.tokensPath);
  }

  if (writeCss) {
    ensureParentDir(paths.cssPath);
    writeFileSync(paths.cssPath, emptyCssStub(), 'utf8');
    created.push(paths.cssPath);
  }

  printGuide(cwd, paths, created);
  return 0;
}
