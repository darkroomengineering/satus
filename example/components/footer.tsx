import { Link } from "~/components/link";

export function Footer() {
  return (
    <footer className="flex items-center justify-between p-safe font-mono text-[calc(9/375*100vw)] uppercase tracking-widest opacity-30 dt:text-[calc(10/1440*100vw)]">
      <Link href="https://darkroom.engineering/" className="link">
        darkroom.engineering
      </Link>
      <Link href="https://github.com/darkroomengineering/satus" className="link">
        github
      </Link>
    </footer>
  );
}
