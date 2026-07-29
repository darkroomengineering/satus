/**
 * React Doctor configuration.
 *
 * A `.ts` file rather than `doctor.config.json` so every disabled check can say
 * why it is disabled — the same reason `oxlint.config.ts` and `oxfmt.config.ts`
 * are TypeScript.
 *
 * Nothing here is switched off to make a number go down. Each entry is either
 * wrong about this codebase or wrong about this *kind* of codebase.
 */
export default {
  $schema: 'https://react.doctor/schema/config.json',

  /**
   * Dead-code analysis: unused files, unused exports, unused devDependencies.
   *
   * Off because it assumes an application and satus is a template. It ships UI
   * primitives, hooks and whole opt-in integrations for consumers to reach for;
   * the demo app deliberately does not import most of them, and
   * `setup:project` strips the ones a project chooses not to keep. "Nothing
   * imports this" is the intended state here, not dead code.
   *
   * This pass accounted for 85 of 130 findings, including the entire Shopify,
   * HubSpot and Mailchimp integrations, `components/ui/form`, `fold`,
   * `scrollbar`, and `lib/hooks/use-reveal` — none of which are dead. It also
   * called `happy-dom` an unused devDependency, when it is loaded without an
   * import: `bunfig.toml` preloads `lib/scripts/test-setup.ts`, which registers
   * happy-dom onto Bun's globals via `@happy-dom/global-registrator`.
   *
   * Real dead code is still covered, by a tool tuned for this repo: `bun run
   * deslop` is a cross-file dead-code, unused-export and circular-import
   * scanner, and it reports zero unused files and zero dead exports here.
   */
  deadCode: false,

  rules: {
    /**
     * Fires on any file named `page.*`, including files that are not Next
     * routes: `lib/integrations/sanity/schemas/page.ts` is a Sanity document
     * schema and `lib/integrations/shopify/queries/page.ts` is a GROQ query.
     * The one real route it flagged, `app/studio/[[...tool]]`, is
     * `'use client'` — a client component cannot export `metadata` — and it is
     * a CMS admin surface that should not be indexed anyway.
     */
    'react-doctor/nextjs-missing-metadata': 'off',

    'react-doctor/server-auth-actions': 'off',
    'react-doctor/no-unknown-property': 'off',
    'react-doctor/no-pure-black-background': 'off',

    /**
     * React Compiler memoizes context values automatically, so hoisting them by
     * hand is pre-Compiler folklore. oxlint's equivalent
     * (`react/jsx-no-constructed-context-values`) is left out of the enabled
     * rule set for the same reason.
     */
    'react-doctor/jsx-no-constructed-context-values': 'off',
  },
}
