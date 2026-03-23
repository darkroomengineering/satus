import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { darkroomStyling } from "./styles/scripts/vite/darkroom-styling.ts";
import { lightningcssFunctions } from "./styles/scripts/vite/lightningcss-functions.ts";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), svgr(), darkroomStyling()],
  envPrefix: "PUBLIC_",
  resolve: {
    tsconfigPaths: true,
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
