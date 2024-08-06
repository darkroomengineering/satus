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
- Sass (Modules)
- [Zustand](https://github.com/pmndrs/zustand)
- GraphQL (CMS API)
- [@svgr/webpack](https://github.com/gregberge/svgr/tree/main) (SVG Imports in `next.config.js`)

## Code Style & Linting:

- Eslint ([Next](https://nextjs.org/docs/basic-features/eslint#eslint-config) and [Prettier](https://github.com/prettier/eslint-config-prettier) plugins)
- [Prettier](https://prettier.io/) with the following settings available in `.pretierrc`:
  ```json
  {
    "endOfLine": "auto",
    "semi": false,
    "singleQuote": true
  }
  ```
- [Lefthook](https://github.com/evilmartians/lefthook)

## Third Party (optional tools):

- [Storyblok CMS](https://storyblok.com/)
- [Mailchimp CRM](https://mailchimp.com/)
- [Hubspot CRM](https://hubspot.com/)
- [Vercel (Hosting & Continuous Deployment)](https://vercel.com/home)
- [GitHub Versioning](https://github.com/)

## Folder Structure:

Alongside the usual Next.js App Router folder structure (`/public`, `/app`, etc.) We've added a few other folders to keep the code easier to read:

- **/components:** Reusable components with their respective Sass file
- **/docs:** Readmes on how to use third party tools at darkroom
- **/hooks:** Reusable Custom Hooks
- **/libs:** Reusable Scripts and State Storing, hubspot integration, sass utils, etc.
- **/styles:** Global styles and Sass partials
