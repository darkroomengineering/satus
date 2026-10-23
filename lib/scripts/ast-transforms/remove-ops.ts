import { type Node, type Project, SyntaxKind } from 'ts-morph'

import type {
  RemoveArrayObjectElementOp,
  RemoveArrayStringElementOp,
  RemoveCallArgumentOp,
  RemoveCallStatementOp,
  RemoveDestructuredBindingOp,
  RemoveFunctionParameterOp,
  RemoveIfStatementOp,
  RemoveImportOp,
  RemoveInterfacePropertyOp,
  RemoveJsxAttributeOp,
  RemoveJsxElementOp,
  RemoveNamedImportOp,
  RemoveTryStatementOp,
  RemoveVariableStatementOp,
  ReplaceFunctionBodyOp,
  ReplaceJsDocOp,
} from '../ast-operation-types'
import {
  objectElementMatches,
  openElementMatchesOp,
  resolvePropertyPath,
  selfClosingMatchesOp,
  withSourceFile,
} from './helpers'

export function applyRemoveImport(
  project: Project,
  sourceText: string,
  op: RemoveImportOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    for (const decl of sf.getImportDeclarations()) {
      if (decl.getModuleSpecifierValue() === op.specifier) {
        decl.remove()
        break
      }
    }
  })
}

export function applyRemoveNamedImport(
  project: Project,
  sourceText: string,
  op: RemoveNamedImportOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const decl = sf
      .getImportDeclarations()
      .find((d) => d.getModuleSpecifierValue() === op.specifier)
    if (!decl) return sourceText

    const named = decl.getNamedImports().find((n) => n.getName() === op.name)
    if (!named) return sourceText

    named.remove()

    if (
      decl.getNamedImports().length === 0 &&
      !decl.getDefaultImport() &&
      !decl.getNamespaceImport()
    ) {
      decl.remove()
    }

    return undefined
  })
}

export function applyRemoveVariableStatement(
  project: Project,
  sourceText: string,
  op: RemoveVariableStatementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    // Descendant scan so function-scoped consts are found, not just top-level.
    for (const stmt of sf.getDescendantsOfKind(SyntaxKind.VariableStatement)) {
      for (const decl of stmt.getDeclarations()) {
        if (decl.getName() === op.name) {
          stmt.remove()
          return undefined
        }
      }
    }
    return sourceText
  })
}

export function applyRemoveCallStatement(
  project: Project,
  sourceText: string,
  op: RemoveCallStatementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    // Text removal invalidates collected nodes, so re-resolve after each pass.
    while (true) {
      const stmt = sf
        .getDescendantsOfKind(SyntaxKind.ExpressionStatement)
        .find((s) => {
          const call = s.getExpression().asKind(SyntaxKind.CallExpression)
          return call?.getExpression().getText() === op.callee
        })
      if (!stmt) break

      // Full start spans the leading trivia (blank line + comments) so the
      // statement's own comment block is removed with it.
      sf.removeText(stmt.getFullStart(), stmt.getEnd())
    }
  })
}

export function applyRemoveIfStatement(
  project: Project,
  sourceText: string,
  op: RemoveIfStatementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    while (true) {
      const stmt = sf
        .getDescendantsOfKind(SyntaxKind.IfStatement)
        .find((s) => s.getExpression().getText().includes(op.conditionContains))
      if (!stmt) break

      sf.removeText(stmt.getFullStart(), stmt.getEnd())
    }
  })
}

export function applyRemoveTryStatement(
  project: Project,
  sourceText: string,
  op: RemoveTryStatementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    while (true) {
      const stmt = sf
        .getDescendantsOfKind(SyntaxKind.TryStatement)
        .find((s) => s.getTryBlock().getText().includes(op.blockContains))
      if (!stmt) break

      sf.removeText(stmt.getFullStart(), stmt.getEnd())
    }
  })
}

/**
 * Splice `replacement` verbatim over the node's exact range, bypassing
 * ts-morph's printer. `replaceWithText` re-indents inserted lines relative to
 * the replaced node, so a first application and a re-application differ in
 * whitespace and break the idempotent re-run contract (see `RequiredMatchOp`).
 * A verbatim splice makes re-applying byte-identical, which the runner's
 * `text === before` check counts as the required-op miss it is. No
 * text-similarity heuristic, so whitespace that is content (template literal
 * interior, JSDoc spacing) can't make a needed replacement look applied.
 * Trade-off: `replacement` must be authored pre-indented for its target (both
 * current targets are top-level, authored flush).
 */
const spliceNodeText = (
  sourceText: string,
  node: { getStart: () => number; getEnd: () => number },
  replacement: string
): string =>
  sourceText.slice(0, node.getStart()) +
  replacement +
  sourceText.slice(node.getEnd())

