/**
 * Creates a fluid utility CSS rule
 * @param {string} name - The name of the utility
 * @param {string|string[]} properties - CSS property or properties to make fluid
 * @returns {string} The generated CSS utility rule
 */
function fluidUtility(name, properties) {
  const propertiesArray = Array.isArray(properties) ? properties : [properties]
  return `@utility f${name}-* {
	${propertiesArray
    .map(
      (property) =>
        `${property}: calc(((--value(integer) * 100) / var(--device-width)) * min(1vw, var(--max-width) / 100 * 1px));`
    )
    .join('\n')}
}`
}

/**
 * Map of fluid utility names to CSS properties
 * @type {Record<string, string | string[]>}
 */
const utilityMap = {
  w: 'width',
  h: 'height',
  text: 'font-size',
  gap: 'gap',
  'gap-x': 'column-gap',
  'gap-y': 'row-gap',
  p: 'padding',
  px: 'padding-inline',
  py: 'padding-block',
  pt: 'padding-top',
  pr: 'padding-right',
  pl: 'padding-left',
  pb: 'padding-bottom',
}

export function generateFluid() {
  return Object.entries(utilityMap)
    .map(([name, property]) => fluidUtility(name, property))
    .join('\n\n')
}
