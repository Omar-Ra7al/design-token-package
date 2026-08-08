import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

import { defaultThemeDir, findProjectRoot } from "./paths";

export type DesignTokensConfig = {
  tokens: {
    file: string;
    export: string;
  };
  output: {
    css: string;
  };
  inject?: {
    css: string;
  };
};

export type ResolvedConfig = DesignTokensConfig & {
  root: string;
  configPath: string | null;
};

const CONFIG_BASENAMES = [
  "design-tokens.config.ts",
  "design-tokens.config.mts",
  "design-tokens.config.js",
  "design-tokens.config.mjs",
] as const;

export function conventionConfig(root: string): DesignTokensConfig {
  const themeDir = defaultThemeDir(root);
  return {
    tokens: {
      file: `${themeDir}/tokens.ts`,
      export: "tokens",
    },
    output: {
      css: `${themeDir}/tokens.css`,
    },
  };
}

export function findConfigPath(root: string): string | null {
  for (const name of CONFIG_BASENAMES) {
    const path = join(root, name);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

function normalizeConfig(raw: unknown): DesignTokensConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("design-tokens config must export a default object");
  }

  const config = raw as Partial<DesignTokensConfig>;
  if (!config.tokens?.file || !config.tokens?.export) {
    throw new Error('design-tokens config requires tokens.file and tokens.export');
  }
  if (!config.output?.css) {
    throw new Error("design-tokens config requires output.css");
  }

  return {
    tokens: {
      file: config.tokens.file,
      export: config.tokens.export,
    },
    output: {
      css: config.output.css,
    },
    ...(config.inject?.css ? { inject: { css: config.inject.css } } : {}),
  };
}

export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<ResolvedConfig> {
  const root = findProjectRoot(cwd);
  const configPath = findConfigPath(root);

  if (!configPath) {
    return {
      ...conventionConfig(root),
      root,
      configPath: null,
    };
  }

  const jiti = createJiti(import.meta.url);
  const mod = await jiti.import(configPath);
  const raw =
    mod && typeof mod === "object" && "default" in mod ? mod.default : mod;

  return {
    ...normalizeConfig(raw),
    root,
    configPath,
  };
}

export function configsEqual(
  a: DesignTokensConfig,
  b: DesignTokensConfig,
): boolean {
  return (
    a.tokens.file === b.tokens.file &&
    a.tokens.export === b.tokens.export &&
    a.output.css === b.output.css &&
    (a.inject?.css ?? null) === (b.inject?.css ?? null)
  );
}

/** True when resolved settings match pure conventions (no inject stored). */
export function isConventionConfig(
  root: string,
  config: DesignTokensConfig,
): boolean {
  const defaults = conventionConfig(root);
  return (
    config.tokens.file === defaults.tokens.file &&
    config.tokens.export === defaults.tokens.export &&
    config.output.css === defaults.output.css
  );
}

export function formatConfigFile(config: DesignTokensConfig): string {
  const injectBlock = config.inject?.css
    ? `
  inject: {
    css: ${JSON.stringify(config.inject.css)},
  },`
    : "";

  return `export default {
  tokens: {
    file: ${JSON.stringify(config.tokens.file)},
    export: ${JSON.stringify(config.tokens.export)},
  },
  output: {
    css: ${JSON.stringify(config.output.css)},
  },${injectBlock}
};
`;
}

export function writeConfigFile(root: string, config: DesignTokensConfig): string {
  const path = join(root, "design-tokens.config.ts");
  writeFileSync(path, formatConfigFile(config), "utf8");
  return path;
}
