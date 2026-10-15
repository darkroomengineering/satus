import { RuleTester } from 'oxlint/plugins-dev'

import { noClassStringVariableRule } from './no-class-string-variable.ts'

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: 'tsx' } },
})
const error = { messageId: 'classStringVariable' }

// Fixtures use classes this project's theme compiles: it has no default
// spacing scale, so `gap-4` or `p-2` are not classes here; `dr-*` are.
tester.run('styling/no-class-string-variable', noClassStringVariableRule, {
  valid: [
    "const label = 'Read more'",
    "const title = 'About the company'",
    "const sentence = 'Read more about the block'",
    "const single = 'flex'",
    "const ease = 'power2.out'",
    "const props = 'opacity transform'",
    "const selector = '.root .item'",
    "const query = '(min-width: 800px)'",
    'const groq = `*[_type == "homePage"][0]{ title }`',
    "const href = '/about/team'",
    "const copy = { label: 'Read more', href: '/about' }",
    'const icon = <svg className="shrink-0 uppercase" />',
    'function A() { return <div className="flex items-center dr-gap-4" /> }',
    "function A({ a }) { return <div className={cn('flex items-center', a && 'opacity-50 uppercase')} /> }",
    "const result = format('flex items-center')",
  ],
  invalid: [
    {
      name: 'plain const',
      code: "const base = 'flex items-center dr-gap-4'",
      errors: [error],
    },
    {
      name: 'one class the theme lacks',
      code: "const base = 'flex items-center gap-4 made-up'",
      errors: [error],
    },
    {
      name: 'exported',
      code: "export const base = 'flex items-center'",
      errors: [error],
    },
    { name: 'let', code: "let base = 'grid grid-cols-2'", errors: [error] },
    {
      name: 'template literal',
      code: 'const base = `flex ${x} items-center dr-gap-4`',
      errors: [error],
    },
    {
      name: 'as const',
      code: "const base = 'flex items-center' as const",
      errors: [error],
    },
    {
      name: 'variants',
      code: "const base = 'hidden dt:block hover:opacity-50'",
      errors: [error],
    },
    {
      name: 'house utilities',
      code: "const base = 'h1 dr-mt-24 desktop-only'",
      errors: [error],
    },
    {
      name: 'ternary',
      code: "const cls = active ? 'bg-black text-white' : 'bg-white text-black'",
      errors: [error, error],
    },
    {
      name: 'logical',
      code: "const cls = active && 'opacity-50 pointer-events-none'",
      errors: [error],
    },
    {
      name: 'cn result',
      code: "const cls = cn('flex items-center', active && 'opacity-50 pointer-events-none')",
      errors: [error, error],
    },
    {
      name: 'variant map',
      code: "const sizes = { sm: 'dr-px-2 dr-py-1', lg: 'dr-px-4 dr-py-2' }",
      errors: [error, error],
    },
    {
      name: 'nested map',
      code: "const styles = { button: { primary: 'bg-black text-white' } }",
      errors: [error],
    },
    {
      name: 'array',
      code: "const list = ['flex items-center', 'grid grid-cols-2']",
      errors: [error, error],
    },
    {
      name: 'inside component',
      code: "function A() { const base = 'flex items-center'; return <div className={base} /> }",
      errors: [error],
    },
  ],
})
