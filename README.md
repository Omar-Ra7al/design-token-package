# @your-scope/package-template

Lightweight starter for TypeScript/React npm packages, with a live playground for developing in the browser.

## Quick start

```bash
npm install
npm run dev
```

That opens a minimal React app in `playground/` that imports your package **source** from `src/`. Edit a component, hook, or util — save — and see it update immediately.

## Project structure

```text
src/                 # package implementation (published API via index.ts)
  components/
  hooks/
  utils/
  types/
  index.ts
playground/          # local React app for manual testing (not published)
tests/               # Vitest + React Testing Library
scripts/             # helpers (e.g. rename)
vite.config.ts       # library build
vitest.config.ts
```

Only symbols re-exported from `src/index.ts` are part of the public API.

## Create a new package from this starter

```bash
node scripts/rename.mjs @your-scope/my-package "What this package does"
```

Then replace the sample code in `src/`, keep exporting from `src/index.ts`, and use the playground while you build.

## Scripts

| Script                            | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `npm run dev`                     | Start the playground                  |
| `npm run build`                   | Build the library into `dist/`        |
| `npm run test` / `test:watch`     | Run tests                             |
| `npm run typecheck`               | TypeScript check                      |
| `npm run lint` / `lint:fix`       | ESLint                                |
| `npm run format` / `format:check` | Prettier                              |
| `npm run pack:check`              | Preview files that would be published |
| `npm run changeset`               | Record a version change               |
| `npm run version`                 | Apply Changesets version bumps        |
| `npm run release`                 | Build and publish with Changesets     |

## Build and publish

```bash
npm run build
npm run pack:check
npm run changeset
npm run version
npm run release
```

The published package includes `dist/`, `package.json`, `README.md`, and `LICENSE` only — not `playground/`, tests, or tooling config.
