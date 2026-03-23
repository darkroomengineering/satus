import type { Colors, Themes } from "../colors";
import type { Easings } from "../easings";
import type { Breakpoints, CustomSizes } from "../layout";
import type { Fonts, Typography } from "../typography";
import { atRule, block, comment, mapEntries, prop, scalingCalc, variables } from "./css";

export function generateTailwind({
  breakpoints,
  colors,
  customSizes,
  easings,
  fonts,
  themes,
  typography,
}: {
  breakpoints: Breakpoints;
  colors: Colors;
  customSizes: CustomSizes;
  easings: Easings;
  fonts: Fonts;
  themes: Themes;
  typography: Typography;
}) {
  const firstTheme = Object.values(themes)[0] ?? {};

  // @theme block — registers design tokens with Tailwind
  const theme = atRule("theme", [
    // Breakpoints
    "--breakpoint-*: initial;",
    ...mapEntries(breakpoints, (name, value) => `--breakpoint-${name}: ${value}px;`),
    "",
    // Colors (default theme + base palette)
    "--color-*: initial;",
    ...variables(firstTheme, "color"),
    ...variables(colors, "color"),
    "",
    // Spacing
    "--spacing-*: initial;",
    "--spacing-0: 0;",
    "--spacing-safe: var(--safe);",
    "--spacing-gap: var(--gap);",
    ...mapEntries(customSizes, (key) => `--spacing-${key}: var(--${key});`),
    "",
    // Fonts
    "--font-*: initial;",
    ...mapEntries(fonts, (name, value) => `--font-${name}: ${value};`),
    "",
    // Easings
    "--ease-*: initial;",
    ...variables(easings, "ease"),
  ]);

  // Theme overwrites: [data-theme=name] { --color-*: value; }
  const themeOverwrites = [
    comment("Custom theme overwrites"),
    ...mapEntries(themes, (name, value) => block(`[data-theme=${name}]`, variables(value, "color"))),
  ].join("\n");

  // Typography utilities
  const typographyUtilities = mapEntries(typography, (name, style) => {
    const declarations = Object.entries(style)
      .filter(([, v]) => v !== undefined && v !== null)
      .flatMap(([key, value]) => {
        if (key === "font-size") {
          if (typeof value === "number") return [`@apply dr-text-${value};`];
          const v = value as { mobile: number; desktop: number };
          return [
            prop("font-size", scalingCalc(v.mobile)),
            atRule(`variant dt`, [prop("font-size", scalingCalc(v.desktop))]),
          ];
        }
        if (typeof value === "object" && value !== null) {
          const v = value as { mobile: string; desktop: string };
          return [
            prop(key, v.mobile),
            atRule(`variant dt`, [prop(key, v.desktop)]),
          ];
        }
        return [prop(key, String(value))];
      });

    return atRule(`utility ${name}`, declarations);
  });

  const utilities = [
    comment("Custom static utilities"),
    // Typography presets
    ...typographyUtilities,
    "",
    // Responsive visibility
    atRule("utility desktop-only", [
      atRule("media (--mobile)", ["display: none !important;"]),
    ]),
    atRule("utility mobile-only", [
      atRule("media (--desktop)", ["display: none !important;"]),
    ]),
    "",
    // Layout grid
    atRule("utility dr-grid", [
      "display: grid;",
      "grid-template-columns: repeat(var(--columns), 1fr);",
      "column-gap: var(--gap);",
    ]),
    atRule("utility dr-layout-block", [
      "margin-inline: auto;",
      "width: calc(100% - 2 * var(--safe));",
    ]),
    atRule("utility dr-layout-block-inner", [
      "padding-inline: var(--safe);",
      "width: 100%;",
    ]),
    atRule("utility dr-layout-grid", [
      "@apply dr-layout-block dr-grid;",
    ]),
    atRule("utility dr-layout-grid-inner", [
      "@apply dr-layout-block-inner dr-grid;",
    ]),
  ].join("\n");

  // Custom variants
  const variants = [
    comment("Custom variants"),
    ...mapEntries(
      themes,
      (name) =>
        `@custom-variant ${name} (&:where([data-theme=${name}], [data-theme=${name}] *));`,
    ),
  ].join("\n");

  return [theme, themeOverwrites, utilities, variants].join("\n\n");
}
