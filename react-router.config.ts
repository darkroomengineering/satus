import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,

  // Marketing site (default) — switch to "app" and delete example/ to start your project
  appDirectory: "example",

  // Your project — uncomment this and delete example/
  // appDirectory: "app",
} satisfies Config;
