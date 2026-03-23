import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

interface DarkroomStylingOptions {
  /** CSS file to prepend into all CSS files (for custom media queries) */
  prependCss?: string;
  /** Style config files to watch for regeneration */
  watchFiles?: string[];
  /** Command to run when config files change */
  generateCommand?: string;
  /** Generated files that must exist before dev server starts */
  requiredFiles?: string[];
}

const defaults: Required<DarkroomStylingOptions> = {
  prependCss: "./styles/css/media.css",
  watchFiles: [
    "styles/colors.ts",
    "styles/typography.ts",
    "styles/easings.ts",
    "styles/layout.ts",
  ],
  generateCommand: "bun ./styles/scripts/setup-styles.ts",
  requiredFiles: [
    "./styles/css/root.css",
    "./styles/css/tailwind.css",
    "./styles/css/media.css",
  ],
};

export function darkroomStyling(options?: DarkroomStylingOptions): Plugin {
  const config = { ...defaults, ...options };

  function generate() {
    exec(config.generateCommand);
  }

  // Check the prepend file exists
  const prependResolved = path.resolve(config.prependCss);
  const prependExists = existsSync(prependResolved);

  return {
    name: "darkroom-styling",
    enforce: "pre",

    // Watch config files and regenerate on change
    configureServer(server) {
      const missing = config.requiredFiles.some((f) => !existsSync(f));
      if (missing) generate();

      server.watcher.add(config.watchFiles);
      server.watcher.on("change", (filePath) => {
        if (config.watchFiles.some((file) => filePath.includes(file))) {
          generate();
        }
      });
    },

    // Restart dev server when the prepended CSS changes
    handleHotUpdate({ file, server }) {
      if (file.includes(config.prependCss.replace(/^(\.\/|\.\.\/)+/, ""))) {
        server.restart();
      }
    },

    // Prepend @import for custom media queries into all CSS files
    transform(code, id) {
      if (!prependExists || !id.endsWith(".css")) return;

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

      parts.splice(insertIndex, 0, `@import '${config.prependCss}';`);
      return parts.join("\n");
    },
  };
}
