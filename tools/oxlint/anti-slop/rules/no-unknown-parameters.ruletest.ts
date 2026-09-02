import { RuleTester } from "oxlint/plugins-dev";

import { noUnknownParametersRule } from "./no-unknown-parameters.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "unknownParameter" };

tester.run("anti-slop/no-unknown-parameters", noUnknownParametersRule, {
  valid: [
    "function f(value: string) {}",
    "function f(cause: unknown) {}",
    "const f = (cause: unknown) => {};",
    "interface Owner { method(value: string): void }",
    "type Fn = (value: string) => void;",
    "function f(...values: unknown[]) {}",
  ],
  invalid: [
    { code: "function f(value: unknown) {}", errors: [error] },
    { code: "const f = (value: unknown) => {};", errors: [error] },
    { code: "function f(value: unknown = undefined) {}", errors: [error] },
    { code: "function f(...value: unknown) {}", errors: [error] },
    { code: "interface Owner { method(value: unknown): void }", errors: [error] },
    { code: "type Fn = (value: unknown) => void;", errors: [error] },
    {
      code: "class Owner { constructor(public value: unknown) {} }",
      errors: [error],
    },
  ],
});
