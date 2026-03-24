import { useRef } from "react";
import gsap from "gsap";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.blue";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Blue — Transitions" }];
}

const BLOCKS = ["Block A", "Block B", "Block C", "Block D"];

export default function BluePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0 });
      gsap.set(titleRef.current, { opacity: 0, x: -60 });
      const items = blocksRef.current?.children;
      if (items?.length) {
        gsap.set(items, { opacity: 0, scale: 0.5, rotation: -10 });
      }
    },
    exit: (done) => {
      const items = blocksRef.current?.children;
      const tl = gsap.timeline({ onComplete: done });

      if (items?.length) {
        tl.to(Array.from(items).reverse(), {
          opacity: 0,
          y: -40,
          scale: 0.6,
          rotation: 15,
          duration: 0.8,
          ease: "power2.in",
          stagger: 0.25,
        });
      }

      tl.to(titleRef.current, { opacity: 0, x: 80, duration: 1.5, ease: "power3.inOut" }, 0.5);
      tl.to(pageRef.current, { opacity: 0, duration: 0.6 }, "-=0.4");
      return () => {
        tl.reverse();
        return tl;
      };
    },
    enter: () => {
      const items = blocksRef.current?.children;
      const tl = gsap.timeline();

      tl.to(pageRef.current, { opacity: 1, duration: 0.5 });
      tl.to(titleRef.current, { opacity: 1, x: 0, duration: 1.8, ease: "power3.out" }, 0.2);

      if (items?.length) {
        tl.to(
          items,
          { opacity: 1, scale: 1, rotation: 0, duration: 1.2, ease: "back.out(1.5)", stagger: 0.3 },
          0.4,
        );
      }

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
        <div className="size-24 rounded-full bg-blue" />
        <h1 ref={titleRef} className="text-5xl font-light text-blue">
          Blue
        </h1>
        <p className="text-sm opacity-50">exit: ~3s stagger scatter / enter: ~2.8s back ease</p>

        <div ref={blocksRef} className="mt-4 grid grid-cols-2 gap-3">
          {BLOCKS.map((label) => (
            <div
              key={label}
              className="flex h-20 w-32 items-center justify-center border border-blue/30 bg-blue/10 text-xs text-blue"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}
