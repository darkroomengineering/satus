import { useRef } from "react";
import gsap from "gsap";
import { Link } from "~/components/link";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import type { Route } from "./+types/transitions.red";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Red — Transitions" }];
}

export default function RedPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0, y: 50 });
    },
    exit: () =>
      gsap.to(pageRef.current, {
        opacity: 0,
        y: -40,
        duration: 0.5,
        ease: "power3.in",
      }),
    enter: () => {
      gsap.to(pageRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-red font-mono"
      >
        <div className="size-20 rounded-full bg-black/20" />
        <h1 className="text-4xl font-light text-black">Red</h1>
        <p className="text-sm text-black/50">initial + gsap.set / gsap.to</p>

        <nav className="mt-8 flex gap-4 text-xs uppercase">
          <Link href="/transitions" className="text-black/40 hover:text-black/80">
            Hub
          </Link>
          <Link href="/transitions/blue" className="text-black/60 hover:text-black">
            Blue
          </Link>
          <Link href="/transitions/green" className="text-black/60 hover:text-black">
            Green
          </Link>
        </nav>
      </div>
    </Wrapper>
  );
}
