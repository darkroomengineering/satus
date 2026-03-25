# Password Protection

Simple site-wide password gate using React Router middleware. Renders a password form on any page when not authenticated — no separate route needed.

## Setup

### 1. Enable middleware in `react-router.config.ts`

```ts
export default {
  future: {
    v8_middleware: true,
  },
} satisfies Config;
```

### 2. Export middleware from your `root.tsx`

```ts
import { middleware as passwordMiddleware } from "~/lib/password-protection";
import type { Route } from "./+types/root";

export const middleware: Route.MiddlewareFunction[] = [passwordMiddleware];
```

### 3. Set environment variables

```env
SITE_PASSWORD=your-password-here
SESSION_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
```

That's it. Every page is now gated behind a password form.

## How it works

- Middleware checks for a signed session cookie on every request
- If not authenticated, returns a password form as raw HTML (no app code loads)
- On correct password, sets a session cookie and redirects to the same URL
- Cookie persists for 1 week
- If `SITE_PASSWORD` is not set, middleware is a no-op — site is open

## Disabling

Remove `SITE_PASSWORD` from your environment variables. The middleware becomes a passthrough.

## Security

- Password comparison uses `crypto.timingSafeEqual` (constant-time)
- Session cookie is signed, `httpOnly`, `sameSite: lax`, `secure` in production
- `SESSION_SECRET` is required in production — throws at startup if missing
- Password form returns `401` with `X-Frame-Options: DENY`
- No app code, loaders, actions, or meta leak to unauthenticated users
- Rate limiting should be handled at the infrastructure layer (Vercel WAF, Cloudflare)

## Files

```
lib/password-protection/
  index.ts              # Barrel export
  middleware.ts         # Middleware + password form HTML
  session.server.ts     # Cookie session storage
  README.md             # This file
```
