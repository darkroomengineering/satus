import type { Colors } from "../colors";
import type { Easings } from "../easings";
import type { CustomSizes, Layout, Screens } from "../layout";
import { atRule, block, mapEntries, prop, scalingCalc, variable } from "./css.ts";

export function generateRoot({
  colors,
  customSizes,
  easings,
  layout,
  screens,
}: {
  colors: Colors;
  customSizes: CustomSizes;
  easings: Easings;
  layout: Layout;
  screens: Screens;
}) {
  return block(":root", [
    // Device dimensions
    variable("device-width", screens.mobile.width),
    variable("device-height", screens.mobile.height),
    "",
    // Layout
    variable("columns", layout.columns.mobile),
    variable("gap", scalingCalc(layout.gap.mobile)),
    variable("safe", scalingCalc(layout.safe.mobile)),
    ...mapEntries(customSizes, (name, v) => variable(name, scalingCalc(v.mobile))),
    "",
    // Computed layout
    prop("--layout-width", "calc(100vw - (2 * var(--safe)))"),
    prop(
      "--column-width",
      "calc((var(--layout-width) - (var(--columns) - 1) * var(--gap)) / var(--columns))",
    ),
    "",
    // Easings
    ...mapEntries(easings, (name, value) => variable(`ease-${name}`, value)),
    "",
    // Colors
    ...mapEntries(colors, (name, value) => variable(`color-${name}`, value)),
    "",
    // Desktop overrides
    atRule("variant dt", [
      variable("device-width", screens.desktop.width),
      variable("device-height", screens.desktop.height),
      "",
      variable("columns", layout.columns.desktop),
      variable("gap", scalingCalc(layout.gap.desktop)),
      variable("safe", scalingCalc(layout.safe.desktop)),
      ...mapEntries(customSizes, (name, v) => variable(name, scalingCalc(v.desktop))),
    ]),
  ]);
}
