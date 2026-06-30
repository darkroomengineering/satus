/**
 * Shared helpers for the AST transform engine.
 *
 * Contains: source-file lifecycle wrapper, JSX attribute reader,
 * element-match predicates, index/path resolution utilities, and
 * JSX child indentation helpers.
 */

import {
  type JsxAttributeLike,
  type JsxElement,
  type JsxFragment,
  type JsxSelfClosingElement,
  type Node,
  type Project,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph'
import type { RemoveJsxElementOp } from '../ast-operation-types'

// ---------------------------------------------------------------------------
// Source-file lifecycle
// ---------------------------------------------------------------------------

/**
 * Owns the create / getFullText / removeSourceFile lifecycle for a single
 * in-memory source file. `fn` receives the SourceFile, mutates it, and returns
 * either `undefined` (proceed with `sf.getFullText()`) or a string (short-
 * circuit early — returned verbatim, bypassing getFullText). The source file is
 * always removed in `finally` regardless of how `fn` exits.
 */
export function withSourceFile(
  project: Project,
  sourceText: string,
  fn: (sf: SourceFile) => string | undefined | undefined,
  fileName = '__tmp__.tsx'
): string {
  const sf = project.createSourceFile(fileName, sourceText, { overwrite: true })
  try {
    const earlyResult = fn(sf)
    if (typeof earlyResult === 'string') return earlyResult
    return sf.getFullText()
  } finally {
    project.removeSourceFile(sf)
  }
}

// ---------------------------------------------------------------------------
// JSX attribute helpers
// ---------------------------------------------------------------------------

/** Extract the string value from a JSX attribute initialiser node. */
export function jsxAttrStringValue(
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

// ---------------------------------------------------------------------------
// JSX element matchers
// ---------------------------------------------------------------------------

export function selfClosingMatchesOp(
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

export function openElementMatchesOp(
  el: JsxElement,
  op: RemoveJsxElementOp
): boolean {
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

/**
 * True when an array element is an object literal containing a property whose
 * name and string value both match `matchProperty`. Quoted property names
 * ("hostname": …) are normalized to bare names before comparison.
 */
export function objectElementMatches(
  el: Node,
  matchProperty: { name: string; value: string }
): boolean {
  if (el.getKind() !== SyntaxKind.ObjectLiteralExpression) return false
  const obj = el.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
  const matchProp = obj.getProperties().find(
    (p) =>
      p.getKind() === SyntaxKind.PropertyAssignment &&
      // Normalize quoted property names ("hostname": …) to bare names.
      p
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getName()
        .replace(/^['"]|['"]$/g, '') === matchProperty.name
  )
  if (!matchProp) return false
  const initNode = matchProp
    .asKindOrThrow(SyntaxKind.PropertyAssignment)
    .getInitializer()
  if (!initNode) return false
  const initValue =
    initNode.getKind() === SyntaxKind.StringLiteral
      ? initNode.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
      : undefined
  return initValue === matchProperty.value
}

// ---------------------------------------------------------------------------
// Import insertion index
// ---------------------------------------------------------------------------

/**
 * Statement index immediately after the last import declaration, falling back
 * to just past any directive prologue ('use client', …) when no imports exist.
 */
export function insertIndexAfterImports(sf: SourceFile): number {
  const imports = sf.getImportDeclarations()
  const lastImport = imports[imports.length - 1]
  if (lastImport) return lastImport.getChildIndex() + 1

  let index = 0
  for (const stmt of sf.getStatements()) {
    const expr = stmt.asKind(SyntaxKind.ExpressionStatement)?.getExpression()
    if (expr?.getKind() !== SyntaxKind.StringLiteral) break
    index++
  }
  return index
}

// ---------------------------------------------------------------------------
// Property path resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated property path from an object-expression node,
 * returning the deepest PropertyAccessExpression value node or undefined.
 *
 * Operates on a caller-owned SourceFile — the caller is responsible for the
 * file's lifetime (open before, remove in `finally` via `withSourceFile`).
 *
 * e.g. `resolvePropertyPath(sf, 'nextConfig', 'images.remotePatterns')` returns
 * the node for the `remotePatterns` array initialiser.
 */
export function resolvePropertyPath(
  sf: SourceFile,
  variableName: string,
  propertyPath: string
): Node | undefined {
  const varDecl = sf
    .getVariableDeclarations()
    .find((v) => v.getName() === variableName)
  if (!varDecl) return undefined

  const init = varDecl.getInitializer()
  if (!init || init.getKind() !== SyntaxKind.ObjectLiteralExpression)
    return undefined

  const parts = propertyPath.split('.')
  let current: Node = init
  for (const part of parts) {
    if (current.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      return undefined
    }
    const obj = current.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
    const prop = obj
      .getProperties()
      .find(
        (p) =>
          p.getKind() === SyntaxKind.PropertyAssignment &&
          p.asKindOrThrow(SyntaxKind.PropertyAssignment).getName() === part
      )
    if (!prop) return undefined
    const pa = prop.asKindOrThrow(SyntaxKind.PropertyAssignment)
    current = pa.getInitializer() ?? pa
  }

  return current
}

// ---------------------------------------------------------------------------
// JSX child indentation helpers
// ---------------------------------------------------------------------------

/** JSX child kinds considered when matching an existing child's indentation. */
export const JSX_CHILD_KINDS: SyntaxKind[] = [
  SyntaxKind.JsxElement,
  SyntaxKind.JsxSelfClosingElement,
  SyntaxKind.JsxExpression,
  SyntaxKind.JsxFragment,
]

/**
 * Line indentation of the last element-ish JSX child, when that child sits on
 * its own line. Returns undefined for inline children (single-line parents).
 */
export function lastJsxChildIndent(
  parent: JsxElement | JsxFragment,
  sourceText: string
): string | undefined {
  const children = parent
    .getJsxChildren()
    .filter((c) => JSX_CHILD_KINDS.includes(c.getKind()))
  const last = children[children.length - 1]
  if (!last) return undefined

  const start = last.getStart()
  const lineStart = sourceText.lastIndexOf('\n', start - 1) + 1
  const prefix = sourceText.slice(lineStart, start)
  return /^[ \t]*$/.test(prefix) ? prefix : undefined
}
