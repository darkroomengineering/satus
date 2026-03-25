import { Suspense, lazy } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { middleware as passwordMiddleware } from "~/lib/password-protection";
import { RAF } from "~/components/raf";
import { RealViewport } from "~/components/real-viewport";
import { ThemeProvider } from "~/components/theme";
import "~/styles/css/index.css";
import "~/styles/css/media.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- types only generated for active appDirectory
export const middleware = [passwordMiddleware] as any[];

const GlobalCanvas = lazy(() => import("../webgl/components/global-canvas"));

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider theme="dark" global>
      <Outlet />
      <RealViewport />
      <RAF />
      <Suspense fallback={null}>
        <GlobalCanvas />
      </Suspense>
    </ThemeProvider>
  );
}
