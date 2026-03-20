import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite-plus";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    // TODO: remove once styles/scripts becomes a vite plugin
    ignorePatterns: ["styles/scripts/**"],
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [reactRouter(), svgr()],
  envPrefix: "PUBLIC_",
  resolve: {
    tsconfigPaths: true,
  },
});
