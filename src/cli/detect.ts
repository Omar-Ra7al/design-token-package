import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { STYLESHEET_CANDIDATES } from "./paths";

export type TailwindMajor = "v3" | "v4" | "unknown";

export type ProjectDetection = {
  framework: string;
  hasReact: boolean;
  tailwind: {
    present: boolean;
    version: string | null;
    major: TailwindMajor;
    fromCssImport: boolean;
  };
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function allDeps(pkg: PackageJson): Record<string, string> {
  return {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };
}

function detectFramework(deps: Record<string, string>): string {
  if (deps.next) return "Next.js";
  if (deps.nuxt) return "Nuxt";
  if (deps.remix || deps["@remix-run/react"]) return "Remix";
  if (deps.astro) return "Astro";
  if (deps["@sveltejs/kit"]) return "SvelteKit";
  if (deps.vite) return "Vite";
  return "unknown";
}

function parseMajor(version: string): TailwindMajor {
  const cleaned = version.replace(/^[^\d]*/, "");
  const major = Number.parseInt(cleaned.split(".")[0] ?? "", 10);
  if (!Number.isFinite(major)) return "unknown";
  if (major >= 4) return "v4";
  if (major === 3) return "v3";
  return "unknown";
}

function cssHasTailwindImport(root: string): boolean {
  const candidates = [
    ...STYLESHEET_CANDIDATES,
    "src/app/global.css",
    "app/global.css",
  ];

  for (const rel of candidates) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    try {
      const source = readFileSync(abs, "utf8");
      if (/@import\s+["']tailwindcss["']/.test(source)) {
        return true;
      }
    } catch {
      // ignore unreadable files
    }
  }

  // light scan of common style roots
  for (const dir of ["src", "app", "styles", "src/styles", "src/app"]) {
    const absDir = join(root, dir);
    if (!existsSync(absDir)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(absDir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith(".css")) continue;
      try {
        const source = readFileSync(join(absDir, name), "utf8");
        if (/@import\s+["']tailwindcss["']/.test(source)) {
          return true;
        }
      } catch {
        // ignore
      }
    }
  }

  return false;
}

function resolveInstalledTailwindVersion(root: string): string | null {
  const installed = join(root, "node_modules", "tailwindcss", "package.json");
  const raw = readJson(installed);
  if (raw && typeof raw === "object" && "version" in raw) {
    const version = (raw as { version?: unknown }).version;
    if (typeof version === "string") return version;
  }
  return null;
}

export function detectProject(root: string): ProjectDetection {
  const pkgRaw = readJson(join(root, "package.json"));
  const pkg =
    pkgRaw && typeof pkgRaw === "object" ? (pkgRaw as PackageJson) : {};
  const deps = allDeps(pkg);

  const range = deps.tailwindcss ?? null;
  const installed = resolveInstalledTailwindVersion(root);
  const fromCssImport = cssHasTailwindImport(root);
  const version = installed ?? range;
  const present = Boolean(range || installed || fromCssImport);

  let major: TailwindMajor = "unknown";
  if (version) {
    major = parseMajor(version);
  } else if (fromCssImport) {
    // `@import "tailwindcss"` is the v4 entry style
    major = "v4";
  }

  return {
    framework: detectFramework(deps),
    hasReact: Boolean(deps.react),
    tailwind: {
      present,
      version,
      major,
      fromCssImport,
    },
  };
}

export function formatDetectionSummary(detection: ProjectDetection): string {
  const parts: string[] = [];

  if (detection.framework !== "unknown") {
    parts.push(detection.framework);
  } else if (detection.hasReact) {
    parts.push("React");
  } else {
    parts.push("unknown stack");
  }

  if (detection.hasReact && detection.framework !== "unknown") {
    parts.push("React");
  }

  if (detection.tailwind.present) {
    const ver = detection.tailwind.version
      ? ` ${detection.tailwind.version}`
      : detection.tailwind.major !== "unknown"
        ? ` ${detection.tailwind.major}`
        : "";
    parts.push(`Tailwind CSS${ver}`);
  }

  return `Detected: ${parts.join(", ")}`;
}
