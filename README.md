# Design token toolkit

Typed TypeScript design tokens that compile to CSS custom properties per theme. The **core** API works with any JS/TS stack; an optional **React** entry injects the stylesheet.

```
defineTokens({ selector, tokens, themes })
    → TokensApi { get, var, css, themes, themeNames }
    → tokens.css() anywhere, or <TokenSheet tokens={…} /> in React
    → selector-based theme switching (.dark, #dark, [data-theme="dark"]) on <html>
```

## Install

```bash
npm install design-token-package
```

Core needs no React. For `TokenSheet`, install peer deps `react` and `react-dom` (`^18` or `^19`).

## CLI

Scaffold tokens interactively, then generate CSS when needed:

```bash
npx design-tokens init
npx design-tokens build
```

`init` walks you through steps (no path arguments):

1. **How will you use your tokens?** — CSS file, or React / Next.js
2. **Where should we put files?** — defaults, or custom paths
3. **Custom paths** (if chosen) — tokens file; CSS file only in CSS mode (suggested beside the tokens file)
4. **Conflicts** — create missing / overwrite / exit when relevant files already exist

Defaults:

- If `src/` exists → `src/theme/tokens.ts` (+ `tokens.css` in CSS mode)
- Otherwise → `theme/tokens.ts` (+ `tokens.css` in CSS mode)

- **CSS file** — creates `tokens.ts` + an empty `tokens.css` stub; later run `build` and import the CSS
- **React / Next.js** — creates `tokens.ts` only; mount `<TokenSheet />` from `/react` or `/next` (no CSS file)

`build` still accepts optional paths:

```bash
npx design-tokens build
npx design-tokens build ./src/design-system/theme.ts ./src/design-system/theme.css
```

`init` only creates/updates its own files — anything else in the folder is left alone. **Create missing files only** appears when at least one relevant file is still missing.

After a successful CSS-mode init:

```text
✓ Created src/theme/tokens.ts
✓ Created src/theme/tokens.css

Next:
  1. Define your tokens in src/theme/tokens.ts
  2. Run: npx design-tokens build
  3. Import src/theme/tokens.css into your global stylesheet

Custom paths:
  npx design-tokens build ./path/to/tokens.ts ./path/to/tokens.css
```

The initial CSS file is a comment stub. Real CSS comes from `build`, which calls your exported `tokens.css()`.

## Quick start

### Core (any framework)

```ts
import { defineTokens } from '@Omar-Ra7al/design-token-package';
import type { TokensApi, TokenRef } from '@Omar-Ra7al/design-token-package';

export const tokens = defineTokens({
  selector: 'class',

  tokens: {
    colors: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0 0)',
      primary: 'oklch(0% 0 0)',
    },

    radius: {
      md: '0.625rem',
    },
  },

  themes: {
    light: {},

    dark: {
      colors: {
        background: 'oklch(0% 0 0)',
        foreground: 'oklch(1 0 0)',
        primary: 'oklch(1 0 0)',
      },
    },
  },
});

// Inject however your stack prefers, e.g. a <style> tag or a CSS file:
// document.head.insertAdjacentHTML("beforeend", `<style>${tokens.css()}</style>`);
```

### Base tokens and themes

`tokens` holds the default values. A theme lists only what it changes, and everything else is inherited:

```css
.light {
  --colors-background: oklch(1 0 0);
  --colors-primary: oklch(0% 0 0);
  --radius-md: 0.625rem;
}
.dark {
  --colors-background: oklch(0% 0 0);
  --colors-primary: oklch(1 0 0);
  --radius-md: 0.625rem;
}
```

Every rule carries the complete token set, so swapping the selector on `<html>` fully swaps the theme. Nested paths flatten into dash-joined custom properties: `colors.primary` → `--colors-primary`, `typography.fontFamily.sans` → `--typography-fontFamily-sans`.

The theme name is the selector value:

| `selector`     | Generated rules                                    |
| -------------- | -------------------------------------------------- |
| `'class'`      | `.light{…}` `.dark{…}`                             |
| `'id'`         | `#light{…}` `#dark{…}`                             |
| `'data-theme'` | `[data-theme="light"]{…}` `[data-theme="dark"]{…}` |

Token categories autocomplete from the base `tokens`, while token names inside a category stay open, so a theme can add its own:

```ts
themes: {
  dark: {
    colors: { myCustomColor: '#123456' },
    spacing: { huge: '100px' },
  },
}
```

### React

```tsx
import { TokenSheet } from '@Omar-Ra7al/design-token-package/react';
import { tokens } from './tokens';

// In your root layout:
<TokenSheet tokens={tokens} />;
```

