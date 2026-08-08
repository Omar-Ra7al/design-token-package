import { useEffect, useState } from "react";
import { TokenSheet } from "../../src/TokenSheet";
import { tokens, type AppThemeName } from "./demoTokens";

const THEME_CLASSES = tokens.themeNames.filter((name) => name !== "light");

export function App() {
  const [theme, setTheme] = useState<AppThemeName>(tokens.defaultTheme);

  useEffect(() => {
    const root = document.documentElement;

    for (const name of THEME_CLASSES) {
      root.classList.toggle(name, name === theme);
    }
  }, [theme]);

  return (
    <>
      <TokenSheet tokens={tokens} />
      <main
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          lineHeight: 1.5,
          minHeight: "100vh",
          background: tokens.var("background"),
          color: tokens.var("foreground"),
        }}
      >
        <h1>Design token playground</h1>
        <p>
          Consumer-owned tokens via <code>defineTokens</code>.{" "}
          <code>TokenSheet</code> injects CSS variables; switch themes with
          class names on <code>&lt;html&gt;</code>.
        </p>

        <section style={{ marginTop: "1.5rem" }}>
          <h2>Theme</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {tokens.themeNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTheme(name)}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: `1px solid ${tokens.var("border")}`,
                  borderRadius: tokens.var("radius"),
                  background:
                    theme === name
                      ? tokens.var("primary")
                      : tokens.var("secondary"),
                  color:
                    theme === name
                      ? tokens.var("primary-foreground")
                      : tokens.var("secondary-foreground"),
                  cursor: "pointer",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <h2>API demos</h2>
          <ul>
            <li>
              <code>tokens.get(&quot;light&quot;, &quot;primary&quot;)</code> →{" "}
              <code>{tokens.get("light", "primary")}</code>
            </li>
            <li>
              <code>tokens.get(&quot;dark&quot;, &quot;primary/20&quot;)</code> →{" "}
              <code>{tokens.get("dark", "primary/20")}</code>
            </li>
            <li>
              <code>tokens.var(&quot;background&quot;)</code> →{" "}
              <code>{tokens.var("background")}</code>
            </li>
            <li>
              <code>tokens.var(&quot;accent/50&quot;)</code> →{" "}
              <code>{tokens.var("accent/50")}</code>
            </li>
          </ul>
        </section>

        <section
          style={{
            marginTop: "1.5rem",
            padding: tokens.var("space-4"),
            borderRadius: tokens.var("radius"),
            background: tokens.var("card"),
            color: tokens.var("card-foreground"),
            border: `1px solid ${tokens.var("border")}`,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Live surface</h2>
          <p style={{ marginBottom: 0 }}>
            Background uses <code>var(--background)</code> from the active
            theme. Accent swatch:{" "}
            <span
              style={{
                display: "inline-block",
                width: "1.25rem",
                height: "1.25rem",
                verticalAlign: "middle",
                borderRadius: "4px",
                background: tokens.var("accent"),
              }}
            />
          </p>
        </section>
      </main>
    </>
  );
}
