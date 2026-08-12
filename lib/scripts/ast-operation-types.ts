/**
 * AST-operation type system shared by `ast-transforms.ts` and `integration-bundles.ts`.
 *
 * Contains only exported interface/type declarations — zero runtime code.
 */

/**
 * Shared by every op: a required-match contract (cross-model review
 * finding). When `required` is true, the op matches nothing on the file
 * it's applied to, AND a sibling op in the same transform DID change the
 * file, the runner (`applyOpsToText` in `ast-transforms/index.ts`) throws
 * instead of silently leaving a partial result — a source shape that
 * drifted out from under a strip transform (a rename, a moved function, a
 * restructured try/catch) would otherwise strip an import while leaving the
 * code that used it, producing a tree that fails to build with no signal
 * until `bun run build` — by which point `setup:project` has already
 * self-pruned the machinery that could have caught it.
 *
 * When EVERY op in the transform misses (the file comes back
 * byte-identical), the runner no-ops instead: file writes are per-transform
 * atomic, so an all-miss file is one a previous run already transformed.
 * That makes required ops idempotent — repeating a `setup:project` run that
 * aborted mid-batch succeeds over the half-stripped tree instead of
 * throwing on the files the first run finished.
 *
 * Defaults to false/undefined: most ops are intentionally best-effort or
 * idempotent by design (e.g. an additive op that's a legitimate no-op
 * because the construct is already present, or a removal op reapplied to an
 * already-lean file via `stripAbsentIntegrationWiring`) — `required` is only
 * safe to set on ops whose single, deterministic application point is
 * guaranteed to see pristine, never-before-touched source (see each op's
 * `required: true` usage in `integration-bundles.ts` / `setup-project.ts`
 * for the reasoning).
 */