export function applyReplaceFunctionBody(
  project: Project,
  sourceText: string,
  op: ReplaceFunctionBodyOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const fn = sf.getFunction(op.functionName)
    if (!fn) return sourceText

    const body = fn.getBody()
    if (!body) return sourceText
    return spliceNodeText(sourceText, body, op.replacement)
  })
}

export function applyRemoveCallArgument(
  project: Project,
  sourceText: string,
  op: RemoveCallArgumentOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    // removeArgument invalidates the node list, so re-resolve after each removal.
    while (true) {
      let removed = false
      for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        if (call.getExpression().getText() !== op.callee) continue
        const arg = call.getArguments().find((a) => a.getText() === op.argument)
        if (arg) {
          call.removeArgument(arg)
          removed = true
          break
        }
      }
      if (!removed) break
    }
  })
}

/**
 * The JSX comment expression documenting `target`, if any: the nearest
 * preceding sibling, skipping whitespace-only JsxText. Remove it AFTER
 * `target`: it sits earlier in the source so its position survives, while the
 * reverse order would invalidate the target node.
 */
function findPrecedingJsxComment(target: Node): Node | undefined {
  const siblings =
    target.getParentSyntaxList()?.getChildren() ??
    target.getParent()?.getChildren() ??
    []

  for (let index = siblings.indexOf(target) - 1; index >= 0; index--) {
    const sibling = siblings[index]
    if (!sibling) return undefined
    if (
      sibling.getKind() === SyntaxKind.JsxText &&
      sibling.getText().trim() === ''
    ) {
      continue
    }
    return sibling.getKind() === SyntaxKind.JsxExpression &&
      sibling.getText().trim().startsWith('{/*')
      ? sibling
      : undefined
  }
  return undefined
}

/**
 * Self-closing and open/close elements both remove the enclosing
 * JsxExpression container (`{studio && <Studio />}`) and the preceding JSX
 * comment, or a removed element leaves its documenting comment orphaned.
 * `unwrap: true` keeps the children and skips comment cleanup, since whatever
 * the comment documents is still rendered.
 */
export function applyRemoveJsxElement(
  project: Project,
  sourceText: string,
  op: RemoveJsxElementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const selfClosingMatches = sf
      .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .filter((el) => selfClosingMatchesOp(el, op))
      .map((n) => ({ pos: n.getPos(), kind: 'self' as const, node: n }))

    const openElementMatches = sf
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter((el) => openElementMatchesOp(el, op))
      .map((n) => ({ pos: n.getPos(), kind: 'open' as const, node: n }))

    // Process in reverse source order so removals don't shift earlier positions.
    const allMatches = [...selfClosingMatches, ...openElementMatches].sort(
      (a, b) => b.pos - a.pos
    )

    for (const match of allMatches) {
      if (match.kind === 'self') {
        const node = match.node

        // Walk the full ancestor chain to the enclosing JsxExpression. Do NOT
        // stop at JsxElement boundaries: the element may be a leaf inside a
        // wrapper (`{a && (<Suspense><Foo /></Suspense>)}`) that is itself
        // inside the target JsxExpression.
        let enclosingJsxExpr: Node | undefined
        let cursor: Node | undefined = node.getParent()
        while (cursor) {
          if (cursor.getKind() === SyntaxKind.JsxExpression) {
            enclosingJsxExpr = cursor
            break
          }
          // Stop at JSX fragments — they delimit independent rendering scopes
          if (cursor.getKind() === SyntaxKind.JsxFragment) {
            break
          }
          cursor = cursor.getParent()
        }

        const removed = enclosingJsxExpr ?? node
        const comment = findPrecedingJsxComment(removed)
        removed.replaceWithText('')
        comment?.replaceWithText('')
      } else {
        const node = match.node
        if (op.unwrap) {
          const childText = node
            .getJsxChildren()
            .map((c) => c.getText())
            .join('')
          node.replaceWithText(childText)
        } else {
          // Remove the enclosing JsxExpression too, so `{cond && <Elem>…</Elem>}` goes whole.
          let enclosingExpr: Node | undefined
          let cur: Node | undefined = node.getParent()
          while (cur) {
            if (cur.getKind() === SyntaxKind.JsxExpression) {
              enclosingExpr = cur
              break
            }
            if (
              cur.getKind() === SyntaxKind.JsxElement ||
              cur.getKind() === SyntaxKind.JsxFragment
            ) {
              break
            }
            cur = cur.getParent()
          }
          const removed = enclosingExpr ?? node
          const comment = findPrecedingJsxComment(removed)
          removed.replaceWithText('')
          comment?.replaceWithText('')
        }
      }
    }
  })
}

