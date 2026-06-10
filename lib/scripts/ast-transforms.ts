/**
 * AST-based code transform engine for integration removal.
 *
 * Uses ts-morph to apply typed, whitespace-resilient operations to TypeScript /
 * TSX source files. Each operation targets a named language construct (import,
 * variable, JSX element, etc.) rather than a raw regex string.
 */

import {
  IndentationText,
  type JsxAttributeLike,
  type JsxElement,
  type JsxSelfClosingElement,
  type Node,
  Project,
  QuoteKind,
  type SourceFile,
  SyntaxKind,
  ts,
} from 'ts-morph'
import type {
  AddArrayObjectElementOp,
  AddArrayStringElementOp,
  AddImportOp,
  AddJsxChildOp,
  AddVariableStatementOp,
  AstOperation,
  CodeTransform,
  RemoveArrayObjectElementOp,
  RemoveArrayStringElementOp,
  RemoveCallStatementOp,
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

/**
 * True when an array element is an object literal containing a property whose
 * name and string value both match `matchProperty`. Quoted property names
 * ("hostname": …) are normalized to bare names before comparison.
 */
function objectElementMatches(
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

/**
 * Statement index immediately after the last import declaration, falling back
 * to just past any directive prologue ('use client', …) when no imports exist.
 */
function insertIndexAfterImports(sf: SourceFile): number {
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
// Individual operation handlers
// Each handler receives source text, applies one op, returns new source text.
// Handlers accept a shared in-memory Project to avoid repeated instantiation.
// Source files are removed from the project after each handler so the next op
// starts from a clean slate (no stale AST nodes between sequential ops).
// ---------------------------------------------------------------------------

function applyRemoveImport(
  project: Project,
  sourceText: string,
  op: RemoveImportOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  for (const decl of sf.getImportDeclarations()) {
    if (decl.getModuleSpecifierValue() === op.specifier) {
      decl.remove()
      break
    }
  }

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

function applyRemoveVariableStatement(
  project: Project,
  sourceText: string,
  op: RemoveVariableStatementOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)
  let result = sourceText

  // Descendant scan so function-scoped consts are found, not just top-level.
  for (const stmt of sf.getDescendantsOfKind(SyntaxKind.VariableStatement)) {
    for (const decl of stmt.getDeclarations()) {
      if (decl.getName() === op.name) {
        stmt.remove()
        result = sf.getFullText()
        break
      }
    }
    if (result !== sourceText) break
  }

  project.removeSourceFile(sf)
  return result
}

/**
 * Remove bare call-expression statements by callee name, e.g. the whole
 * `useTheatre(sheet, …)` statement. Removes every occurrence in the file,
 * including each statement's attached leading comments.
 */
function applyRemoveCallStatement(
  project: Project,
  sourceText: string,
  op: RemoveCallStatementOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

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

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
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
  project: Project,
  sourceText: string,
  op: RemoveJsxElementOp
): string {
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

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

function applyRemoveInterfaceProperty(
  project: Project,
  sourceText: string,
  op: RemoveInterfacePropertyOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const iface = sf.getInterface(op.interfaceName)
  if (!iface) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const prop = iface.getProperty(op.propertyName)
  if (!prop) {
    project.removeSourceFile(sf)
    return sourceText
  }

  prop.remove()
  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

function applyRemoveFunctionParameter(
  project: Project,
  sourceText: string,
  op: RemoveFunctionParameterOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const fn = sf.getFunction(op.functionName)
  if (!fn) {
    project.removeSourceFile(sf)
    return sourceText
  }

  // Props are destructured in the first parameter's object binding pattern.
  const param = fn.getParameters()[0]
  if (!param) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const binding = param.getNameNode()
  if (binding.getKind() !== SyntaxKind.ObjectBindingPattern) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const pattern = binding.asKindOrThrow(SyntaxKind.ObjectBindingPattern)
  const elements = pattern.getElements()
  const target = elements.find((el) => el.getName() === op.parameterName)
  if (!target) {
    project.removeSourceFile(sf)
    return sourceText
  }

  // BindingElement has no `.remove()`; rebuild the binding pattern text from the
  // remaining elements (each element's text preserves its default value, and a
  // rest element like `...props` is kept verbatim).
  const kept = elements.filter((el) => el !== target).map((el) => el.getText())
  pattern.replaceWithText(`{ ${kept.join(', ')} }`)

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

function applyReplaceJsDoc(
  project: Project,
  sourceText: string,
  op: ReplaceJsDocOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const fn = sf.getFunction(op.functionName)
  if (!fn) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const docs = fn.getJsDocs()
  if (docs.length === 0) {
    project.removeSourceFile(sf)
    return sourceText
  }

  // Replace the first (and typically only) JSDoc block.
  // We pass the full /** … */ text directly to replaceWithText; ts-morph
  // treats JSDoc nodes as replaceable text ranges.
  const firstDoc = docs[0]
  if (!firstDoc) {
    project.removeSourceFile(sf)
    return sourceText
  }

  firstDoc.replaceWithText(op.replacement)
  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

/**
 * Resolve a dot-separated property path from an object-expression node,
 * returning the deepest PropertyAccessExpression value node or undefined.
 *
 * e.g. `resolvePropertyPath(objExpr, 'images.remotePatterns')` returns the
 * node for the `remotePatterns` array initialiser.
 */
function resolvePropertyPath(
  project: Project,
  sourceText: string,
  variableName: string,
  propertyPath: string
): { sf: SourceFile; node: Node | undefined } {
  const sf = project.createSourceFile('__tmp__.ts', sourceText)

  const varDecl = sf
    .getVariableDeclarations()
    .find((v) => v.getName() === variableName)
  if (!varDecl) return { sf, node: undefined }

  const init = varDecl.getInitializer()
  if (!init || init.getKind() !== SyntaxKind.ObjectLiteralExpression)
    return { sf, node: undefined }

  const parts = propertyPath.split('.')
  let current: Node = init
  for (const part of parts) {
    if (current.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      return { sf, node: undefined }
    }
    const obj = current.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
    const prop = obj
      .getProperties()
      .find(
        (p) =>
          p.getKind() === SyntaxKind.PropertyAssignment &&
          p.asKindOrThrow(SyntaxKind.PropertyAssignment).getName() === part
      )
    if (!prop) return { sf, node: undefined }
    const pa = prop.asKindOrThrow(SyntaxKind.PropertyAssignment)
    current = pa.getInitializer() ?? pa
  }

  return { sf, node: current }
}

function applyRemoveArrayObjectElement(
  project: Project,
  sourceText: string,
  op: RemoveArrayObjectElementOp
): string {
  const { sf, node } = resolvePropertyPath(
    project,
    sourceText,
    op.variableName,
    op.propertyPath
  )

  if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    project.removeSourceFile(sf)
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

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

function applyRemoveArrayStringElement(
  project: Project,
  sourceText: string,
  op: RemoveArrayStringElementOp
): string {
  const { sf, node } = resolvePropertyPath(
    project,
    sourceText,
    op.variableName,
    op.propertyPath
  )

  if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  const elements = arr.getElements()

  for (const el of elements) {
    if (el.getKind() !== SyntaxKind.StringLiteral) continue
    if (
      el.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue() === op.value
    ) {
      arr.removeElement(el)
      break
    }
  }

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

// ---------------------------------------------------------------------------
// Additive operation handlers
// Every additive handler is IDEMPOTENT: when the construct it would add is
// already present, the original source text is returned byte-for-byte
// unchanged (the no-op paths return `sourceText`, never re-printed text).
// ---------------------------------------------------------------------------

/**
 * Add an import declaration given as full source text. The text is parsed in
 * a throwaway file to extract its module specifier and bindings, so arbitrary
 * formatting of both the op text and the target file is handled.
 *
 * - Existing import from the same specifier: merge missing named imports (and
 *   a missing default import) into it; no-op when everything is present.
 * - No existing import: insert after the last import declaration, or after
 *   the directive prologue ('use client') when the file has no imports.
 */
function applyAddImport(
  project: Project,
  sourceText: string,
  op: AddImportOp
): string {
  const opSf = project.createSourceFile('__op__.tsx', op.text)
  const opDecl = opSf.getImportDeclarations()[0]
  if (!opDecl) {
    project.removeSourceFile(opSf)
    return sourceText
  }

  const specifier = opDecl.getModuleSpecifierValue()
  const namedImports = opDecl.getNamedImports().map((n) => ({
    name: n.getName(),
    alias: n.getAliasNode()?.getText(),
  }))
  const defaultImport = opDecl.getDefaultImport()?.getText()
  project.removeSourceFile(opSf)

  const sf = project.createSourceFile('__tmp__.tsx', sourceText)
  const existing = sf
    .getImportDeclarations()
    .find((d) => d.getModuleSpecifierValue() === specifier)

  if (existing) {
    let changed = false

    // A namespace import (`import * as X`) cannot carry named/default
    // bindings; the module is already imported, so treat as present.
    if (!existing.getNamespaceImport()) {
      if (defaultImport && !existing.getDefaultImport()) {
        existing.setDefaultImport(defaultImport)
        changed = true
      }

      // Merge missing named imports, compared by imported name so aliased
      // re-imports of the same binding don't duplicate.
      const existingNames = new Set(
        existing.getNamedImports().map((n) => n.getName())
      )
      const missing = namedImports.filter((n) => !existingNames.has(n.name))
      if (missing.length > 0) {
        existing.addNamedImports(
          missing.map((n) => (n.alias ? `${n.name} as ${n.alias}` : n.name))
        )
        changed = true
      }
    }

    const result = changed ? sf.getFullText() : sourceText
    project.removeSourceFile(sf)
    return result
  }

  sf.insertStatements(insertIndexAfterImports(sf), op.text)
  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

/**
 * Append a string-literal element to the array at
 * `variableName`.`propertyPath`. No-op when an element with the same literal
 * value (regardless of quote style) already exists.
 */
function applyAddArrayStringElement(
  project: Project,
  sourceText: string,
  op: AddArrayStringElementOp
): string {
  const { sf, node } = resolvePropertyPath(
    project,
    sourceText,
    op.variableName,
    op.propertyPath
  )

  if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  const alreadyPresent = arr
    .getElements()
    .some(
      (el) =>
        el.getKind() === SyntaxKind.StringLiteral &&
        el.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue() ===
          op.value
    )
  if (alreadyPresent) {
    project.removeSourceFile(sf)
    return sourceText
  }

  arr.addElement(`'${op.value.replace(/'/g, "\\'")}'`, {
    useNewLines: arr.getText().includes('\n'),
  })

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

/**
 * Append an object-literal element (given as source text) to the array at
 * `variableName`.`propertyPath`. No-op when an element already matches
 * `matchProperty` — same semantics as removeArrayObjectElement, including
 * quoted-key normalization.
 */
function applyAddArrayObjectElement(
  project: Project,
  sourceText: string,
  op: AddArrayObjectElementOp
): string {
  const { sf, node } = resolvePropertyPath(
    project,
    sourceText,
    op.variableName,
    op.propertyPath
  )

  if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  const alreadyPresent = arr
    .getElements()
    .some((el) => objectElementMatches(el, op.matchProperty))
  if (alreadyPresent) {
    project.removeSourceFile(sf)
    return sourceText
  }

  arr.addElement(op.objectText, {
    useNewLines: arr.getText().includes('\n'),
  })

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

/**
 * Insert a full variable statement. No-op when a variable named `name`
 * already exists anywhere in the file — descendant scan mirrors
 * removeVariableStatement, so function-scoped declarations count as present.
 */
function applyAddVariableStatement(
  project: Project,
  sourceText: string,
  op: AddVariableStatementOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const exists = sf
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .some((d) => d.getName() === op.name)
  if (exists) {
    project.removeSourceFile(sf)
    return sourceText
  }

  if (op.afterImports === false) {
    sf.addStatements(op.text)
  } else {
    sf.insertStatements(insertIndexAfterImports(sf), op.text)
  }

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

/** JSX child kinds considered when matching an existing child's indentation. */
const JSX_CHILD_KINDS: SyntaxKind[] = [
  SyntaxKind.JsxElement,
  SyntaxKind.JsxSelfClosingElement,
  SyntaxKind.JsxExpression,
  SyntaxKind.JsxFragment,
]

/**
 * Line indentation of the last element-ish JSX child, when that child sits on
 * its own line. Returns undefined for inline children (single-line parents).
 */
function lastJsxChildIndent(
  parent: JsxElement,
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

/**
 * Append `childText` as the last child of the first JSX element whose opening
 * tag matches `parentTagName`. No-op when any JSX element (or self-closing
 * element) with tag `childTagName` already exists anywhere in the file.
 *
 * Indentation heuristic: when the parent's closing tag sits on its own line,
 * the child goes on its own line matching the last existing child's indent
 * (or one level past the closing tag). Single-line parents get the child
 * inserted inline before the closing tag.
 */
function applyAddJsxChild(
  project: Project,
  sourceText: string,
  op: AddJsxChildOp
): string {
  const sf = project.createSourceFile('__tmp__.tsx', sourceText)

  const childExists =
    sf
      .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .some((el) => el.getTagNameNode().getText() === op.childTagName) ||
    sf
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .some(
        (el) =>
          el.getOpeningElement().getTagNameNode().getText() === op.childTagName
      )
  if (childExists) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const parent = sf
    .getDescendantsOfKind(SyntaxKind.JsxElement)
    .find(
      (el) =>
        el.getOpeningElement().getTagNameNode().getText() === op.parentTagName
    )
  if (!parent) {
    project.removeSourceFile(sf)
    return sourceText
  }

  const closing = parent.getClosingElement()
  const closingStart = closing.getStart()
  const lineStart = sourceText.lastIndexOf('\n', closingStart - 1) + 1
  const closingLinePrefix = sourceText.slice(lineStart, closingStart)

  if (/^[ \t]*$/.test(closingLinePrefix)) {
    // Closing tag on its own line — give the child its own indented line.
    const childIndent =
      lastJsxChildIndent(parent, sourceText) ?? `${closingLinePrefix}  `
    sf.insertText(lineStart, `${childIndent}${op.childText}\n`)
  } else {
    // Single-line parent (e.g. `<main>{children}</main>`) — insert inline.
    sf.insertText(closingStart, op.childText)
  }

  const result = sf.getFullText()
  project.removeSourceFile(sf)
  return result
}

// ---------------------------------------------------------------------------
// Per-file transform runner
// ---------------------------------------------------------------------------

/**
 * Apply a sequence of typed AST operations to source text (in memory).
 * Returns the transformed text. Safe to call from tests — never touches disk.
 *
 * A single in-memory Project is shared across all operations for this call.
 * JSX compiler options are enabled so the project can parse `.tsx` files for
 * any op kind — enabling the JSX handlers without affecting non-JSX ops.
 * Each handler creates and removes its own source file, so no AST state leaks
 * between sequential ops.
 */
export function applyOpsToText(
  sourceText: string,
  ops: AstOperation[]
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
    // Match house style (Biome: 2-space indent, single quotes) so additive
    // ops insert text that needs no reformatting.
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  })
  let text = sourceText

  for (const op of ops) {
    switch (op.kind) {
      case 'removeImport':
        text = applyRemoveImport(project, text, op)
        break
      case 'removeVariableStatement':
        text = applyRemoveVariableStatement(project, text, op)
        break
      case 'removeCallStatement':
        text = applyRemoveCallStatement(project, text, op)
        break
      case 'removeJsxElement':
        text = applyRemoveJsxElement(project, text, op)
        break
      case 'removeInterfaceProperty':
        text = applyRemoveInterfaceProperty(project, text, op)
        break
      case 'removeFunctionParameter':
        text = applyRemoveFunctionParameter(project, text, op)
        break
      case 'replaceJsDoc':
        text = applyReplaceJsDoc(project, text, op)
        break
      case 'removeArrayObjectElement':
        text = applyRemoveArrayObjectElement(project, text, op)
        break
      case 'removeArrayStringElement':
        text = applyRemoveArrayStringElement(project, text, op)
        break
      case 'addImport':
        text = applyAddImport(project, text, op)
        break
      case 'addArrayStringElement':
        text = applyAddArrayStringElement(project, text, op)
        break
      case 'addArrayObjectElement':
        text = applyAddArrayObjectElement(project, text, op)
        break
      case 'addVariableStatement':
        text = applyAddVariableStatement(project, text, op)
        break
      case 'addJsxChild':
        text = applyAddJsxChild(project, text, op)
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
