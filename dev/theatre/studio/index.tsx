import { useEffect, useRef, useState } from "react";
import s from "./studio.module.css";

// Theatre.js CJS interop wraps the default export, so types don't match runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StudioInstance = any;

function getProjectId(): string | undefined {
  return (window as { THEATRE_PROJECT_ID?: string }).THEATRE_PROJECT_ID;
}

function downloadState(studio: StudioInstance, projectId: string) {
  const json = studio.createContentOfSaveFile(projectId);
  const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectId}-${new Date().toISOString().slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Studio() {
  const studioRef = useRef<StudioInstance>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void import("@theatre/core")
      .then(() => import("@theatre/studio"))
      .then((mod) => {
        const raw = mod.default as StudioInstance;
        const studio = raw?.default ?? raw;
        studio.initialize();
        studio.ui.restore();
        studioRef.current = studio;
        setReady(true);
      });

    return () => {
      studioRef.current?.ui.hide();
    };
  }, []);

  if (!ready) return null;

  const projectId = getProjectId();

  return (
    <div className={s.studio}>
      {projectId && (
        <button
          type="button"
          onClick={() => downloadState(studioRef.current, projectId)}
          className={s.save}
        >
          💾
        </button>
      )}
    </div>
  );
}
