import { describe, expect, it } from "vitest";
import { defineTokens } from "../src/defineTokens";

const sample = defineTokens({
  defaultTheme: "light",
  themes: {
    light: {
      selector: ":root",
      tokens: {
        background: "#ffffff",
        primary: "oklch(0% 0 0)",
        radius: "8px",
      },
    },
    dark: {
      selector: ".dark",
      tokens: {
        background: "#000000",
        primary: "oklch(100% 0 0)",
        radius: "8px",
      },
    },
  },
});

describe("defineTokens", () => {
  it("exposes theme metadata", () => {
    expect(sample.defaultTheme).toBe("light");
    expect(sample.themeNames).toEqual(["light", "dark"]);
    expect(sample.themes.light.tokens.primary).toBe("oklch(0% 0 0)");
  });

  it("builds css() with selectors and custom properties", () => {
    const css = sample.css();

    expect(css).toContain(":root{");
    expect(css).toContain(".dark{");
    expect(css).toContain("--background:#ffffff");
    expect(css).toContain("--background:#000000");
    expect(css).toContain("--primary:oklch(0% 0 0)");
  });

  it("resolves get() literals and opacity refs", () => {
    expect(sample.get("light", "primary")).toBe("oklch(0% 0 0)");
    expect(sample.get("dark", "background")).toBe("#000000");
    expect(sample.get("light", "primary/20")).toBe(
      "color-mix(in oklch, oklch(0% 0 0) 20%, transparent)",
    );
  });

  it("builds var() references and opacity mixes", () => {
    expect(sample.var("background")).toBe("var(--background)");
    expect(sample.var("primary/50")).toBe(
      "color-mix(in oklch, var(--primary) 50%, transparent)",
    );
  });

  it("throws on unknown tokens and invalid opacity", () => {
    expect(() => sample.get("light", "missing" as "primary")).toThrow(
      /Unknown token/,
    );
    expect(() => sample.get("light", "primary/101" as "primary/100")).toThrow(
      /Invalid opacity/,
    );
  });
});
