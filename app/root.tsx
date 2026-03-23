import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { ReactTempus } from "tempus/react";
import { RealViewport } from "@/components/real-viewport";
import { Theme } from "@/components/theme";
import "@/styles/css/index.css";
import "@/styles/css/media.css";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

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
    <RealViewport>
      <Theme theme="dark" global>
        <Header />
        <main id="main-content">
          <Outlet />
        </main>
        <Footer />
      </Theme>
      <ReactTempus />
    </RealViewport>
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
