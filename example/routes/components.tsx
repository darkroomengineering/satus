import { Image } from "~/components/image";
import { Link } from "~/components/link";
import { Marquee } from "~/components/marquee";
import { Wrapper } from "~/components/wrapper";
import type { Route } from "./+types/components";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Components — Satus" },
    { name: "description", content: "Component library showcase" },
  ];
}

export default function Components() {
  return (
    <Wrapper className="gap-16 pt-32 pb-24 font-mono">
      <header className="px-safe">
        <h1 className="dt:text-[13px] text-[12px] uppercase opacity-50">Components</h1>
      </header>

      {/* Link */}
      <section className="flex flex-col gap-4 px-safe">
        <h2 className="text-[11px] uppercase opacity-40">Link</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/" className="link underline">
            Internal link (/)
          </Link>
          <Link href="https://github.com/darkroomengineering/satus" className="link underline">
            External link (opens in new tab) ↗
          </Link>
          <Link onClick={() => alert("clicked")} className="link underline">
            Button (onClick only)
          </Link>
        </div>
      </section>

      {/* Image */}
      <section className="flex flex-col gap-4 px-safe">
        <h2 className="text-[11px] uppercase opacity-40">Image</h2>
        <div className="dr-layout-grid">
          <div className="col-span-full dt:col-span-4">
            <Image
              src="/opengraph-image.jpg"
              alt="Demo image"
              aspectRatio={1200 / 630}
              mobileSize="100vw"
              desktopSize="33vw"
            />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="flex flex-col gap-4">
        <h2 className="px-safe text-[11px] uppercase opacity-40">Marquee</h2>
        <Marquee speed={0.5}>
          <span className="px-4 text-2xl uppercase">Satus — React Router starter</span>
          <span className="px-4 text-2xl uppercase opacity-40">•</span>
        </Marquee>
      </section>
    </Wrapper>
  );
}
