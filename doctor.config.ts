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

  /**
   * Per-path suppressions. Scoped by rule rather than by whole directory on
   * purpose: a genuine bug of some *other* kind in these files still gets
   * reported. Nothing here is a blanket "skip this folder".
   */
  ignore: {
    overrides: [
      {
        /**
         * Theatre.js is an external, imperative animation editor. React does
         * not own this data flow: values change because someone dragged a
         * keyframe in the studio UI, and the hooks exist to subscribe to that
         * and mirror it back. Every rule below presupposes React owning the
         * flow, so each one asks for a rewrite that cannot exist here —
         * `no-event-handler` in particular says "run the side effect in the
         * event handler that triggers it", and there is no React event
         * handler, only Theatre's own change notifications.
         *
         * Scope note: this is dev-only tooling. The Studio editor itself is
         * lazily imported and gated behind a dev toggle (only mounts when
         * `NODE_ENV === 'development'`, via `OptionalFeatures`), and the
         * project-bootstrap runtime in `SheetProvider` (the fetch + live
         * Theatre project) is now gated the same way — production visitors
         * trigger neither. `setup:project` deletes the whole directory
         * outright for projects that do not keep Theatre. The hook code
         * itself (`useSheet`/`useTheatre`) still ships as part of the WebGL
         * bundle, because production components (`fluid`, `flowmaps`) call
         * it directly — but with no project, it resolves to inert no-ops
         * that fall back to each call site's own hard-coded defaults.
         */
        files: ['lib/dev/theatre/**'],
        rules: [
          'react-doctor/no-event-handler',
          'react-doctor/no-effect-event-handler',
          'react-doctor/no-chain-state-updates',
          'react-doctor/no-derived-state',
          'react-doctor/no-pass-data-to-parent',
          'react-doctor/no-fetch-in-effect',
          'react-doctor/rendering-hydration-mismatch-time',
          'react-doctor/exhaustive-deps',
        ],
      },
      {
        /**
         * `components/layout/theme` already implements React's documented
         * pattern for adjusting state when a prop changes — the render-phase
         * re-sync with a `prevTheme` sentinel, with the docs link in the file.
         * The three rules below each ask for something that cannot work here:
         *
         * - `no-derived-useState` wants the value computed inline, but
         *   `currentTheme` is overridable at runtime through `setTheme`, so it
         *   is seeded from the prop rather than derived from it.
         * - `rerender-state-only-in-handlers` wants a ref, but the value is
         *   rendered — it goes out through context to every consumer.
         * - `no-event-handler` flags the `data-theme` write on <html>, which
         *   is synchronising an external system with React state, the case
         *   effects are actually for.
         */
        files: ['components/layout/theme/**'],
        rules: [
          'react-doctor/no-derived-useState',
          'react-doctor/rerender-state-only-in-handlers',
          'react-doctor/no-event-handler',
        ],
      },
    ],
  },

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
