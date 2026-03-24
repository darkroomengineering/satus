/**
 * CSS code generation helpers.
 *
 * These are string formatting functions — not a CSS-in-JS runtime.
 * They produce readable, well-indented CSS strings for the style generators.
 */

/** `property: value;` */
export function prop(property: string, value: string | number): string {
  return `${property}: ${value};`;
}

/** `--name: value;` */
export function variable(name: string, value: string | number): string {
  return `--${name}: ${value};`;
}

/** Wraps lines in a block: `selector { ... }` */
export function block(selector: string, lines: string[]): string {
  const body = indent(lines).join("\n");
  return `${selector} {\n${body}\n}`;
}

/** `@rule;` or `@rule { ... }` */
export function atRule(rule: string, lines?: string[]): string {
  if (!lines) return `@${rule};`;
  return block(`@${rule}`, lines);
}

/** Comment: `/** text **\/` */
export function comment(text: string): string {
  return `/** ${text} **/`;
}

/** Indent lines by `level` tabs */
export function indent(lines: string[], level = 1): string[] {
  const prefix = "\t".repeat(level);
  return lines.map((line) => (line === "" ? "" : `${prefix}${line}`));
}

/**
 * Type-safe Object.entries mapper.
 * Unlike formatObject, this preserves the value type.
 */
export function mapEntries<V>(
  obj: Record<string, V>,
  fn: (key: string, value: V) => string | string[],
): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const result = fn(key, value);
    return Array.isArray(result) ? result : [result];
  });
}

/** Responsive scaling calc: `calc(((value * 100) / var(--device-width)) * 1vw)` */
export function scalingCalc(value: number): string {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`;
}

/** Maps an object to `--prefix-key: value;` lines */
export function variables(obj: Record<string, string | number>, prefix?: string): string[] {
  return mapEntries(obj, (key, value) =>
    prefix ? variable(`${prefix}-${key}`, value) : variable(key, value),
  );
}
