import {
  IndentationText,
  Project,
  QuoteKind,
  type SourceFile,
  SyntaxKind,
  ts,
} from 'ts-morph'

import type { AstOperation, CodeTransform } from '../ast-operation-types'
import { resolvePath } from '../utils'
import {
  applyAddArrayObjectElement,
  applyAddArrayStringElement,
  applyAddDestructuredBinding,
  applyAddFunctionBodyStatement,
  applyAddImport,
  applyAddJsxChild,
  applyAddVariableStatement,
} from './add-ops'
import { resolvePropertyPath, withSourceFile } from './helpers'
import {
  applyRemoveArrayObjectElement,
  applyRemoveArrayStringElement,
  applyRemoveCallArgument,
  applyRemoveCallStatement,
  applyRemoveDestructuredBinding,
  applyRemoveFunctionParameter,
  applyRemoveIfStatement,
  applyRemoveImport,
  applyRemoveInterfaceProperty,
  applyRemoveJsxAttribute,
  applyRemoveJsxElement,
  applyRemoveNamedImport,
  applyRemoveTryStatement,
  applyRemoveVariableStatement,
  applyReplaceFunctionBody,
  applyReplaceJsDoc,
} from './remove-ops'
import { applySyncUnusedParameterPrefix } from './set-ops'

/**
 * Thrown by `applyOpsToText` when a `required: true` op matches nothing (see
 * `RequiredMatchOp` in `ast-operation-types.ts`). `applyCodeTransforms`
 * re-throws it to hard-fail the run instead of collecting it into
 * `TransformFailure[]`.
 */
export class RequiredOpMatchError extends Error {
  override readonly name = 'RequiredOpMatchError'
}

function describeOp(op: AstOperation): string {
  switch (op.kind) {
    case 'removeImport':
      return `removeImport '${op.specifier}'`
    case 'removeNamedImport':
      return `removeNamedImport '${op.name}' from '${op.specifier}'`
    case 'removeVariableStatement':
      return `removeVariableStatement '${op.name}'`
    case 'removeCallStatement':
      return `removeCallStatement '${op.callee}'`
    case 'removeCallArgument':
      return `removeCallArgument '${op.argument}' from '${op.callee}'`
    case 'removeJsxElement':
      return `removeJsxElement '${op.tagName}'${op.attribute ? ` [${op.attribute.name}="${op.attribute.value}"]` : ''}`
    case 'removeJsxAttribute':
      return `removeJsxAttribute '${op.attributeName}' on '${op.tagName}'`
    case 'removeDestructuredBinding':
      return `removeDestructuredBinding '${op.bindingName}'`
    case 'removeInterfaceProperty':
      return `removeInterfaceProperty '${op.propertyName}' on '${op.interfaceName}'`
    case 'removeFunctionParameter':
      return `removeFunctionParameter '${op.parameterName}' on '${op.functionName}'`
    case 'replaceJsDoc':
      return `replaceJsDoc on '${op.functionName}'`
    case 'removeIfStatement':
      return `removeIfStatement '${op.conditionContains}'`
    case 'removeTryStatement':
      return `removeTryStatement '${op.blockContains}'`
    case 'replaceFunctionBody':
      return `replaceFunctionBody on '${op.functionName}'`
    case 'removeArrayObjectElement':
      return `removeArrayObjectElement '${op.matchProperty.name}=${op.matchProperty.value}' from '${op.variableName}.${op.propertyPath}'`
    case 'removeArrayStringElement':
      return `removeArrayStringElement '${op.value}' from '${op.variableName}.${op.propertyPath}'`
    case 'syncUnusedParameterPrefix':
      return `syncUnusedParameterPrefix '${op.parameterName}' on '${op.functionName}'`
    case 'addImport':
      return `addImport '${op.text}'`
    case 'addArrayStringElement':
      return `addArrayStringElement '${op.value}' to '${op.variableName}.${op.propertyPath}'`
    case 'addArrayObjectElement':
      return `addArrayObjectElement '${op.matchProperty.name}=${op.matchProperty.value}' to '${op.variableName}.${op.propertyPath}'`
    case 'addVariableStatement':
      return `addVariableStatement '${op.name}'`
    case 'addJsxChild':
      return `addJsxChild '${op.childTagName}' into '${op.parentTagName}'`
    case 'addDestructuredBinding':
      return `addDestructuredBinding '${op.bindingName}'`
    case 'addFunctionBodyStatement':
      return `addFunctionBodyStatement '${op.marker}' in '${op.functionName}'`
  }
}

