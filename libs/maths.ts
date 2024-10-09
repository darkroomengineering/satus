function clamp(min: number, input: number, max: number) {
  return Math.max(min, Math.min(input, max))
}

function mapRange(
  in_min: number,
  in_max: number,
  input: number,
  out_min: number,
  out_max: number
) {
  return ((input - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}

function truncate(value: number, decimals: number) {
  return Number.parseFloat(value.toFixed(decimals))
}

function modulo(n: number, d: number) {
  if (d === 0) return n
  if (d < 0) return Number.NaN
  return ((n % d) + d) % d
}

const Maths = { lerp, clamp, mapRange, truncate, modulo }

export { clamp, lerp, mapRange, modulo, truncate }
export default Maths
