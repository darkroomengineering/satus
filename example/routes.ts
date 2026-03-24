import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("features", "routes/features.tsx"),
  route("about", "routes/about.tsx"),
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
