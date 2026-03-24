import cn from "clsx";
import { Outlet, useLocation } from "react-router";
import { Link } from "~/components/link";

const PAGES = [
  { href: "/transitions/auto-done", label: "Auto-Done", desc: "return tween" },
  { href: "/transitions/callback", label: "Callback", desc: "done()" },
  { href: "/transitions/cleanup", label: "Cleanup", desc: "reversal" },
  { href: "/transitions/initial", label: "Initial", desc: "overlap prep" },
  { href: "/transitions/no-transition", label: "None", desc: "instant" },
];

export default function TransitionsLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <Outlet />
      <nav className="fixed bottom-safe left-1/2 z-10 flex max-w-[90vw] -translate-x-1/2 gap-1 overflow-x-auto font-mono text-[10px]">
        {PAGES.map((page) => {
          const active = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              className={cn(
                "flex flex-col items-center border px-3 py-2 transition-colors",
                active
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/5 hover:border-white/20",
              )}
            >
              <span className={active ? "opacity-100" : "opacity-60"}>{page.label}</span>
              <span className="opacity-30">{page.desc}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
