// Every disabled check states why; nothing is off to lower a score.
export default {
  $schema: 'https://react.doctor/schema/config.json',

  /**
   * Off: satus is a template, so primitives, hooks and opt-in integrations
   * that nothing imports are intended, not dead (85 of 130 findings, incl.
   * all of Shopify, HubSpot, Mailchimp). It also flagged `happy-dom`, which
   * `bunfig.toml` preloads via `lib/scripts/test-setup.ts`. `bun run deslop`
   * covers real dead code.
   */
  deadCode: false,

  // Scoped by rule, not directory, so other bugs in these files still report.
  ignore: {
    overrides: [
      {
        /**
         * Theatre.js owns this data flow (keyframes dragged in its studio), so
         * rules that presuppose React owning it ask for impossible rewrites.
         * Dev-only: the Studio and the project fetch are gated on development,
         * and the hooks resolve to inert no-ops in production.
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
         * The theme provider uses React's documented prop-change re-sync
         * (`prevTheme` sentinel). `currentTheme` is seeded, not derived, since
         * `setTheme` overrides it; it is rendered through context, so not a
         * ref; and the `data-theme` write syncs an external system.
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
    // Fires on any `page.*` file, including Sanity schemas and GROQ queries;
    // real routes export metadata or inherit it from `app/(site)/layout.tsx`.
    'react-doctor/nextjs-missing-metadata': 'off',

    'react-doctor/server-auth-actions': 'off',
    'react-doctor/no-unknown-property': 'off',
    'react-doctor/no-pure-black-background': 'off',

    // React Compiler memoizes context values; oxlint's equivalent is off too.
    'react-doctor/jsx-no-constructed-context-values': 'off',
  },
}
