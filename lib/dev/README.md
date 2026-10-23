# Orchestra (Dev Tools)

Debug tools suite, toggled with `Cmd/Ctrl + O`. Mounted by `OptionalFeatures` in `app/(site)/layout.tsx`, development only; production builds exclude all dev tools. Toggle state persists in `localStorage` and syncs across tabs.

| Tool            | Description                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Grid (🌐)       | Layout grid overlay                                                                                        |
| Theatre.js (⚙️) | Animation debugging (`useSheet`, `useTheatre` from `@/lib/dev/theatre`)                                    |
| Stats (📈)      | FPS and performance (stats-gl frame-time / GPU meter)                                                      |
| Dev Mode (🚧)   | Development toggle                                                                                         |
| Minimap (🗺️)    | ScrollTrigger navigation                                                                                   |
| WebGL (🧊)      | Kill switch for the global WebGL canvas (on by default), for isolating perf work to the DOM side of a page |
| React Scan (🔬) | React re-render profiler — opt-in, off by default                                                          |
| Screenshot (📸) | Clean UI captures                                                                                          |

React Scan (`react-scan`) is mounted only while its toggle is on, so a normal
dev session carries no profiler overhead. It overlaps Stats only on the FPS
readout: Stats is a frame-time/GPU meter, React Scan is a re-render profiler.
