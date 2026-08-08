#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";

import { runBuild } from "./build";
import { runInit } from "./init";

function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, "../../package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const cli = cac("design-tokens");

cli
  .command("init", "Initialize design tokens in the current project")
  .option("-y, --yes", "Skip prompts and use defaults")
  .action(async (options: { yes?: boolean }) => {
    await runInit({ yes: Boolean(options.yes) });
  });

cli
  .command("build", "Regenerate tokens.css from the token definition")
  .action(async () => {
    const { outputPath } = await runBuild();
    console.log(`✓ Generated ${outputPath}`);
  });

cli.help();
cli.version(packageVersion());

cli.parse();
