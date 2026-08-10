import type { TOKEN_CATEGORIES } from './categories';

/** A token category, e.g. `"color"`, `"spacing"`, `"fontWeight"`. */
export type TokenCategory = keyof typeof TOKEN_CATEGORIES;

/** The CSS variable prefix a category emits, e.g. `fontWeight` → `"font-weight"`. */
export type CategoryPrefix<TCategory extends TokenCategory> = (typeof TOKEN_CATEGORIES)[TCategory];

/** One category's tokens: free-form names mapped to CSS values. */
export type TokenGroup = Record<string, string>;

/** A set of tokens. Categories are fixed; the names inside them are not. */
export type TokenSet = { [K in TokenCategory]?: TokenGroup };

/**
 * A theme: the same shape as the base tokens, with everything optional.
 *
 * A theme may use any category, whether or not the base tokens define it.
 */
export type ThemeOverride = TokenSet;

/** Turns any category the fixed set does not know about into a type error. */
type ExactCategories<TTokens> = { [K in Exclude<keyof TTokens, TokenCategory>]: never };

/**
 * How a theme name becomes a CSS selector.
 *
 * - `"class"` → `.dark`
 * - `"id"` → `#dark`
 * - any `data-*` → `[data-theme="dark"]`
 */
export type SelectorStrategy = 'class' | 'id' | `data-${string}`;

export type DefineTokensConfig<
  TTokens extends TokenSet,
  TThemes extends Record<string, ThemeOverride>,
> = {
  selector: SelectorStrategy;
  tokens: TTokens & ExactCategories<TTokens>;
  themes: TThemes & { [K in keyof TThemes]: ThemeOverride & ExactCategories<TThemes[K]> };
};

/** Base tokens with a theme's overrides applied, keeping both sets of names. */
export type ResolvedTheme<TTokens, TOverride> = {
  [K in keyof TTokens | keyof TOverride]: (K extends keyof TTokens ? TTokens[K] : unknown) &
    (K extends keyof TOverride ? TOverride[K] : unknown);
};

/** Every token reference, e.g. `"color-primary"` or `"font-weight-bold"`. */
export type TokenPath<TTokens> = {
  [K in keyof TTokens & TokenCategory]: `${CategoryPrefix<K>}-${keyof TTokens[K] & string}`;
}[keyof TTokens & TokenCategory];

type ThemeTokenPaths<TThemes> = {
  [K in keyof TThemes]: TokenPath<TThemes[K]>;
}[keyof TThemes];

/** The one category whose values may carry an opacity step. */
export type ColorCategory = 'color';

/** References that accept an opacity step: the tokens of the `color` category. */
export type ColorTokenPath<TPath extends string> = Extract<TPath, `${ColorCategory}-${string}`>;

/**
 * Tailwind-like opacity steps (percent). Used so `"color-primary/20"` autocompletes.
 * Runtime still accepts any integer 0–100; types prefer this scale.
 */
export type OpacityScale =
  | 0
  | 5
  | 10
  | 15
  | 20
  | 25
  | 30
  | 35
  | 40
  | 45
  | 50
  | 55
  | 60
  | 65
  | 70
  | 75
  | 80
  | 85
  | 90
  | 95
  | 100;

/**
 * `"color-primary"` | `"color-primary/20"` — every reference autocompletes, but the
 * opacity step is offered only for color tokens, since it compiles to `color-mix()`.
 */
export type TokenRef<TPath extends string> = TPath | `${ColorTokenPath<TPath>}/${OpacityScale}`;

export type TokensApi<
  TTokens extends TokenSet,
  TThemes extends Record<string, ThemeOverride>,
> = {
  /** Base tokens with each theme's overrides applied. */
  themes: { [K in keyof TThemes]: ResolvedTheme<TTokens, TThemes[K]> };
  themeNames: (keyof TThemes & string)[];

  get<TTheme extends keyof TThemes & string>(
    theme: TTheme,
    ref: TokenRef<TokenPath<TTokens> | TokenPath<TThemes[TTheme]>>,
  ): string;

  var(ref: TokenRef<TokenPath<TTokens> | ThemeTokenPaths<TThemes>>): string;

  css(): string;
};

/** Minimal surface needed to render or inject the generated token CSS. */
export type TokenCssSource = { css(): string };
