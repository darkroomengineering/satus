import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.auto-done";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Auto-Done — Transitions" }];
}

/**
 * Pattern: return a GSAP tween/timeline from exit.
 * The system detects the thenable and calls done() automatically when it resolves.
 * No manual done() call needed. Simplest pattern.
 */
export default function AutoDonePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0, y: 60 });
    },
    // Return tween → auto-done (no done() callback needed)
    exit: () =>
      gsap.to(pageRef.current, {
        opacity: 0,
        y: -40,
        duration: 1.5,
        ease: "power3.in",
      }),
    enter: () => {
      gsap.to(pageRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power3.out",
      });
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="mx-auto flex min-h-dvh max-w-[800px] flex-col items-center justify-center gap-6 px-safe font-mono"
      >
        <div ref={circleRef} className="size-20 rounded-full bg-red" />
        <h1 ref={titleRef} className="text-4xl font-light text-red">
          Auto-Done
        </h1>
        <p className="max-w-xs text-center text-sm opacity-40">
          Returns GSAP tween from exit — thenable detected, done() called automatically on
          completion. No manual callback.
        </p>
        <code className="border border-white/10 p-3 text-[10px] opacity-60">
          exit: () =&gt; gsap.to(ref, ...)
        </code>
      </div>
    </Wrapper>
  );
}
