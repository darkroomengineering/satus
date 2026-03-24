import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.red";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Red — Transitions" }];
}

export default function RedPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0, y: 80 });
    },
    exit: (done) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(titleRef.current, { opacity: 0, y: -60, duration: 1.2, ease: "power2.inOut" });
      tl.to(circleRef.current, { opacity: 0, scale: 0.3, duration: 1.8, ease: "power3.in" }, 0.3);
      tl.to(pageRef.current, { opacity: 0, duration: 1.0 }, 1.2);
      return () => {
        tl.reverse();
        return tl;
      };
    },
    enter: () => {
      const tl = gsap.timeline();
      tl.to(pageRef.current, { opacity: 1, y: 0, duration: 2.0, ease: "power3.out" });
      return () => {
        tl.revert();
      };
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="flex min-h-dvh flex-col items-center justify-center gap-8 font-mono"
      >
        <div ref={circleRef} className="size-24 rounded-full bg-red" />
        <h1 ref={titleRef} className="text-5xl font-light text-red">
          Red
        </h1>
        <p ref={descRef} className="text-sm opacity-50">
          exit: 2.2s sequenced / enter: 2s slide
        </p>
      </div>
    </Wrapper>
  );
}
