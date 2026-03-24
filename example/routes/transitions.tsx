import { Link } from "~/components/link";
import { Wrapper } from "~/components/wrapper";
import type { Route } from "./+types/transitions";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Transitions — Satus" }];
}

export default function Transitions() {
  return (
    <Wrapper lenis={false}>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-safe font-mono">
        <h1 className="text-2xl font-light tracking-tight">Page Transitions</h1>
        <p className="max-w-sm text-center text-sm opacity-50">
          Navigate between these pages to see transitions. Check the debug panel in the
          bottom-right.
        </p>
        <nav className="flex flex-col gap-3">
          <Link
            href="/transitions/red"
            className="border border-red-500/30 bg-red-500/10 px-8 py-4 text-center text-sm text-red-400 hover:bg-red-500/20"
          >
            Red Page — GSAP fade
          </Link>
          <Link
            href="/transitions/blue"
            className="border border-blue-500/30 bg-blue-500/10 px-8 py-4 text-center text-sm text-blue-400 hover:bg-blue-500/20"
          >
            Blue Page — GSAP stagger
          </Link>
          <Link
            href="/transitions/green"
            className="border border-green-500/30 bg-green-500/10 px-8 py-4 text-center text-sm text-green-400 hover:bg-green-500/20"
          >
            Green Page — GSAP timeline
          </Link>
        </nav>
      </div>
    </Wrapper>
  );
}
