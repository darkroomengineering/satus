import { RuleTester } from "oxlint/plugins-dev";

import { noWidenThenAssertRule } from "./no-widen-then-assert.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "widenThenAssert" };

tester.run("anti-slop/no-widen-then-assert", noWidenThenAssertRule, {
	valid: [
		"const source = { id: 'first' }; const widened: unknown = source;",
		"declare const input: unknown; const parsed = input as { readonly id: string };",
		// Cycle guard: a self-referencing declarator must not hang the
		// knownValueEvidence walk or false-positive.
		"const a: unknown = a; const parsed = a as { readonly id: string };",
		// Only `const` bindings are tracked: a `let` may be reassigned after widening.
		"const source = { id: 'x' }; let widened: unknown = source; const parsed = widened as { readonly id: string };",
		// The widening and the assertion must share a function boundary.
		"const source = { id: 'x' }; const widened: unknown = source; function useIt() { return widened as { readonly id: string }; }",
		// A plain rename of a widened binding is a new declarator that doesn't
		// widen, so it is not walked transitively (out of scope, not a bug).
		"const a: unknown = 'literal'; const b = a; const c = b as string;",
	],
	invalid: [
		{
			code: "const source = { id: 'second' }; const widened: unknown = source; const parsed = widened as { readonly id: string };",
			errors: [error],
		},
		{
			// Multi-hop: knownValueEvidence recurses through intermediate const aliases.
			code: "const original = { id: 'x' }; const alias = original; const widened: unknown = alias; const parsed = widened as { readonly id: string };",
			errors: [error],
		},
		{
			// declaredBroadKind ?? initializerBroadKind: no declared type, so the broad
			// kind comes from the initializer's own `as unknown`.
			code: "const source = { id: 'x' }; const widened = source as unknown; const parsed = widened as { readonly id: string };",
			errors: [error],
		},
	],
});
