/** AST-operation types shared by `ast-transforms.ts` and `integration-bundles.ts`. Types only, no runtime code. */

/**
 * Required-match contract. When `required` is true and the op matches nothing
 * while a sibling op in the same transform DID change the file, the runner
 * (`applyOpsToText` in `ast-transforms/index.ts`) throws. Otherwise a drifted
 * source shape would strip an import but leave the code using it, and the
 * build would fail with no signal after `setup:project` self-pruned the
 * machinery that could have caught it.
 *
 * When EVERY op in the transform misses (file byte-identical), the runner
 * no-ops: writes are per-transform atomic, so an all-miss file was already
 * transformed by a previous run. That keeps required ops idempotent, so
 * re-running an aborted `setup:project` succeeds.
 *
 * Only set `required` on ops whose single application point is guaranteed to
 * see pristine source. Most ops stay best-effort (additive ops already
 * present, removals re-applied via `stripAbsentIntegrationWiring`).
 */
export interface RequiredMatchOp {
  /**
   * Zero matches is a hard failure only as evidence of drift: a sibling op
   * changed the file, or the op's container construct is gone
   * (`missedRequiredOpAnchorAbsent` in `ast-transforms/index.ts`).
   */
  required?: boolean
}

/** Remove a top-level import declaration by its module specifier. */
export interface RemoveImportOp extends RequiredMatchOp {
  kind: 'removeImport'
  /** The module specifier string to match exactly, e.g. '@/webgl/components/canvas' */
  specifier: string
}

/**
 * Remove one named binding from an import declaration, keeping the others.
 * Removes the whole declaration when it was the only binding. No-op when the
 * specifier or binding isn't found.
 *
 * Use instead of `removeImport` when bindings of one declaration belong to
 * different integrations, e.g. `import { type NextRequest, NextResponse } from
 * 'next/server'` where only `NextResponse` is sanity-owned.
 */
export interface RemoveNamedImportOp extends RequiredMatchOp {
  kind: 'removeNamedImport'
  /** Module specifier of the import declaration to target, e.g. 'next/server' */
  specifier: string
  /** The named import to remove, e.g. 'NextResponse' */
  name: string
}

/**
 * Remove a `try { … } catch { … }` statement whose try-block source text
 * contains `blockContains`. Matches at any scope depth; removes every
 * occurrence, including its own leading comments.
 */
export interface RemoveTryStatementOp extends RequiredMatchOp {
  kind: 'removeTryStatement'
  /** Substring to match against the try block's own source text. */
  blockContains: string
}

/**
 * Replace the entire body of a named function with `replacement`, for gutting
 * a function to a stub when a targeted removal can't express the change.
 */
export interface ReplaceFunctionBodyOp extends RequiredMatchOp {
  kind: 'replaceFunctionBody'
  /** Name of the function whose body to replace, e.g. 'getCmsRoutes' */
  functionName: string
  /** Replacement body text, including braces, e.g. '{\n  return []\n}' */
  replacement: string
}

/** Remove a `const NAME = …` variable statement by name (any scope depth). */
export interface RemoveVariableStatementOp extends RequiredMatchOp {
  kind: 'removeVariableStatement'
  /** The variable name to remove, e.g. 'LazyWebGLCanvas' */
  name: string
}

/**
 * Remove a bare call-expression statement by its callee name. Matches at any
 * scope depth; removes every occurrence in the file.
 */
export interface RemoveCallStatementOp extends RequiredMatchOp {
  kind: 'removeCallStatement'
  /** The called identifier, e.g. 'useTheatre' */
  callee: string
}

/**
 * Remove a single argument (by its source text) from every call to `callee`,
 * e.g. drop `SheetContext` from `useContextBridge(TransformContext, SheetContext)`.
 * No-op when the argument is already absent.
 */