export function applyRemoveJsxAttribute(
  project: Project,
  sourceText: string,
  op: RemoveJsxAttributeOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const selfClosingAttrs = sf
      .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .filter((el) => el.getTagNameNode().getText() === op.tagName)
      .flatMap((el) => {
        const attr = el.getAttribute(op.attributeName)
        return attr ? [attr] : []
      })

    const openElementAttrs = sf
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter(
        (el) => el.getOpeningElement().getTagNameNode().getText() === op.tagName
      )
      .flatMap((el) => {
        const attr = el.getOpeningElement().getAttribute(op.attributeName)
        return attr ? [attr] : []
      })

    const allAttrs = [...selfClosingAttrs, ...openElementAttrs].sort(
      (a, b) => b.getPos() - a.getPos()
    )

    for (const attr of allAttrs) {
      attr.remove()
    }
  })
}

export function applyRemoveInterfaceProperty(
  project: Project,
  sourceText: string,
  op: RemoveInterfacePropertyOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const iface = sf.getInterface(op.interfaceName)
    if (!iface) return sourceText

    const prop = iface.getProperty(op.propertyName)
    if (!prop) return sourceText

    prop.remove()
    return undefined
  })
}

export function applyRemoveFunctionParameter(
  project: Project,
  sourceText: string,
  op: RemoveFunctionParameterOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const fn = sf.getFunction(op.functionName)
    if (!fn) return sourceText

    const param = fn.getParameters()[0]
    if (!param) return sourceText

    const binding = param.getNameNode()
    if (binding.getKind() !== SyntaxKind.ObjectBindingPattern) return sourceText

    const pattern = binding.asKindOrThrow(SyntaxKind.ObjectBindingPattern)
    const elements = pattern.getElements()
    // Match on the destructured property name, falling back to the binding
    // name — `webgl: _webgl = false` renames the binding but the prop being
    // removed is still `webgl`.
    const target = elements.find(
      (el) =>
        (el.getPropertyNameNode()?.getText() ?? el.getName()) ===
        op.parameterName
    )
    if (!target) return sourceText

    // BindingElement has no `.remove()`; rebuild the pattern from the rest
    // (element text keeps defaults, and rest elements stay verbatim).
    const kept = elements
      .filter((el) => el !== target)
      .map((el) => el.getText())
    pattern.replaceWithText(`{ ${kept.join(', ')} }`)
    return undefined
  })
}

export function applyRemoveDestructuredBinding(
  project: Project,
  sourceText: string,
  op: RemoveDestructuredBindingOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    for (const stmt of sf.getDescendantsOfKind(SyntaxKind.VariableStatement)) {
      for (const decl of stmt.getDeclarations()) {
        const nameNode = decl.getNameNode()
        if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) continue

        const pattern = nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern)
        const elements = pattern.getElements()
        const target = elements.find((el) => el.getName() === op.bindingName)
        if (!target) continue

        const initText = decl.getInitializer()?.getText() ?? ''
        if (!initText.includes(op.initializerContains)) continue

        const kept = elements
          .filter((el) => el !== target)
          .map((el) => el.getText())
        pattern.replaceWithText(`{ ${kept.join(', ')} }`)

        return undefined
      }
    }

    return sourceText
  })
}

export function applyReplaceJsDoc(
  project: Project,
  sourceText: string,
  op: ReplaceJsDocOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const fn = sf.getFunction(op.functionName)
    if (!fn) return sourceText

    const docs = fn.getJsDocs()
    if (docs.length === 0) return sourceText

    // Verbatim splice over the first JSDoc block; see `spliceNodeText`.
    const firstDoc = docs[0]
    if (!firstDoc) return sourceText
    return spliceNodeText(sourceText, firstDoc, op.replacement)
  })
}

export function applyRemoveArrayObjectElement(
  project: Project,
  sourceText: string,
  op: RemoveArrayObjectElementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const node = resolvePropertyPath(sf, op.variableName, op.propertyPath)

    if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
      return sourceText
    }

    const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
    const elements = arr.getElements()

    for (const el of elements) {
      if (!objectElementMatches(el, op.matchProperty)) continue

      arr.removeElement(el)
      break
    }
    return undefined
  })
}

export function applyRemoveArrayStringElement(
  project: Project,
  sourceText: string,
  op: RemoveArrayStringElementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const node = resolvePropertyPath(sf, op.variableName, op.propertyPath)

    if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
      return sourceText
    }

    const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
    const elements = arr.getElements()

    for (const el of elements) {
      if (el.getKind() !== SyntaxKind.StringLiteral) continue
      if (
        el.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue() ===
        op.value
      ) {
        arr.removeElement(el)
        break
      }
    }
    return undefined
  })
}
