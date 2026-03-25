import cn from "clsx";
import { createTimeline } from "animejs";
import { useRef } from "react";
import { useLocation } from "react-router";
import { Link } from "~/components/link";
import { useTransitionEvent } from "~/lib/transitions";
import s from "./nav.module.css";

const PAGES = [
  { href: "/", label: "Satus" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
] as const;

export function Nav() {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useTransitionEvent({
    onExit: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(navRef.current!, {
        opacity: 0.3,
        duration: 400,
        ease: "inCubic",
      });
      return () => tl.revert();
    },
    onEnter: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(navRef.current!, {
        opacity: 1,
        duration: 600,
        ease: "outCubic",
      });
      return () => tl.revert();
    },
  });

  return (
    <nav ref={navRef} className={s.nav}>
      <div className={s.links}>
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={cn(s.link, pathname === page.href && s.active)}
          >
            {page.label}
          </Link>
        ))}
      </div>
      <div className={s.right}>
        <Link href="https://github.com/darkroomengineering/satus" className={s.link}>
          GitHub
        </Link>
      </div>
    </nav>
  );
}
