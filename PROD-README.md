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

- [PNPM](https://pnpm.io/)
- [Next.js](https://nextjs.org/)
- [Three.js](https://threejs.org/)
- [@react-three/drei](https://github.com/pmndrs/drei)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [Theatre.js](https://www.theatrejs.com/) (Animation tooling)
- [Storyblok](https://www.storyblok.com/) (CMS)
- [Shopify](https://www.shopify.com/) (E-commerce)
- CSS Modules with PostCSS custom settings (check `postcss.config.mjs`)
- [Biome](https://biomejs.dev/) (Linting & Formatting)
- [Husky](https://typicode.github.io/husky/) (Git hooks)
- [Storybook](https://storybook.js.org/) (Component development)

## Code Style & Linting:

- [Lefthook](https://github.com/evilmartians/lefthook)
- [Biome](https://biomejs.dev/)

## Third Party (optional tools):

- [Vercel (Hosting & Continuous Deployment)](https://vercel.com/home)
- [GitHub Versioning](https://github.com/)
- [Storyblok CMS](https://www.storyblok.com/)
- [Shopify](https://www.shopify.com/)

## Folder Structure:

Alongside the usual Next.js App Router folder structure (`/public`, `/app`, etc.) We've added a few other folders to keep the code easier to read:

- **/components:** Reusable components with their respective CSS modules
- **/app/(pages):** Page components and layouts
  - **/r3f:** Three.js/React Three Fiber components
- **/libs:** Core functionality and integrations
  - Storyblok integration
  - Shopify integration
  - Theatre.js integration
  - WebGL utilities
