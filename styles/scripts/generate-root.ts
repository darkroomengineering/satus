import type { Config } from '../config'
import { scalingCalc } from './utils'

export function generateRoot({
  breakpoints,
  colors,
  customSizes,
  easings,
  layout,
  screens,
}: Pick<
  Config,
  'breakpoints' | 'colors' | 'customSizes' | 'easings' | 'layout' | 'screens'
>) {
  return `@custom-media --hover (hover: hover);
@custom-media --mobile (width <= ${breakpoints.dt - 0.02}px);
@custom-media --desktop (width >= ${breakpoints.dt}px);
@custom-media --reduced-motion (prefers-reduced-motion: reduce);

:root {
	--device-width: ${screens.mobile.width}px;
	--device-height: ${screens.mobile.height}px;
	
	${Object.entries(layout)
    .map(([name, { mobile }]) => {
      if (name === 'columns') return `--columns: ${mobile};`

      return `--${name}: ${scalingCalc(mobile)};`
    })
    .join('\n\t')}
	
	${Object.entries(customSizes)
    .map(([name, { mobile }]) => `--${name}: ${scalingCalc(mobile)};`)
    .join('\n\t')}

	--layout-width: calc(100vw - (2 * var(--space)));
	--column-width: calc((var(--layout-width) - (var(--columns) - 1) * var(--gap)) / var(--columns));
	
	${Object.entries(easings)
    .map(([name, value]) => `--ease-${name}: ${value};`)
    .join('\n\t')}
	
	${Object.entries(colors)
    .map(([name, value]) => `--color-${name}: ${value};`)
    .join('\n\t')}
	
	@variant dt {
    --device-width: ${screens.desktop.width};
    --device-height: ${screens.desktop.height};

    ${Object.entries(layout)
      .map(([name, { desktop }]) => {
        if (name === 'columns') return `--columns: ${desktop};`

        return `--${name}: ${scalingCalc(desktop)};`
      })
      .join('\n\t\t')}

    ${Object.entries(customSizes)
      .map(([name, { desktop }]) => `--${name}: ${scalingCalc(desktop)};`)
      .join('\n\t')}
	}
}
  `
}
