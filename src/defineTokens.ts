import type {
  DefineTokensConfig,
  ThemeDefinition,
  TokenRef,
  TokensApi,
} from "./types";

function serializeTokensToCssVariables(map: ThemeDefinition["tokens"]): string {
  return Object.entries(map)
    .map(([key, value]) => `--${key}:${value}`)
    .join(";");
}

function parseTokenRef(ref: string): { key: string; opacity?: number } {
  const match = ref.match(/^(.+)\/(\d+)$/);

  if (!match) {
    return { key: ref };
  }

  const key = match[1];
  const opacityRaw = match[2];

  if (key == null || opacityRaw == null) {
    return { key: ref };
  }

  const opacity = Number(opacityRaw);

  if (!Number.isInteger(opacity) || opacity < 0 || opacity > 100) {
    throw new Error(`Invalid opacity "${opacityRaw}" in token ref "${ref}"`);
  }

  return { key, opacity };
}

function withOpacity(color: string, opacity: number): string {
  return `color-mix(in oklch, ${color} ${opacity}%, transparent)`;
}

export function defineTokens<TThemes extends Record<string, ThemeDefinition>>({
  themes,
  defaultTheme,
}: DefineTokensConfig<TThemes>): TokensApi<TThemes> {
  type ThemeName = keyof TThemes & string;

  function get(
    theme: ThemeName,
    ref: TokenRef<keyof TThemes[ThemeName]["tokens"] & string>,
  ): string {
    const { key, opacity } = parseTokenRef(ref);
    const value = themes[theme]?.tokens?.[key];

    if (value === undefined) {
      throw new Error(`Unknown token "${String(theme)}.${key}"`);
    }

    if (opacity == null) {
      return value;
    }

    return withOpacity(value, opacity);
  }

  function cssVar(
    ref: TokenRef<
      {
        [K in keyof TThemes]: keyof TThemes[K]["tokens"] & string;
      }[keyof TThemes]
    >,
  ): string {
    const { key, opacity } = parseTokenRef(ref);
    const variable = `var(--${key})`;

    if (opacity == null) {
      return variable;
    }

    return withOpacity(variable, opacity);
  }

  function css(): string {
    return Object.entries(themes)
      .map(([name, definition]) => {
        const { selector, tokens: tokenMap } = definition;
        const resolvedSelector =
          selector || (name === defaultTheme ? ":root" : `.${name}`);

        return `${resolvedSelector}{${serializeTokensToCssVariables(tokenMap)}}`;
      })
      .join("");
  }

  return {
    themes,
    defaultTheme,
    themeNames: Object.keys(themes),
    get,
    var: cssVar,
    css,
  };
}
