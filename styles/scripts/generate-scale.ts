import { atRule, comment } from "./css.ts";

// Text, border, and border-radius utilities that only need viewport scaling
const scaleUtilityMap: Record<string, string | string[]> = {
  // Text
  text: "font-size",
  tracking: "letter-spacing",
  leading: "line-height",
  // Border
  border: "border-width",
  "border-t": "border-top-width",
  "border-r": "border-right-width",
  "border-b": "border-bottom-width",
  "border-l": "border-left-width",
  rounded: "border-radius",
  "rounded-t": ["border-top-left-radius", "border-top-right-radius"],
  "rounded-r": ["border-top-right-radius", "border-bottom-right-radius"],
  "rounded-b": ["border-bottom-right-radius", "border-bottom-left-radius"],
  "rounded-l": ["border-bottom-left-radius", "border-top-left-radius"],
  "rounded-tl": "border-top-left-radius",
  "rounded-tr": "border-top-right-radius",
  "rounded-br": "border-bottom-right-radius",
  "rounded-bl": "border-bottom-left-radius",
};

// Sizing, spacing, and position utilities that also get column-based variants
const columnUtilityMap: Record<string, string> = {
  // Sizing
  w: "width",
  "min-w": "min-width",
  "max-w": "max-width",
  h: "height",
  "min-h": "min-height",
  "max-h": "max-height",
  gap: "gap",
  "gap-x": "column-gap",
  "gap-y": "row-gap",
  p: "padding",
  px: "padding-inline",
  py: "padding-block",
  pt: "padding-top",
  pr: "padding-right",
  pl: "padding-left",
  pb: "padding-bottom",
  m: "margin",
  mx: "margin-inline",
  my: "margin-block",
  mt: "margin-top",
  mr: "margin-right",
  ml: "margin-left",
  mb: "margin-bottom",
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
  inset: "inset",
  "inset-x": "inset-inline",
  "inset-y": "inset-block",
};

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function scaleDeclarations(properties: string[], calc: string): string[] {
  return properties.map((p) => `${p}: ${calc};`);
}

function scaleUtility(name: string, properties: string | string[]): string {
  const props = toArray(properties);

  return [
    atRule(
      `utility dr-${name}-*`,
      scaleDeclarations(props, "calc((--value(integer) * 100) / var(--device-width) * 1vw)"),
    ),
    atRule(
      `utility dr-${name}-px`,
      scaleDeclarations(props, "calc(100 / var(--device-width) * 1vw)"),
    ),
    atRule(
      `utility -dr-${name}-*`,
      scaleDeclarations(props, "calc((--value(integer) * -100) / var(--device-width) * 1vw)"),
    ),
    atRule(
      `utility -dr-${name}-px`,
      scaleDeclarations(props, "calc(-100 / var(--device-width) * 1vw)"),
    ),
  ].join("\n");
}

function columnScaleUtility(name: string, property: string): string {
  const colCalc =
    "calc((--value(integer) * var(--column-width)) + ((--value(integer) - 1) * var(--gap)))";
  const negColCalc =
    "calc((--value(integer) * -1 * var(--column-width)) + ((--value(integer) * -1 - 1) * var(--gap)))";

  return [
    atRule(`utility dr-${name}-col-*`, [`${property}: ${colCalc};`]),
    atRule(`utility -dr-${name}-col-*`, [`${property}: ${negColCalc};`]),
  ].join("\n");
}

export function generateScale(): string {
  const allProperties = { ...scaleUtilityMap, ...columnUtilityMap };

  const scale = Object.entries(allProperties)
    .map(([name, property]) => scaleUtility(name, property))
    .join("\n\n");

  const columnScale = Object.entries(columnUtilityMap)
    .map(([name, property]) => columnScaleUtility(name, property))
    .join("\n\n");

  return [comment("Custom function utilities"), scale, columnScale].join("\n\n");
}
