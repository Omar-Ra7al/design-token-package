import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";

import { runBuild } from "./build";
import {
  configsEqual,
  conventionConfig,
  findConfigPath,
  loadConfig,
  needsConfigFile,
  writeConfigFile,
  type DesignTokensConfig,
} from "./config";
import {
  detectProject,
  formatDetectionSummary,
  type ProjectDetection,
} from "./detect";
import { injectTokensImport } from "./inject";
import {
  findProjectRoot,
  findStylesheetCandidates,
  resolveFromRoot,
} from "./paths";
import { tokensScaffold } from "./scaffold";

export type InitOptions = {
  yes?: boolean;
  cwd?: string;
};

function cancelIfNeeded<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Init cancelled.");
    process.exit(0);
  }
  return value;
}

function ownPackageName(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, "../../package.json"), "utf8"),
    ) as { name?: string };
    return pkg.name ?? "design-token-package";
  } catch {
    return "design-token-package";
  }
}

function logWarn(yes: boolean, message: string): void {
  if (yes) console.log(`⚠ ${message}`);
  else p.log.warn(message);
}

function logInfo(yes: boolean, message: string): void {
  if (yes) console.log(`✓ ${message}`);
  else p.log.info(message);
}

function logSuccess(yes: boolean, message: string): void {
  if (yes) console.log(`✓ ${message}`);
  else p.log.success(message);
}

function isTailwindV4(detection: ProjectDetection): boolean {
  return (
    detection.tailwind.major === "v4" ||
    (detection.tailwind.present &&
      detection.tailwind.major === "unknown" &&
      detection.tailwind.fromCssImport)
  );
}

async function promptTailwindTheme(
  detection: ProjectDetection,
  yes: boolean,
  existing?: boolean,
): Promise<boolean> {
  if (!detection.tailwind.present) {
    return false;
  }

  if (detection.tailwind.major === "v3") {
    if (!yes) {
      p.log.info(
        "Tailwind CSS v3 detected — @theme inline mappings are skipped (v4 only).",
      );
    } else {
      console.log(
        "⚠ Tailwind CSS v3 detected — @theme inline mappings are skipped (v4 only).",
      );
    }
    return false;
  }

  if (!isTailwindV4(detection)) {
    return false;
  }

  if (yes) {
    return existing ?? true;
  }

  return cancelIfNeeded(
    await p.confirm({
      message: "Generate Tailwind theme mappings?",
      initialValue: existing ?? true,
    }),
  );
}

async function promptConfig(
  defaults: DesignTokensConfig,
  candidates: string[],
  detection: ProjectDetection,
  yes: boolean,
  hasExistingConfig: boolean,
): Promise<DesignTokensConfig> {
  if (yes) {
    // Re-init with -y: keep existing config as source of truth
    if (hasExistingConfig) {
      return defaults;
    }

    const injectCss = candidates.length > 0 ? candidates[0] : undefined;
    const tailwindTheme = await promptTailwindTheme(detection, true);
    return {
      tokens: { ...defaults.tokens },
      output: {
        css: defaults.output.css,
        ...(tailwindTheme ? { tailwindTheme: true } : {}),
      },
      ...(injectCss ? { inject: { css: injectCss } } : {}),
    };
  }

  p.intro("design-tokens init");

  const tokensFile = cancelIfNeeded(
    await p.text({
      message: "Tokens file path",
      initialValue: defaults.tokens.file,
    }),
  );

  const exportName = cancelIfNeeded(
    await p.text({
      message: "Tokens export name",
      initialValue: defaults.tokens.export,
    }),
  );

  const cssOutput = cancelIfNeeded(
    await p.text({
      message: "Generated CSS output path",
      initialValue: defaults.output.css,
    }),
  );

  let injectCss: string | undefined = defaults.inject?.css;

  if (candidates.length === 0) {
    p.log.warn(
      "No global stylesheet found. Skip inject for now, or set inject.css in design-tokens.config.ts later.",
    );
    injectCss = undefined;
  } else if (candidates.length === 1) {
    const only = candidates[0]!;
    const confirm = cancelIfNeeded(
      await p.confirm({
        message: `Add @import to ${only}?`,
        initialValue: true,
      }),
    );
    injectCss = confirm ? only : undefined;
  } else {
    const selected = cancelIfNeeded(
      await p.select({
        message: "Which stylesheet should receive the tokens import?",
        options: [
          ...candidates.map((c) => ({ value: c, label: c })),
          { value: "", label: "Skip inject" },
        ],
        initialValue: defaults.inject?.css ?? candidates[0],
      }),
    );
    injectCss = selected || undefined;
  }

  const tailwindTheme = await promptTailwindTheme(
    detection,
    false,
    defaults.output.tailwindTheme,
  );

  return {
    tokens: {
      file: tokensFile.trim(),
      export: exportName.trim(),
    },
    output: {
      css: cssOutput.trim(),
      ...(tailwindTheme ? { tailwindTheme: true } : {}),
    },
    ...(injectCss ? { inject: { css: injectCss } } : {}),
  };
}

