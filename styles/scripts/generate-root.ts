import type { Config } from '../config'

export function generateRoot({
  breakpoints,
  easings,
  headerHeight,
  layout,
  screens,
}: Pick<
  Config,
  'breakpoints' | 'easings' | 'headerHeight' | 'layout' | 'screens'
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
        return `--mobile-gap: ${fluidCalc(mobile)};\n\t--desktop-gap: ${fluidCalc(desktop)};`
      }

      if (name === 'space') {
        return `--mobile-space: ${fluidCalc(mobile)};\n\t--desktop-space: ${fluidCalc(desktop)};`
      }
    })
    .join('\n\n\t')}
	
	${Object.entries(headerHeight)
    .map(([name, value]) => `--${name}-header-height: ${fluidCalc(value)};`)
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

function fluidCalc(value: number) {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`
}
