import { defineRule } from '@oxlint/plugins'
import type { ESTree, SourceCode } from '@oxlint/plugins'

import {
  isStringLiteral,
  isUnshadowedGlobal,
} from '../shared/global-reference.ts'

const OBSERVER_HOOKS: ReadonlyMap<string, string> = new Map([
  ['ResizeObserver', 'useResizeObserver'],
  ['IntersectionObserver', 'useIntersectionObserver'],
])

const LISTENER_HOOKS: ReadonlyMap<string, string> = new Map([
  ['resize', 'useWindowSize or useResizeObserver'],
  ['scroll', 'useScrollTrigger or useLenis'],
])

function isWindowOrGlobal(
  sourceCode: SourceCode,
  object: ESTree.Expression
): boolean {
  if (object.type !== 'Identifier') return false
  return (
    (object.name === 'window' || object.name === 'globalThis') &&
    isUnshadowedGlobal(sourceCode, object)
  )
}

function staticName(callee: ESTree.Expression): string | null {
  if (callee.type !== 'MemberExpression' || callee.computed) return null
  if (callee.property.type === 'PrivateIdentifier') return null
  return callee.property.name
}

function firstStringArgument(node: ESTree.CallExpression): string | null {
  const [first] = node.arguments
  if (first === undefined || !isStringLiteral(first)) return null
  return first.value
}

/**
 * hamo shares one debounced ResizeObserver; each `new ResizeObserver` beside
 * it is one more observer firing on the same frame. `gsap.matchMedia()` is
 * not a browser call and is left alone.
 */
export const noRawObserverRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw ResizeObserver, IntersectionObserver, matchMedia and resize/scroll listeners; use the hamo hook.',
    },
    messages: {
      rawObserver:
        '`new {{name}}` duplicates hamo. Use `{{hook}}` so the site keeps one shared observer.',
      rawMatchMedia:
        '`matchMedia` outside hamo. Read the query from useDeviceDetection, adding it there if it is new (or usePreferredReducedMotion for the reduced-motion query).',
      rawListener:
        "A raw `{{event}}` listener runs outside the site's rAF loop. Use {{hook}}.",
    },
  },
  createOnce(context) {
    return {
      NewExpression(node) {
        if (node.callee.type !== 'Identifier') return
        const hook = OBSERVER_HOOKS.get(node.callee.name)
        if (hook === undefined) return
        if (!isUnshadowedGlobal(context.sourceCode, node.callee)) return
        context.report({
          node,
          messageId: 'rawObserver',
          data: { name: node.callee.name, hook },
        })
      },
      CallExpression(node) {
        const { callee } = node
        if (
          callee.type === 'Identifier' &&
          callee.name === 'matchMedia' &&
          isUnshadowedGlobal(context.sourceCode, callee)
        ) {
          context.report({ node, messageId: 'rawMatchMedia' })
          return
        }
        if (callee.type !== 'MemberExpression') return
        const name = staticName(callee)
        if (
          name === 'matchMedia' &&
          isWindowOrGlobal(context.sourceCode, callee.object)
        ) {
          context.report({ node, messageId: 'rawMatchMedia' })
          return
        }
        // Window only: element scroll containers aren't driven by Lenis.
        if (
          name === 'addEventListener' &&
          isWindowOrGlobal(context.sourceCode, callee.object)
        ) {
          const event = firstStringArgument(node)
          if (event === null) return
          const hook = LISTENER_HOOKS.get(event)
          if (hook === undefined) return
          context.report({
            node,
            messageId: 'rawListener',
            data: { event, hook },
          })
        }
      },
    }
  },
})