export interface RemoveCallArgumentOp extends RequiredMatchOp {
  kind: 'removeCallArgument'
  /** The called identifier, e.g. 'useContextBridge' */
  callee: string
  /** The argument's source text to remove, e.g. 'SheetContext' */
  argument: string
}

/** Remove (or unwrap) a JSX element by its tag name. */
export interface RemoveJsxElementOp extends RequiredMatchOp {
  kind: 'removeJsxElement'
  /** JSX tag name, e.g. 'LazyWebGLCanvas', 'Canvas', 'OrchestraToggle' */
  tagName: string
  /** Disambiguates elements sharing a tag, e.g. OrchestraToggle with id="webgl" */
  attribute?: { name: string; value: string }
  /** Keep children and remove only the opening and closing tags */
  unwrap?: boolean
}

/** Remove a property (with its leading JSDoc) from a named interface. */
export interface RemoveInterfacePropertyOp extends RequiredMatchOp {
  kind: 'removeInterfaceProperty'
  /** Interface name, e.g. 'WrapperProps' */
  interfaceName: string
  /** Property name, e.g. 'webgl' */
  propertyName: string
}

/**
 * Remove a named JSX attribute from every element with the given tag name,
 * self-closing or not.
 */
export interface RemoveJsxAttributeOp extends RequiredMatchOp {
  kind: 'removeJsxAttribute'
  /** Tag name of the element whose attribute to remove, e.g. 'Wrapper' */
  tagName: string
  /** Attribute name to remove, e.g. 'webgl' */
  attributeName: string
}

/**
 * Remove a named binding from a destructured variable declaration
 * (`const { …, name, … } = expr`, any scope depth). Rebuilt from the
 * remaining elements, preserving defaults and rest elements.
 */
export interface RemoveDestructuredBindingOp extends RequiredMatchOp {
  kind: 'removeDestructuredBinding'
  /** The binding name to remove, e.g. 'studio' */
  bindingName: string
  /**
   * Substring of the initializer expression text that narrows the target
   * declaration (e.g. 'useOrchestra'), so unrelated destructurings binding
   * the same name are left alone.
   */
  initializerContains: string
}

/** Remove a named parameter from a function's destructured props argument. */
export interface RemoveFunctionParameterOp extends RequiredMatchOp {
  kind: 'removeFunctionParameter'
  /** Exported function name, e.g. 'Wrapper' */
  functionName: string
  /** Parameter name as it appears in the destructured binding, e.g. 'webgl' */
  parameterName: string
}

/**
 * Replace the entire JSDoc block on a named function. Preferred over partial
 * text edits, which are brittle.
 */
export interface ReplaceJsDocOp extends RequiredMatchOp {
  kind: 'replaceJsDoc'
  /** Name of the function whose JSDoc to replace */
  functionName: string
  /** The replacement JSDoc text (must include /** … * /) */
  replacement: string
}

/**
 * Remove a bare `if (condition) { … }` statement (including any `else` chain)
 * whose condition source text contains `conditionContains`. Matches at any
 * scope depth; removes every occurrence, including each statement's own
 * leading comments.
 *
 * For guard-dispatch patterns such as a webhook router delegating to an
 * integration handler; pair with `removeImport` (handler) and
 * `removeVariableStatement` (guard variable) to remove the whole dispatch.
 */
export interface RemoveIfStatementOp extends RequiredMatchOp {
  kind: 'removeIfStatement'
  /** Substring to match against the `if` statement's condition source text. */
  conditionContains: string
}

/**
 * Remove an object element from an array property nested inside a named
 * variable declaration, e.g. `images.remotePatterns` in next.config.ts.
 * Matches an object literal containing a property whose name and string value
 * both match `matchProperty`.
 */
export interface RemoveArrayObjectElementOp extends RequiredMatchOp {
  kind: 'removeArrayObjectElement'
  /** Dot-separated path from the variable declaration to the array, e.g. `'images.remotePatterns'`. */
  propertyPath: string
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** Property name + value that must be present on the target object element. */
  matchProperty: { name: string; value: string }
}

