/**
 * Subtractive AST operation handlers.
 *
 * Each handler receives source text, applies one remove/replace op, and
 * returns the new source text. Handlers accept a shared in-memory Project
 * to avoid repeated instantiation; source files are removed after each
 * handler so the next op starts from a clean slate.
 */

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
  RemoveVariableStatementOp,
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
          return undefined // proceed with sf.getFullText()
        }
      }
    }
    return sourceText // no match — return original unchanged
  })
}

/**
 * Remove bare call-expression statements by callee name, e.g. the whole
 * `useTheatre(sheet, …)` statement. Removes every occurrence in the file,
 * including each statement's attached leading comments.
 */
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

/**
 * Remove every `if (condition) { … }` statement (including an attached
 * `else` chain) whose condition text contains `op.conditionContains`. Mirrors
 * `applyRemoveCallStatement`'s full-file, remove-all-matches loop, and
 * removes each match's `getFullStart()..getEnd()` span so a directly
 * attached leading comment is removed with it.
 */
export function applyRemoveIfStatement(
  project: Project,
  sourceText: string,
  op: RemoveIfStatementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    // Text removal invalidates collected nodes, so re-resolve after each pass.
    while (true) {
      const stmt = sf
        .getDescendantsOfKind(SyntaxKind.IfStatement)
        .find((s) => s.getExpression().getText().includes(op.conditionContains))
      if (!stmt) break

      sf.removeText(stmt.getFullStart(), stmt.getEnd())
    }
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
 * Walk all JSX elements in the source file and find those matching the op.
 *
 * Self-closing elements: remove the whole element (plus any immediately
 * preceding JSX comment expression on the prior sibling position).
 *
 * Open/close elements with `unwrap: true`: replace the element with its
 * children, preserving indentation.
 *
 * Open/close elements without `unwrap`: remove entirely, including any
 * wrapping JsxExpression container (handles `{studio && <Studio />}`).
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

        // Walk up the full ancestor chain to find the enclosing JsxExpression.
        // This handles `{<Foo />}` (direct), `{cond && <Foo />}` (one level of
        // binary expression), and deeper nesting like
        // `{a && b && (<Wrapper><Foo /></Wrapper>)}` where Foo is several
        // levels inside a JsxElement that itself is inside the JsxExpression.
        // We do NOT stop at JsxElement boundaries here because the element being
        // removed may be a leaf inside a wrapper (e.g. `<Suspense><Foo/></Suspense>`)
        // that is itself inside the target JsxExpression.
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

        if (enclosingJsxExpr) {
          // Also remove any immediately preceding JSX comment sibling.
          const container = enclosingJsxExpr.getParent()
          if (container) {
            const siblings = container.getChildren()
            const idx = siblings.indexOf(enclosingJsxExpr)
            if (idx > 0) {
              const prev = siblings[idx - 1]
              if (
                prev &&
                prev.getKind() === SyntaxKind.JsxExpression &&
                prev.getText().trim().startsWith('{/*')
              ) {
                prev.replaceWithText('')
              }
            }
          }
          enclosingJsxExpr.replaceWithText('')
        } else {
          node.replaceWithText('')
        }
      } else {
        // JsxElement (open+close pair)
        const node = match.node
        if (op.unwrap) {
          // Keep children, strip opening/closing tags.
          const childText = node
            .getJsxChildren()
            .map((c) => c.getText())
            .join('')
          node.replaceWithText(childText)
        } else {
          // Remove entirely — walk up to find the enclosing JsxExpression so
          // that `{cond && <Elem>…</Elem>}` is removed whole, not just the tags.
          let enclosingExpr: Node | undefined
          let cur: Node | undefined = node.getParent()
          while (cur) {
            if (cur.getKind() === SyntaxKind.JsxExpression) {
              enclosingExpr = cur
              break
            }
            // Stop if we reach another JSX element boundary (don't escape siblings)
            if (
              cur.getKind() === SyntaxKind.JsxElement ||
              cur.getKind() === SyntaxKind.JsxFragment
            ) {
              break
            }
            cur = cur.getParent()
          }
          if (enclosingExpr) {
            enclosingExpr.replaceWithText('')
          } else {
            node.replaceWithText('')
          }
        }
      }
    }
  })
}

/**
 * Remove a named attribute from all JSX elements with the given tag name.
 * Handles both self-closing (`<Foo bar />`) and open/close (`<Foo bar>…</Foo>`)
 * elements, and both boolean shorthand (`webgl`) and valued (`webgl={true}`)
 * attribute forms.
 */
export function applyRemoveJsxAttribute(
  project: Project,
  sourceText: string,
  op: RemoveJsxAttributeOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    // Collect attribute nodes from self-closing elements
    const selfClosingAttrs = sf
      .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .filter((el) => el.getTagNameNode().getText() === op.tagName)
      .flatMap((el) => {
        const attr = el.getAttribute(op.attributeName)
        return attr ? [attr] : []
      })

    // Collect attribute nodes from open/close elements
    const openElementAttrs = sf
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter(
        (el) => el.getOpeningElement().getTagNameNode().getText() === op.tagName
      )
      .flatMap((el) => {
        const attr = el.getOpeningElement().getAttribute(op.attributeName)
        return attr ? [attr] : []
      })

    // Process in reverse source order to keep positions stable
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
    return undefined // proceed with sf.getFullText()
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

    // Props are destructured in the first parameter's object binding pattern.
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

    // BindingElement has no `.remove()`; rebuild the binding pattern text from the
    // remaining elements (each element's text preserves its default value, and a
    // rest element like `...props` is kept verbatim).
    const kept = elements
      .filter((el) => el !== target)
      .map((el) => el.getText())
    pattern.replaceWithText(`{ ${kept.join(', ')} }`)
    return undefined // proceed with sf.getFullText()
  })
}

/**
 * Remove a named binding from a destructured variable declaration at any scope
 * depth, e.g. `const { stats, grid, studio } = useOrchestra()`.
 *
 * The declaration is located by finding a VariableStatement whose binding
 * pattern contains `bindingName` AND whose initializer text contains
 * `initializerContains` (substring match). The remaining elements are preserved
 * verbatim (including defaults and rest elements).
 */
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

        // Narrow by initializer text to avoid modifying unrelated destructurings.
        const initText = decl.getInitializer()?.getText() ?? ''
        if (!initText.includes(op.initializerContains)) continue

        const kept = elements
          .filter((el) => el !== target)
          .map((el) => el.getText())
        pattern.replaceWithText(`{ ${kept.join(', ')} }`)

        return undefined // proceed with sf.getFullText()
      }
    }

    return sourceText // no match — return original unchanged
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

    // Replace the first (and typically only) JSDoc block.
    // We pass the full /** … */ text directly to replaceWithText; ts-morph
    // treats JSDoc nodes as replaceable text ranges.
    const firstDoc = docs[0]
    if (!firstDoc) return sourceText

    firstDoc.replaceWithText(op.replacement)
    return undefined // proceed with sf.getFullText()
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

      // Found the matching element — remove it from the array
      arr.removeElement(el)
      break
    }
    return undefined // proceed with sf.getFullText()
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
    return undefined // proceed with sf.getFullText()
  })
}
