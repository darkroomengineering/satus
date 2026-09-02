import { RuleTester } from "oxlint/plugins-dev";

import { noChainedTypeAssertionsRule } from "./no-chained-type-assertions.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "chained" };

tester.run("anti-slop/no-chained-type-assertions", noChainedTypeAssertionsRule, {
  valid: [
    "declare const x: unknown; const a = x as string;",
    "declare const x: unknown; const a = x as const;",
    "declare const x: unknown; const a = (x as const) as const;",
    "declare const x: unknown; const a = <string>x;",
  ],
  invalid: [
    {
      code: "declare const x: unknown; const a = (x as string) as number;",
      errors: [error],
    },
    {
      code: "declare const x: unknown; const a = ((x as string) as number) as boolean;",
      errors: [error],
    },
    {
      code: "declare const x: unknown; const a = (x as const) as string;",
      errors: [error],
    },
    {
      code: "declare const x: unknown; const a = <number><string>x;",
      errors: [error],
    },
  ],
});
