import type { Config } from '../config'
import { scalingCalc } from './utils'

export function generateRoot({
  breakpoints,
  colors,
  easings,
  headerHeight,
  layout,
  screens,
}: Pick<
  Config,
  'breakpoints' | 'colors' | 'easings' | 'headerHeight' | 'layout' | 'screens'
>) {
  return `@custom-media --hover (hover: hover);
@custom-media --mobile (width <= ${breakpoints.dt - 0.02}px);
@custom-media --desktop (width >= ${breakpoints.dt}px);
@custom-media --reduced-motion (prefers-reduced-motion: reduce);

:root {
	${Object.entries(screens)
    .map(
      ([name, { width, height }]) =>
        `--${name}-width: ${width};\n\t--${name}-height: ${height};`
    )
    .join('\n\n\t')}
	
	${Object.entries(layout)
    .map(([name, { mobile, desktop }]) => {
      if (name === 'columns') {
        return `--mobile-columns: ${mobile};\n\t--desktop-columns: ${desktop};`
      }

      if (name === 'gap') {
        return `--mobile-gap: ${scalingCalc(mobile)};\n\t--desktop-gap: ${scalingCalc(desktop)};`
      }

      if (name === 'space') {
        return `--mobile-space: ${scalingCalc(mobile)};\n\t--desktop-space: ${scalingCalc(desktop)};`
      }
    })
    .join('\n\n\t')}
	
	${Object.entries(headerHeight)
    .map(([name, value]) => `--${name}-header-height: ${scalingCalc(value)};`)
    .join('\n\t')}
	
	--device-width: var(--mobile-width);
	--device-height: var(--mobile-height);
	--columns: var(--mobile-columns);
	--gap: var(--mobile-gap);
	--space: var(--mobile-space);
	--header-height: var(--mobile-header-height);

	--layout-width: calc(100vw - (2 * var(--space)));
	--column-width: calc((var(--layout-width) - (var(--columns) - 1) * var(--gap)) / var(--columns));
	
	${Object.entries(easings)
    .map(([name, value]) => `--ease-${name}: ${value};`)
    .join('\n\t')}
	
	${Object.entries(colors)
    .map(([name, value]) => `--color-${name}: ${value};`)
    .join('\n\t')}
	
	@variant dt {
		--device-width: var(--desktop-width);
		--device-height: var(--desktop-height);
		--columns: var(--desktop-columns);
		--gap: var(--desktop-gap);
		--space: var(--desktop-space);
		--header-height: var(--desktop-header-height);
	}
}
  `
}
