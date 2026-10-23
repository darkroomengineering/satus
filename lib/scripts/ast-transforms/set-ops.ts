import { Node, type Project, SyntaxKind } from 'ts-morph'

import type { SyncUnusedParameterPrefixOp } from '../ast-operation-types'
import { withSourceFile } from './helpers'

/**
 * Rename a parameter's declaration between `name` and `_name` to match
 * whether the body still reads it (see `SyncUnusedParameterPrefixOp`).
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
    return undefined
  })
}
