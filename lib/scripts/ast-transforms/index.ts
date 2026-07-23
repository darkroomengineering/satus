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
  applyRemoveVariableStatement,
  applyReplaceJsDoc,
} from './remove-ops'
import { applySetObjectProperty } from './set-ops'

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
      case 'removeIfStatement':
        text = applyRemoveIfStatement(project, text, op)
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
      // Exhaustiveness — TypeScript ensures all union members are handled above.
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
 */
export async function applyCodeTransforms(
  transforms: CodeTransform[],
  dryRun: boolean
): Promise<{ changes: number; failures: TransformFailure[] }> {
  let totalChanges = 0
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
      }
    } catch (error) {
      failures.push({
        file: transform.file,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { changes: totalChanges, failures }
}
