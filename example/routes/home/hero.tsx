import gsap from "gsap";
import { useLenis } from "lenis/react";
import { useRef } from "react";
import { Marquee } from "~/components/marquee";
import { SplitText } from "~/components/split-text";
import { useRouteTransition } from "~/lib/transitions";
import s from "./hero.module.css";

import type { SplitText as GSAPSplitText } from "gsap/SplitText";

interface SplitTextHandle {
  getSplitText: () => GSAPSplitText | null;
  getNode: () => HTMLElement | null;
  splittedText: GSAPSplitText | null;
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<SplitTextHandle>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  useRouteTransition({
    initial: () => {
      gsap.set(sectionRef.current, { opacity: 0, y: 40 });
    },
    exit: ({ done, enter }) => {
      const runExit = () => {
        const tl = gsap.timeline({ onComplete: done });
        const chars = titleRef.current?.getSplitText()?.chars;

        tl.call(() => enter(), [], 0.3);

        if (chars?.length) {
          tl.to(
            chars,
            {
              y: -80,
              opacity: 0,
              duration: 0.7,
              ease: "power3.in",
              stagger: 0.03,
            },
            0,
          );
        }
        tl.to(subtitleRef.current, { opacity: 0, y: -30, duration: 0.5, ease: "power2.in" }, 0.05);
        tl.to(marqueeRef.current, { opacity: 0, y: -20, duration: 0.4, ease: "power2.in" }, 0.1);
        tl.to(sectionRef.current, { opacity: 0, duration: 0.4 }, "-=0.3");
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
      tl.to(sectionRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
      const chars = titleRef.current?.getSplitText()?.chars;
      if (chars?.length) {
        gsap.set(chars, { y: 100, opacity: 0 });
        tl.to(
          chars,
          {
            y: 0,
            opacity: 1,
            duration: 1.4,
            ease: "power3.out",
            stagger: 0.04,
          },
          0.1,
        );
      }
      tl.to(subtitleRef.current, { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }, 0.3);
      tl.to(marqueeRef.current, { opacity: 1, duration: 0.8 }, 0.5);
      return () => tl.revert();
    },
  });

  return (
    <section ref={sectionRef} className={s.hero}>
      <div className={s.content}>
        <SplitText ref={titleRef} as="h1" className={s.title ?? ""} type="chars" mask>
          SATUS
        </SplitText>
        <p ref={subtitleRef} className={s.subtitle}>
          React Router Starter
          <br />
          by Darkroom Engineering
        </p>
      </div>
      <div ref={marqueeRef} className={s.marqueeWrap}>
        <Marquee speed={0.3} repeat={4}>
          <span className={s.marqueeItem}>React 19</span>
          <span className={s.marqueeSep}>/</span>
          <span className={s.marqueeItem}>TypeScript</span>
          <span className={s.marqueeSep}>/</span>
          <span className={s.marqueeItem}>Tailwind v4</span>
          <span className={s.marqueeSep}>/</span>
          <span className={s.marqueeItem}>R3F</span>
          <span className={s.marqueeSep}>/</span>
          <span className={s.marqueeItem}>GSAP</span>
          <span className={s.marqueeSep}>/</span>
          <span className={s.marqueeItem}>Lenis</span>
          <span className={s.marqueeSep}>/</span>
        </Marquee>
      </div>
    </section>
  );
}
