import { engine } from "animejs";
import { useEffect } from "react";
import { ReactTempus, useTempus } from "tempus/react";

engine.useDefaultMainLoop = false;

function AnimeSync() {
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

/**
 * Unified RAF component — single place for all frame-loop syncing.
 *
 * - Initializes Tempus (the master clock)
 * - Syncs anime.js engine to Tempus
 *
 * R3F rendering is synced separately inside the Canvas tree
 * (see webgl/components/raf) because it requires R3F context.
 */
export function RAF() {
  return (
    <>
      <ReactTempus />
      <AnimeSync />
    </>
  );
}
