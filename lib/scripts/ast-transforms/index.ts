/**
 * AST-based code transform engine — public API.
 *
 * Wires together the helper, remove-ops, and add-ops modules into the
 * two exported entry points used by the rest of the codebase:
 *
 *   applyOpsToText  — in-memory transform; safe to use in tests
 *   applyCodeTransforms — disk-writing orchestrator used by setup/satus
 */

import { IndentationText, Project, QuoteKind, ts } from 'ts-morph'

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
  applyRemoveUseCacheDirective,
  applyRemoveVariableStatement,
  applyReplaceFunctionBody,
  applyReplaceJsDoc,
} from './remove-ops'
import { applySetObjectProperty } from './set-ops'

// ---------------------------------------------------------------------------
// Required-match contract
// ---------------------------------------------------------------------------

/**
 * Thrown by `applyOpsToText` when a `required: true` op matches nothing —
 * see `RequiredMatchOp`'s docstring in `ast-operation-types.ts` for the full
 * rationale. Distinguished from a regular op-application error so
 * `applyCodeTransforms` can re-throw it (hard-fail the whole run) instead of
 * collecting it into `TransformFailure[]` like every other error.
 */
export class RequiredOpMatchError extends Error {
  override readonly name = 'RequiredOpMatchError'
}

/** One-line, human-readable description of an op, for RequiredOpMatchError's message. */
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
    case 'removeUseCacheDirective':
      return `removeUseCacheDirective on '${op.functionName}'`
    case 'replaceFunctionBody':
      return `replaceFunctionBody on '${op.functionName}'`
    case 'removeArrayObjectElement':
      return `removeArrayObjectElement '${op.matchProperty.name}=${op.matchProperty.value}' from '${op.variableName}.${op.propertyPath}'`
    case 'removeArrayStringElement':
      return `removeArrayStringElement '${op.value}' from '${op.variableName}.${op.propertyPath}'`
    case 'setObjectProperty':
      return `setObjectProperty '${op.variableName}.${op.propertyPath}'`
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
    // Exhaustiveness — TypeScript ensures all union members are handled above.
  }
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
 *
 * Required-match contract: an op with `required: true` that leaves `text`
 * byte-for-byte unchanged (no match found) throws `RequiredOpMatchError`
 * instead of silently continuing — see `RequiredMatchOp`'s docstring in
 * `ast-operation-types.ts`.
 */
export function applyOpsToText(
  sourceText: string,
  ops: AstOperation[]
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
    // Match house style (oxfmt: 2-space indent, single quotes) so additive
    // ops insert text that needs no reformatting.
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  })
  let text = sourceText

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
      case 'removeUseCacheDirective':
        text = applyRemoveUseCacheDirective(project, text, op)
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
      case 'setObjectProperty':
        text = applySetObjectProperty(project, text, op)
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
      // Exhaustiveness — TypeScript ensures all union members are handled above.
    }

    if (op.required && text === before) {
      throw new RequiredOpMatchError(
        `Required op matched nothing (source shape may have drifted): ${describeOp(op)}`
      )
    }
  }

  return text
}

// ---------------------------------------------------------------------------
// Public disk-writing API used by setup-project.ts
// ---------------------------------------------------------------------------

/** A single file's transform failure, surfaced to callers instead of swallowed. */
export interface TransformFailure {
  file: string
  error: string
}

/**
 * Apply code transformations to on-disk project source files.
 * Honors `dryRun` (no writes when true).
 *
 * Never throws on a single file's failure — the transform continues across
 * the remaining files (a batch mid-run abort would leave some files
 * transformed and others not, which is worse than finishing the batch and
 * reporting every failure at once). Failures are collected and returned
 * instead of only logged, so callers can fail loudly — and non-zero — once
 * the batch is done, rather than exiting 0 on a silently-incomplete run.
 *
 * Exception: a `RequiredOpMatchError` (a `required: true` op that matched
 * nothing) is deliberately NOT collected into `failures` — it's re-thrown
 * immediately, aborting this whole batch. Regular per-file failures are
 * recoverable (the other files still get their intended changes; the run
 * finishes and reports non-zero); a required-match miss means the source
 * shape has drifted from what a strip transform expects, which risks
 * leaving a broken tree (an import removed, the code that used it still
 * there) — that must stop the run before `setup()` reaches self-prune, not
 * just get reported alongside everything else at the end.
 *
 * `changedFiles` (relative paths, deduped, one entry per transform that
 * actually wrote — a single file can appear once even if two transforms in
 * `transforms` both touch it) lets callers reformat exactly the files this
 * run modified afterward (P-B2), instead of the whole repo.
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

      if (!(await file.exists())) continue

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
