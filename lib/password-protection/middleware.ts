import { timingSafeEqual } from "node:crypto";
import { redirect } from "react-router";
import { env } from "~/env.server";
import { getSession, commitSession } from "./session.server";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const HEADERS = {
  "Content-Type": "text/html",
  "X-Frame-Options": "DENY",
} as const;

/**
 * Password protection middleware.
 *
 * Renders a password form on any page when not authenticated.
 * No separate route needed — the form renders at whatever URL
 * the user visited and stays there after login.
 *
 * Disabled when `SITE_PASSWORD` env var is not set.
 *
 * ```ts
 * // root.tsx
 * import { middleware as passwordMiddleware } from "~/lib/password-protection";
 * export const middleware: Route.MiddlewareFunction[] = [passwordMiddleware];
 * ```
 */
export async function passwordMiddleware(
  { request }: { request: Request },
  next: () => Promise<Response>,
) {
  if (!env.SITE_PASSWORD) return next();

  const session = await getSession(request.headers.get("Cookie"));

  // Already authenticated — proceed
  if (session.get("authenticated")) return next();

  // Handle password submission
  if (request.method === "POST") {
    const formData = await request.formData();
    const password = formData.get("__site_password");

    if (typeof password === "string" && safeEqual(password, env.SITE_PASSWORD)) {
      session.set("authenticated", true);
      const url = new URL(request.url);

      throw redirect(url.pathname + url.search, {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    }

    // Wrong password
    return new Response(renderPage(true), {
      status: 401,
      headers: HEADERS,
    });
  }

  // Not authenticated — render password form at this URL
  return new Response(renderPage(false), {
    status: 401,
    headers: HEADERS,
  });
}

function renderPage(error: boolean) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Password Required</title>
  <style>
    :root { color-scheme: light dark; }
    * { margin: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      background: light-dark(#fff, #000);
      color: light-dark(#000, #fff);
    }
    form {
      position: relative;
      display: flex;
      gap: 1rem;
    }
    input {
      height: 50px;
      padding: 0 1rem;
      font-family: inherit;
      font-size: 1rem;
      background: transparent;
      border: 1px solid ${error ? "#ff4444" : "light-dark(#000, #fff)"};
      color: light-dark(#000, #fff);
      outline: none;
    }
    button {
      flex-shrink: 0;
      height: 50px;
      width: 95px;
      font-family: inherit;
      background: light-dark(#000, #fff);
      color: light-dark(#fff, #000);
      border: none;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }
    .error { position: absolute; top: 56px; left: 112px; font-size: 0.875rem; color: #ff4444; }
    .darkroom {
      position: relative;
      flex-shrink: 0;
      height: 50px;
      width: 95px;
      background: light-dark(#000, #fff);
    }
    .darkroom-inner {
      position: absolute;
      top: 24px;
      height: 3px;
      width: 70px;
      background: light-dark(#fff, #000);
    }
  </style>
</head>
<body>
  <form method="post">
    <div class="darkroom">
      <div class="darkroom-inner"></div>
    </div>
    <input id="__site_password" type="password" name="__site_password" required autofocus autocomplete="off" placeholder="Password" />
    ${error ? '<p class="error">Wrong password</p>' : ""}
    <button type="submit">Enter</button>
  </form>
</body>
</html>`;
}
