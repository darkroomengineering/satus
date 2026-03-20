export function scalingCalc(value: number) {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`;
}

/**
 * Format an object into a string of CSS variables
 * @param obj - The object to format
 * @param mapper - A function that maps the object's entries to a string
 * @param joiner - The string to join the mapped entries with
 * @returns A string of CSS variables
 */
export function formatObject(
  obj: Record<string, unknown>,
  mapper: (args: [string, unknown]) => string,
  joiner = "\n\t",
) {
  return Object.entries(obj).map(mapper).join(joiner);
}
