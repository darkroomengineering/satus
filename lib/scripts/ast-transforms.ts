/**
 * AST-based code transform engine — barrel re-export.
 *
 * Public API is unchanged for all callers. Implementation is split across:
 *   ast-transforms/helpers.ts     — shared helpers
 *   ast-transforms/remove-ops.ts  — subtractive operation handlers
 *   ast-transforms/add-ops.ts     — additive operation handlers
 *   ast-transforms/index.ts       — dispatch + disk API
 */

export { applyCodeTransforms, applyOpsToText } from './ast-transforms/index'
