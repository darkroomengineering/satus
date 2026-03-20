import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const IMPORT_PATH_REGEX = /^(\.\/|\.\.\/)+/;

/**
 * Vite plugin to prepend an @import statement to all CSS files.
 * Replaces @csstools/postcss-global-data by making generated CSS vars
 * available to all CSS modules.
 */
export function prependCss(importPath: string): Plugin {
  const plugin = {
    name: "prepend-css",
    enforce: "pre",
  } as const;

  const resolvedPath = path.resolve(importPath);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`Warning: "${resolvedPath}" does not exist. The @import may not work.`);
    return plugin;
  }

  return {
    ...plugin,

    handleHotUpdate({ file, server }) {
      const tidyPath = importPath.replace(IMPORT_PATH_REGEX, "");
      if (file.includes(tidyPath)) server.restart();
    },

    transform(code, id) {
      if (id.endsWith(".css")) {
        const parts = code.split("\n");
        let insertIndex = 0;

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.startsWith("@charset") || trimmed.startsWith("@layer")) {
            insertIndex++;
          } else {
            break;
          }
        }

        parts.splice(insertIndex, 0, `@import '${importPath}';`);
        return parts.join("\n");
      }
    },
  };
}
