import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.callback";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Callback — Transitions" }];
}

/**
 * Pattern: use done() callback for manual control.
 * Useful when you need to sequence multiple animations or do async work
 * before signaling completion.
 */
export default function CallbackPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0 });
      gsap.set(titleRef.current, { opacity: 0, x: -40 });
      const items = blocksRef.current?.children;
      if (items?.length) gsap.set(items, { opacity: 0, scale: 0.7 });
    },
    // Manual done() — called explicitly via onComplete
    exit: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      const items = blocksRef.current?.children;
      if (items?.length) {
        tl.to(Array.from(items).reverse(), {
          opacity: 0,
          scale: 0.5,
          duration: 0.6,
          ease: "power2.in",
          stagger: 0.15,
        });
      }
      tl.to(titleRef.current, { opacity: 0, x: 60, duration: 1.0, ease: "power3.inOut" }, 0.3);
      tl.to(pageRef.current, { opacity: 0, duration: 0.5 }, "-=0.3");
    },
    enter: () => {
      const items = blocksRef.current?.children;
      gsap.to(pageRef.current, { opacity: 1, duration: 0.4 });
      gsap.to(titleRef.current, {
        opacity: 1,
        x: 0,
        duration: 1.4,
        ease: "power3.out",
        delay: 0.1,
      });
      if (items?.length) {
        gsap.to(items, {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.5)",
          stagger: 0.2,
          delay: 0.3,
        });
      }
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="mx-auto flex min-h-dvh max-w-[800px] flex-col items-center justify-center gap-6 px-safe font-mono"
      >
        <div ref={circleRef} className="size-20 rounded-full bg-blue" />
        <h1 ref={titleRef} className="text-4xl font-light text-blue">
          Callback
        </h1>
        <p className="max-w-xs text-center text-sm opacity-40">
          Uses done() callback for manual completion. Timeline calls done() via onComplete. Good for
          sequenced multi-element animations.
        </p>
        <div ref={blocksRef} className="mt-2 grid grid-cols-3 gap-2">
          {["A", "B", "C"].map((label) => (
            <div
              key={label}
              className="flex size-16 items-center justify-center border border-blue/30 bg-blue/10 text-xs text-blue"
            >
              {label}
            </div>
          ))}
        </div>
        <code className="border border-white/10 p-3 text-[10px] opacity-60">
          exit: (done) =&gt; tl.onComplete(done)
        </code>
      </div>
    </Wrapper>
  );
}
