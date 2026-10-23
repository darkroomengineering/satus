// Every handler is IDEMPOTENT: when the construct is already present, no-op
// paths return `sourceText` byte-for-byte, never re-printed text.

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
  AddDestructuredBindingOp,
  AddFunctionBodyStatementOp,
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
 * Add an import declaration given as full source text. Same specifier already
 * imported: merge missing named/default bindings into it. Otherwise insert
 * after the last import, or after the directive prologue when there are none.
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
      return undefined
    }

    sf.insertStatements(insertIndexAfterImports(sf), op.text)
    return undefined
  })
}

/** No-op when an element with the same literal value (any quote style) exists. */
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

    const escaped = op.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    arr.addElement(`'${escaped}'`, {
      useNewLines: arr.getText().includes('\n'),
    })
    return undefined
  })
}

/** No-op when an element already matches `matchProperty` (same semantics as removeArrayObjectElement). */
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
    return undefined
  })
}

/**
 * No-op when a variable named `name` exists anywhere in the file (descendant
 * scan, like removeVariableStatement, so function-scoped declarations count).
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
    return undefined
  })
}

export function applyAddDestructuredBinding(
  project: Project,
  sourceText: string,
  op: AddDestructuredBindingOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    for (const stmt of sf.getDescendantsOfKind(SyntaxKind.VariableStatement)) {
      for (const decl of stmt.getDeclarations()) {
        const nameNode = decl.getNameNode()
        if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) continue

        const pattern = nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern)
        const initText = decl.getInitializer()?.getText() ?? ''
        if (!initText.includes(op.initializerContains)) continue

        const elements = pattern.getElements()
        if (elements.some((el) => el.getName() === op.bindingName)) {
          return sourceText
        }

        const names = [...elements.map((el) => el.getText()), op.bindingName]
        pattern.replaceWithText(`{ ${names.join(', ')} }`)
        return undefined
      }
    }
    return sourceText
  })
}

/**
 * Positioning is documented on `AddFunctionBodyStatementOp`.
 *
 * A given anchor that matches nothing returns `sourceText` unchanged instead
 * of appending: an append lands after a terminal return as dead code, and an
 * unchanged file is what lets a `required` op report the miss
 * (`applyOpsToText`) so self-prune never runs over it.
 */
export function applyAddFunctionBodyStatement(
  project: Project,
  sourceText: string,
  op: AddFunctionBodyStatementOp
): string {
  return withSourceFile(project, sourceText, (sf) => {
    const fn = sf.getFunction(op.functionName)
    if (!fn) return sourceText

    const body = fn.getBody()
    if (!body || body.getKind() !== SyntaxKind.Block) return sourceText
    const block = body.asKindOrThrow(SyntaxKind.Block)

    const statements = block.getStatements()
    const exists = statements.some((s) => s.getText().includes(op.marker))
    if (exists) return sourceText

    const containing = (needle: string) =>
      statements.find((s) => s.getText().includes(needle))

    // Raw text insertion, not `block.insertStatements(index, …)`: ts-morph's
    // numeric index mis-positions by one when a leading comment precedes the
    // block's first statement.
    if (op.afterContains !== undefined) {
      const anchor = containing(op.afterContains)
      if (anchor) {
        sf.insertText(anchor.getEnd(), `\n${op.text}`)
        return undefined
      }
    }

    if (op.beforeContains !== undefined) {
      const candidates =
        typeof op.beforeContains === 'string'
          ? [op.beforeContains]
          : op.beforeContains
      for (const candidate of candidates) {
        const anchor = containing(candidate)
        if (!anchor) continue
        // Start at the anchor's first leading comment so it stays attached.
        const commentStart = anchor.getLeadingCommentRanges()[0]?.getPos()
        const start = commentStart ?? anchor.getStart()
        const lineStart = sf.getFullText().lastIndexOf('\n', start - 1) + 1
        sf.insertText(lineStart, `${op.text}\n\n`)
        return undefined
      }
    }

    if (op.afterContains !== undefined || op.beforeContains !== undefined) {
      return sourceText
    }

    const last = statements[statements.length - 1]
    if (last) {
      sf.insertText(last.getEnd(), `\n${op.text}`)
    } else {
      const openBrace = block.getFirstChildByKindOrThrow(
        SyntaxKind.OpenBraceToken
      )
      sf.insertText(openBrace.getEnd(), `\n${op.text}`)
    }
    return undefined
  })
}

/**
 * Parent selection and the idempotency check are documented on `AddJsxChildOp`.
 *
 * Indentation: when the parent's closing tag sits on its own line, the child
 * goes on its own line matching the last existing child's indent (or one level
 * past the closing tag); single-line parents get it inline before the closing
 * tag.
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
      const childIndent =
        lastJsxChildIndent(parent, sourceText) ?? `${closingLinePrefix}  `
      sf.insertText(lineStart, `${childIndent}${op.childText}\n`)
    } else {
      sf.insertText(closingStart, op.childText)
    }
    return undefined
  })
}
