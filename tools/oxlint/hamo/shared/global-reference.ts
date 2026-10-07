import type { ESTree, Scope, SourceCode } from '@oxlint/plugins'

export function isStringLiteral(
  node: ESTree.Node
): node is ESTree.Node & { type: 'Literal'; value: string } {
  return node.type === 'Literal' && typeof node.value === 'string'
}

/**
 * `isGlobalReference` only knows globals the lint env declares, so fall back
 * to the scope chain: a name no enclosing scope declares must be the global.
 */
export function isUnshadowedGlobal(
  sourceCode: SourceCode,
  identifier: ESTree.Node & { name: string }
): boolean {
  if (sourceCode.isGlobalReference(identifier)) return true
  let scope: Scope | null = sourceCode.getScope(identifier)
  while (scope !== null) {
    if (scope.set.has(identifier.name)) return false
    scope = scope.upper
  }
  return true
}
