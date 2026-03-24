import { Fold } from "~/components/fold";
import s from "./stack-section.module.css";

const STACK = [
  { name: "React Router 7", detail: "SSR + Loaders" },
  { name: "React 19", detail: "Compiler + Transitions" },
  { name: "Tailwind v4", detail: "Lightning CSS" },
  { name: "R3F + Three.js", detail: "WebGL / WebGPU" },
  { name: "GSAP", detail: "Animation" },
  { name: "Lenis", detail: "Smooth Scroll" },
] as const;

export function StackSection() {
  return (
    <Fold type="bottom" overlay>
      <section className={s.section}>
        <h2 className={s.label}>Stack</h2>
        <div className={s.list}>
          {STACK.map((item) => (
            <div key={item.name} className={s.item}>
              <span className={s.name}>{item.name}</span>
              <span className={s.detail}>{item.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </Fold>
  );
}
