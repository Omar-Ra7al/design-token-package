#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cac } from 'cac';
import { runBuild } from './build';
import { runInit } from './init';
import { resolveTokenPaths } from './paths';

function packageJson(): { name: string; version: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/cli/index.js → package root
  const root = join(here, '..', '..');
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  };
}

const pkg = packageJson();
const cli = cac('design-tokens');

cli
  .command('init', 'Scaffold tokens via interactive steps')
  .action(async () => {
    const cwd = process.cwd();

    try {
      const code = await runInit({
        cwd,
        packageName: pkg.name,
      });
      process.exitCode = code;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

cli
  .command('build [tokens] [css]', 'Generate CSS from your tokens file')
  .action(async (tokens?: string, css?: string) => {
    const cwd = process.cwd();
    const args = [tokens, css].filter((v): v is string => v != null && v !== '');

    try {
      const paths = resolveTokenPaths(cwd, args);
      const code = await runBuild({ cwd, paths });
      process.exitCode = code;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  });

cli.help();
cli.version(pkg.version);
cli.parse();
