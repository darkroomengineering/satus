import { ProgressText } from "~/components/progress-text";
import s from "./philosophy.module.css";

const MANIFESTO =
  "We build tools for studios who care about craft. Satus is the foundation — opinionated defaults, zero compromise on performance, every pixel considered. Start with everything. Remove what you don't need.";

export function Philosophy() {
  return (
    <section className={s.section}>
      <ProgressText className={s.text ?? ""} start="top bottom" end="center center">
        {MANIFESTO}
      </ProgressText>
    </section>
  );
}
