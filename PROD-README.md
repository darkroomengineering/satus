# [PROJECT]

## Setup:

The usual process for Next.js based apps/websites:

1. Install node modules:

   `$ pnpm i`

2. Get the .env variables from Vercel (check `.env.template`), after [installing Vercel CLI](https://vercel.com/docs/cli):

   `$ vc link`

   `$ vc env pull`

3. run development environment:

   `$ pnpm dev`

## Stack:

- [Lenis](https://github.com/darkroomengineering/lenis)
- [Tempus](https://github.com/darkroomengineering/tempus)
- [Hamo](https://github.com/darkroomengineering/hamo)
- [PNPM](https://pnpm.io/)
- [Next.js](https://nextjs.org/)
- [Three.js](https://threejs.org/)
- [@react-three/drei](https://github.com/pmndrs/drei)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [GSAP](https://greensock.com/gsap/)
- CSS with PostCSS custom settings (check `postcss.config.mjs`)
- [Zustand](https://github.com/pmndrs/zustand)
- GraphQL (CMS API)
- [@svgr/webpack](https://github.com/gregberge/svgr/tree/main) (SVG Imports in `next.config.ts`)
- [pnpm](https://pnpm.io/)

## Code Style & Linting:

- [Biome](https://github.com/biomejs/biome)
- [Lefthook](https://github.com/evilmartians/lefthook)

## Third Party (optional tools):

- [Storyblok CMS](https://storyblok.com/)
- [Mailchimp CRM](https://mailchimp.com/)
- [Hubspot CRM](https://hubspot.com/)
- [Vercel (Hosting & Continuous Deployment)](https://vercel.com/home)
- [GitHub Versioning](https://github.com/)

## Folder Structure:

Alongside the usual Next.js App Router folder structure (`/public`, `/app`, etc.) We've added a few other folders to keep the code easier to read:

- **/components:** Reusable components with their respective CSS file
- **/docs:** Readmes on how to use third party tools at darkroom
- **/hooks:** Reusable Custom Hooks
- **/libs:** 
  - Core form functionality
  - Hubspot integration
  - Shopify integration
  - Storyblok integration
  - Style variables
  - Theatre.js integration
  - general purpose functions
- **/styles:** Style theme configurations, Global styles and CSS partials.