/**
 * Remove a string-literal element from an array property nested inside a named
 * variable declaration, e.g. `experimental.optimizePackageImports`.
 */
export interface RemoveArrayStringElementOp extends RequiredMatchOp {
  kind: 'removeArrayStringElement'
  /** Dot-separated path from the variable declaration to the array, e.g. `'experimental.optimizePackageImports'`. */
  propertyPath: string
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** The exact string value to remove from the array. */
  value: string
}

/**
 * Keep a function parameter's `_` prefix in step with whether the body still
 * reads it: `request` becomes `_request` once no identifier in the body
 * refers to `request`, and `_request` becomes `request` again once one does.
 * Only the declaration is renamed; body references are never touched.
 *
 * For a handler whose every use of a parameter belongs to strippable
 * integrations: with all of them stripped, the bare name fails
 * `noUnusedParameters` and oxlint's `no-unused-vars`, and both ignore a `_`
 * prefix. Put it last in each owner's strip ops and each owner's re-add ops,
 * so whichever runs last leaves the name matching the body.
 *
 * No-op when the name already matches the body, when the body refers to the
 * prefixed name itself (an author's choice, left alone), or when neither
 * name is a parameter of the function. Only the last case is a `required`
 * miss.
 */
export interface SyncUnusedParameterPrefixOp extends RequiredMatchOp {
  kind: 'syncUnusedParameterPrefix'
  /** Top-level function declaration name, e.g. `'POST'`. */
  functionName: string
  /** The unprefixed parameter name, e.g. `'request'`. */
  parameterName: string
}

// Additive ops are IDEMPOTENT: when the construct is already present the
// source comes back byte-for-byte unchanged.

/**
 * Add a top-level import declaration, given as full source text. If an import
 * with the same module specifier exists, missing named imports are merged into
 * it; otherwise the declaration is inserted after the last import.
 */
export interface AddImportOp extends RequiredMatchOp {
  kind: 'addImport'
  /** Full import declaration text, e.g. `import { Canvas } from '@/webgl/components/canvas'` */
  text: string
}

/**
 * Append a string-literal element to an array property nested inside a named
 * variable declaration. Inverse of `removeArrayStringElement`. No-op when the
 * same literal value already exists.
 */
export interface AddArrayStringElementOp extends RequiredMatchOp {
  kind: 'addArrayStringElement'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** Dot-separated path from the variable declaration to the array, e.g. `'experimental.optimizePackageImports'`. */
  propertyPath: string
  /** The string value to append to the array. */
  value: string
}

/**
 * Append an object-literal element to an array property nested inside a named
 * variable declaration. Inverse of `removeArrayObjectElement`. No-op when an
 * element already matches `matchProperty` (same semantics as the removal,
 * including quoted-key normalization).
 */
export interface AddArrayObjectElementOp extends RequiredMatchOp {
  kind: 'addArrayObjectElement'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** Dot-separated path from the variable declaration to the array, e.g. `'images.remotePatterns'`. */
  propertyPath: string
  /** The object literal to append, as source text, e.g. `{ protocol: 'https', hostname: 'cdn.sanity.io' }` */
  objectText: string
  /** Property name + value identifying an already-present matching element. */
  matchProperty: { name: string; value: string }
}

/**
 * Insert a full variable statement. No-op when a variable named `name` already
 * exists anywhere in the file (any scope depth, like `removeVariableStatement`).
 */
export interface AddVariableStatementOp extends RequiredMatchOp {
  kind: 'addVariableStatement'
  /** The declared variable name used for the idempotency check, e.g. 'LazyWebGLCanvas' */
  name: string
  /** Full statement text to insert, e.g. `const LazyWebGLCanvas = dynamic(() => …)` */
  text: string
  /** Insert after the last import (true or omitted) or append at end of file (false). */
  afterImports?: boolean
}

