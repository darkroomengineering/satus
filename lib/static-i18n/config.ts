import type { Config } from "@react-router/dev/config";

/**
 * React Router config for static i18n builds.
 *
 * Activated when BUILD_LANG env var is set. Override `appDirectory`
 * and `prerender` paths for your project.
 *
 * ```ts
 * // react-router.config.ts
 * import { staticI18nConfig } from "~/lib/static-i18n/config";
 *
 * export default staticI18nConfig({
 *   appDirectory: "translated",
 *   prerender: ["/", "/about", "/contact"],
 * }) ?? defaultConfig;
 * ```
 */
export function staticI18nConfig(options: {
  appDirectory: string;
  prerender: string[];
}): Config | null {
  const lang = process.env.BUILD_LANG;
  if (!lang) return null;

  return {
    ssr: false,
    prerender: options.prerender,
    buildDirectory: `dist/${lang}`,
    appDirectory: options.appDirectory,
  } satisfies Config;
}
