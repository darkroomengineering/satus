/**
 * AST-based code transform engine — public API.
 *
 * Wires together the helper, remove-ops, and add-ops modules into the
 * two exported entry points used by the rest of the codebase:
 *
 *   applyOpsToText  — in-memory transform; safe to use in tests
 *   applyCodeTransforms — disk-writing orchestrator used by setup/satus
 */

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

/**
 * For a missed `required: true` op, decide whether the miss is provably
 * drift rather than a previous run's completed work. Some op kinds target a
 * construct INSIDE a container (a directive inside a named function, a
 * property on a named interface) — for those, the two causes of a miss are
 * distinguishable:
 *
 * - container present, construct gone → a previous run removed the
 *   construct; the miss is the idempotent re-run case. Returns false.
 * - container gone → the op's premise no longer exists in the source (a
 *   renamed function, a restructured config object) — drift, even when the
 *   file is otherwise byte-identical. Returns true.
 *
 * Kinds whose target IS the whole construct (an import, a variable
 * statement, a JSX element) have no container to probe — absence is
 * genuinely ambiguous there, and the function returns false (tolerated).
 * Each probe mirrors the corresponding handler's lookup in remove-ops.ts /
 * set-ops.ts, so "container present" means the handler would have found it.
 *
 * Caveat this encodes: a container-anchored required op assumes no sibling
 * transform removes its container — if one did, the retry would read the
 * missing container as drift and fail. No current bundle does this (there
 * is no op kind that removes whole functions, interfaces, destructurings,
 * or config variables).
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
    // Stricter than function-exists: this op only runs when Cache Components
    // is being disabled, which requires EVERY `'use cache'` boundary in the
    // file to be gone (see the op's docstring). A directive that merely MOVED
    // to another function leaves the named function standing directive-less —
    // indistinguishable from already-applied by the container probe alone —
    // so any surviving directive anywhere in the file is also drift.
    case 'removeUseCacheDirective':
      return probe(
        (sf) =>
          sf.getFunction(op.functionName) !== undefined &&
          !sf
            .getDescendantsOfKind(SyntaxKind.ExpressionStatement)
            .some(
              (stmt) =>
                stmt
                  .getExpression()
                  .asKind(SyntaxKind.StringLiteral)
                  ?.getLiteralValue() === 'use cache'
            )
      )
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
    case 'removeArrayObjectElement':
    case 'removeArrayStringElement':
    case 'setObjectProperty':
      return probe(
        (sf) =>
          resolvePropertyPath(sf, op.variableName, op.propertyPath) !==
          undefined
      )
    default:
      return false
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
 * byte-for-byte unchanged (no match found) is a drift signal — but only when
 * some OTHER op in the same sequence DID change the file. Misses are
 * collected across the whole sequence and judged at the end:
 *
 * - Misses + a changed file → `RequiredOpMatchError`. Partial application is
 *   the hazard the contract exists for (an import stripped while the code
 *   that used it survives), and it can only happen on drifted source.
 * - Misses + a byte-identical file → no-op. Disk writes are per-file atomic
 *   (`applyCodeTransforms` writes once per transform), so a file where EVERY
 *   op misses is a file a previous run already fully transformed — the
 *   re-run recovery path after a mid-batch abort. Throwing here made
 *   "repeat the run" permanently fail with no way forward but a manual
 *   `git checkout`.
 *
 * A byte-identical file gets one more check before passing: a missed
 * required op whose CONTAINER construct is gone (a `'use cache'` directive
 * whose named function no longer exists, an interface property whose
 * interface is missing) is provable drift — the already-applied case leaves
 * the container standing — and throws even with no other change. See
 * `missedRequiredOpAnchorAbsent`. This is what keeps a single-op required
 * transform (e.g. `CACHE_COMPONENTS_LLMS_TXT_TRANSFORM`) protected: it can
 * never trip the partial-application signal, so the anchor probe is its
 * only drift detection.
 *
 * The remaining tradeoff: for container-less op kinds (an import, a
 * variable statement, a JSX element), a file so drifted that NO op matches
 * is indistinguishable from an already-transformed file and passes
 * silently. Every pinned drift scenario (a renamed function, a
 * restructured try-block) leaves sibling ops matching, so partial
 * application still catches them — see `RequiredMatchOp`'s docstring in
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
      missedRequiredOps.push(op)
    }
  }

  // Judged after the whole sequence, not at the first miss — see the
  // required-match contract in this function's docstring.
  if (missedRequiredOps.length > 0) {
    if (text !== sourceText) {
      throw new RequiredOpMatchError(
        `Required op(s) matched nothing while others applied (source shape may have drifted): ${missedRequiredOps.map(describeOp).join(', ')}`
      )
    }

    // Byte-identical file: usually a previous run's completed work — but a
    // container-anchored op whose container is GONE is provable drift even
    // here (the already-applied case leaves the container standing).
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
 * nothing while sibling ops changed the same file — see `applyOpsToText`'s
 * contract) is deliberately NOT collected into `failures` — it's re-thrown
 * immediately, aborting this whole batch. Regular per-file failures are
 * recoverable (the other files still get their intended changes; the run
 * finishes and reports non-zero); a partial required-match miss means the
 * source shape has drifted from what a strip transform expects, which risks
 * leaving a broken tree (an import removed, the code that used it still
 * there) — that must stop the run before `setup()` reaches self-prune, not
 * just get reported alongside everything else at the end. A file where
 * EVERY op misses is instead treated as already transformed (a previous
 * run's write) and skipped, so repeating an aborted run recovers instead of
 * failing on work the first run already finished.
 *
 * A missing target file is silently skipped (`continue`, no failure entry)
 * UNLESS the transform contains at least one `required: true` op — a missing
 * file can't possibly satisfy a required match, so that's the same drifted-
 * source signal as a required op matching nothing on a file that DOES exist,
 * and is handled identically: `RequiredOpMatchError` is thrown and aborts
 * the batch, same as above.
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
