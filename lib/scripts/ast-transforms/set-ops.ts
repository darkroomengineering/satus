/**
 * Mutating AST operation handlers — overwrite an existing value in place.
 *
 * Unlike the additive handlers in `add-ops.ts`, these never create a
 * construct that doesn't already exist.
 */

import { Node, type Project, SyntaxKind } from 'ts-morph'

import type {
  SetObjectPropertyOp,
  SyncUnusedParameterPrefixOp,
} from '../ast-operation-types'
import { resolvePropertyPath, withSourceFile } from './helpers'

/**
 * Set an existing property's value in an object literal at
 * `variableName`.`propertyPath` (dot-separated — walks nested object
 * properties down to the parent of the final segment, e.g.
 * `'experimental.cachedNavigations'` resolves `experimental` as the parent
 * object literal and sets its `cachedNavigations` property).
 *
 * No-op — returns `sourceText` unchanged — when:
 *  - `variableName` isn't found, or its initializer isn't an object literal
 *  - any parent segment of `propertyPath` doesn't resolve to a nested
 *    object literal (reuses `resolvePropertyPath`'s traversal for this)
 *  - the final path segment doesn't name an existing property on that object
 *    (this op only ever overwrites — it never creates a missing property)
 *  - the property's current initializer text already equals `op.valueText`
 *    (idempotent — reapplying with the same value is a byte-for-byte no-op)
 */
export function applySetObjectProperty(
  project: Project,
  sourceText: string,
  op: SetObjectPropertyOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const parts = op.propertyPath.split('.')
    const lastPart = parts.pop()
    if (!lastPart) return sourceText
    const parentPath = parts.join('.')

    const parentNode =
      parentPath === ''
        ? sf
            .getVariableDeclarations()
            .find((v) => v.getName() === op.variableName)
            ?.getInitializer()
        : resolvePropertyPath(sf, op.variableName, parentPath)

    if (
      !parentNode ||
      parentNode.getKind() !== SyntaxKind.ObjectLiteralExpression
    ) {
      return sourceText
    }

    const parentObj = parentNode.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression
    )
    const targetProp = parentObj
      .getProperties()
      .find(
        (p) =>
          p.getKind() === SyntaxKind.PropertyAssignment &&
          p.asKindOrThrow(SyntaxKind.PropertyAssignment).getName() === lastPart
      )
    if (!targetProp) return sourceText

    const pa = targetProp.asKindOrThrow(SyntaxKind.PropertyAssignment)
    const currentInit = pa.getInitializer()
    if (currentInit?.getText() === op.valueText) {
      return sourceText // already the target value — exact no-op
    }

    pa.setInitializer(op.valueText)
    return undefined // proceed with sf.getFullText()
  })
}

/**
 * Rename a function parameter's declaration between `name` and `_name` so it
 * matches whether the body still reads it. See `SyncUnusedParameterPrefixOp`
 * for when to use it and the no-op cases.
 *
 * "Reads" means an identifier in the body with that text, other than a
 * property name (`x.request`, `{ request: 1 }`). A local that shadows the
 * parameter counts as a read, which errs toward keeping the bare name: a
 * wrongly kept name is a lint error, a wrongly prefixed one would be a
 * broken reference.
 */
export function applySyncUnusedParameterPrefix(
  project: Project,
  sourceText: string,
  op: SyncUnusedParameterPrefixOp
): string {
  const bare = op.parameterName
  const prefixed = `_${op.parameterName}`

  return withSourceFile(project, sourceText, (sf) => {
    const fn = sf.getFunction(op.functionName)
    const param = fn
      ?.getParameters()
      .find((p) => p.getName() === bare || p.getName() === prefixed)
    const body = fn?.getBody()
    if (!(param && body)) return sourceText

    const reads = (name: string) =>
      body.getDescendantsOfKind(SyntaxKind.Identifier).some((id) => {
        if (id.getText() !== name) return false
        const parent = id.getParent()
        const isPropertyName =
          (Node.isPropertyAccessExpression(parent) ||
            Node.isPropertyAssignment(parent)) &&
          parent.getNameNode() === id
        return !isPropertyName
      })

    if (reads(prefixed)) return sourceText
    const wanted = reads(bare) ? bare : prefixed
    if (param.getName() === wanted) return sourceText

    param.getNameNode().replaceWithText(wanted)
    return undefined // proceed with sf.getFullText()
  })
}
