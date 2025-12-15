import type { Config } from '../config'
import { formatObject, scalingCalc } from './utils'

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
	--device-width: ${screens.mobile.width};
	--device-height: ${screens.mobile.height};
	
	${formatObject(layout, ([name, { mobile }]) => {
    if (name === 'columns') return `--columns: ${mobile};`

    return `--${name}: ${scalingCalc(mobile)};`
  })}
	
	${formatObject(customSizes, ([name, { mobile }]) => `--${name}: ${scalingCalc(mobile)};`)}

	--layout-width: calc(100vw - (2 * var(--safe)));
	--column-width: calc((var(--layout-width) - (var(--columns) - 1) * var(--gap)) / var(--columns));
	
	${formatObject(easings, ([name, value]) => `--ease-${name}: ${value};`)}
	
	${formatObject(colors, ([name, value]) => `--color-${name}: ${value};`)}
	
	@variant dt {
    --device-width: ${screens.desktop.width};
    --device-height: ${screens.desktop.height};

    ${formatObject(
      layout,
      ([name, { desktop }]) => {
        if (name === 'columns') return `--columns: ${desktop};`

        return `--${name}: ${scalingCalc(desktop)};`
      },
      '\n\t\t'
    )}

    ${formatObject(customSizes, ([name, { desktop }]) => `--${name}: ${scalingCalc(desktop)};`, '\n\t\t')}
	}
}
  `
}
