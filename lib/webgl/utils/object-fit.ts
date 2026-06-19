export function objectFit(
  parentWidth = 1,
  parentHeight = 1,
  childWidth = 1,
  childHeight = 1,
  objectFit: 'contain' | 'cover' = 'cover'
) {
  if (!(parentWidth && parentHeight && childWidth && childHeight)) {
    return [1, 1]
  }

  const parentRatio = parentWidth / parentHeight
  const childRatio = childWidth / childHeight
  let width: number
  if (objectFit === 'contain') {
    width = parentRatio > childRatio ? parentHeight * childRatio : parentWidth
  } else if (objectFit === 'cover') {
    width = parentRatio > childRatio ? parentWidth : parentHeight * childRatio
  } else {
    return [1, 1]
  }
  const height = width / childRatio

  return [parentWidth / width, parentHeight / height]
}

export const OBJECT_FIT = /* glsl */ `
    vec2 objectFit(vec2 vUv, vec2 ratio) {

        vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );
        return uv;
    }
`
