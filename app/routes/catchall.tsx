import { Link } from "react-router";
import type { Route } from "./+types/catchall";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "404 — Satus" }];
}

// TODO Phase 4: port full not-found styling with Link component
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontSize: "4rem" }}>404</h1>
      <p>Page Not Found</p>
      <Link to="/" style={{ textDecoration: "underline" }}>
        Go Home
      </Link>
    </div>
  );
}
