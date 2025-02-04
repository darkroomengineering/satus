/**
 * Map of fluid utility names to CSS properties
 * @type {Record<string, string | string[]>}
 */
const utilityMap = {
  // Sizing
  w: 'width',
  'min-w': 'min-width',
  'max-w': 'max-width',
  h: 'height',
  'min-h': 'min-height',
  'max-h': 'max-height',
  // Text
  text: 'font-size',
  tracking: 'letter-spacing',
  leading: 'line-height',
  // Border
  border: 'border-width',
  'border-t': 'border-top-width',
  'border-r': 'border-right-width',
  'border-b': 'border-bottom-width',
  'border-l': 'border-left-width',
  // Border radius
  rounded: 'border-radius',
  'rounded-t': ['border-top-left-radius', 'border-top-right-radius'],
  'rounded-r': ['border-top-right-radius', 'border-bottom-right-radius'],
  'rounded-b': ['border-bottom-right-radius', 'border-bottom-left-radius'],
  'rounded-l': ['border-bottom-left-radius', 'border-top-left-radius'],
  'rounded-tl': 'border-top-left-radius',
  'rounded-tr': 'border-top-right-radius',
  'rounded-br': 'border-bottom-right-radius',
  'rounded-bl': 'border-bottom-left-radius',
  // Gap
  gap: 'gap',
  'gap-x': 'column-gap',
  'gap-y': 'row-gap',
  // Padding
  p: 'padding',
  px: 'padding-inline',
  py: 'padding-block',
  pt: 'padding-top',
  pr: 'padding-right',
  pl: 'padding-left',
  pb: 'padding-bottom',
  // Margin
  m: 'margin',
  mx: 'margin-inline',
  my: 'margin-block',
  mt: 'margin-top',
  mr: 'margin-right',
  ml: 'margin-left',
  mb: 'margin-bottom',
  // Position
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
  inset: 'inset',
  'inset-x': 'inset-inline',
  'inset-y': 'inset-block',
}

/**
 * Creates a fluid utility CSS rule
 * @param {string} name - The name of the utility
 * @param {string|string[]} properties - CSS property or properties to make fluid
 * @returns {string} The generated CSS utility rule
 */
function fluidUtility(name, properties) {
  const propertiesArray = Array.isArray(properties) ? properties : [properties]
  const utility = `@utility s${name}-* {
	${propertiesArray
    .map(
      (property) =>
        `${property}: calc((--value(integer) * 100) / var(--device-width));`
    )
    .join('\n')}
}`

  const negatedUtility = utility
    .replace('@utility s', '@utility -s')
    .replace('--value(integer)', '--value(integer) * -1')

  return `${utility}\n${negatedUtility}`
}

export function generateFluid() {
  return Object.entries(utilityMap)
    .map(([name, property]) => fluidUtility(name, property))
    .join('\n\n')
}
