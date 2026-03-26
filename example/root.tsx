import { Suspense, lazy, type PropsWithChildren } from "react";
import { Link, Links, Meta, Scripts, ScrollRestoration } from "react-router";
import { Lenis } from "~/components/lenis";
import { middleware as passwordMiddleware } from "~/lib/password-protection";
import { RAF } from "~/components/raf";
import { RealViewport } from "~/components/real-viewport";
import { ThemeProvider } from "~/components/theme";
import { TransitionRouter } from "~/lib/transitions";
import { WebGLTunnel } from "~/webgl/components/tunnel";
import "~/styles/css/index.css";
import "~/styles/css/media.css";
import { BackgroundShader } from "./components/background-shader";
import { Footer } from "./components/footer";
import { Nav } from "./components/nav";
import { PersistentWebGL } from "./components/persistent-webgl";
import type { Route } from "./+types/root";

export const middleware: Route.MiddlewareFunction[] = [passwordMiddleware];

const OrchestraTools = lazy(() => import("../dev"));
const GlobalCanvas = lazy(() => import("../webgl/components/global-canvas"));

export function Layout({ children }: PropsWithChildren) {
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
      <Nav />
      <TransitionRouter
        mode="overlap"
        preventTransition={(_from, _to, { trigger }) => trigger === "browser"}
      >
        {null}
      </TransitionRouter>
      <Footer />
      <Lenis root options={{}} />
      <RealViewport />
      <RAF />
      <Suspense fallback={null}>
        <GlobalCanvas forceWebGL dpr={process.env.NODE_ENV === "development" ? 0.5 : undefined} />
      </Suspense>
      <PersistentWebGL>
        <WebGLTunnel>
          <BackgroundShader />
        </WebGLTunnel>
      </PersistentWebGL>
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <OrchestraTools />
        </Suspense>
      )}
    </ThemeProvider>
  );
}

export function ErrorBoundary() {
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
      <h1>Something went wrong</h1>
      <Link to="/">Go Home</Link>
    </div>
  );
}
