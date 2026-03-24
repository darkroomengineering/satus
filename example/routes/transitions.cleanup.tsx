import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.cleanup";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Cleanup — Transitions" }];
}

export default function CleanupPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(circleRef.current, { opacity: 0, scale: 2.5, rotation: 120 });
      gsap.set(titleRef.current, { opacity: 0, y: 80 });
      gsap.set(descRef.current, { opacity: 0, y: 40 });
    },
    exit: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(descRef.current, { opacity: 0, y: -20, duration: 0.6, ease: "power2.in" });
      tl.to(titleRef.current, { opacity: 0, y: -60, duration: 1.0, ease: "power3.inOut" }, 0.15);
      tl.to(
        circleRef.current,
        { opacity: 0, scale: 2, rotation: -60, duration: 1.5, ease: "power2.in" },
        0.1,
      );
      tl.to(pageRef.current, { opacity: 0, duration: 0.6 }, "-=0.4");
      return () => tl.revert();
    },
    enter: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(circleRef.current, {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 2.0,
        ease: "power3.out",
      });
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }, 0.2);
      tl.to(descRef.current, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 0.5);
      return () => tl.revert();
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="mx-auto flex min-h-dvh max-w-[800px] flex-col items-center justify-center gap-6 px-safe font-mono"
      >
        <div ref={circleRef} className="size-20 rounded-full bg-green" />
        <h1 ref={titleRef} className="text-4xl font-light text-green">
          Cleanup
        </h1>
        <p ref={descRef} className="max-w-xs text-center text-sm opacity-40">
          Returns cleanup function from exit/enter. On rapid navigation the animations revert. Try
          clicking fast.
        </p>
        <code className="border border-white/10 p-3 text-[10px] opacity-60">
          return () =&gt; tl.revert()
        </code>
      </div>
    </Wrapper>
  );
}
