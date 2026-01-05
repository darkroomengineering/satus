const scaleUtilityMap = {
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
}

const columnUtilityMap = {
  // Sizing
  w: 'width',
  'min-w': 'min-width',
  'max-w': 'max-width',
  h: 'height',
  'min-h': 'min-height',
  'max-h': 'max-height',
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

function scaleUtility(name: string, properties: string | string[]) {
  const propertiesArray = Array.isArray(properties) ? properties : [properties]
  const utility = `@utility dr-${name}-* {
	${propertiesArray
    .map(
      (property) =>
        `${property}: calc((--value(integer) * 100) / var(--device-width) * 1vw);`
    )
    .join('\n')}
}`

  const autoCompleteUtility = `@utility dr-${name}-px {
	${propertiesArray
    .map((property) => `${property}: calc(100 / var(--device-width) * 1vw);`)
    .join('\n')}
}`

  const negatedUtility = utility
    .replace('@utility ', '@utility -')
    .replace('--value(integer) * 100', '--value(integer) * -100')

  const negatedAutoCompleteUtility = autoCompleteUtility
    .replace('@utility ', '@utility -')
    .replace('100', '-100')

  return `${utility}\n${autoCompleteUtility}\n${negatedUtility}\n${negatedAutoCompleteUtility}`
}

function columnScaleUtility(name: string, properties: string | string[]) {
  const propertiesArray = Array.isArray(properties) ? properties : [properties]
  const utility = `@utility dr-${name}-col-* {
	${propertiesArray
    .map(
      (property) =>
        `${property}: calc((--value(integer) * var(--column-width)) + ((--value(integer) - 1) * var(--gap)));`
    )
    .join('\n')}
}`

  const autoCompleteUtility = `@utility dr-${name}-col-value {
	${propertiesArray
    .map(
      (property) =>
        `${property}: calc((value * var(--column-width)) + ((value - 1) * var(--gap)));`
    )
    .join('\n')}
}`

  const negatedUtility = utility
    .replace('@utility ', '@utility -')
    .replace('--value(integer)', '--value(integer) * -1')

  const negatedAutoCompleteUtility = autoCompleteUtility
    .replace('@utility ', '@utility -')
    .replace('value', '-value')

  return `${utility}\n${autoCompleteUtility}\n${negatedUtility}\n${negatedAutoCompleteUtility}`
}

export function generateScale() {
  const scale = Object.entries({ ...scaleUtilityMap, ...columnUtilityMap })
    .map(([name, property]) => scaleUtility(name, property))
    .join('\n\n')

  const columnScale = Object.entries(columnUtilityMap)
    .map(([name, property]) => columnScaleUtility(name, property))
    .join('\n\n')

  return `/** Custom function utilities **/\n${scale}\n\n${columnScale}`
}
