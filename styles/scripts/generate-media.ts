import type { Breakpoints } from "../layout";
import { atRule } from "./css.ts";

export function generateMedia({ breakpoints }: { breakpoints: Breakpoints }) {
  return [
    atRule(`custom-media --hover (hover: hover)`),
    atRule(`custom-media --mobile (width <= ${breakpoints.dt - 0.02}px)`),
    atRule(`custom-media --desktop (width >= ${breakpoints.dt}px)`),
    atRule(`custom-media --reduced-motion (prefers-reduced-motion: reduce)`),
  ].join("\n");
}
