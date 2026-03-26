#!/usr/bin/env bun
/**
 * Static i18n build script.
 *
 * 1. Validates all translation JSONs against the valibot schema
 * 2. Builds each language in parallel (configurable concurrency)
 * 3. Zips each build into output/<lang>.zip
 *
 * Usage:
 *   bun lib/static-i18n/build.ts --translations ./translations
 *   bun lib/static-i18n/build.ts --translations ./translations --concurrency 8
 */
import { readdirSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as v from "valibot";
import { TranslationSchema } from "./schema.ts";

const exec = promisify(execFile);

const ROOT = join(import.meta.dirname, "../..");

function arg(name: string): string | undefined {
  return process.argv.find((_, i, a) => a[i - 1] === `--${name}`);
}

const translationsArg = arg("translations");
if (!translationsArg) {
  console.error("Usage: bun lib/static-i18n/build.ts --translations <path>");
  process.exit(1);
}

const TRANSLATIONS_DIR = join(ROOT, translationsArg);
const OUTPUT_DIR = join(ROOT, "output");
const DIST_DIR = join(ROOT, "dist");
const CONCURRENCY = parseInt(arg("concurrency") || "4", 10);

/**
 * Reads every JSON in translations/, validates against the schema.
 * Collects all errors before throwing so you see every broken file at once.
 */
function validate(): string[] {
  const files = readdirSync(TRANSLATIONS_DIR).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    throw new Error(`No translation files found in ${TRANSLATIONS_DIR}`);
  }

  const langs: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const lang = basename(file, ".json");

    try {
      const raw = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, file), "utf-8"));
      v.parse(TranslationSchema, raw);
      langs.push(lang);
    } catch (err) {
      if (err instanceof v.ValiError) {
        const issues = err.issues
          .map((i) => `  - ${i.path?.map((p: { key: string }) => p.key).join(".")}: ${i.message}`)
          .join("\n");
        errors.push(`${file}:\n${issues}`);
      } else {
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n\n${errors.join("\n\n")}`);
  }

  console.log(`Validated ${langs.length} translations: ${langs.join(", ")}`);
  return langs;
}

/**
 * Runs `react-router build` for a single language, then zips the client output.
 * BUILD_LANG tells the Vite plugin which JSON to inline.
 * SITE_PASSWORD is cleared so the password middleware doesn't block pre-rendering.
 */
async function buildLanguage(lang: string): Promise<void> {
  const start = performance.now();
  console.log(`[${lang}] Building...`);

  try {
    await exec("bun", ["react-router", "build"], {
      cwd: ROOT,
      env: {
        ...process.env,
        BUILD_LANG: lang,
        TRANSLATIONS_DIR: TRANSLATIONS_DIR,
        SITE_PASSWORD: "",
      },
    });
  } catch (err) {
    const stderr =
      err instanceof Error && "stderr" in err ? (err as { stderr: string }).stderr : String(err);
    throw new Error(`[${lang}] Build failed:\n${stderr}`);
  }

  // Zip the client output (static files only, no server)
  const clientDir = join(DIST_DIR, lang, "client");
  const zipPath = join(OUTPUT_DIR, `${lang}.zip`);

  await exec("zip", ["-r", "-q", zipPath, "."], { cwd: clientDir });

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`[${lang}] Done (${elapsed}s) → output/${lang}.zip`);
}

/**
 * Runs builds in batches to limit concurrency.
 * If any build in a batch fails, reports all failures then throws.
 */
async function runBatch(langs: string[], concurrency: number): Promise<void> {
  for (let i = 0; i < langs.length; i += concurrency) {
    const batch = langs.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(buildLanguage));

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(result.reason instanceof Error ? result.reason.message : result.reason);
      }
    }

    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      throw new Error(`${failures} build(s) failed in batch`);
    }
  }
}

async function main() {
  const start = performance.now();

  // 1. Validate all translations upfront — fail fast before any builds
  console.log("Validating translations...\n");
  const langs = validate();

  // 2. Clean previous output
  if (existsSync(OUTPUT_DIR)) rmSync(OUTPUT_DIR, { recursive: true });
  if (existsSync(DIST_DIR)) rmSync(DIST_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 3. Build all languages in parallel batches
  console.log(`\nBuilding ${langs.length} languages (concurrency: ${CONCURRENCY})...\n`);
  await runBatch(langs, CONCURRENCY);

  // 4. Clean up intermediate build files, keep only the zips
  rmSync(DIST_DIR, { recursive: true });

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`\nDone! ${langs.length} ZIPs in output/ (${elapsed}s total)`);
}

main().catch((err) => {
  console.error("\n" + (err instanceof Error ? err.message : err));
  process.exit(1);
});
