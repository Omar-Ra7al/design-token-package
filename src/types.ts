export type TokenMap = Record<string, string>;

export type ThemeDefinition = {
  selector: string;
  tokens: TokenMap;
};

export type DefineTokensConfig<TThemes extends Record<string, ThemeDefinition>> = {
  themes: TThemes;
  defaultTheme: keyof TThemes & string;
};

/**
 * Tailwind-like opacity steps (percent). Used so `"primary/20"` autocompletes.
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

/** `"primary"` | `"primary/20"` — keys and opacity steps autocomplete. */
export type TokenRef<TKey extends string> = TKey | `${TKey}/${OpacityScale}`;

type ThemeTokenKeys<
  TThemes extends Record<string, ThemeDefinition>,
  TTheme extends keyof TThemes,
> = keyof TThemes[TTheme]["tokens"] & string;

type AllThemeTokenKeys<TThemes extends Record<string, ThemeDefinition>> = {
  [K in keyof TThemes]: ThemeTokenKeys<TThemes, K>;
}[keyof TThemes];

export type TokensApi<TThemes extends Record<string, ThemeDefinition>> = {
  themes: TThemes;
  defaultTheme: keyof TThemes & string;
  themeNames: (keyof TThemes & string)[];

  get<TTheme extends keyof TThemes & string>(
    theme: TTheme,
    ref: TokenRef<ThemeTokenKeys<TThemes, TTheme>>,
  ): string;

  var(ref: TokenRef<AllThemeTokenKeys<TThemes>>): string;

  css(): string;
};
