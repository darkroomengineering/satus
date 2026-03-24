import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.green";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Green — Transitions" }];
}

export default function GreenPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(circleRef.current, { opacity: 0, scale: 3, rotation: 180 });
      gsap.set(titleRef.current, { opacity: 0, y: 100 });
      gsap.set(descRef.current, { opacity: 0, y: 60 });
    },
    exit: (done) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(descRef.current, { opacity: 0, y: -30, duration: 0.8, ease: "power2.in" });
      tl.to(titleRef.current, { opacity: 0, y: -80, duration: 1.4, ease: "power3.inOut" }, 0.2);
      tl.to(
        circleRef.current,
        { opacity: 0, scale: 2.5, rotation: -90, duration: 2.0, ease: "power2.in" },
        0.1,
      );
      tl.to(pageRef.current, { opacity: 0, duration: 0.8 }, "-=0.5");
      return () => {
        tl.reverse();
        return tl;
      };
    },
    enter: () => {
      const tl = gsap.timeline();
      tl.to(circleRef.current, {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 2.5,
        ease: "power3.out",
      });
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 1.6, ease: "power3.out" }, 0.3);
      tl.to(descRef.current, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, 0.8);
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
        <div ref={circleRef} className="size-24 rounded-full bg-green" />
        <h1 ref={titleRef} className="text-5xl font-light text-green">
          Green
        </h1>
        <p ref={descRef} className="text-sm opacity-50">
          exit: ~2.5s spin+rise / enter: ~2.5s zoom+slide
        </p>
      </div>
    </Wrapper>
  );
}
