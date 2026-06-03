# Security Policy

Satūs is a **starter template**, not a hosted service. It is meant to be cloned
and customized, so this policy covers the template's own code and tooling. Once
you fork and deploy, securing your environment variables, secrets, and
infrastructure is your responsibility.

## Supported Versions

Security fixes land on the **latest release** and `main`. There are no long-term
support branches; if you forked an older copy, rebase onto the latest `main` to
pick up fixes.

| Version      | Supported |
| ------------ | --------- |
| 2.x (latest) | ✅        |
| < 2.0        | ❌        |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.** Report it
privately through one of these channels:

1. **GitHub Security Advisories** (preferred): open the repository's Security tab
   and choose [Report a vulnerability](https://github.com/darkroomengineering/satus/security/advisories/new).
2. **Email**: tech@darkroom.engineering

Please include the affected file or route, the impact, and steps to reproduce
(a minimal proof of concept helps).

### What to expect

- Acknowledgement within **3 business days**.
- A severity assessment and a decision on whether the report is accepted.
- A fix on `main` (and a patch release) once confirmed, with credit to you
  unless you prefer to stay anonymous.

## Scope

**In scope**: the template's own code, including the request proxy (`proxy.ts`)
and rate limiting, server actions and Zod input validation, the integration
clients (Sanity, Shopify, HubSpot, Mailchimp), and the CI/build configuration.

**Out of scope:**

- Vulnerabilities in third-party dependencies. Report those upstream; we track
  them via Dependabot and patch when releases land.
- Issues that exist only in *your* deployment: leaked secrets, misconfigured
  environment variables, exposed `NEXT_PUBLIC_*` values, or infrastructure you
  control.

## Safeguards in this repo

CodeQL scanning and Dependabot run on every change, sensitive routes are
rate-limited, and external input is validated with Zod schemas.
