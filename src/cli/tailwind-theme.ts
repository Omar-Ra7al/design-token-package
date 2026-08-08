/** Map design-token keys to Tailwind v4 `@theme inline` custom properties. */

export function mapTokenKeyToThemeVar(key: string): string {
  if (key === "radius") {
    return "--radius-lg";
  }

  if (key.startsWith("radius-")) {
    return `--radius-${key.slice("radius-".length)}`;
  }

  if (key.endsWith("-radius")) {
    const suffix = key.slice(0, -"-radius".length);
    return `--radius-${suffix}`;
  }

  if (key.startsWith("font-")) {
    return `--${key}`;
  }

  return `--color-${key}`;
}

export function collectTokenKeys(
  themes: Record<string, { tokens?: Record<string, string> }>,
): string[] {
  const keys = new Set<string>();
  for (const definition of Object.values(themes)) {
    if (!definition?.tokens) continue;
    for (const key of Object.keys(definition.tokens)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}

export function formatTailwindThemeBlock(keys: string[]): string {
  if (keys.length === 0) {
    return "";
  }

  const lines = keys.map(
    (key) => `  ${mapTokenKeyToThemeVar(key)}: var(--${key});`,
  );

  return `@theme inline {\n${lines.join("\n")}\n}`;
}
