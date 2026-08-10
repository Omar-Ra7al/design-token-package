import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import * as p from '@clack/prompts';
import { emptyCssStub, tokensScaffold } from './scaffold';
import type { TokenPaths } from './paths';

export type UsageMode = 'css' | 'react';
export type ConflictChoice = 'create-missing' | 'overwrite' | 'exit';

export type ConflictContext = {
  hasMissing: boolean;
};

export type InitOptions = {
  cwd: string;
  paths: TokenPaths;
  packageName: string;
  /** Injected for tests; defaults to clack select. */
  chooseUsage?: () => Promise<UsageMode | 'exit'>;
  /** Injected for tests; defaults to clack select. */
  chooseConflict?: (ctx: ConflictContext) => Promise<ConflictChoice>;
};

export function buildConflictOptions(hasMissing: boolean): Array<{
  value: ConflictChoice;
  label: string;
}> {
  const options: Array<{ value: ConflictChoice; label: string }> = [];

  if (hasMissing) {
    options.push({
      value: 'create-missing',
      label: 'Create missing files only',
    });
  }

  options.push(
    { value: 'overwrite', label: 'Overwrite existing token files' },
    { value: 'exit', label: 'Exit without changes' },
  );

  return options;
}

function displayPath(cwd: string, absolutePath: string): string {
  const rel = relative(cwd, absolutePath);
  return rel.startsWith('..') ? absolutePath : rel || '.';
}

function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

async function defaultChooseUsage(): Promise<UsageMode | 'exit'> {
  const choice = await p.select({
    message: 'How will you use your tokens?',
    options: [
      { value: 'css' as const, label: 'CSS file' },
      { value: 'react' as const, label: 'React / Next.js' },
    ],
  });

  if (p.isCancel(choice)) {
    p.cancel('Cancelled.');
    return 'exit';
  }

  return choice;
}

async function defaultChooseConflict(ctx: ConflictContext): Promise<ConflictChoice> {
  const choice = await p.select({
    message: 'Some token files already exist. What should we do?',
    options: buildConflictOptions(ctx.hasMissing),
  });

  if (p.isCancel(choice)) {
    p.cancel('Cancelled.');
    return 'exit';
  }

  return choice;
}

function printGuide(
  cwd: string,
  paths: TokenPaths,
  created: string[],
  mode: UsageMode,
  packageName: string,
): void {
  for (const file of created) {
    console.log(`✓ Created ${displayPath(cwd, file)}`);
  }

  if (created.length === 0) {
    console.log('Nothing to create.');
    return;
  }

  const tokensDisplay = displayPath(cwd, paths.tokensPath);

  if (mode === 'react') {
    console.log(`
Next:
  1. Define your tokens in ${tokensDisplay}
  2. Mount <TokenSheet tokens={tokens} /> from ${packageName}/react
     (or ${packageName}/next in App Router)
`);
    return;
  }

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
  const chooseUsage = options.chooseUsage ?? defaultChooseUsage;
  const chooseConflict = options.chooseConflict ?? defaultChooseConflict;

  const usage = await chooseUsage();
  if (usage === 'exit') {
    return 0;
  }

  const wantsCss = usage === 'css';
  const tokensExists = existsSync(paths.tokensPath);
  const cssExists = wantsCss && existsSync(paths.cssPath);

  const relevantExists = tokensExists || cssExists;
  const hasMissing =
    !tokensExists || (wantsCss && !existsSync(paths.cssPath));

  let writeTokens = true;
  let writeCss = wantsCss;

  if (relevantExists) {
    const choice = await chooseConflict({ hasMissing });

    if (choice === 'exit') {
      return 0;
    }

    if (choice === 'create-missing') {
      writeTokens = !tokensExists;
      writeCss = wantsCss && !existsSync(paths.cssPath);

      if (!writeTokens && !writeCss) {
        console.log('Nothing to create — relevant files already exist.');
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

  printGuide(cwd, paths, created, usage, packageName);
  return 0;
}
