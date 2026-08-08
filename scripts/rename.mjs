#!/usr/bin/env node

/**
 * Rename the package after copying this starter.
 *
 * Usage:
 *   node scripts/rename.mjs @scope/name "Short description"
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , name, description] = process.argv;

if (!name || !description) {
  console.error('Usage: node scripts/rename.mjs @scope/name "Short description"');
  process.exit(1);
}

if (!name.startsWith('@') || !name.includes('/')) {
  console.error('Package name must be scoped, e.g. @your-scope/my-package');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const previousName = '@Omar-Ra7al/design-token-package';

const packageJsonPath = resolve(root, 'package.json');
const readmePath = resolve(root, 'README.md');
const playgroundConfigPath = resolve(root, 'playground/vite.config.ts');
const playgroundAppPath = resolve(root, 'playground/src/App.tsx');
const tsconfigPath = resolve(root, 'tsconfig.json');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
packageJson.name = name;
packageJson.description = description;
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const replaceName = (filePath) => {
  const contents = readFileSync(filePath, 'utf8');
  writeFileSync(filePath, contents.replaceAll(previousName, name));
};

replaceName(readmePath);
replaceName(playgroundConfigPath);
replaceName(playgroundAppPath);
replaceName(resolve(root, 'playground/src/demoTokens.ts'));
replaceName(tsconfigPath);

console.log(`Updated package name to ${name}`);
console.log(`Updated description to "${description}"`);
