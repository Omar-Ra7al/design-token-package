import { TOKEN_CATEGORIES } from './categories';
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

function categoriesOf(...sets: TokenSet[]): TokenCategory[] {
  return [...new Set(sets.flatMap((set) => Object.keys(set)))] as TokenCategory[];
}

/**
 * Builds a complete token set from the base tokens and a theme's overrides.
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

/** Names each token after its Tailwind namespace: `fontWeight.bold` → `font-weight-bold`. */
function toCssVariables(tokens: TokenSet): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const category of categoriesOf(tokens)) {
    for (const [name, value] of Object.entries(tokens[category] ?? {})) {
      variables[`${TOKEN_CATEGORIES[category]}-${name}`] = value;
    }
  }

  return variables;
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

/** Parses a token reference into a path and optional opacity step. */
function parseTokenRef(ref: string): { path: string; opacity?: number } {
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

  if (!path.startsWith(`${COLOR_CATEGORY}-`)) {
    throw new Error(
      `Opacity is only supported for "${COLOR_CATEGORY}" tokens, because it compiles to color-mix(); "${ref}" is not a color token.`,
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
 * Categories come from a fixed Tailwind-compatible set, while the token names
 * inside them are yours to choose.
 *
 * @param config - Selector strategy, base tokens, and theme overrides.
 *
 * @example
 * ```ts
 * const tokens = defineTokens({
 *   selector: "class",
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
 * // ":root{--color-primary:#000;--color-background:#fff}
 * //  .light{--color-primary:#000;--color-background:#fff}
 * //  .dark{--color-primary:#fff;--color-background:#000}"
 * ```
 */
export function defineTokens<
  TTokens extends TokenSet,
  TThemes extends Record<string, ThemeOverride>,
>({ selector, tokens, themes }: DefineTokensConfig<TTokens, TThemes>): TokensApi<TTokens, TThemes> {
  type ThemeName = keyof TThemes & string;

  const themeNames = Object.keys(themes) as ThemeName[];
  const resolvedThemes = {} as { [K in keyof TThemes]: ResolvedTheme<TTokens, TThemes[K]> };
  const themeVariables: Record<string, Record<string, string>> = {};

  const baseVariables = toCssVariables(tokens);
  const rules = [`:root{${serializeCssVariables(baseVariables)}}`];

  for (const name of themeNames) {
    const resolved = resolveTokenSet(tokens, themes[name]);
    const variables = toCssVariables(resolved);

    resolvedThemes[name] = resolved as ResolvedTheme<TTokens, TThemes[ThemeName]>;
    themeVariables[name] = variables;
    rules.push(`${selectorFor(selector, name)}{${serializeCssVariables(variables)}}`);
  }

  /**
   * Gets the resolved value of a token in a specific theme.
   *
   * Token refs join the category namespace and the token name
   * (`color.primary` → `"color-primary"`). Color tokens also take a
   * Tailwind-style opacity step, as in `"color-primary/50"`.
   *
   * @param theme - The theme to read from.
   * @param ref - Token reference, plus an opacity step for color tokens.
   */
  function get(theme: ThemeName, ref: string): string {
    const { path, opacity } = parseTokenRef(ref);
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
   * tokens.var("color-primary/50");
   * // "color-mix(in oklch, var(--color-primary) 50%, transparent)"
   * ```
   */
  function cssVar(ref: string): string {
    const { path, opacity } = parseTokenRef(ref);
    const variable = `var(--${path})`;

    return opacity == null ? variable : withOpacity(variable, opacity);
  }

  /**
   * Generates the stylesheet: the base tokens on `:root`, then one complete
   * rule per theme.
   *
   * The `:root` rule keeps every token defined when no theme selector is
   * active, and comes first so the theme rules override it. Each theme rule
   * carries the full token set, so switching selectors swaps the whole theme.
   */
  function css(): string {
    return rules.join('');
  }

  return {
    themes: resolvedThemes,
    themeNames,
    get,
    var: cssVar,
    css,
  };
}
