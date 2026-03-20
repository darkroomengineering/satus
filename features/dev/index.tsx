import { Suspense, lazy, useEffect, useState } from "react";
import { Cmdo } from "./cmdo";
import Orchestra from "./orchestra";

const Studio = lazy(() => import("./theatre/studio").then(({ Studio }) => ({ default: Studio })));
const Stats = lazy(() => import("./stats").then(({ Stats }) => ({ default: Stats })));
const GridDebugger = lazy(() =>
  import("./grid").then(({ GridDebugger }) => ({ default: GridDebugger })),
);
const Minimap = lazy(() => import("./minimap").then(({ Minimap }) => ({ default: Minimap })));

export function OrchestraTools() {
  const { stats, grid, studio, dev, minimap, screenshot } = useOrchestra();

  useEffect(() => {
    document.documentElement.classList.toggle("dev", Boolean(dev));
  }, [dev]);

  useEffect(() => {
    document.documentElement.classList.toggle("screenshot", Boolean(screenshot));
  }, [screenshot]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Cmdo />
      {studio && <Studio />}
      {stats && <Stats />}
      {grid && <GridDebugger />}
      {minimap && <Minimap />}
    </Suspense>
  );
}

export function useOrchestra() {
  const [state, setState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return Orchestra.subscribe(
      (state) => state,
      (state) => setState(state),
      {
        fireImmediately: true,
      },
    );
  }, []);

  return state;
}
