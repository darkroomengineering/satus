import cn from "clsx";
import type { LenisOptions } from "lenis";
import { Canvas } from "../features/webgl/components/canvas";
import { Lenis } from "./lenis";

interface WrapperProps extends React.HTMLAttributes<HTMLElement> {
  lenis?: boolean | LenisOptions;
  webgl?: boolean;
}

export function Wrapper({
  children,
  className,
  lenis = true,
  webgl = false,
  ...props
}: WrapperProps) {
  return (
    <>
      <Canvas root={webgl}>
        <main id="main-content" className={cn("relative flex grow flex-col", className)} {...props}>
          {children}
        </main>
      </Canvas>
      {lenis && <Lenis root options={typeof lenis === "object" ? lenis : {}} />}
    </>
  );
}