/**
 * For a missed `required: true` op, decide whether the miss is provably
 * drift rather than a previous run's completed work. Ops that target a
 * construct INSIDE a container (a named function, a named interface) are
 * distinguishable:
 *
 * - container present, construct gone: a previous run removed it (idempotent
 *   re-run). Returns false.
 * - container gone: the op's premise no longer exists (renamed function,
 *   restructured config object), so drift even on a byte-identical file.
 *   Returns true.
 *
 * Ops whose target IS the whole construct (import, variable statement, JSX
 * element) have no container to probe, so absence is ambiguous and the
 * function returns false (tolerated). Each probe mirrors the corresponding
 * handler's lookup in remove-ops.ts.
 *
 * `addFunctionBodyStatement` and `syncUnusedParameterPrefix` always return
 * true: their benign no-op is filtered out earlier
 * (`requiredOpAlreadySatisfied`), so any miss reaching here is drift.
 *
 * Caveat: a container-anchored required op assumes no sibling transform
 * removes its container, or the retry would read it as drift. No op kind
 * removes whole functions, interfaces, destructurings, or config variables.
 */
function missedRequiredOpAnchorAbsent(
  project: Project,
  sourceText: string,
  op: AstOperation
): boolean {
  const probe = (check: (sf: SourceFile) => boolean) => {
    let present = false
    withSourceFile(project, sourceText, (sf) => {
      present = check(sf)
      return sourceText // never mutate — probe only
    })
    return !present
  }

  switch (op.kind) {
    case 'replaceFunctionBody':
    case 'replaceJsDoc':
    case 'removeFunctionParameter':
      return probe((sf) => sf.getFunction(op.functionName) !== undefined)
    case 'removeInterfaceProperty':
      return probe((sf) => sf.getInterface(op.interfaceName) !== undefined)
    case 'removeDestructuredBinding':
      return probe((sf) =>
        sf
          .getDescendantsOfKind(SyntaxKind.VariableStatement)
          .some((stmt) =>
            stmt
              .getDeclarations()
              .some(
                (decl) =>
                  decl.getNameNode().getKind() ===
                    SyntaxKind.ObjectBindingPattern &&
                  (decl.getInitializer()?.getText() ?? '').includes(
                    op.initializerContains
                  )
              )
          )
      )
    case 'removeCallArgument':
      return probe((sf) =>
        sf
          .getDescendantsOfKind(SyntaxKind.CallExpression)
          .some((call) => call.getExpression().getText() === op.callee)
      )
    case 'removeJsxAttribute':
      return probe(
        (sf) =>
          sf
            .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
            .some((el) => el.getTagNameNode().getText() === op.tagName) ||
          sf
            .getDescendantsOfKind(SyntaxKind.JsxElement)
            .some(
              (el) =>
                el.getOpeningElement().getTagNameNode().getText() === op.tagName
            )
      )
    case 'addFunctionBodyStatement':
    case 'syncUnusedParameterPrefix':
      return true
    case 'removeArrayObjectElement':
    case 'removeArrayStringElement':
      return probe(
        (sf) =>
          resolvePropertyPath(sf, op.variableName, op.propertyPath) !==
          undefined
      )
    default:
      return false
  }
}

