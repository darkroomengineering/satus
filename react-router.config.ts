import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  presets: [vercelPreset()],
  future: {
    v8_middleware: true,
  },

  // Marketing site (default) — switch to "app" and delete example/ to start your project
  appDirectory: "example",

  // Your project — uncomment this and delete example/
  // appDirectory: "app",
} satisfies Config;
