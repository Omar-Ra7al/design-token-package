import { cssVariableName } from './categories';
import type {
  ColorCategory,
  DefineTokensConfig,
  ResolvedTheme,
  SelectorStrategy,
  ThemeOverride,
  TokenCategory,
  TokenSet,
  TokensApi,
} from './types';

/** Only tokens in this category may carry an opacity step. */
const COLOR_CATEGORY: ColorCategory = 'color';

/** Where a CSS variable came from, so refs can be traced back to a category. */
type TokenOrigin = { category: TokenCategory; name: string };

function categoriesOf(...sets: TokenSet[]): TokenCategory[] {
  return [...new Set(sets.flatMap((set) => Object.keys(set)))] as TokenCategory[];
}

/**
 * Builds a complete token set from the base tokens and a theme's overrides.
 *
 * This is the theme's effective value map, used by `themes` and `get()`. The
 * generated CSS stays narrower: it emits only what a theme declares, and lets
 * the rest inherit from `:root`.
 *
 * Each category is rebuilt as a new object, so themes never alias the base
 * tokens or each other, and a theme may add token names, or whole categories,
 * that the base does not have.
 */
function resolveTokenSet(base: TokenSet, override: ThemeOverride = {}): TokenSet {
  const resolved: TokenSet = {};

  for (const category of categoriesOf(base, override)) {
    resolved[category] = { ...base[category], ...override[category] };
  }

  return resolved;
}

/** Names each token after its category: `fontWeight.bold` → `font-weight-bold`. */
function toCssVariables(tokens: TokenSet): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const category of categoriesOf(tokens)) {
    for (const [name, value] of Object.entries(tokens[category] ?? {})) {
      variables[cssVariableName(category, name)] = value;
    }
  }

  return variables;
}

/**
 * Indexes every token by the CSS variable it emits, so a ref like `"primary"`
 * can be traced back to the category it came from.
 *
 * Because `color` and `custom` are unprefixed, two categories can end up
 * claiming one variable. That is a config error rather than something to
 * resolve silently: the loser would be overwritten in the stylesheet.
 */
function indexTokenOrigins(sets: TokenSet[]): Map<string, TokenOrigin> {
  const origins = new Map<string, TokenOrigin>();

  for (const set of sets) {
    for (const category of categoriesOf(set)) {
      for (const name of Object.keys(set[category] ?? {})) {
        const path = cssVariableName(category, name);
        const claimed = origins.get(path);

        if (claimed && claimed.category !== category) {
          throw new Error(
            `Both "${claimed.category}.${claimed.name}" and "${category}.${name}" compile to "--${path}". Rename one of them.`,
          );
        }

        origins.set(path, { category, name });
      }
    }
  }

  return origins;
}

/** Returns a selector for a theme based on the strategy. */
function selectorFor(strategy: SelectorStrategy, theme: string): string {
  if (strategy === 'class') {
    return `.${theme}`;
  }

  if (strategy === 'id') {
    return `#${theme}`;
  }

  if (strategy.startsWith('data-')) {
    return `[${strategy}="${theme}"]`;
  }

  throw new Error(
    `Invalid selector "${strategy}". Use "class", "id", or a "data-*" attribute name.`,
  );
}

/** Serializes CSS variables into the body of a rule. */
function serializeCssVariables(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `--${name}:${value}`)
    .join(';');
}

/**
 * Parses a token reference into a path and optional opacity step.
 *
 * Whether a ref may carry opacity is decided by the category it was declared
 * under, not by the shape of its name, since an unprefixed `"primary"` says
 * nothing about being a color on its own.
 */
function parseTokenRef(
  ref: string,
  origins: Map<string, TokenOrigin>,
): { path: string; opacity?: number } {
  const match = ref.match(/^(.+)\/(\d+)$/);
  const path = match?.[1];
  const opacityRaw = match?.[2];

  if (path == null || opacityRaw == null) {
    return { path: ref };
  }

  const opacity = Number(opacityRaw);

  if (!Number.isInteger(opacity) || opacity < 0 || opacity > 100) {
    throw new Error(`Invalid opacity "${opacityRaw}" in token ref "${ref}"`);
  }

  const origin = origins.get(path);

  if (!origin) {
    throw new Error(`Unknown token "${path}" in token ref "${ref}"`);
  }

  if (origin.category !== COLOR_CATEGORY) {
    throw new Error(
      `Opacity is only supported for "${COLOR_CATEGORY}" tokens, because it compiles to color-mix(); "${ref}" is a "${origin.category}" token.`,
    );
  }

  return { path, opacity };
}

/** Mixes a color with an opacity step to create a transparent variant. */
function withOpacity(color: string, opacity: number): string {
  return `color-mix(in oklch, ${color} ${opacity}%, transparent)`;
}

