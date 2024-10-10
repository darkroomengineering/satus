// maths.ts

// Function type declarations
type ClampFunction = (min: number, input: number, max: number) => number
type MapRangeFunction = (
  in_min: number,
  in_max: number,
  input: number,
  out_min: number,
  out_max: number
) => number
type LerpFunction = (start: number, end: number, amt: number) => number
type TruncateFunction = (value: number, decimals: number) => number
type ModuloFunction = (n: number, d: number) => number

// Interface for the Maths object
interface Maths {
  lerp: LerpFunction
  clamp: ClampFunction
  mapRange: MapRangeFunction
  truncate: TruncateFunction
  modulo: ModuloFunction
}

// Function implementations
const clamp: ClampFunction = (min, input, max) => {
  return Math.max(min, Math.min(input, max))
}

const mapRange: MapRangeFunction = (
  in_min,
  in_max,
  input,
  out_min,
  out_max
) => {
  return ((input - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}

const lerp: LerpFunction = (start, end, amt) => {
  return (1 - amt) * start + amt * end
}

const truncate: TruncateFunction = (value, decimals) => {
  return Number.parseFloat(value.toFixed(decimals))
}

const modulo: ModuloFunction = (n, d) => {
  if (d === 0) return n
  if (d < 0) return Number.NaN
  return ((n % d) + d) % d
}

// Maths object
const Maths: Maths = { lerp, clamp, mapRange, truncate, modulo }

export { clamp, lerp, mapRange, modulo, truncate }
export default Maths