### Next.js

Same component via the Next entry:

```tsx
import { TokenSheet } from '@Omar-Ra7al/design-token-package/next';
import { tokens } from './tokens';

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <TokenSheet tokens={tokens} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Mount `TokenSheet` early (e.g. in `<head>` or the app root) so CSS variables exist before paint. Toggle themes by adding/removing class names on `<html>` (e.g. with `next-themes`); that is **not** bundled here.

## Public API

### Core (`@Omar-Ra7al/design-token-package`)

| Export         | Role                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineTokens` | Factory → `TokensApi`                                                                                                                                                                 |
| Types          | `DefineTokensConfig`, `SelectorStrategy`, `TokenTree`, `ThemeOverride`, `TokenGroupOverride`, `ResolvedTheme`, `TokenPath`, `TokenRef`, `ColorCategory`, `ColorTokenPath`, `TokensApi`, `TokenCssSource`, `OpacityScale` |

### React (`@Omar-Ra7al/design-token-package/react`)

| Export       | Role                                        |
| ------------ | ------------------------------------------- |
| `TokenSheet` | React component that injects `tokens.css()` |

### Next.js (`@Omar-Ra7al/design-token-package/next`)

| Export       | Role                                              |
| ------------ | ------------------------------------------------- |
| `TokenSheet` | Same component as `./react` (for Next.js imports) |

### `TokensApi`

| Member            | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `themes`          | Base tokens with each theme's overrides applied                    |
| `themeNames`      | Theme name list (handy for theme switchers)                        |
| `get(theme, ref)` | Resolved literal for a named theme                                 |
| `var(ref)`        | `var(--key)` or opacity `color-mix(...)` — tracks the active theme |
| `css()`           | Full stylesheet string (`.light{…}.dark{…}`)                       |

### Opacity refs

```ts
tokens.get('light', 'colors-primary/20');
// color-mix(in oklch, … 20%, transparent)

tokens.var('colors-primary/50');
// color-mix(in oklch, var(--colors-primary) 50%, transparent)
```

Types autocomplete the usual 0–100 steps of 5. Runtime accepts any integer 0–100.

Opacity compiles to `color-mix()`, so it is offered only for tokens in the `colors` category. Other categories autocomplete without the `/NN` step, and using one throws:

```ts
tokens.var('spacing-md'); // fine
tokens.var('spacing-md/20'); // type error, and throws at runtime
```

## Package formats

The published package is **ESM-only** (no CommonJS):

| Artifact            | Role                          |
| ------------------- | ----------------------------- |
| `dist/**/*.js`      | ESM runtime (`import`)        |
| `dist/**/*.d.ts`    | TypeScript / IDE autocomplete |
| `dist/cli/index.js` | CLI bin (ESM)                 |

Each public entry exposes `types` then `import` in `package.json` `exports`, so editors resolve autocomplete for TypeScript and JavaScript consumers.

| Entry                             | Import                       |
| --------------------------------- | ---------------------------- |
| Core (any framework / vanilla JS) | `design-token-package`       |
| React                             | `design-token-package/react` |
| Next.js                           | `design-token-package/next`  |

## Consuming in CSS / Tailwind

Map tokens into Tailwind v4 `@theme` (or use raw CSS variables) in your app stylesheet:

```css
@theme inline {
  --color-background: var(--colors-background);
  --color-foreground: var(--colors-foreground);
  --color-primary: var(--colors-primary);
  --radius-lg: var(--radius-md);
}
```

Or use raw vars:

```tsx
style={{ background: tokens.var("colors-background") }}
className="bg-[var(--colors-background)]"
```

## Local development

```bash
npm install
npm run dev        # playground (demo tokens live in playground/src/)
npm run test
npm run build
npm run pack:check
```

Published entry points are `.` (core), `./react`, and `./next` — each as ESM `.js` plus `.d.ts`. The concrete light/dark/ocean palette in `playground/` is a consumer demo and is **not** part of the package.

## Scripts

| Script                                      | Purpose                               |
| ------------------------------------------- | ------------------------------------- |
| `npm run dev`                               | Start the playground                  |
| `npm run build`                             | Build the library into `dist/`        |
| `npm run test` / `test:watch`               | Run tests                             |
| `npm run typecheck`                         | TypeScript check                      |
| `npm run lint` / `lint:fix`                 | ESLint                                |
| `npm run format` / `format:check`           | Prettier                              |
| `npm run pack:check`                        | Preview files that would be published |
| `npm run changeset` / `version` / `release` | Changesets publish flow               |

## Rename this package

```bash
node scripts/rename.mjs @your-scope/design-tokens "Typed design token toolkit"
```
