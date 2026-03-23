import type { Config } from "../config";

export function generateMedia({
  breakpoints,
}: Pick<Config, "breakpoints">) {
  return `@custom-media --hover (hover: hover);
@custom-media --mobile (width <= ${breakpoints.dt - 0.02}px);
@custom-media --desktop (width >= ${breakpoints.dt}px);
@custom-media --reduced-motion (prefers-reduced-motion: reduce);`;
}
