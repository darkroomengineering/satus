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
  type JsxFragment,
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
  RemoveCallArgumentOp,
  RemoveCallStatementOp,
  RemoveDestructuredBindingOp,
  RemoveFunctionParameterOp,
  RemoveImportOp,
  RemoveInterfacePropertyOp,
  RemoveJsxAttributeOp,
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

/**
 * Owns the create / getFullText / removeSourceFile lifecycle for a single
 * in-memory source file. `fn` receives the SourceFile, mutates it, and returns
 * either `undefined` (proceed with `sf.getFullText()`) or a string (short-
 * circuit early — returned verbatim, bypassing getFullText). The source file is
 * always removed in `finally` regardless of how `fn` exits.
 */
function withSourceFile(
  project: Project,
  sourceText: string,
  fn: (sf: SourceFile) => string | undefined,
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
  return withSourceFile(project, sourceText, (sf) => {
    for (const decl of sf.getImportDeclarations()) {
      if (decl.getModuleSpecifierValue() === op.specifier) {
        decl.remove()
        break
      }
    }
  })
}

function applyRemoveVariableStatement(
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
function applyRemoveCallStatement(
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

function applyRemoveCallArgument(
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
function applyRemoveJsxElement(
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
function applyRemoveJsxAttribute(
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

function applyRemoveInterfaceProperty(
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

function applyRemoveFunctionParameter(
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
    const target = elements.find((el) => el.getName() === op.parameterName)
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
function applyRemoveDestructuredBinding(
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

function applyReplaceJsDoc(
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

  return withSourceFile(project, sourceText, (sf) => {
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

      if (!changed) return sourceText
      return undefined // proceed with sf.getFullText()
    }

    sf.insertStatements(insertIndexAfterImports(sf), op.text)
    return undefined // proceed with sf.getFullText()
  })
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

  // Escape backslashes before quotes so the emitted literal round-trips.
  const escaped = op.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  arr.addElement(`'${escaped}'`, {
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
  return withSourceFile(project, sourceText, (sf) => {
    const exists = sf
      .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
      .some((d) => d.getName() === op.name)
    if (exists) return sourceText

    if (op.afterImports === false) {
      sf.addStatements(op.text)
    } else {
      sf.insertStatements(insertIndexAfterImports(sf), op.text)
    }
    return undefined // proceed with sf.getFullText()
  })
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

/**
 * Append `childText` as the last child of the first JSX element whose opening
 * tag matches `parentTagName`. Among same-tag candidates, an element that
 * already contains a direct `childTagName` child wins, so re-added elements
 * land next to their siblings. `parentTagName: 'Fragment'` falls back to the
 * first JSX fragment (`<>…</>`) when no `<Fragment>` element matches.
 *
 * No-op when any JSX element (or self-closing element) with tag
 * `childTagName` already exists anywhere in the file — narrowed to elements
 * whose attribute matches when `op.childAttribute` is provided (so e.g.
 * `<OrchestraToggle id="webgl">` can be re-added next to other toggles).
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
  return withSourceFile(project, sourceText, (sf) => {
    const childMatches = (
      tagName: string,
      getAttribute: (name: string) => JsxAttributeLike | undefined
    ): boolean => {
      if (tagName !== op.childTagName) return false
      if (!op.childAttribute) return true
      return (
        jsxAttrStringValue(getAttribute(op.childAttribute.name)) ===
        op.childAttribute.value
      )
    }

    const childExists =
      sf
        .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
        .some((el) =>
          childMatches(el.getTagNameNode().getText(), (name) =>
            el.getAttribute(name)
          )
        ) ||
      sf
        .getDescendantsOfKind(SyntaxKind.JsxElement)
        .some((el) =>
          childMatches(
            el.getOpeningElement().getTagNameNode().getText(),
            (name) => el.getOpeningElement().getAttribute(name)
          )
        )
    if (childExists) return sourceText

    // True when `el` has a direct JSX child whose tag matches the op's child.
    const hasSameTagChild = (el: JsxElement | JsxFragment): boolean =>
      el.getJsxChildren().some((child) => {
        if (child.getKind() === SyntaxKind.JsxSelfClosingElement) {
          return (
            child
              .asKindOrThrow(SyntaxKind.JsxSelfClosingElement)
              .getTagNameNode()
              .getText() === op.childTagName
          )
        }
        if (child.getKind() === SyntaxKind.JsxElement) {
          return (
            child
              .asKindOrThrow(SyntaxKind.JsxElement)
              .getOpeningElement()
              .getTagNameNode()
              .getText() === op.childTagName
          )
        }
        return false
      })

    const candidates = sf
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter(
        (el) =>
          el.getOpeningElement().getTagNameNode().getText() === op.parentTagName
      )

    let parent: JsxElement | JsxFragment | undefined =
      candidates.find(hasSameTagChild) ?? candidates[0]

    if (!parent && op.parentTagName === 'Fragment') {
      const fragments = sf.getDescendantsOfKind(SyntaxKind.JsxFragment)
      parent = fragments.find(hasSameTagChild) ?? fragments[0]
    }

    if (!parent) return sourceText

    const closing =
      parent.getKind() === SyntaxKind.JsxFragment
        ? parent.asKindOrThrow(SyntaxKind.JsxFragment).getClosingFragment()
        : parent.asKindOrThrow(SyntaxKind.JsxElement).getClosingElement()
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
    return undefined // proceed with sf.getFullText()
  })
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
      case 'removeCallArgument':
        text = applyRemoveCallArgument(project, text, op)
        break
      case 'removeJsxElement':
        text = applyRemoveJsxElement(project, text, op)
        break
      case 'removeJsxAttribute':
        text = applyRemoveJsxAttribute(project, text, op)
        break
      case 'removeDestructuredBinding':
        text = applyRemoveDestructuredBinding(project, text, op)
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
