import { animate, createTimeline, stagger } from "animejs";
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
    desc: "Overlap mode with anime.js choreography. Exit, enter, crossfade — all orchestrated.",
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
      animate(pageRef.current!, { opacity: 0, y: 60, duration: 0 });
      animate(titleRef.current!, { opacity: 0, y: 40, duration: 0 });
      if (gridRef.current?.children) {
        animate(gridRef.current.children, { opacity: 0, y: 80, scale: 0.9, duration: 0 });
      }
    },
    exit: ({ done, enter }) => {
      const runExit = () => {
        const tl = createTimeline({ onComplete: done });
        tl.call(() => enter(), 250);
        if (gridRef.current?.children) {
          tl.add(
            Array.from(gridRef.current.children).reverse(),
            {
              opacity: 0,
              y: -40,
              scale: 0.9,
              duration: 500,
              ease: "inCubic",
              delay: stagger(40),
            },
            0,
          );
        }
        tl.add(titleRef.current!, { opacity: 0, y: -30, duration: 500, ease: "inQuart" }, 50);
        tl.add(pageRef.current!, { opacity: 0, duration: 400 }, 400);
        return tl;
      };

      if (lenis && lenis.scroll > 0) {
        let tl: ReturnType<typeof createTimeline> | undefined;
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
      const tl = createTimeline({ onComplete: done });
      tl.add(pageRef.current!, { opacity: 1, y: 0, duration: 600, ease: "outCubic" });
      tl.add(titleRef.current!, { opacity: 1, y: 0, duration: 1000, ease: "outQuart" }, 100);
      if (gridRef.current?.children) {
        tl.add(
          gridRef.current.children,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1000,
            ease: "outQuart",
            delay: stagger(60),
          },
          150,
        );
      }
      return () => tl.revert();
    },
  });

  return (
    <Wrapper lenis={false}>
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