/**
 * For a `required` op that left the text unchanged, decide whether the no-op
 * is the op's own success state rather than a miss. Checked against the text
 * at the moment the op ran, so a sibling op changing the same file cannot
 * turn it into a "matched nothing while others applied" error.
 *
 * - `addFunctionBodyStatement`: its marker is already in the body. A missing
 *   function or an unmatched named anchor is still a miss.
 * - `syncUnusedParameterPrefix`: the function has the parameter under either
 *   name, so the name already matches the body.
 *
 * Every other kind returns false (unchanged file is a miss, judged in
 * `applyOpsToText`).
 */
function requiredOpAlreadySatisfied(
  project: Project,
  sourceText: string,
  op: AstOperation
): boolean {
  let satisfied = false
  const check = (fn: (sf: SourceFile) => boolean) => {
    withSourceFile(project, sourceText, (sf) => {
      satisfied = fn(sf)
      return sourceText // never mutate — probe only
    })
    return satisfied
  }

  switch (op.kind) {
    case 'addFunctionBodyStatement':
      return check(
        (sf) =>
          sf
            .getFunction(op.functionName)
            ?.getBody()
            ?.asKind(SyntaxKind.Block)
            ?.getStatements()
            .some((s) => s.getText().includes(op.marker)) ?? false
      )
    case 'syncUnusedParameterPrefix':
      return check(
        (sf) =>
          sf
            .getFunction(op.functionName)
            ?.getParameters()
            .some((p) =>
              [op.parameterName, `_${op.parameterName}`].includes(p.getName())
            ) ?? false
      )
    default:
      return false
  }
}

/**
 * Apply a sequence of typed AST operations to source text in memory (never
 * touches disk). Each handler creates and removes its own source file in a
 * shared in-memory Project, so no AST state leaks between ops. JSX is enabled
 * so any op kind can parse `.tsx`.
 *
 * Required-match contract: a `required: true` op that leaves `text`
 * unchanged is a drift signal only when some OTHER op in the sequence DID
 * change the file. A no-op that is the op's own success state (see
 * `requiredOpAlreadySatisfied`) is not a miss. Misses are collected across
 * the sequence and judged at the end:
 *
 * - Misses + a changed file: `RequiredOpMatchError`. Partial application (an
 *   import stripped while its users survive) can only happen on drifted
 *   source.
 * - Misses + a byte-identical file: no-op. Disk writes are per-file atomic
 *   (`applyCodeTransforms` writes once per transform), so a file where EVERY
 *   op misses was fully transformed by a previous run. Throwing here made
 *   re-running an aborted batch fail permanently, recoverable only by a
 *   manual `git checkout`.
 *
 * One more check on a byte-identical file: a missed required op whose
 * CONTAINER construct is gone (function, interface) is provable drift and
 * throws (`missedRequiredOpAnchorAbsent`). This is the only drift detection
 * for a single-op required transform, which can never trip the
 * partial-application signal.
 *
 * Accepted gap: for container-less op kinds (import, variable statement, JSX
 * element), a file so drifted that NO op matches looks like an
 * already-transformed file and passes silently. Every pinned drift scenario
 * (renamed function, restructured try-block) leaves sibling ops matching, so
 * partial application still catches them.
 */
