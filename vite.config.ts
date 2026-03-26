import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { staticI18n } from "./lib/static-i18n/vite-plugin.ts";
import { darkroomStyling } from "./styles/scripts/vite/darkroom-styling.ts";
import { lightningcssFunctions } from "./styles/scripts/vite/lightningcss-functions.ts";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), svgr(), darkroomStyling(), staticI18n()],
  envPrefix: "PUBLIC_",
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // Bundle all CSS into a single file instead of per-route chunks.
    // Prevents React Router's <Links> from removing route stylesheets
    // during page transitions (which breaks exiting page styles).
    cssCodeSplit: false,
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      drafts: {
        customMedia: true,
      },
      visitor: composeVisitors([lightningcssFunctions()]),
    },
  },
});
