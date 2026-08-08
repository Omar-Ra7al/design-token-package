import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";

import { runBuild } from "./build";
import {
  conventionConfig,
  isConventionConfig,
  writeConfigFile,
  type DesignTokensConfig,
} from "./config";
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
    return pkg.name ?? "design-token";
  } catch {
    return "design-token";
  }
}

async function promptConfig(
  root: string,
  defaults: DesignTokensConfig,
  candidates: string[],
  yes: boolean,
): Promise<DesignTokensConfig> {
  if (yes) {
    const injectCss = candidates.length > 0 ? candidates[0] : undefined;
    return {
      ...defaults,
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

  let injectCss: string | undefined;

  if (candidates.length === 0) {
    p.log.warn(
      "No global stylesheet found. Skip inject for now, or set inject.css in design-tokens.config.ts later.",
    );
  } else if (candidates.length === 1) {
    const only = candidates[0]!;
    const confirm = cancelIfNeeded(
      await p.confirm({
        message: `Add @import to ${only}?`,
        initialValue: true,
      }),
    );
    if (confirm) {
      injectCss = only;
    }
  } else {
    const selected = cancelIfNeeded(
      await p.select({
        message: "Which stylesheet should receive the tokens import?",
        options: [
          ...candidates.map((c) => ({ value: c, label: c })),
          { value: "", label: "Skip inject" },
        ],
      }),
    );
    if (selected) {
      injectCss = selected;
    }
  }

  return {
    tokens: {
      file: tokensFile.trim(),
      export: exportName.trim(),
    },
    output: {
      css: cssOutput.trim(),
    },
    ...(injectCss ? { inject: { css: injectCss } } : {}),
  };
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

export async function runInit(options: InitOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const yes = options.yes ?? false;
  const root = findProjectRoot(cwd);
  const defaults = conventionConfig(root);
  const candidates = findStylesheetCandidates(root);

  if (yes && candidates.length > 1) {
    console.warn(
      `⚠ Multiple stylesheets found; using ${candidates[0]} (pass interactively to choose).`,
    );
  }

  const config = await promptConfig(root, defaults, candidates, yes);

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

  if (existsSync(cssAbs)) {
    logWarn(yes, `${config.output.css} already exists`);
    logInfo(yes, "Keeping existing file until generate");
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

  if (!isConventionConfig(root, config)) {
    const configPath = writeConfigFile(root, config);
    logSuccess(yes, `Wrote ${configPath.slice(root.length + 1)}`);
  }

  try {
    const { outputPath } = await runBuild(cwd, {
      ...config,
      root,
      configPath: null,
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
