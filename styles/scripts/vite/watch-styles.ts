import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import type { Plugin } from "vite";

const watchFiles = [
  "styles/colors.ts",
  "styles/typography.ts",
  "styles/easings.ts",
  "styles/layout.ts",
];

export function watchStyles(): Plugin {
  function runCommand() {
    exec("bun ./styles/scripts/setup-styles.ts");
  }

  return {
    name: "watch-styles",
    enforce: "pre",
    configureServer(server) {
      if (!existsSync("./styles/css/root.css") || !existsSync("./styles/css/tailwind.css")) {
        runCommand();
      }

      server.watcher.add(watchFiles);
      server.watcher.on("change", (filePath) => {
        if (watchFiles.some((file) => filePath.includes(file))) {
          runCommand();
        }
      });
    },
  };
}
