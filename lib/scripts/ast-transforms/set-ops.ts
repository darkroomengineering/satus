/**
 * Mutating AST operation handlers — overwrite an existing value in place.
 *
 * Unlike the additive handlers in `add-ops.ts`, these never create a
 * construct that doesn't already exist.
 */

import { type Project, SyntaxKind } from 'ts-morph'
import type { SetObjectPropertyOp } from '../ast-operation-types'
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
