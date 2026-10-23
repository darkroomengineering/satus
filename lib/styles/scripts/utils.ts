export function scalingCalc(value: number) {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`
}

/** Maps an object's entries to strings (CSS variables) joined by `joiner`. */
export function formatObject<Obj extends object>(
  obj: Obj,
  mapper: (args: [key: keyof Obj, value: Obj[keyof Obj]]) => string,
  joiner = '\n\t'
) {
  // SAFETY: Object.entries()'s built-in typing widens keys to `string`;
  // the entries it returns are exactly `obj`'s own keys, i.e. `keyof Obj`.
  return (Object.entries(obj) as [keyof Obj, Obj[keyof Obj]][])
    .map(mapper)
    .join(joiner)
}