export interface RequiredMatchOp {
  /**
   * When true, zero matches for this op is a hard failure when it is
   * evidence of drift: a sibling op changed the file (partial application),
   * or the op's container construct is gone (`missedRequiredOpAnchorAbsent`
   * in `ast-transforms/index.ts`). A miss on a byte-identical file whose
   * container survives is tolerated as a previous run's completed work —
   * the idempotent re-run contract described above.
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
 * Remove a single named binding from an existing import declaration, keeping
 * any other named/default/namespace bindings on that declaration intact.
 * When the removed binding was the declaration's only binding, the whole
 * declaration is removed (mirrors `removeImport`'s cleanup). No-op when the
 * specifier or the named binding isn't found.
 *
 * Use this instead of `removeImport` when a declaration is shared by bindings
 * owned by different integrations, e.g. `import { type NextRequest,
 * NextResponse } from 'next/server'` where only `NextResponse` is
 * sanity-owned and `NextRequest` must survive (it types the shared handler's
 * parameter).
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
 * contains `blockContains` (disambiguates multiple try statements in the same
 * file). Matches at any scope depth; removes every occurrence, including its
 * own leading comments. Pure deletion — no replacement — mirrors
 * `removeIfStatement`.
 */
export interface RemoveTryStatementOp extends RequiredMatchOp {
  kind: 'removeTryStatement'
  /** Substring to match against the try block's own source text. */
  blockContains: string
}

/**
 * Remove a `'use cache'` directive that sits as the first statement of a
 * named function's body. No-op when the function isn't found or its first
 * statement isn't a `'use cache'` directive.
 *
 * Used to keep a `'use cache'` boundary from becoming a hard Next.js compile
 * error once Cache Components is disabled (`cacheComponents: false` requires
 * every `'use cache'` boundary in the app to be gone too) — see
 * `setupCacheComponentsOptOut`.
 */
export interface RemoveUseCacheDirectiveOp extends RequiredMatchOp {
  kind: 'removeUseCacheDirective'
  /** Name of the function whose leading directive to remove, e.g. 'buildBody' */
  functionName: string
}

/**
 * Replace the entire body of a named function with `replacement` (source
 * text including the surrounding braces, e.g. `{ return [] }`). Used to gut a
 * function down to a lean stub when the codeTransform machinery can't express
 * a targeted removal inside a complex body (mirrors `replaceJsDoc`'s
 * whole-block-replacement approach, applied to a function body instead of a
 * JSDoc comment).
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
 * Remove a bare call-expression statement by its callee name, e.g. the whole
 * `useTheatre(sheet, 'fluid simulation', { … })` statement. Matches at any
 * scope depth; removes every occurrence in the file.
 */
export interface RemoveCallStatementOp extends RequiredMatchOp {
  kind: 'removeCallStatement'
  /** The called identifier, e.g. 'useTheatre' */
  callee: string
}

/**
 * Remove a single argument (by its source text) from every call to `callee`,
 * e.g. drop `SheetContext` from `useContextBridge(TransformContext, SheetContext)`
 * so the remaining `useContextBridge(TransformContext)` stops depending on the
 * stripped Theatre.js module. No-op when the argument is already absent.
 */
export interface RemoveCallArgumentOp extends RequiredMatchOp {
  kind: 'removeCallArgument'
  /** The called identifier, e.g. 'useContextBridge' */
  callee: string
  /** The argument's source text to remove, e.g. 'SheetContext' */
  argument: string
}

/**
 * Remove (or unwrap) a JSX element by its tag name.
 *
 * - `attribute` — optional {name, value} pair that must match to disambiguate
 *   elements sharing the same tag (e.g. OrchestraToggle with id="webgl").
 * - `unwrap` — when true, keep the element's children and remove only the
 *   opening / closing tags (e.g. strip <Canvas> but keep its content).
 */
export interface RemoveJsxElementOp extends RequiredMatchOp {
  kind: 'removeJsxElement'
  /** JSX tag name, e.g. 'LazyWebGLCanvas', 'Canvas', 'OrchestraToggle' */
  tagName: string
  /** Optional attribute to match for disambiguation */
  attribute?: { name: string; value: string }
  /** When true, keep children and remove only the tags */
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
 * Remove a named JSX attribute from all JSX elements with a given tag name.
 * Targets both self-closing and open/close elements.
 *
 * @example Remove `webgl` prop from every `<Wrapper webgl …>` usage:
 * `{ kind: 'removeJsxAttribute', tagName: 'Wrapper', attributeName: 'webgl' }`
 */
export interface RemoveJsxAttributeOp extends RequiredMatchOp {
  kind: 'removeJsxAttribute'
  /** Tag name of the element whose attribute to remove, e.g. 'Wrapper' */
  tagName: string
  /** Attribute name to remove, e.g. 'webgl' */
  attributeName: string
}

/**
 * Remove a named binding from a destructured variable declaration.
 *
 * Targets `const { …, name, … } = expr` statements at any scope depth.
 * Rebuilt from the remaining elements, preserving defaults and rest elements.
 *
 * @example Remove `studio` from `const { stats, grid, studio } = useOrchestra()`
 * `{ kind: 'removeDestructuredBinding', variableName: 'studio', declarationPattern: 'useOrchestra' }`
 */
export interface RemoveDestructuredBindingOp extends RequiredMatchOp {
  kind: 'removeDestructuredBinding'
  /** The binding name to remove, e.g. 'studio' */
  bindingName: string
  /**
   * Substring of the initializer expression text used to narrow the target
   * declaration (e.g. 'useOrchestra'). Prevents accidentally modifying
   * unrelated destructurings that happen to bind the same name.
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
 * Replace the entire JSDoc block on a named function with a provided string.
 * Used when multiple partial-text edits to the JSDoc would be brittle; a full
 * replacement is simpler and guarantees the result is well-formed.
 */
export interface ReplaceJsDocOp extends RequiredMatchOp {
  kind: 'replaceJsDoc'
  /** Name of the function whose JSDoc to replace */
  functionName: string
  /** The replacement JSDoc text (must include /** … * /) */
  replacement: string
}

/**
 * Remove a bare `if (condition) { … }` statement (including any attached
 * `else` chain) whose condition source text contains `conditionContains`.
 * Matches at any scope depth; removes every occurrence in the file, including
 * each matched statement's own leading comments.
 *
 * Designed for guard-dispatch patterns like a webhook router delegating to an
 * integration handler:
 * `if (isShopifyWebhook) { return shopifyRevalidate(request) }` — pair with
 * `removeImport` (for the handler import) and `removeVariableStatement` (for
 * the guard variable) to remove the whole dispatch.
 *
 * @example Remove the Shopify webhook dispatch:
 * `{ kind: 'removeIfStatement', conditionContains: 'isShopifyWebhook' }`
 */
export interface RemoveIfStatementOp extends RequiredMatchOp {
  kind: 'removeIfStatement'
  /** Substring to match against the `if` statement's condition source text. */
  conditionContains: string
}

/**
 * Remove an object element from an array property nested inside a named
 * variable declaration.  Designed for `images.remotePatterns` in next.config.ts.
 *
 * Matches an array element that is an object literal containing a property
 * whose name and string value both match the given `matchProperty`.
 */
export interface RemoveArrayObjectElementOp extends RequiredMatchOp {
  kind: 'removeArrayObjectElement'
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'images.remotePatterns'`.
   */
  propertyPath: string
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** Property name + value that must be present on the target object element. */
  matchProperty: { name: string; value: string }
}

/**
 * Remove a string-literal element from an array property nested inside a named
 * variable declaration.  Designed for `experimental.optimizePackageImports`.
 */
export interface RemoveArrayStringElementOp extends RequiredMatchOp {
  kind: 'removeArrayStringElement'
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'experimental.optimizePackageImports'`.
   */
  propertyPath: string
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** The exact string value to remove from the array. */
  value: string
}

// ---------------------------------------------------------------------------
// Mutating operations
// Unlike the additive ops below, these never create a construct that doesn't
// already exist — they overwrite an existing value in place.
// ---------------------------------------------------------------------------

/**
 * Set an existing property's value in an object literal at
 * `variableName`.`propertyPath` (dot-separated, walking nested object
 * properties, e.g. `'experimental.cachedNavigations'`). Overwrites the
 * property's current initializer with `valueText`, inserted verbatim as
 * source text — callers are responsible for quoting (e.g. `'false'` for a
 * boolean, `"'some string'"` for a string literal).
 *
 * Designed for flipping a `next.config.ts` flag conditionally, e.g. turning
 * `cacheComponents` off when no kept integration benefits from it.
 *
 * No-op (returns the source unchanged) when `variableName`/`propertyPath`
 * doesn't resolve to an existing property, or the property's current value
 * already equals `valueText` — see `applySetObjectProperty`'s doc for the
 * exact conditions.
 */
export interface SetObjectPropertyOp extends RequiredMatchOp {
  kind: 'setObjectProperty'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /**
   * Dot-separated path from the variable declaration down to the property
   * to set, e.g. `'cacheComponents'` or `'experimental.cachedNavigations'`.
   */
  propertyPath: string
  /** Replacement value, as source text, e.g. `'false'`. */
  valueText: string
}

// ---------------------------------------------------------------------------
// Additive operations (inverse of the removals above)
// Every additive op is IDEMPOTENT: when the construct it would add is already
// present, the source text is returned byte-for-byte unchanged, so applying
// the same op twice is a no-op.
// ---------------------------------------------------------------------------

/**
 * Add a top-level import declaration, given as full source text.
 *
 * If an import with the same module specifier already exists, any missing
 * named imports are merged into it (no-op when all bindings are present).
 * Otherwise the declaration is inserted after the last existing import, e.g.
 * re-adding `import { Canvas } from '@/webgl/components/canvas'`.
 */
export interface AddImportOp extends RequiredMatchOp {
  kind: 'addImport'
  /** Full import declaration text, e.g. `import { Canvas } from '@/webgl/components/canvas'` */
  text: string
}

/**
 * Append a string-literal element to an array property nested inside a named
 * variable declaration.  Inverse of `removeArrayStringElement`; designed for
 * `experimental.optimizePackageImports` in next.config.ts.
 *
 * No-op when an element with the same literal value already exists.
 */
export interface AddArrayStringElementOp extends RequiredMatchOp {
  kind: 'addArrayStringElement'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'experimental.optimizePackageImports'`.
   */
  propertyPath: string
  /** The string value to append to the array. */
  value: string
}

/**
 * Append an object-literal element to an array property nested inside a named
 * variable declaration.  Inverse of `removeArrayObjectElement`; designed for
 * `images.remotePatterns` in next.config.ts.
 *
 * No-op when an element already matches `matchProperty` (same matching
 * semantics as `removeArrayObjectElement`, including quoted-key
 * normalization).
 */
export interface AddArrayObjectElementOp extends RequiredMatchOp {
  kind: 'addArrayObjectElement'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'images.remotePatterns'`.
   */
  propertyPath: string
  /** The object literal to append, as source text, e.g. `{ protocol: 'https', hostname: 'cdn.sanity.io' }` */
  objectText: string
  /** Property name + value identifying an already-present matching element. */
  matchProperty: { name: string; value: string }
}

/**
 * Insert a full variable statement, e.g. re-adding
 * `const LazyWebGLCanvas = dynamic(…)` to lib/features/index.tsx.
 *
 * No-op when a variable named `name` already exists anywhere in the file
 * (any scope depth, mirroring `removeVariableStatement`).
 */
export interface AddVariableStatementOp extends RequiredMatchOp {
  kind: 'addVariableStatement'
  /** The declared variable name used for the idempotency check, e.g. 'LazyWebGLCanvas' */
  name: string
  /** Full statement text to insert, e.g. `const LazyWebGLCanvas = dynamic(() => …)` */
  text: string
  /**
   * When true or omitted, insert after the last import declaration.
   * When false, append at the end of the file.
   */
  afterImports?: boolean
}

/**
 * Append a JSX child as the last child of the first element whose opening tag
 * matches `parentTagName`, e.g. re-adding `<Canvas root />` inside <Wrapper>.
 *
 * Parent selection: among same-tag candidates, an element that already
 * contains a direct child with tag `childTagName` wins, so re-added elements
 * land next to their siblings (e.g. an OrchestraToggle row). The special
 * value `parentTagName: 'Fragment'` falls back to the first JSX fragment
 * (`<>…</>`) when no `<Fragment>` element matches.
 *
 * No-op when any JSX element (or self-closing element) with tag
 * `childTagName` already exists anywhere in the file — narrowed to elements
 * whose attribute matches when `childAttribute` is provided.
 */
export interface AddJsxChildOp extends RequiredMatchOp {
  kind: 'addJsxChild'
  /**
   * Tag name of the parent element to append into, e.g. 'Wrapper'.
   * 'Fragment' targets the first JSX fragment when no element matches.
   */
  parentTagName: string
  /** The JSX child to append, as source text, e.g. `<Canvas root />` */
  childText: string
  /** Tag name of the child, used for the idempotency check, e.g. 'Canvas' */
  childTagName: string
  /**
   * Optional attribute narrowing the idempotency check: only an existing
   * `childTagName` element whose attribute matches blocks insertion, so
   * `<OrchestraToggle id="webgl">` can be re-added next to other toggles.
   */
  childAttribute?: { name: string; value: string }
}

/**
 * Add a named binding to an existing destructured variable declaration.
 * Inverse of `removeDestructuredBinding`.
 *
 * Targets `const { …, name, … } = expr` statements at any scope depth,
 * narrowed by `initializerContains` (same matching semantics as
 * `removeDestructuredBinding`). No-op when a binding with `bindingName`
 * already exists on the matched pattern, or when no matching destructuring is
 * found.
 *
 * @example Re-add `stats` to `const { grid, studio } = useOrchestra()`
 * `{ kind: 'addDestructuredBinding', bindingName: 'stats', initializerContains: 'useOrchestra' }`
 */
export interface AddDestructuredBindingOp extends RequiredMatchOp {
  kind: 'addDestructuredBinding'
  /** The binding name to add, e.g. 'stats' */
  bindingName: string
  /**
   * Substring of the initializer expression text used to find the target
   * declaration (e.g. 'useOrchestra').
   */
  initializerContains: string
}

/**
 * Insert a full statement into a named function's body. No-op when a
 * statement containing `marker` already exists in the body (idempotency
 * check, mirrors `addVariableStatement`'s name-based check).
 *
 * Positioning: when `afterContains` is given and a statement containing that
 * substring exists, `text` is inserted immediately after it — a stable
 * anchor independent of what other additive ops have already inserted.
 * Otherwise `text` is appended as the body's last statement.
 */
export interface AddFunctionBodyStatementOp extends RequiredMatchOp {
  kind: 'addFunctionBodyStatement'
  /** Name of the function whose body to insert into, e.g. 'POST' */
  functionName: string
  /** Full statement text to insert. */
  text: string
  /** Substring used for the idempotency check against existing statements. */
  marker: string
  /** Optional anchor: insert immediately after the statement containing this substring. */
  afterContains?: string
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
  | RemoveUseCacheDirectiveOp
  | ReplaceFunctionBodyOp
  | RemoveArrayObjectElementOp
  | RemoveArrayStringElementOp
  | SetObjectPropertyOp
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
  /** Typed AST operations to apply */
  ops: AstOperation[]
}