/**
 * Creates a type-safe design token system from base tokens and theme overrides.
 *
 * `tokens` holds the default values; each theme lists only what it changes, and
 * the theme name becomes the selector value for the configured strategy.
 * Categories come from a fixed Tailwind-compatible set, plus `custom` for
 * anything outside it, while the token names inside them are yours to choose.
 *
 * `color` and `custom` tokens emit bare CSS variables (`--primary`), so the
 * output matches what shadcn/ui-style codebases already expect; every other
 * category keeps its Tailwind namespace (`--spacing-md`).
 *
 * Set `tailwind.generateThemeInline` to emit a separate `@theme inline` bridge
 * via `theme()`, so bare colors map into Tailwind utilities (`bg-primary`).
 *
 * @param config - Selector strategy, optional Tailwind options, base tokens, and theme overrides.
 *
 * @example
 * ```ts
 * const tokens = defineTokens({
 *   selector: "class",
 *   tailwind: { generateThemeInline: true },
 *   tokens: {
 *     color: { primary: "#000", background: "#fff" },
 *   },
 *   themes: {
 *     light: {},
 *     dark: { color: { primary: "#fff", background: "#000" } },
 *   },
 * });
 *
 * tokens.css();
 * // ":root{--primary:#000;--background:#fff}
 * //  .light{}
 * //  .dark{--primary:#fff;--background:#000}"
 *
 * tokens.theme();
 * // "@theme inline{--color-background:var(--background);--color-primary:var(--primary)}"
 * // (+ --spacing-*, --radius-*, … when those categories are present; never custom)
 * ```
 */
export function defineTokens<
  TTokens extends TokenSet,
  TThemes extends Record<string, ThemeOverride>,
>({
  selector,
  tailwind,
  tokens,
  themes,
}: DefineTokensConfig<TTokens, TThemes>): TokensApi<TTokens, TThemes> {
  type ThemeName = keyof TThemes & string;

  const generateThemeInline = tailwind?.generateThemeInline === true;
  const themeNames = Object.keys(themes) as ThemeName[];
  const resolvedThemes = {} as { [K in keyof TThemes]: ResolvedTheme<TTokens, TThemes[K]> };
  const themeVariables: Record<string, Record<string, string>> = {};

  const origins = indexTokenOrigins([tokens, ...themeNames.map((name) => themes[name] ?? {})]);
  const baseVariables = toCssVariables(tokens);
  const rules = [`:root{${serializeCssVariables(baseVariables)}}`];

  for (const name of themeNames) {
    const override = themes[name] ?? {};
    const resolved = resolveTokenSet(tokens, override);

    resolvedThemes[name] = resolved as ResolvedTheme<TTokens, TThemes[ThemeName]>;
    themeVariables[name] = toCssVariables(resolved);
    rules.push(
      `${selectorFor(selector, name)}{${serializeCssVariables(toCssVariables(override))}}`,
    );
  }

  const themeInlineEntries = [...origins.entries()]
    .filter(([, origin]) => origin.category !== 'custom')
    .map(([path, origin]) => {
      const themeName = origin.category === COLOR_CATEGORY ? `color-${path}` : path;
      return `--${themeName}:var(--${path})`;
    })
    .sort();

  /**
   * Gets the resolved value of a token in a specific theme.
   *
   * A ref is the token's CSS variable name without the `--`: `color.primary` →
   * `"primary"`, `spacing.md` → `"spacing-md"`. Color tokens also take a
   * Tailwind-style opacity step, as in `"primary/50"`.
   *
   * @param theme - The theme to read from.
   * @param ref - Token reference, plus an opacity step for color tokens.
   */
  function get(theme: ThemeName, ref: string): string {
    const { path, opacity } = parseTokenRef(ref, origins);
    const value = themeVariables[theme]?.[path];

    if (value === undefined) {
      throw new Error(`Unknown token "${theme}.${path}"`);
    }

    return opacity == null ? value : withOpacity(value, opacity);
  }

  /**
   * Returns a CSS `var()` reference for a token, so it tracks the active theme.
   *
   * @example
   * ```ts
   * tokens.var("spacing-md");
   * // "var(--spacing-md)"
   *
   * tokens.var("primary/50");
   * // "color-mix(in oklch, var(--primary) 50%, transparent)"
   * ```
   */
  function cssVar(ref: string): string {
    const { path, opacity } = parseTokenRef(ref, origins);
    const variable = `var(--${path})`;

    return opacity == null ? variable : withOpacity(variable, opacity);
  }

  /**
   * Generates the stylesheet: the base tokens on `:root`, then one rule per
   * theme holding only the tokens that theme declares.
   *
   * The `:root` rule comes first, so it defines every base token and the theme
   * rules override it. Anything a theme leaves out is not repeated; it inherits
   * from `:root` instead, which keeps the output small and means a theme that
   * only styles colors never restates unrelated categories like spacing.
   *
   * Never includes `@theme` — use `theme()` for the Tailwind bridge.
   */
  function css(): string {
    return rules.join('');
  }

  /**
   * Tailwind v4 `@theme inline` bridge so utilities pick up your tokens.
   *
   * Only runs when `tailwind.generateThemeInline` is `true`. Colors are remapped
   * into Tailwind's color namespace (`--color-primary: var(--primary)`); every
   * other Tailwind category is registered in place
   * (`--spacing-md: var(--spacing-md)`). `custom` is skipped — it has no
   * Tailwind namespace.
   *
   * Put this in a CSS file Tailwind compiles (after `@import "tailwindcss"`).
   * Do not inject it at runtime via `TokenSheet` — Tailwind never sees it there.
   */
  function theme(): string {
    if (!generateThemeInline || themeInlineEntries.length === 0) {
      return '';
    }

    return `@theme inline{${themeInlineEntries.join(';')}}`;
  }

  return {
    themes: resolvedThemes,
    themeNames,
    get,
    var: cssVar,
    css,
    theme,
  };
}