/**
 * Append a JSX child as the last child of the first element whose opening tag
 * matches `parentTagName`, e.g. `<Canvas root />` inside <Wrapper>.
 *
 * Parent selection: among same-tag candidates, an element that already
 * contains a direct child with tag `childTagName` wins, so re-added elements
 * land next to their siblings. `parentTagName: 'Fragment'` falls back to the
 * first JSX fragment (`<>…</>`) when no `<Fragment>` element matches.
 *
 * No-op when any JSX element with tag `childTagName` already exists anywhere
 * in the file, narrowed to elements whose attribute matches when
 * `childAttribute` is provided.
 */
export interface AddJsxChildOp extends RequiredMatchOp {
  kind: 'addJsxChild'
  /** Tag name of the parent element to append into, e.g. 'Wrapper' */
  parentTagName: string
  /** The JSX child to append, as source text, e.g. `<Canvas root />` */
  childText: string
  /** Tag name of the child, used for the idempotency check, e.g. 'Canvas' */
  childTagName: string
  /**
   * Narrows the idempotency check: only an existing `childTagName` element
   * whose attribute matches blocks insertion, so `<OrchestraToggle id="webgl">`
   * can be re-added next to other toggles.
   */
  childAttribute?: { name: string; value: string }
}

/**
 * Add a named binding to an existing destructured variable declaration.
 * Inverse of `removeDestructuredBinding` (same `initializerContains`
 * matching). No-op when the binding already exists or no matching
 * destructuring is found.
 */
export interface AddDestructuredBindingOp extends RequiredMatchOp {
  kind: 'addDestructuredBinding'
  /** The binding name to add, e.g. 'stats' */
  bindingName: string
  /** Substring of the initializer expression text that finds the target declaration (e.g. 'useOrchestra'). */
  initializerContains: string
}

/**
 * Insert a full statement into a named function's body. No-op when a
 * statement containing `marker` already exists in the body.
 *
 * Positioning, first match wins:
 *
 * - `afterContains`: `text` goes immediately after the first statement
 *   containing that substring.
 * - `beforeContains`: `text` goes on its own lines immediately before the
 *   first statement containing the substring, ahead of that statement's
 *   leading comments (the way to land ahead of a terminal return). An array
 *   is a list of candidates tried in order.
 * - Neither given: `text` is appended as the body's last statement.
 *
 * An anchor that is given but matches no statement is a miss: the source
 * comes back unchanged, so a `required` op reports it instead of landing
 * somewhere nobody chose (after a terminal return, as dead code).
 */
export interface AddFunctionBodyStatementOp extends RequiredMatchOp {
  kind: 'addFunctionBodyStatement'
  /** Name of the function whose body to insert into, e.g. 'POST' */
  functionName: string
  /** Full statement text to insert. */
  text: string
  /** Substring used for the idempotency check against existing statements. */
  marker: string
  afterContains?: string
  beforeContains?: string | readonly string[]
}

export type AstOperation =
  | RemoveImportOp
  | RemoveNamedImportOp
  | RemoveVariableStatementOp
  | RemoveCallStatementOp
  | RemoveCallArgumentOp
  | RemoveJsxElementOp
  | RemoveJsxAttributeOp
  | RemoveDestructuredBindingOp
  | RemoveInterfacePropertyOp
  | RemoveFunctionParameterOp
  | ReplaceJsDocOp
  | RemoveIfStatementOp
  | RemoveTryStatementOp
  | ReplaceFunctionBodyOp
  | RemoveArrayObjectElementOp
  | RemoveArrayStringElementOp
  | SyncUnusedParameterPrefixOp
  | AddImportOp
  | AddArrayStringElementOp
  | AddArrayObjectElementOp
  | AddVariableStatementOp
  | AddJsxChildOp
  | AddDestructuredBindingOp
  | AddFunctionBodyStatementOp

export interface CodeTransform {
  /** Path to the file to transform (relative to project root) */
  file: string
  ops: AstOperation[]
}
