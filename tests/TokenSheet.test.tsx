import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defineTokens } from "../src/defineTokens";
import { TokenSheet } from "../src/TokenSheet";

const tokens = defineTokens({
  defaultTheme: "light",
  themes: {
    light: {
      selector: ":root",
      tokens: {
        background: "#fafafa",
        foreground: "#111111",
      },
    },
    dark: {
      selector: ".dark",
      tokens: {
        background: "#111111",
        foreground: "#fafafa",
      },
    },
  },
});

describe("TokenSheet", () => {
  it("injects a style tag with tokens.css()", () => {
    const { container } = render(<TokenSheet tokens={tokens} />);
    const style = container.querySelector("style");

    expect(style).not.toBeNull();
    expect(style?.innerHTML).toBe(tokens.css());
    expect(style?.innerHTML).toContain("--background:#fafafa");
    expect(style?.innerHTML).toContain(".dark{");
  });
});
