# GSAP

Satūs uses GSAP for animations

## Usage

To setup GSAP in your project, you can import it like with the `<GSAP>` component, it will merge automatically merge GSAP ticker with [Tempus](https://www.npmjs.com/package/@darkroom.engineering/tempus). If `scrollTrigger` is passed as a prop, it will also setup ScrollTrigger so it's synced with [Lenis](https://www.npmjs.com/package/@darkroom.engineering/lenis).

```jsx
<GSAP scrollTrigger />
```

## Business

[GSAP Business](https://gsap.com/pricing/) is a paid version of GSAP that includes extra plugins. To install it, you'll need an auth token from GSAP. Satūs provides you way to install it easily so it works on both production and development environment while keeping your token safe.

You need to add your GSAP token to your `.env` file:
`GSAP_AUTH_TOKEN=your-gsap-auth-token`

Then you can install GSAP Business by running:

```bash
npm run npmrc
pnpm install gsap@npm:@gsap/business
```

From now on, your install command will be the following, so you don't need to worry about the token anymore:

```bash
npm run npmrc; pnpm install
```
