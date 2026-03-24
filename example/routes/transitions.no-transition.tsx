import { Wrapper } from "~/components/wrapper";
import type { Route } from "./+types/transitions.no-transition";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "No Transition — Transitions" }];
}

/**
 * Pattern: no useRouteTransition at all.
 * Page mounts and unmounts instantly. Zero registered animations means
 * the transition system has nothing to wait for — navigation is instant.
 *
 * This is the baseline. All other pages should eventually reach this
 * state after their animations complete.
 */
export default function NoTransitionPage() {
  return (
    <Wrapper lenis={false}>
      <div className="mx-auto flex min-h-dvh max-w-[800px] flex-col items-center justify-center gap-6 px-safe font-mono">
        <div className="size-20 rounded-full bg-white/20" />
        <h1 className="text-4xl font-light opacity-60">No Transition</h1>
        <p className="max-w-xs text-center text-sm opacity-40">
          This page has no useRouteTransition. Zero registered callbacks means the transition system
          proceeds instantly. The page just appears.
        </p>
        <code className="border border-white/10 p-3 text-[10px] opacity-60">
          // no useRouteTransition()
        </code>
      </div>
    </Wrapper>
  );
}
