import { eslintCompatPlugin } from '@oxlint/plugins'

import { noClassStringVariableRule } from './rules/no-class-string-variable.ts'

/** Keeps styling in the two sanctioned places: Tailwind in markup and CSS modules. */
const stylingPlugin = eslintCompatPlugin({
  meta: { name: 'styling' },
  rules: {
    'no-class-string-variable': noClassStringVariableRule,
  },
})

export default stylingPlugin
