import { RuleTester } from "oxlint/plugins-dev";

import { noForbiddenTermInSymbolNamesRule } from "./no-shape-in-symbol-names.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });
const error = { messageId: "forbiddenSymbolName" };

tester.run("anti-slop/no-shape-in-symbol-names", noForbiddenTermInSymbolNamesRule, {
  valid: [
    "const size = 1;",
    "function outline() {}",
    "class Box { radius = 1; }",
    "const Icon = () => <svg />;",
  ],
  invalid: [
    { code: "const shape = 1;", errors: [error] },
    { code: "function drawShape() {}", errors: [error] },
    { code: "const SHAPE = 1;", errors: [error] },
    { code: "class Box { #shape = 1; }", errors: [error] },
    { code: "const Shape = () => <div />;", errors: [error] },
  ],
});
