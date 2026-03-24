import { useTransitionState } from "~/lib/transitions";

const PHASE_COLOR: Record<string, string> = {
  idle: "#888",
  exiting: "#ff4433",
  entering: "#33ff44",
};

export function TransitionDebug() {
  const { mode, phase, from, to, pages, isTransitioning } = useTransitionState();

  return (
    <div
      className="pointer-events-none fixed right-safe bottom-safe z-50"
      style={{ fontFamily: "SF Mono, Menlo, monospace", fontSize: 10, lineHeight: 1.5 }}
    >
      <div
        className="pointer-events-auto"
        style={{
          background: "#0a0a0a",
          border: "1px solid #222",
          borderRadius: 6,
          padding: "8px 10px",
          minWidth: 200,
          color: "#ddd",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isTransitioning ? "#ff4433" : "#333",
              boxShadow: isTransitioning ? "0 0 6px #ff443388" : "none",
            }}
          />
          <span style={{ color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Transition
          </span>
          <span
            style={{
              marginLeft: "auto",
              padding: "1px 5px",
              background: "#1a1a1a",
              borderRadius: 3,
              color: "#999",
              fontSize: 9,
            }}
          >
            {mode}
          </span>
        </div>

        {/* Route info */}
        {from || to ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 0",
              borderTop: "1px solid #1a1a1a",
            }}
          >
            <span style={{ color: "#aaa" }}>{from ?? "—"}</span>
            <span style={{ color: "#666" }}>{"\u2192"}</span>
            <span style={{ color: "#ccc" }}>{to ?? "—"}</span>
          </div>
        ) : (
          <div style={{ padding: "4px 0", borderTop: "1px solid #1a1a1a", color: "#666" }}>
            {phase}
          </div>
        )}

        {/* Page stack */}
        {pages.length > 0 && (
          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 4, marginTop: 4 }}>
            <div style={{ color: "#999", marginBottom: 3 }}>
              pages <span style={{ color: "#bbb" }}>({pages.length})</span>
            </div>
            {pages.map((page, i) => {
              const color = PHASE_COLOR[page.phase] ?? "#888";
              const isCurrent = i === pages.length - 1;
              return (
                <div
                  key={page.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 0",
                    borderLeft: `2px solid ${color}`,
                    paddingLeft: 6,
                    marginBottom: 1,
                  }}
                >
                  <span style={{ color: isCurrent ? "#fff" : "#aaa", flex: 1 }}>
                    {page.pathname}
                  </span>
                  <span
                    style={{
                      color,
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {page.phase}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
