function clamp(min, input, max) {
  return input < min ? min : input > max ? max : input
}

function mapRange(in_min, in_max, input, out_min, out_max) {
  return ((input - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end
}

function trunc(value, decimals) {
  const multiplier = Math.pow(10, decimals)
  return Math.floor(value * multiplier) / multiplier
}

const Maths = { lerp, clamp, mapRange, trunc }

export { lerp, clamp, mapRange, trunc }
export default Maths
