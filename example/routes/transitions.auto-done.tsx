import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.auto-done";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Auto-Done — Transitions" }];
}

export default function AutoDonePage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0, y: 60 });
    },
    exit: ({ done }) => {
      gsap.to(pageRef.current, {
        opacity: 0,
        y: -40,
        duration: 1.5,
        ease: "power3.in",
        onComplete: done,
      });
    },
    enter: ({ done }) => {
      gsap.to(pageRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power3.out",
        onComplete: done,
      });
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="mx-auto flex min-h-dvh max-w-[800px] flex-col items-center justify-center gap-6 px-safe font-mono"
      >
        <div className="size-20 rounded-full bg-red" />
        <h1 className="text-4xl font-light text-red">Simple</h1>
        <p className="max-w-xs text-center text-sm opacity-40">
          Simple gsap.to with onComplete: done. Both exit and enter call done() explicitly.
        </p>
        <code className="border border-white/10 p-3 text-[10px] opacity-60">
          exit/enter: (&#123; done &#125;) =&gt; gsap.to(..., onComplete: done)
        </code>
      </div>
    </Wrapper>
  );
}
