import { useRef } from "react";
import gsap from "gsap";
import { Link } from "~/components/link";
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

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0 });
      const items = blocksRef.current?.children;
      if (items?.length) {
        gsap.set(items, { opacity: 0, y: 30 });
      }
    },
    exit: () => {
      const items = blocksRef.current?.children;
      const tl = gsap.timeline();

      if (items?.length) {
        tl.to(Array.from(items).reverse(), {
          opacity: 0,
          y: -20,
          duration: 0.3,
          ease: "power2.in",
          stagger: 0.05,
        });
      }

      tl.to(pageRef.current, { opacity: 0, duration: 0.2 }, "-=0.1");
      return tl;
    },
    enter: () => {
      const items = blocksRef.current?.children;

      gsap.to(pageRef.current, { opacity: 1, duration: 0.3 });

      if (items?.length) {
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.08,
          delay: 0.15,
        });
      }
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-blue font-mono"
      >
        <div className="size-20 rounded-full bg-black/20" />
        <h1 className="text-4xl font-light text-black">Blue</h1>
        <p className="text-sm text-black/50">initial + stagger timeline</p>

        <div ref={blocksRef} className="mt-4 grid grid-cols-2 gap-3">
          {BLOCKS.map((label) => (
            <div
              key={label}
              className="flex h-20 w-32 items-center justify-center border border-black/20 bg-black/10 text-xs text-black/70"
            >
              {label}
            </div>
          ))}
        </div>

        <nav className="mt-8 flex gap-4 text-xs uppercase">
          <Link href="/transitions" className="text-black/40 hover:text-black/80">
            Hub
          </Link>
          <Link href="/transitions/red" className="text-black/60 hover:text-black">
            Red
          </Link>
          <Link href="/transitions/green" className="text-black/60 hover:text-black">
            Green
          </Link>
        </nav>
      </div>
    </Wrapper>
  );
}