async function maybeWriteConfig(
  root: string,
  config: DesignTokensConfig,
  existingPath: string | null,
  yes: boolean,
): Promise<void> {
  if (!needsConfigFile(root, config)) {
    return;
  }

  if (!existingPath) {
    const configPath = writeConfigFile(root, config);
    logSuccess(yes, `Wrote ${configPath.slice(root.length + 1)}`);
    return;
  }

  // Config exists — load and compare
  let existing: DesignTokensConfig | null = null;
  try {
    const loaded = await loadConfig(root);
    existing = {
      tokens: loaded.tokens,
      output: loaded.output,
      ...(loaded.inject ? { inject: loaded.inject } : {}),
    };
  } catch {
    existing = null;
  }

  if (existing && configsEqual(existing, config)) {
    logInfo(yes, `Keeping existing ${existingPath.slice(root.length + 1)}`);
    return;
  }

  if (yes) {
    logWarn(
      yes,
      `${existingPath.slice(root.length + 1)} already exists — keeping (re-run interactively to overwrite)`,
    );
    return;
  }

  const overwrite = cancelIfNeeded(
    await p.confirm({
      message: `${existingPath.slice(root.length + 1)} already exists. Overwrite?`,
      initialValue: false,
    }),
  );

  if (overwrite) {
    writeConfigFile(root, config);
    logSuccess(yes, `Overwrote ${existingPath.slice(root.length + 1)}`);
  } else {
    logInfo(yes, `Keeping existing ${existingPath.slice(root.length + 1)}`);
  }
}

export async function runInit(options: InitOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const yes = options.yes ?? false;
  const root = findProjectRoot(cwd);
  const detection = detectProject(root);
  const existingConfigPath = findConfigPath(root);

  let defaults: DesignTokensConfig = conventionConfig(root);
  if (existingConfigPath) {
    try {
      const loaded = await loadConfig(root);
      defaults = {
        tokens: loaded.tokens,
        output: loaded.output,
        ...(loaded.inject ? { inject: loaded.inject } : {}),
      };
      if (!yes) {
        p.log.info(`Using existing config: ${existingConfigPath.slice(root.length + 1)}`);
      } else {
        console.log(
          `✓ Using existing config: ${existingConfigPath.slice(root.length + 1)}`,
        );
      }
    } catch {
      // fall back to conventions
    }
  }

  const candidates = findStylesheetCandidates(root);

  if (!yes) {
    p.log.info(formatDetectionSummary(detection));
  } else {
    console.log(`✓ ${formatDetectionSummary(detection)}`);
  }

  if (yes && candidates.length > 1 && !defaults.inject?.css) {
    console.warn(
      `⚠ Multiple stylesheets found; using ${candidates[0]} (pass interactively to choose).`,
    );
  }

  const config = await promptConfig(
    defaults,
    candidates,
    detection,
    yes,
    Boolean(existingConfigPath),
  );

  const tokensAbs = resolveFromRoot(root, config.tokens.file);
  const cssAbs = resolveFromRoot(root, config.output.css);
  const themeDir = dirname(tokensAbs);

  if (!existsSync(themeDir)) {
    mkdirSync(themeDir, { recursive: true });
    logSuccess(yes, `Created ${dirname(config.tokens.file) || themeDir}`);
  }

  if (existsSync(tokensAbs)) {
    logWarn(yes, `${config.tokens.file} already exists`);
    logInfo(yes, "Keeping existing file");
  } else {
    writeFileSync(tokensAbs, tokensScaffold(ownPackageName()), "utf8");
    logSuccess(yes, `Created ${config.tokens.file}`);
  }

  if (config.inject?.css) {
    const stylesheetAbs = resolveFromRoot(root, config.inject.css);
    if (!existsSync(stylesheetAbs)) {
      const msg = `Stylesheet not found: ${config.inject.css}`;
      if (yes) console.error(`✗ ${msg}`);
      else p.log.error(msg);
    } else {
      const result = injectTokensImport(stylesheetAbs, cssAbs);
      if (result.status === "added") {
        logSuccess(
          yes,
          `Added @import ${JSON.stringify(result.importPath)} to ${config.inject.css}`,
        );
      } else {
        logInfo(yes, `Import already present in ${config.inject.css}`);
      }
    }
  }

  await maybeWriteConfig(root, config, existingConfigPath, yes);

  try {
    const { outputPath } = await runBuild(cwd, {
      ...config,
      root,
      configPath: existingConfigPath,
    });
    const rel = outputPath.startsWith(root)
      ? outputPath.slice(root.length + 1)
      : outputPath;
    logSuccess(yes, `Generated ${rel}`);
    if (!yes) {
      p.outro("Done. Edit your tokens file, then run: design-tokens build");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn(yes, `Could not generate CSS yet: ${message}`);
    if (!yes) {
      p.outro("Fix the tokens file, then run: design-tokens build");
    }
  }
}
