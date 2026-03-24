import { useRef } from "react";
import gsap from "gsap";
import { Link } from "~/components/link";
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
      gsap.set(circleRef.current, { opacity: 0, scale: 0.6 });
      gsap.set(titleRef.current, { opacity: 0, y: 30 });
      gsap.set(descRef.current, { opacity: 0, y: 20 });
    },
    exit: () => {
      const tl = gsap.timeline();
      tl.to(descRef.current, { opacity: 0, y: -10, duration: 0.25, ease: "power2.in" });
      tl.to(titleRef.current, { opacity: 0, y: -15, duration: 0.3, ease: "power2.in" }, 0.05);
      tl.to(circleRef.current, { opacity: 0, scale: 0.8, duration: 0.35, ease: "power3.in" }, 0.1);
      tl.to(pageRef.current, { opacity: 0, duration: 0.15 }, "-=0.1");
      return tl;
    },
    enter: () => {
      const tl = gsap.timeline();
      tl.to(circleRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" });
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.1);
      tl.to(descRef.current, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.2);
    },
  });

  return (
    <Wrapper lenis={false}>
      <div
        ref={pageRef}
        className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-green font-mono"
      >
        <div ref={circleRef} className="size-20 rounded-full bg-black/20" />
        <h1 ref={titleRef} className="text-4xl font-light text-black">
          Green
        </h1>
        <p ref={descRef} className="text-sm text-black/50">
          initial per-element + sequenced timeline
        </p>

        <nav className="mt-8 flex gap-4 text-xs uppercase">
          <Link href="/transitions" className="text-black/40 hover:text-black/80">
            Hub
          </Link>
          <Link href="/transitions/red" className="text-black/60 hover:text-black">
            Red
          </Link>
          <Link href="/transitions/blue" className="text-black/60 hover:text-black">
            Blue
          </Link>
        </nav>
      </div>
    </Wrapper>
  );
}
