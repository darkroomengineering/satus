/**
 * AST-based code transform engine for integration removal.
 *
 * Uses ts-morph to apply typed, whitespace-resilient operations to TypeScript /
 * TSX source files. Each operation targets a named language construct (import,
 * variable, JSX element, etc.) rather than a raw regex string.
 */

import {
  type JsxAttributeLike,
  type JsxElement,
  type JsxSelfClosingElement,
  Project,
  SyntaxKind,
  ts,
} from 'ts-morph'
import type {
  AstOperation,
  CodeTransform,
  RemoveFunctionParameterOp,
  RemoveImportOp,
  RemoveInterfacePropertyOp,
  RemoveJsxElementOp,
  RemoveVariableStatementOp,
  ReplaceJsDocOp,
} from './integration-bundles'
import { resolvePath } from './utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the string value from a JSX attribute initialiser node. */
function jsxAttrStringValue(
  attrNode: JsxAttributeLike | undefined
): string | undefined {
  if (!attrNode) return undefined
  const attr = attrNode.asKind(SyntaxKind.JsxAttribute)
  if (!attr) return undefined
  const init = attr.getInitializer()
  if (!init) return undefined
  // String literal: value="foo"
  if (init.getKind() === SyntaxKind.StringLiteral) {
    return init.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
  }
  // JSX expression: value={"foo"} or value={true}
  if (init.getKind() === SyntaxKind.JsxExpression) {
    const expr = init.asKindOrThrow(SyntaxKind.JsxExpression).getExpression()
    if (!expr) return undefined
    if (expr.getKind() === SyntaxKind.StringLiteral) {
      return expr.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
    }
    // Fallback: raw text without surrounding {}
    return expr.getText().trim()
  }
  return undefined
}

function selfClosingMatchesOp(
  el: JsxSelfClosingElement,
  op: RemoveJsxElementOp
): boolean {
  if (el.getTagNameNode().getText() !== op.tagName) return false
  if (op.attribute) {
    const val = jsxAttrStringValue(el.getAttribute(op.attribute.name))
    if (val !== op.attribute.value) return false
  }
  return true
}

function openElementMatchesOp(el: JsxElement, op: RemoveJsxElementOp): boolean {
  if (el.getOpeningElement().getTagNameNode().getText() !== op.tagName)
    return false
  if (op.attribute) {
    const val = jsxAttrStringValue(
      el.getOpeningElement().getAttribute(op.attribute.name)
    )
    if (val !== op.attribute.value) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Individual operation handlers
// Each handler receives source text, applies one op, returns new source text.
// A fresh ts-morph Project per call avoids any inter-op state leakage.
// ---------------------------------------------------------------------------

function applyRemoveImport(sourceText: string, op: RemoveImportOp): string {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  for (const decl of sf.getImportDeclarations()) {
    if (decl.getModuleSpecifierValue() === op.specifier) {
      decl.remove()
      break
    }
  }

  return sf.getFullText()
}

function applyRemoveVariableStatement(
  sourceText: string,
  op: RemoveVariableStatementOp
): string {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  for (const stmt of sf.getVariableStatements()) {
    for (const decl of stmt.getDeclarations()) {
      if (decl.getName() === op.name) {
        stmt.remove()
        return sf.getFullText()
      }
    }
  }

  return sourceText
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
function applyRemoveJsxElement(
  sourceText: string,
  op: RemoveJsxElementOp
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
  })
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

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

      // Walk up the parent chain to find the enclosing JsxExpression.
      // This handles both `{<Foo />}` (direct) and `{cond && <Foo />}`
      // (wrapped in a BinaryExpression inside the JsxExpression).
      const parent = node.getParent()
      const grandParent = parent?.getParent()
      const enclosingJsxExpr = [parent, grandParent].find(
        (n) => n?.getKind() === SyntaxKind.JsxExpression
      )

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
        // Remove entirely — including any wrapping JsxExpression.
        const parent = node.getParent()
        if (parent?.getKind() === SyntaxKind.JsxExpression) {
          parent.replaceWithText('')
        } else {
          node.replaceWithText('')
        }
      }
    }
  }

  return sf.getFullText()
}

