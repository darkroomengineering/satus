# react-doctor — acknowledged false positives

Entries here tell `react-doctor` to stop flagging diagnostics that have been
reviewed and judged not to apply to this codebase. Re-run `npx react-doctor`
after editing to confirm they're suppressed.

## `server-auth-actions` (×12) — all false positives

The rule treats every server action that touches data as a public endpoint that
should check the caller's identity first. This template has **no auth/session
library** (no NextAuth/Clerk/Supabase-auth — confirmed in `package.json`) and
`proxy.ts` does rate-limiting only, so there is no `auth()` to call. Every flagged
action is an intentionally public or anonymous endpoint, defended the correct way
(rate-limit + Turnstile/CAPTCHA + Zod validation). Bolting on a no-op `auth()`
stub is the exact anti-pattern the rule's own docs warn against.

- `server-auth-actions` — public form actions (demo / mailchimp / hubspot) — public by design; protected by rate-limit + Turnstile + Zod validation
- `server-auth-actions` — `shopify/cart/actions.ts` (add/remove/update/fetch) — anonymous guest cart keyed by a server-set httpOnly `cartId` cookie + IP rate-limit; no user identity exists to check
- `server-auth-actions` — `shopify/customer` `LoginCustomerAction` / `CreateCustomerAction` — credential-establishing endpoints; run for logged-out users by definition; already rate-limited + validated
- `server-auth-actions` — `shopify/customer` `LogoutCustomerAction` / `getCustomer` — self-scoped to the caller's own `customerAccessToken` cookie; bail/no-op when absent (a real cookie-based gate the rule doesn't recognize)

> If authenticated account pages are ever added as server actions ("view my
> orders", "update my address"), those **must** gate on the signed-in user —
> remove the relevant entry above and add the check. None exist today.
