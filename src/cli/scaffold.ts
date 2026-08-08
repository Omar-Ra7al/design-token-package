export function tokensScaffold(packageName: string): string {
  return `import { defineTokens } from ${JSON.stringify(packageName)};

export const tokens = defineTokens({
  defaultTheme: "light",
  themes: {
    light: {
      selector: ":root",
      tokens: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.145 0 0)",
        primary: "oklch(0% 0 0)",
        radius: "0.625rem",
      },
    },
    dark: {
      selector: ".dark",
      tokens: {
        background: "oklch(0% 0 0)",
        foreground: "oklch(1 0 0)",
        primary: "oklch(1 0 0)",
        radius: "0.625rem",
      },
    },
  },
});
`;
}
