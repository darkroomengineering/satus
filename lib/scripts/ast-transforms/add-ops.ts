/**
 * Additive AST operation handlers.
 *
 * Every handler is IDEMPOTENT: when the construct it would add is already
 * present, the original source text is returned byte-for-byte unchanged
 * (no-op paths return `sourceText`, never re-printed text).
 */

import {
  type JsxAttributeLike,
  type JsxElement,
  type JsxFragment,
  type Project,
  SyntaxKind,
} from 'ts-morph'
import type {
  AddArrayObjectElementOp,
  AddArrayStringElementOp,
  AddImportOp,
  AddJsxChildOp,
  AddVariableStatementOp,
} from '../ast-operation-types'
import {
  insertIndexAfterImports,
  jsxAttrStringValue,
  lastJsxChildIndent,
  objectElementMatches,
  resolvePropertyPath,
  withSourceFile,
} from './helpers'

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
export function applyAddImport(
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
export function applyAddArrayStringElement(
  project: Project,
  sourceText: string,
  op: AddArrayStringElementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const node = resolvePropertyPath(sf, op.variableName, op.propertyPath)

    if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
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
      return sourceText
    }

    // Escape backslashes before quotes so the emitted literal round-trips.
    const escaped = op.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    arr.addElement(`'${escaped}'`, {
      useNewLines: arr.getText().includes('\n'),
    })
    return undefined // proceed with sf.getFullText()
  })
}

/**
 * Append an object-literal element (given as source text) to the array at
 * `variableName`.`propertyPath`. No-op when an element already matches
 * `matchProperty` — same semantics as removeArrayObjectElement, including
 * quoted-key normalization.
 */
export function applyAddArrayObjectElement(
  project: Project,
  sourceText: string,
  op: AddArrayObjectElementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const node = resolvePropertyPath(sf, op.variableName, op.propertyPath)

    if (!node || node.getKind() !== SyntaxKind.ArrayLiteralExpression) {
      return sourceText
    }

    const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
    const alreadyPresent = arr
      .getElements()
      .some((el) => objectElementMatches(el, op.matchProperty))
    if (alreadyPresent) {
      return sourceText
    }

    arr.addElement(op.objectText, {
      useNewLines: arr.getText().includes('\n'),
    })
    return undefined // proceed with sf.getFullText()
  })
}

/**
 * Insert a full variable statement. No-op when a variable named `name`
 * already exists anywhere in the file — descendant scan mirrors
 * removeVariableStatement, so function-scoped declarations count as present.
 */
export function applyAddVariableStatement(
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
export function applyAddJsxChild(
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
