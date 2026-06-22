/**
 * AST-operation type system shared by `ast-transforms.ts` and `integration-bundles.ts`.
 *
 * Contains only exported interface/type declarations — zero runtime code.
 */

/** Remove a top-level import declaration by its module specifier. */
export interface RemoveImportOp {
  kind: 'removeImport'
  /** The module specifier string to match exactly, e.g. '@/webgl/components/canvas' */
  specifier: string
}

/** Remove a `const NAME = …` variable statement by name (any scope depth). */
export interface RemoveVariableStatementOp {
  kind: 'removeVariableStatement'
  /** The variable name to remove, e.g. 'LazyWebGLCanvas' */
  name: string
}

/**
 * Remove a bare call-expression statement by its callee name, e.g. the whole
 * `useTheatre(sheet, 'fluid simulation', { … })` statement. Matches at any
 * scope depth; removes every occurrence in the file.
 */
export interface RemoveCallStatementOp {
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
export interface RemoveCallArgumentOp {
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
export interface RemoveJsxElementOp {
  kind: 'removeJsxElement'
  /** JSX tag name, e.g. 'LazyWebGLCanvas', 'Canvas', 'OrchestraToggle' */
  tagName: string
  /** Optional attribute to match for disambiguation */
  attribute?: { name: string; value: string }
  /** When true, keep children and remove only the tags */
  unwrap?: boolean
}

/** Remove a property (with its leading JSDoc) from a named interface. */
export interface RemoveInterfacePropertyOp {
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
export interface RemoveJsxAttributeOp {
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
export interface RemoveDestructuredBindingOp {
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
export interface RemoveFunctionParameterOp {
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
export interface ReplaceJsDocOp {
  kind: 'replaceJsDoc'
  /** Name of the function whose JSDoc to replace */
  functionName: string
  /** The replacement JSDoc text (must include /** … * /) */
  replacement: string
}

/**
 * Remove an object element from an array property nested inside a named
 * variable declaration.  Designed for `images.remotePatterns` in next.config.ts.
 *
 * Matches an array element that is an object literal containing a property
 * whose name and string value both match the given `matchProperty`.
 */
export interface RemoveArrayObjectElementOp {
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
export interface RemoveArrayStringElementOp {
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
export interface AddImportOp {
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
export interface AddArrayStringElementOp {
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
export interface AddArrayObjectElementOp {
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
export interface AddVariableStatementOp {
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
export interface AddJsxChildOp {
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

export type AstOperation =
  | RemoveImportOp
  | RemoveVariableStatementOp
  | RemoveCallStatementOp
  | RemoveCallArgumentOp
  | RemoveJsxElementOp
  | RemoveJsxAttributeOp
  | RemoveDestructuredBindingOp
  | RemoveInterfacePropertyOp
  | RemoveFunctionParameterOp
  | ReplaceJsDocOp
  | RemoveArrayObjectElementOp
  | RemoveArrayStringElementOp
  | AddImportOp
  | AddArrayStringElementOp
  | AddArrayObjectElementOp
  | AddVariableStatementOp
  | AddJsxChildOp

export interface CodeTransform {
  /** Path to the file to transform (relative to project root) */
  file: string
  /** Typed AST operations to apply */
  ops: AstOperation[]
}
