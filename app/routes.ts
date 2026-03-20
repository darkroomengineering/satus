import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("components", "routes/components.tsx"),
  route("sanity", "routes/sanity.tsx"),
  route("sanity/:slug", "routes/sanity.$slug.tsx"),
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
