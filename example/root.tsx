import { Suspense, lazy } from "react";
import { Link, Links, Meta, Scripts, ScrollRestoration } from "react-router";
import { ReactTempus } from "tempus/react";
import { RealViewport } from "~/components/real-viewport";
import { ThemeProvider } from "~/components/theme";
import { TransitionRouter } from "~/lib/transitions";
import "~/styles/css/index.css";
import "~/styles/css/media.css";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { TransitionDebug } from "./components/transition-debug";

const OrchestraTools = lazy(() => import("../dev"));
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
      <Header />
      <TransitionRouter mode="overlap">
        <TransitionDebug />
      </TransitionRouter>
      <Footer />
      <RealViewport />
      <ReactTempus />
      <Suspense fallback={null}>
        <GlobalCanvas />
      </Suspense>
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
