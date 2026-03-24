import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.initial";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Initial — Transitions" }];
}

export default function InitialPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(circleRef.current, { opacity: 0, scale: 0, rotation: -180 });
      gsap.set(titleRef.current, { opacity: 0, y: 60 });
      gsap.set(descRef.current, { opacity: 0, y: 40 });
      gsap.set(badgeRef.current, { opacity: 0, scale: 0.8 });
    },
    exit: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(badgeRef.current, { opacity: 0, scale: 0.8, duration: 0.4, ease: "power2.in" });
      tl.to(descRef.current, { opacity: 0, y: -20, duration: 0.5, ease: "power2.in" }, 0.1);
      tl.to(titleRef.current, { opacity: 0, y: -40, duration: 0.8, ease: "power3.in" }, 0.15);
      tl.to(
        circleRef.current,
        { opacity: 0, scale: 0.5, rotation: 90, duration: 1.2, ease: "power3.in" },
        0.1,
      );
      tl.to(pageRef.current, { opacity: 0, duration: 0.4 }, "-=0.3");
      return () => tl.revert();
    },
    enter: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(circleRef.current, {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 1.8,
        ease: "elastic.out(1, 0.5)",
      });
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" }, 0.2);
      tl.to(descRef.current, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 0.4);
      tl.to(badgeRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.6);
      return () => tl.revert();
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="mx-auto flex min-h-dvh max-w-[800px] flex-col items-center justify-center gap-6 px-safe font-mono"
      >
        <div ref={circleRef} className="size-20 rounded-full bg-purple" />
        <h1 ref={titleRef} className="text-4xl font-light text-purple">
          Initial
        </h1>
        <p ref={descRef} className="max-w-xs text-center text-sm opacity-40">
          Uses initial() to hide elements before paint. Per-element sequenced enter with
          elastic/back easing.
        </p>
        <div
          ref={badgeRef}
          className="border border-purple/30 bg-purple/10 px-4 py-2 text-[10px] text-purple"
        >
          initial() + enter(&#123; done &#125;)
        </div>
      </div>
    </Wrapper>
  );
}
