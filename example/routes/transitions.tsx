import cn from "clsx";
import { Outlet, useLocation } from "react-router";
import { Link } from "~/components/link";

const PAGES = [
  { href: "/transitions/red", label: "Red", color: "bg-red" },
  { href: "/transitions/blue", label: "Blue", color: "bg-blue" },
  { href: "/transitions/green", label: "Green", color: "bg-green" },
];

export default function TransitionsLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <Outlet />
      <nav className="fixed bottom-safe left-1/2 z-10 flex -translate-x-1/2 gap-2 font-mono text-[11px]">
        {PAGES.map((page) => {
          const active = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              className={cn(
                "flex items-center gap-2 border px-4 py-2 transition-colors",
                active
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/5 hover:border-white/20",
              )}
            >
              <div className={cn("size-2 rounded-full", page.color)} />
              <span className={active ? "opacity-100" : "opacity-50"}>{page.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
