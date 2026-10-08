import { eslintCompatPlugin } from '@oxlint/plugins'

import { noRawLayoutReadRule } from './rules/no-raw-layout-read.ts'
import { noRawObserverRule } from './rules/no-raw-observer.ts'

/** Routes layout measurement through hamo instead of raw DOM and window reads. */
const hamoPlugin = eslintCompatPlugin({
  meta: { name: 'hamo' },
  rules: {
    'no-raw-layout-read': noRawLayoutReadRule,
    'no-raw-observer': noRawObserverRule,
  },
})

export default hamoPlugin
