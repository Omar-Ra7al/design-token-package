import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function preserveCliShebang(): Plugin {
  return {
    name: 'preserve-cli-shebang',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (chunk.fileName !== 'cli/index.js') continue;
        if (!chunk.code.startsWith('#!')) {
          chunk.code = `#!/usr/bin/env node\n${chunk.code}`;
        }
      }
    },
  };
}

const cliExternals = [
  'cac',
  'jiti',
  '@clack/prompts',
  /^node:/,
  'fs',
  'path',
  'url',
  'module',
  'os',
  'util',
  'process',
];

export default defineConfig({
  plugins: [
    preserveCliShebang(),
    dts({
      tsconfigPath: './tsconfig.build.json',
      entryRoot: 'src',
      include: ['src'],
      exclude: ['src/cli/**'],
    }),
  ],
  build: {
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'react/index': resolve(__dirname, 'src/react/index.ts'),
        'cli/index': resolve(__dirname, 'src/cli/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        ...cliExternals,
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
