import { useTransitionState } from "~/lib/transitions";

export function TransitionDebug() {
  const { phase, from, to } = useTransitionState();

  return (
    <div className="pointer-events-none fixed right-safe bottom-safe z-50 font-mono text-[10px]">
      <div className="pointer-events-auto flex flex-col gap-1 border border-white/10 bg-black/80 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{
              backgroundColor: phase === "idle" ? "#666" : phase === "exiting" ? "#f43" : "#3f4",
            }}
          />
          <span className="uppercase tracking-widest opacity-50">transition</span>
        </div>
        <div className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-0.5">
          <span className="opacity-40">phase</span>
          <code>{phase}</code>
          <span className="opacity-40">from</span>
          <code>{from ?? "—"}</code>
          <span className="opacity-40">to</span>
          <code>{to ?? "—"}</code>
        </div>
      </div>
    </div>
  );
}
