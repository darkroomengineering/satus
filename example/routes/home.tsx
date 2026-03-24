import { useLayoutEffect } from "react";
import { Wrapper } from "~/components/wrapper";
import { PALETTES, useShaderStore } from "../store";
import type { Route } from "./+types/home";
import { Hero } from "./home/hero";
import { Philosophy } from "./home/philosophy";
import { StackSection } from "./home/stack-section";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Satus" },
    {
      name: "description",
      content: "React Router starter by Darkroom Engineering — React 19, TypeScript, Tailwind v4",
    },
  ];
}

export default function Home() {
  const setTargetPalette = useShaderStore((s) => s.setTargetPalette);

  useLayoutEffect(() => {
    setTargetPalette(PALETTES.home);
  }, [setTargetPalette]);

  return (
    <Wrapper>
      <Hero />
      <StackSection />
      <Philosophy />
    </Wrapper>
  );
}
