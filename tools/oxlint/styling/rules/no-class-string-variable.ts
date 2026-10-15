import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineRule } from '@oxlint/plugins'
import type { ESTree } from '@oxlint/plugins'
import { __unstable__loadDesignSystem } from '@tailwindcss/node'

const CLASS_FUNCTIONS: ReadonlySet<string> = new Set(['cn', 'clsx'])

// The same stylesheet oxfmt sorts against, so "is this a class" has one answer:
// Tailwind compiles each token against this project's theme and utilities.
const stylesheet = fileURLToPath(
  new URL('../../../../lib/styles/css/index.css', import.meta.url)
)
const designSystem = await __unstable__loadDesignSystem(
  readFileSync(stylesheet, 'utf8'),
  { base: dirname(stylesheet) }
)

/**
 * At least two tokens compile as classes and they are at least half the
 * string. Requiring every token would let one typo or theme-less class (`gap-4`
 * with no spacing scale) hide the whole list.
 */
function isClassList(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return false
  const classes = designSystem
    .candidatesToCss(tokens)
    .filter((css) => css !== null).length
  return classes >= 2 && classes * 2 >= tokens.length
}

function isStringLiteral(
  node: ESTree.Node
): node is ESTree.Node & { type: 'Literal'; value: string } {
  return node.type === 'Literal' && typeof node.value === 'string'
}

function templateText(node: ESTree.TemplateLiteral): string {
  return node.quasis.map((quasi) => quasi.value.cooked ?? '').join(' ')
}

/** Every string literal that ends up in the variable's value. */
function collectStrings(node: ESTree.Node, found: ESTree.Node[]): void {
  switch (node.type) {
    case 'Literal':
      if (isStringLiteral(node) && isClassList(node.value)) found.push(node)
      return
    case 'TemplateLiteral':
      if (isClassList(templateText(node))) found.push(node)
      return
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'ParenthesizedExpression':
      collectStrings(node.expression, found)
      return
    case 'ConditionalExpression':
      collectStrings(node.consequent, found)
      collectStrings(node.alternate, found)
      return
    case 'LogicalExpression':
      collectStrings(node.left, found)
      collectStrings(node.right, found)
      return
    case 'ObjectExpression':
      for (const property of node.properties) {
        if (property.type === 'Property') collectStrings(property.value, found)
      }
      return
    case 'ArrayExpression':
      for (const element of node.elements) {
        if (element !== null && element.type !== 'SpreadElement') {
          collectStrings(element, found)
        }
      }
      return
    case 'CallExpression':
      if (
        node.callee.type === 'Identifier' &&
        CLASS_FUNCTIONS.has(node.callee.name)
      ) {
        for (const argument of node.arguments) {
          if (argument.type !== 'SpreadElement') collectStrings(argument, found)
        }
      }
      return
    default:
      return
  }
}

/**
 * A class list held in a variable is outside the tools that check classes:
 * oxfmt sorts only `className` and `cn()`/`clsx()` arguments, Tailwind
 * IntelliSense reads only `className`, and nothing stops the variable being
 * exported or passed as a prop. A `cn()` result is sorted but still travels.
 */
export const noClassStringVariableRule = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow Tailwind class lists stored in variables; write them in className, extract a component, or use the CSS module.',
    },
    messages: {
      classStringVariable:
        'Tailwind classes in a variable can be reused, exported or passed as a prop, and outside `cn()` they skip oxfmt sorting and IntelliSense. Write them in `className` (with `cn()` for conditions), extract a component for repeated markup, or move them to the CSS module.',
    },
  },
  createOnce(context) {
    return {
      VariableDeclarator(node) {
        if (node.init === null) return
        const found: ESTree.Node[] = []
        collectStrings(node.init, found)
        for (const literal of found) {
          context.report({ node: literal, messageId: 'classStringVariable' })
        }
      },
    }
  },
})
