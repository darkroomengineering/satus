import { animate } from "animejs";
import { useEffect, useRef } from "react";
import s from "./preloader.module.css";

export function Preloader({ onLoaded }: { onLoaded: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    // Preloader owns the loading logic — simulate asset loading here.
    // Replace with real checks: fonts, images, WebGL assets, etc.
    const timer = setTimeout(() => {
      // Assets loaded — animate out, then signal ready
      animate(ref.current!, {
        opacity: 0,
        duration: 600,
        ease: "inCubic",
        onComplete: () => {
          if (ref.current) ref.current.style.display = "none";
          onLoadedRef.current();
        },
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} className={s.preloader}>
      <p className={s.text}>Loading</p>
    </div>
  );
}