function applyRemoveInterfaceProperty(
  sourceText: string,
  op: RemoveInterfacePropertyOp
): string {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const iface = sf.getInterface(op.interfaceName)
  if (!iface) return sourceText

  const prop = iface.getProperty(op.propertyName)
  if (!prop) return sourceText

  prop.remove()
  return sf.getFullText()
}

function applyRemoveFunctionParameter(
  sourceText: string,
  op: RemoveFunctionParameterOp
): string {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const fn = sf.getFunction(op.functionName)
  if (!fn) return sourceText

  // Props are destructured in the first parameter's object binding pattern.
  const param = fn.getParameters()[0]
  if (!param) return sourceText

  const binding = param.getNameNode()
  if (binding.getKind() !== SyntaxKind.ObjectBindingPattern) return sourceText

  const pattern = binding.asKindOrThrow(SyntaxKind.ObjectBindingPattern)
  const elements = pattern.getElements()
  const target = elements.find((el) => el.getName() === op.parameterName)
  if (!target) return sourceText

  // BindingElement has no `.remove()`; rebuild the binding pattern text from the
  // remaining elements (each element's text preserves its default value, and a
  // rest element like `...props` is kept verbatim).
  const kept = elements.filter((el) => el !== target).map((el) => el.getText())
  pattern.replaceWithText(`{ ${kept.join(', ')} }`)

  return sf.getFullText()
}

function applyReplaceJsDoc(sourceText: string, op: ReplaceJsDocOp): string {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

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
  return sf.getFullText()
}

// ---------------------------------------------------------------------------
// Per-file transform runner
// ---------------------------------------------------------------------------

/**
 * Apply a sequence of typed AST operations to source text (in memory).
 * Returns the transformed text. Safe to call from tests — never touches disk.
 */
export function applyOpsToText(
  sourceText: string,
  ops: AstOperation[]
): string {
  let text = sourceText

  for (const op of ops) {
    switch (op.kind) {
      case 'removeImport':
        text = applyRemoveImport(text, op)
        break
      case 'removeVariableStatement':
        text = applyRemoveVariableStatement(text, op)
        break
      case 'removeJsxElement':
        text = applyRemoveJsxElement(text, op)
        break
      case 'removeInterfaceProperty':
        text = applyRemoveInterfaceProperty(text, op)
        break
      case 'removeFunctionParameter':
        text = applyRemoveFunctionParameter(text, op)
        break
      case 'replaceJsDoc':
        text = applyReplaceJsDoc(text, op)
        break
      // Exhaustiveness — TypeScript ensures all union members are handled above.
    }
  }

  return text
}

// ---------------------------------------------------------------------------
// Public disk-writing API used by setup-project.ts
// ---------------------------------------------------------------------------

/**
 * Apply code transformations to on-disk project source files.
 * Honors `dryRun` (no writes when true).
 * Returns the count of files that were actually changed.
 */
export async function applyCodeTransforms(
  transforms: CodeTransform[],
  dryRun: boolean
): Promise<number> {
  let totalChanges = 0

  for (const transform of transforms) {
    try {
      const fullPath = resolvePath(transform.file)
      const file = Bun.file(fullPath)

      if (!(await file.exists())) continue

      const original = await file.text()
      const transformed = applyOpsToText(original, transform.ops)

      if (transformed !== original) {
        if (!dryRun) {
          await Bun.write(fullPath, transformed)
        }
        totalChanges++
      }
    } catch (error) {
      // Log but continue — mirrors the previous regex-based behaviour.
      console.error(`Failed to transform ${transform.file}:`, error)
    }
  }

  return totalChanges
}
