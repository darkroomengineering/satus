import { RuleTester } from "oxlint/plugins-dev";

import { noWidenThenAssertRule } from "./no-widen-then-assert.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "widenThenAssert" };

tester.run("anti-slop/no-widen-then-assert", noWidenThenAssertRule, {
	valid: [
		"const source = { id: 'first' }; const widened: unknown = source;",
		"declare const input: unknown; const parsed = input as { readonly id: string };",
		// Cycle guard: a self-referencing declarator must not hang/crash the
		// recursive knownValueEvidence walk, and — since the cycle guard makes
		// the self-reference unresolvable evidence — must not false-positive.
		"const a: unknown = a; const parsed = a as { readonly id: string };",
		// Only `const` bindings are tracked (a `let` could be reassigned after
		// the widening, so the rule can't trust the evidence it captured).
		"const source = { id: 'x' }; let widened: unknown = source; const parsed = widened as { readonly id: string };",
		// The widening and the assertion must share a function boundary.
		"const source = { id: 'x' }; const widened: unknown = source; function useIt() { return widened as { readonly id: string }; }",
		// Scope boundary: the rule only inspects the widening at the variable
		// directly named in the assertion. A plain rename of an already-widened
		// binding introduces a new variable whose own declarator does not widen
		// anything, so it is not walked transitively — this is out of scope for
		// "Detect immutable local bindings that erase a known type and are later
		// asserted", not a bug.
		"const a: unknown = 'literal'; const b = a; const c = b as string;",
	],
	invalid: [
		{
			code: "const source = { id: 'second' }; const widened: unknown = source; const parsed = widened as { readonly id: string };",
			errors: [error],
		},
		{
			// Multi-hop widening: knownValueEvidence must recurse through more
			// than one intermediate const alias to find the original evidence.
			code: "const original = { id: 'x' }; const alias = original; const widened: unknown = alias; const parsed = widened as { readonly id: string };",
			errors: [error],
		},
		{
			// declaredBroadKind ?? initializerBroadKind: no declared type on the
			// widened binding, so the broad kind must come from the initializer's
			// own `as unknown` assertion instead.
			code: "const source = { id: 'x' }; const widened = source as unknown; const parsed = widened as { readonly id: string };",
			errors: [error],
		},
	],
});
