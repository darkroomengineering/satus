import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("components", "routes/components.tsx"),
  route("transitions", "routes/transitions.tsx", [
    index("routes/transitions.index.tsx"),
    route("auto-done", "routes/transitions.auto-done.tsx"),
    route("callback", "routes/transitions.callback.tsx"),
    route("cleanup", "routes/transitions.cleanup.tsx"),
    route("initial", "routes/transitions.initial.tsx"),
    route("no-transition", "routes/transitions.no-transition.tsx"),
  ]),
  route("sanity", "routes/sanity.tsx"),
  route("sanity/:slug", "routes/sanity.$slug.tsx"),
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