export function applyOpsToText(
  sourceText: string,
  ops: AstOperation[]
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
    // Match oxfmt style so additive ops insert text that needs no reformatting.
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  })
  let text = sourceText
  const missedRequiredOps: AstOperation[] = []

  for (const op of ops) {
    const before = text
    switch (op.kind) {
      case 'removeImport':
        text = applyRemoveImport(project, text, op)
        break
      case 'removeNamedImport':
        text = applyRemoveNamedImport(project, text, op)
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
      case 'removeIfStatement':
        text = applyRemoveIfStatement(project, text, op)
        break
      case 'removeTryStatement':
        text = applyRemoveTryStatement(project, text, op)
        break
      case 'replaceFunctionBody':
        text = applyReplaceFunctionBody(project, text, op)
        break
      case 'removeArrayObjectElement':
        text = applyRemoveArrayObjectElement(project, text, op)
        break
      case 'removeArrayStringElement':
        text = applyRemoveArrayStringElement(project, text, op)
        break
      case 'syncUnusedParameterPrefix':
        text = applySyncUnusedParameterPrefix(project, text, op)
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
      case 'addDestructuredBinding':
        text = applyAddDestructuredBinding(project, text, op)
        break
      case 'addFunctionBodyStatement':
        text = applyAddFunctionBodyStatement(project, text, op)
        break
    }

    if (
      op.required &&
      text === before &&
      !requiredOpAlreadySatisfied(project, text, op)
    ) {
      missedRequiredOps.push(op)
    }
  }

  if (missedRequiredOps.length > 0) {
    if (text !== sourceText) {
      throw new RequiredOpMatchError(
        `Required op(s) matched nothing while others applied (source shape may have drifted): ${missedRequiredOps.map(describeOp).join(', ')}`
      )
    }

    // Byte-identical file is usually a previous run's work, but a missed op
    // whose container is GONE is drift.
    const orphaned = missedRequiredOps.filter((op) =>
      missedRequiredOpAnchorAbsent(project, text, op)
    )
    if (orphaned.length > 0) {
      throw new RequiredOpMatchError(
        `Required op(s) matched nothing and their anchor construct is missing (source shape may have drifted): ${orphaned.map(describeOp).join(', ')}`
      )
    }
  }

  return text
}

/** A single file's transform failure, surfaced to callers instead of swallowed. */
export interface TransformFailure {
  file: string
  error: string
}

/**
 * Apply code transformations to on-disk project source files. No writes when
 * `dryRun`.
 *
 * A single file's failure never throws: the batch continues, because a
 * mid-run abort would leave some files transformed and others not. Failures
 * are returned in `failures` so callers can exit non-zero once the batch is
 * done.
 *
 * Exception: a `RequiredOpMatchError` (see `applyOpsToText`) is re-thrown
 * immediately, aborting the batch. Source drift from what a strip transform
 * expects risks a broken tree (an import removed, its users still there), and
 * that must stop the run before `setup()` reaches self-prune. A file where
 * EVERY op misses is skipped as already transformed, so repeating an aborted
 * run recovers.
 *
 * A missing target file is silently skipped UNLESS the transform contains a
 * `required: true` op: a missing file can't satisfy a required match, so it
 * throws `RequiredOpMatchError` like any other drift.
 *
 * `changedFiles` (relative paths, deduped, one entry per transform that wrote)
 * lets callers reformat exactly the files this run modified.
 */
export async function applyCodeTransforms(
  transforms: CodeTransform[],
  dryRun: boolean
): Promise<{
  changes: number
  changedFiles: string[]
  failures: TransformFailure[]
}> {
  let totalChanges = 0
  const changedFiles = new Set<string>()
  const failures: TransformFailure[] = []

  for (const transform of transforms) {
    try {
      const fullPath = resolvePath(transform.file)
      const file = Bun.file(fullPath)

      if (!(await file.exists())) {
        const requiredOps = transform.ops.filter((op) => op.required)
        if (requiredOps.length > 0) {
          throw new RequiredOpMatchError(
            `target file does not exist (required op(s): ${requiredOps.map(describeOp).join(', ')})`
          )
        }
        continue
      }

      const original = await file.text()
      const transformed = applyOpsToText(original, transform.ops)

      if (transformed !== original) {
        if (!dryRun) {
          await Bun.write(fullPath, transformed)
        }
        totalChanges++
        changedFiles.add(transform.file)
      }
    } catch (error) {
      if (error instanceof RequiredOpMatchError) {
        throw new RequiredOpMatchError(`${transform.file}: ${error.message}`)
      }
      failures.push({
        file: transform.file,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { changes: totalChanges, changedFiles: [...changedFiles], failures }
}
