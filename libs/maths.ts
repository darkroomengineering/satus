function clamp(min: number, input: number, max: number) {
  return Math.max(min, Math.min(input, max))
}

function mapRange(
  inMin: number,
  inMax: number,
  input: number,
  outMin: number,
  outMax: number
) {
  return ((input - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

function lerp(start: number, end: number, amount: number) {
  return (1 - amount) * start + amount * end
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
