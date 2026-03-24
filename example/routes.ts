import { index, type RouteConfig, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("components", "routes/components.tsx"),
  layout("routes/transitions.tsx", [
    route("transitions/red", "routes/transitions.red.tsx"),
    route("transitions/blue", "routes/transitions.blue.tsx"),
    route("transitions/green", "routes/transitions.green.tsx"),
  ]),
  route("sanity", "routes/sanity.tsx"),
  route("sanity/:slug", "routes/sanity.$slug.tsx"),
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
