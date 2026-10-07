import { defineRule } from '@oxlint/plugins'
import type { ESTree } from '@oxlint/plugins'

import {
  isStringLiteral,
  isUnshadowedGlobal,
} from '../shared/global-reference.ts'

/** Reads that force a synchronous style/layout flush, mapped to the hamo replacement. */
const LAYOUT_READS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    getBoundingClientRect: 'useRect',
    getClientRects: 'useRect',
    offsetTop: 'useRect',
    offsetLeft: 'useRect',
    offsetWidth: 'useResizeObserver',
    offsetHeight: 'useResizeObserver',
    offsetParent: 'useRect',
    clientWidth: 'useResizeObserver',
    clientHeight: 'useResizeObserver',
    clientTop: 'useRect',
    clientLeft: 'useRect',
    scrollWidth: 'useResizeObserver',
    scrollHeight: 'useResizeObserver',
    scrollTop: 'useScrollTrigger (or lenis.scroll)',
    scrollLeft: 'useScrollTrigger (or lenis.scroll)',
    innerWidth: 'useWindowSize',
    innerHeight: 'useWindowSize',
    outerWidth: 'useWindowSize',
    outerHeight: 'useWindowSize',
    scrollX: 'useScrollTrigger (or lenis.scroll)',
    scrollY: 'useScrollTrigger (or lenis.scroll)',
    pageXOffset: 'useScrollTrigger (or lenis.scroll)',
    pageYOffset: 'useScrollTrigger (or lenis.scroll)',
    getComputedStyle: 'a CSS custom property read once, or useResizeObserver',
    computedStyleMap: 'a CSS custom property read once, or useResizeObserver',
    elementFromPoint: 'useRect plus pointer coordinates',
    checkVisibility: 'useIntersectionObserver',
    getBBox: 'useRect',
    scrollIntoView: 'lenis.scrollTo',
  })
)

/** Window properties that read as bare globals: `scrollY` for `window.scrollY`. */
const WINDOW_GLOBALS = new Set([
  'innerWidth',
  'innerHeight',
  'outerWidth',
  'outerHeight',
  'scrollX',
  'scrollY',
  'pageXOffset',
  'pageYOffset',
])

function isPropertyPosition(node: ESTree.Node): boolean {
  const { parent } = node
  if (parent === null) return false
  if (parent.type === 'MemberExpression') {
    return !parent.computed && parent.property === node
  }
  if (parent.type === 'Property') {
    return !parent.computed && parent.key === node
  }
  return false
}

function propertyName(node: ESTree.MemberExpression): string | null {
  if (node.computed) {
    return isStringLiteral(node.property) ? node.property.value : null
  }
  if (node.property.type === 'PrivateIdentifier') return null
  return node.property.name
}

function isAssignmentTarget(node: ESTree.MemberExpression): boolean {
  const { parent } = node
  return (
    (parent.type === 'AssignmentExpression' && parent.left === node) ||
    parent.type === 'UpdateExpression'
  )
}

/**
 * hamo measures on a shared, debounced ResizeObserver, so the read happens
 * once per resize instead of once per frame. A genuine one-off read outside
 * any loop can stay behind an `oxlint-disable-next-line` that says why.
 */
export const noRawLayoutReadRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow DOM reads that force synchronous layout; use the hamo hook that caches the same value.',
    },
    messages: {
      layoutRead:
        '`{{name}}` forces a synchronous layout. Read it through hamo ({{hook}}) so it is measured once per resize, or justify the raw read with a disable comment.',
    },
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const name = propertyName(node)
        if (name === null) return
        const hook = LAYOUT_READS.get(name)
        if (hook === undefined) return
        if (isAssignmentTarget(node)) return
        context.report({ node, messageId: 'layoutRead', data: { name, hook } })
      },
      Identifier(node) {
        // Bare `scrollY` with no `window.` in front.
        if (!WINDOW_GLOBALS.has(node.name)) return
        if (isPropertyPosition(node)) return
        if (!isUnshadowedGlobal(context.sourceCode, node)) return
        context.report({
          node,
          messageId: 'layoutRead',
          data: {
            name: node.name,
            hook: LAYOUT_READS.get(node.name) ?? 'hamo',
          },
        })
      },
      CallExpression(node) {
        // Bare `getComputedStyle(el)` with no `window.` in front.
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'getComputedStyle' &&
          isUnshadowedGlobal(context.sourceCode, node.callee)
        ) {
          context.report({
            node,
            messageId: 'layoutRead',
            data: {
              name: 'getComputedStyle',
              hook: LAYOUT_READS.get('getComputedStyle') ?? 'hamo',
            },
          })
        }
      },
    }
  },
})
