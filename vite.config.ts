import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { composeVisitors } from "lightningcss";
import { defineConfig } from "vite-plus";
import svgr from "vite-plugin-svgr";
import { lightningcssFunctions } from "./styles/scripts/vite/lightningcss-functions";
import { prependCss } from "./styles/scripts/vite/prepend-css";
import { watchStyles } from "./styles/scripts/vite/watch-styles";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["styles/scripts/**"],
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    svgr(),
    watchStyles(),
    prependCss("./styles/css/root.css"),
  ],
  envPrefix: "PUBLIC_",
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      cssModules: true,
      drafts: {
        customMedia: true,
      },
      visitor: composeVisitors([lightningcssFunctions()]),
    },
  },
  build: {
    cssMinify: "lightningcss",
  },
});
