import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

const VIRTUAL_ID = "satus:static-translation";
const RESOLVED_ID = "\0satus:static-translation";

/**
 * Vite plugin for static i18n.
 *
 * Provides `satus:static-translation` virtual module with the current
 * language's JSON inlined at compile time. Falls back to "en" when
 * BUILD_LANG is not set (dev mode).
 *
 * Validation is handled by the build script before any builds start.
 *
 * ```ts
 * import t from "satus:static-translation";
 * ```
 */
export function staticI18n(): Plugin {
  let translation: string;

  return {
    name: "satus:static-i18n",
    buildStart() {
      const lang = process.env.BUILD_LANG || "en";
      const dir =
        process.env.TRANSLATIONS_DIR || join(process.cwd(), "lib/static-i18n/translations");
      translation = readFileSync(join(dir, `${lang}.json`), "utf-8");
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return `export default ${translation};`;
      }
      return undefined;
    },
  };
}
