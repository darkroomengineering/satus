// Ambient declaration for a hamo path that ships without types.
//
// hamo 1.0.1 dropped `./scroll-trigger` and `./scroll-trigger/debugger` from
// its exports map. The files still ship, and the `./dist/*` passthrough is
// still exported, so `hamo/dist/scroll-trigger/debugger` resolves at runtime.
// That passthrough carries no `types` condition though, so TypeScript cannot
// follow it and reports TS2307.
//
// This file must stay free of top-level imports. A `.d.ts` with any top-level
// import becomes a module, and `declare module 'some/real/path'` inside a
// module is treated as augmentation of an existing module rather than an
// ambient declaration — which silently fails to resolve the import.
//
// Delete this file once hamo restores the `./scroll-trigger/debugger` export.
declare module 'hamo/dist/scroll-trigger/debugger' {
  // oxlint-disable-next-line typescript/consistent-type-imports -- a top-level `import type` would make this file a module and break the ambient declaration
  export const Debugger: import('react').FC<{ theme?: 'light' | 'dark' }>
}
