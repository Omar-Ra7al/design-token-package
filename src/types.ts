/** Nested token values grouped by category; every leaf is a CSS value string. */
export type TokenTree = { [key: string]: string | TokenTree };

/**
 * How a theme name becomes a CSS selector.
 *
 * - `"class"` → `.dark`
 * - `"id"` → `#dark`
 * - any `data-*` → `[data-theme="dark"]`
 */
export type SelectorStrategy = 'class' | 'id' | `data-${string}`;

/**
 * Overrides for one token group.
 *
 * Members of the base group autocomplete, while the index signature keeps
 * theme-only token names such as `colors.myCustomColor` valid.
 */
export type TokenGroupOverride<TGroup extends TokenTree> = {
  [K in keyof TGroup]?: TGroup[K] extends TokenTree ? TokenGroupOverride<TGroup[K]> : string;
} & { [key: string]: string | TokenTree | undefined };

/**
 * A theme: a deep partial of the base tokens.
 *
 * Top-level keys are the base token categories, so they autocomplete; the token
 * names inside a category stay open.
 */
export type ThemeOverride<TTokens extends TokenTree> = {
  [K in keyof TTokens]?: TTokens[K] extends TokenTree ? TokenGroupOverride<TTokens[K]> : string;
};

export type DefineTokensConfig<
  TTokens extends TokenTree,
  TThemes extends Record<string, ThemeOverride<TTokens>>,
> = {
  selector: SelectorStrategy;
  tokens: TTokens;
  themes: TThemes;
};

/** Base tokens with a theme's overrides applied, keeping both sets of names. */
export type ResolvedTheme<TTokens, TOverride> = {
  [K in keyof TTokens | keyof TOverride]: K extends keyof TOverride
    ? K extends keyof TTokens
      ? ResolvedTokenValue<TTokens[K], TOverride[K]>
      : TOverride[K]
    : K extends keyof TTokens
      ? TTokens[K]
      : never;
};

type ResolvedTokenValue<TToken, TOverride> = TToken extends TokenTree
  ? TOverride extends TokenTree
    ? ResolvedTheme<TToken, TOverride>
    : TOverride
  : TOverride;

/** Dash-joined path to every leaf, e.g. `"typography-fontFamily-sans"`. */
export type TokenPath<TTree, TPrefix extends string = ''> = {
  [K in keyof TTree & string]: TTree[K] extends string
    ? `${TPrefix}${K}`
    : TTree[K] extends object
      ? TokenPath<TTree[K], `${TPrefix}${K}-`>
      : never;
}[keyof TTree & string];

type ThemeTokenPaths<TThemes> = {
  [K in keyof TThemes]: TokenPath<TThemes[K]>;
}[keyof TThemes];

/** The token category whose values may carry an opacity step. */
export type ColorCategory = 'colors';

/** Paths that accept an opacity step: the leaves of the `colors` category. */
export type ColorTokenPath<TPath extends string> = Extract<TPath, `${ColorCategory}-${string}`>;

/**
 * Tailwind-like opacity steps (percent). Used so `"colors-primary/20"` autocompletes.
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
 * `"colors-primary"` | `"colors-primary/20"` — every path autocompletes, but the
 * opacity step is offered only for color tokens, since it compiles to `color-mix()`.
 */
export type TokenRef<TPath extends string> = TPath | `${ColorTokenPath<TPath>}/${OpacityScale}`;

export type TokensApi<
  TTokens extends TokenTree,
  TThemes extends Record<string, ThemeOverride<TTokens>>,
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
