import gsap from "gsap";
import { useLenis } from "lenis/react";
import { useLayoutEffect, useRef } from "react";
import { Wrapper } from "~/components/wrapper";
import { useRouteTransition } from "~/lib/transitions";
import { PALETTES, useShaderStore } from "../store";
import s from "./features/features.module.css";
import type { Route } from "./+types/features";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Features — Satus" }, { name: "description", content: "What Satus gives you" }];
}

const FEATURES = [
  {
    title: "Page Transitions",
    desc: "Overlap mode with GSAP choreography. Exit, enter, crossfade — all orchestrated.",
  },
  {
    title: "WebGL Canvas",
    desc: "Persistent global canvas with tunnels. Flowmap and fluid sim built in.",
  },
  {
    title: "Scroll Animations",
    desc: "Fold sections, progress text, scroll triggers. All hooked to Lenis.",
  },
  {
    title: "Design System",
    desc: "Themes, responsive tokens, generated CSS custom properties.",
  },
  {
    title: "Performance",
    desc: "React Compiler. Tempus RAF. Lazy loading. Code splitting. Zero overhead.",
  },
  {
    title: "Developer Tools",
    desc: "Orchestra debug panel. Theatre.js integration. Grid overlay. Stats.",
  },
] as const;

export default function Features() {
  const setTargetPalette = useShaderStore((s) => s.setTargetPalette);
  const pageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const lenis = useLenis();

  useLayoutEffect(() => {
    setTargetPalette(PALETTES.features);
  }, [setTargetPalette]);

  useRouteTransition({
    initial: () => {
      gsap.set(pageRef.current, { opacity: 0, y: 60 });
      gsap.set(titleRef.current, { opacity: 0, y: 40 });
      if (gridRef.current?.children) {
        gsap.set(gridRef.current.children, { opacity: 0, y: 80, scale: 0.9 });
      }
    },
    exit: ({ done, enter }) => {
      const runExit = () => {
        const tl = gsap.timeline({ onComplete: done });
        tl.call(() => enter(), [], 0.25);
        if (gridRef.current?.children) {
          tl.to(
            Array.from(gridRef.current.children).reverse(),
            {
              opacity: 0,
              y: -40,
              scale: 0.9,
              duration: 0.5,
              ease: "power2.in",
              stagger: 0.04,
            },
            0,
          );
        }
        tl.to(titleRef.current, { opacity: 0, y: -30, duration: 0.5, ease: "power3.in" }, 0.05);
        tl.to(pageRef.current, { opacity: 0, duration: 0.4 }, "-=0.3");
        return tl;
      };

      if (lenis && lenis.scroll > 0) {
        let tl: gsap.core.Timeline | undefined;
        lenis.scrollTo(0, {
          onComplete: () => {
            tl = runExit();
          },
        });
        return () => tl?.revert();
      }

      const tl = runExit();
      return () => tl.revert();
    },
    enter: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(pageRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" }, 0.1);
      if (gridRef.current?.children) {
        tl.to(
          gridRef.current.children,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.0,
            ease: "power3.out",
            stagger: 0.06,
          },
          0.15,
        );
      }
      return () => tl.revert();
    },
  });

  return (
    <Wrapper>
      <div ref={pageRef} className={s.page}>
        <h1 ref={titleRef} className={s.title}>
          Features
        </h1>
        <div ref={gridRef} className={s.grid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className={s.card}>
              <h2 className={s.cardTitle}>{feature.title}</h2>
              <p className={s.cardDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}
