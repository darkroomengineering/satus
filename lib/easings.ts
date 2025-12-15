// https://github.com/ai/easings.net/blob/master/src/easings/easingsFunctions.ts

const pow = Math.pow
const sqrt = Math.sqrt
const sin = Math.sin
const cos = Math.cos
const PI = Math.PI
const c1 = 1.70158
const c2 = c1 * 1.525
const c3 = c1 + 1
const c4 = (2 * PI) / 3
const c5 = (2 * PI) / 4.5

const bounceOut = (x: number) => {
  const n1 = 7.5625
  const d1 = 2.75

  if (x < 1 / d1) {
    return n1 * x * x
  }
  if (x < 2 / d1) {
    return n1 * (x - 1.5 / d1) * x + 0.75
  }
  if (x < 2.5 / d1) {
    return n1 * (x - 2.25 / d1) * x + 0.9375
  }
  return n1 * (x - 2.625 / d1) * x + 0.984375
}

export const easings = {
  linear: (x: number) => x,
  easeInQuad: (x: number) => x * x,
  easeOutQuad: (x: number) => 1 - (1 - x) * (1 - x),
  easeInOutQuad: (x: number) =>
    x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2,
  easeInCubic: (x: number) => x * x * x,
  easeOutCubic: (x: number) => 1 - pow(1 - x, 3),
  easeInOutCubic: (x: number) =>
    x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2,
  easeInQuart: (x: number) => x * x * x * x,
  easeOutQuart: (x: number) => 1 - pow(1 - x, 4),
  easeInOutQuart: (x: number) =>
    x < 0.5 ? 8 * x * x * x * x : 1 - pow(-2 * x + 2, 4) / 2,
  easeInQuint: (x: number) => x * x * x * x * x,
  easeOutQuint: (x: number) => 1 - pow(1 - x, 5),
  easeInOutQuint: (x: number) =>
    x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2,
  easeInSine: (x: number) => 1 - cos((x * PI) / 2),
  easeOutSine: (x: number) => sin((x * PI) / 2),
  easeInOutSine: (x: number) => -(cos(PI * x) - 1) / 2,
  easeInExpo: (x: number) => (x === 0 ? 0 : pow(2, 10 * x - 10)),
  easeOutExpo: (x: number) => (x === 1 ? 1 : 1 - pow(2, -10 * x)),
  easeInOutExpo: (x: number) => {
    if (x === 0) return 0
    if (x === 1) return 1
    if (x < 0.5) return pow(2, 20 * x - 10) / 2
    return (2 - pow(2, -20 * x + 10)) / 2
  },
  easeInCirc: (x: number) => 1 - sqrt(1 - pow(x, 2)),
  easeOutCirc: (x: number) => sqrt(1 - pow(x - 1, 2)),
  easeInOutCirc: (x: number) =>
    x < 0.5
      ? (1 - sqrt(1 - pow(2 * x, 2))) / 2
      : (sqrt(1 - pow(-2 * x + 2, 2)) + 1) / 2,
  easeInBack: (x: number) => c3 * x * x * x - c1 * x * x,
  easeOutBack: (x: number) => 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2),
  easeInOutBack: (x: number) =>
    x < 0.5
      ? (pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2,
  easeInElastic: (x: number) => {
    if (x === 0) return 0
    if (x === 1) return 1
    return -pow(2, 10 * x - 10) * sin((x * 10 - 10.75) * c4)
  },
  easeOutElastic: (x: number) => {
    if (x === 0) return 0
    if (x === 1) return 1
    return pow(2, -10 * x) * sin((x * 10 - 0.75) * c4) + 1
  },
  easeInOutElastic: (x: number) => {
    if (x === 0) return 0
    if (x === 1) return 1
    if (x < 0.5) return -(pow(2, 20 * x - 10) * sin((20 * x - 11.125) * c5)) / 2
    return (pow(2, -20 * x + 10) * sin((20 * x - 11.125) * c5)) / 2 + 1
  },
  easeInBounce: (x: number) => 1 - bounceOut(1 - x),
  easeOutBounce: bounceOut,
  easeInOutBounce: (x: number) =>
    x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2,
}
