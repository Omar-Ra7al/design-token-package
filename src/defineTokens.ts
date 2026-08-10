import type {
  ColorCategory,
  DefineTokensConfig,
  ResolvedTheme,
  SelectorStrategy,
  ThemeOverride,
  TokenTree,
  TokensApi,
} from './types';

/** A theme override as seen by the runtime: every branch is optional. */
type OverrideTree = { [key: string]: string | OverrideTree | undefined };

/** Only tokens in this category may carry an opacity step. */
const COLOR_CATEGORY: ColorCategory = 'colors';

function isTokenGroup<TGroup extends object>(value: string | TGroup | undefined): value is TGroup {
  return typeof value === 'object' && value !== null;
}

/**
 * Builds a complete token tree from the base tokens and a theme's overrides.
 *
 * Groups are rebuilt as new objects, so themes never alias the base tokens or
 * each other, and a theme may introduce token names the base does not have.
 */
function resolveTokenTree(base: TokenTree, override: OverrideTree = {}): TokenTree {
  const resolved: TokenTree = {};

  for (const [key, value] of Object.entries(base)) {
    resolved[key] = isTokenGroup(value) ? resolveTokenTree(value) : value;
  }

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }

    const inherited = resolved[key];

    resolved[key] = isTokenGroup(value)
      ? resolveTokenTree(isTokenGroup(inherited) ? inherited : {}, value)
      : value;
  }

  return resolved;
}

/** Turns nested paths into dash-joined variable names: `colors.primary` → `colors-primary`. */
function flattenTokenTree(tree: TokenTree, prefix = ''): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}-${key}` : key;

    if (isTokenGroup(value)) {
      Object.assign(variables, flattenTokenTree(value, path));
    } else {
      variables[path] = value;
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

/** Serializes a token tree into a string of CSS variables. */
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
 *
 * @param config - Selector strategy, base tokens, and theme overrides.
 *
 * @example
 * ```ts
 * const tokens = defineTokens({
 *   selector: "class",
 *   tokens: {
 *     colors: { primary: "#000", background: "#fff" },
 *   },
 *   themes: {
 *     light: {},
 *     dark: { colors: { primary: "#fff", background: "#000" } },
 *   },
 * });
 *
 * tokens.css();
 * // ".light{--colors-primary:#000;--colors-background:#fff}
 * //  .dark{--colors-primary:#fff;--colors-background:#000}"
 * ```
 */
export function defineTokens<
  TTokens extends TokenTree,
  TThemes extends Record<string, ThemeOverride<TTokens>>,
>({ selector, tokens, themes }: DefineTokensConfig<TTokens, TThemes>): TokensApi<TTokens, TThemes> {
  type ThemeName = keyof TThemes & string;

  const themeNames = Object.keys(themes) as ThemeName[];
  const resolvedThemes = {} as { [K in keyof TThemes]: ResolvedTheme<TTokens, TThemes[K]> };
  const themeVariables: Record<string, Record<string, string>> = {};
  const rules: string[] = [];

  for (const name of themeNames) {
    const tree = resolveTokenTree(tokens, themes[name]);
    const variables = flattenTokenTree(tree);

    resolvedThemes[name] = tree as ResolvedTheme<TTokens, TThemes[ThemeName]>;
    themeVariables[name] = variables;
    rules.push(`${selectorFor(selector, name)}{${serializeCssVariables(variables)}}`);
  }

  /**
   * Gets the resolved value of a token in a specific theme.
   *
   * Token refs are dash-joined paths (`colors.primary` → `"colors-primary"`).
   * Color tokens also take a Tailwind-style opacity step, as in `"colors-primary/50"`.
   *
   * @param theme - The theme to read from.
   * @param ref - Token path, plus an opacity step for color tokens.
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
   * tokens.var("colors-primary/50");
   * // "color-mix(in oklch, var(--colors-primary) 50%, transparent)"
   * ```
   */
  function cssVar(ref: string): string {
    const { path, opacity } = parseTokenRef(ref);
    const variable = `var(--${path})`;

    return opacity == null ? variable : withOpacity(variable, opacity);
  }

  /**
   * Generates the stylesheet: one complete rule per theme.
   *
   * Every rule carries the full token set, so switching selectors swaps themes
   * without relying on a base rule staying matched.
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
