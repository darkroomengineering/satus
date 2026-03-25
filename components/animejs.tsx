import { engine } from "animejs";
import { useEffect } from "react";
import { useTempus } from "tempus/react";

engine.useDefaultMainLoop = false;

export function AnimeRuntime() {
  useTempus(() => {
    engine.update();
  });

  useEffect(() => {
    return () => {
      engine.useDefaultMainLoop = true;
    };
  }, []);

  return null;
}
