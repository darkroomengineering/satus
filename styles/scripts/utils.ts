export function scalingCalc(value: number) {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`
}
