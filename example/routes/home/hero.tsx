import { animate, createTimeline, stagger } from "animejs";
import { useLenis } from "lenis/react";
import { useRef } from "react";
import { Marquee } from "~/components/marquee";
import { SplitText } from "~/components/split-text";
import type { SplitTextRef } from "~/components/split-text";
import { useRouteTransition } from "~/lib/transitions";
import s from "./hero.module.css";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<SplitTextRef>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  useRouteTransition({
    initial: () => {
      animate(sectionRef.current!, { opacity: 0, y: 40, duration: 0 });
    },
    exit: ({ done, enter }) => {
      const runExit = () => {
        const tl = createTimeline({ onComplete: done });
        const chars = titleRef.current?.getSplitText()?.chars;

        tl.call(() => enter(), 300);

        if (chars?.length) {
          tl.add(
            chars,
            {
              y: -80,
              opacity: 0,
              duration: 700,
              ease: "inQuart",
              delay: stagger(30),
            },
            0,
          );
        }
        tl.add(subtitleRef.current!, { opacity: 0, y: -30, duration: 500, ease: "inCubic" }, 50);
        tl.add(marqueeRef.current!, { opacity: 0, y: -20, duration: 400, ease: "inCubic" }, 100);
        tl.add(sectionRef.current!, { opacity: 0, duration: 400 }, 500);
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
      tl.add(sectionRef.current!, { opacity: 1, y: 0, duration: 600, ease: "outCubic" });
      const chars = titleRef.current?.getSplitText()?.chars;
      if (chars?.length) {
        animate(chars, { y: 100, opacity: 0, duration: 0 });
        tl.add(
          chars,
          {
            y: 0,
            opacity: 1,
            duration: 1400,
            ease: "outQuart",
            delay: stagger(40),
          },
          100,
        );
      }
      tl.add(subtitleRef.current!, { opacity: 1, y: 0, duration: 1000, ease: "outCubic" }, 300);
      tl.add(marqueeRef.current!, { opacity: 1, duration: 800 }, 500);
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
          <span className={s.marqueeItem}>Anime.js</span>
          <span className={s.marqueeSep}>/</span>
          <span className={s.marqueeItem}>Lenis</span>
          <span className={s.marqueeSep}>/</span>
        </Marquee>
      </div>
    </section>
  );
}
