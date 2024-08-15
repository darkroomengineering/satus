function clamp(min, input, max) {
  return Math.max(min, Math.min(input, max))
}

function mapRange(in_min, in_max, input, out_min, out_max) {
  return ((input - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end
}

function truncate(value, decimals) {
  return parseFloat(value.toFixed(decimals))
}

function modulo(n, d) {
  if (d === 0) return n
  if (d < 0) return NaN
  return ((n % d) + d) % d
}

const Maths = { lerp, clamp, mapRange, truncate, modulo }

export { clamp, lerp, mapRange, modulo, truncate }
export default Maths
