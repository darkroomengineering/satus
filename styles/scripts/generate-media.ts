import type { Config } from "../config";
import { atRule } from "./css";

export function generateMedia({ breakpoints }: Pick<Config, "breakpoints">) {
  return [
    atRule(`custom-media --hover (hover: hover)`),
    atRule(`custom-media --mobile (width <= ${breakpoints.dt - 0.02}px)`),
    atRule(`custom-media --desktop (width >= ${breakpoints.dt}px)`),
    atRule(`custom-media --reduced-motion (prefers-reduced-motion: reduce)`),
  ].join("\n");
}
