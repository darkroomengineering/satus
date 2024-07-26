import { useMemo } from 'react'

export function useObjectFit(
  parentWidth = 1,
  parentHeight = 1,
  childWidth = 1,
  childHeight = 1,
  objectFit = 'cover',
  deps = [],
) {
  const [width, height] = useMemo(() => {
    if (!parentWidth || !parentHeight || !childWidth || !childHeight)
      return [1, 1]
    const parentRatio = parentWidth / parentHeight
    const childRatio = childWidth / childHeight
    let width
    if (objectFit === 'contain') {
      width = parentRatio > childRatio ? parentHeight * childRatio : parentWidth
    } else if (objectFit === 'cover') {
      width = parentRatio > childRatio ? parentWidth : parentHeight * childRatio
    } else {
      return [1, 1]
    }
    const height = width / childRatio
    return [parentWidth / width, parentHeight / height]
  }, [parentWidth, parentHeight, childHeight, childWidth, objectFit, ...deps])

  return [1 / width, 1 / height]
}
