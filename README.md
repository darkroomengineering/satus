[![SATUS](https://assets.studiofreight.com/satus/header.png)](https://github.com/studio-freight/satus)

<!-- <p align="center">
  <a aria-label="Vercel logo" href="https://vercel.com">
    <img src="https://badgen.net/badge/icon/Next?icon=zeit&label&color=black&labelColor=black">
  </a>
  <br/>
  <a aria-label="NPM version" href="https://www.npmjs.com/package/swr">
    <img alt="" src="https://badgen.net/npm/v/swr?color=black&labelColor=black">
  </a>
  <a aria-label="Package size" href="https://bundlephobia.com/result?p=swr">
    <img alt="" src="https://badgen.net/bundlephobia/minzip/swr?color=black&labelColor=black">
  </a>
  <a aria-label="License" href="https://github.com/vercel/swr/blob/main/LICENSE">
    <img alt="" src="https://badgen.net/npm/license/swr?color=black&labelColor=black">
  </a>
</p> -->

## Introduction

Satūs means start, beginning, planting, it's a set of tools we use as a template when starting a new project.

<br/>

## Composition

This starter kit is composed of:

- [Next.js](https://nextjs.org)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Spring](https://github.com/pmndrs/react-spring)
- [Embla](https://embla-carousel.com)
- [Lenis](https://github.com/studio-freight/lenis)
- [Clsx](https://www.npmjs.com/package/clsx)
- From [Radix UI](https://www.radix-ui.com/):
  - [Accordion](https://www.radix-ui.com/docs/primitives/components/accordion)

<br/>

## Features

This starter kit is composed of:

- SVG import through [@svgr/webpack](https://www.npmjs.com/package/@svgr/webpack)
- Sass architecture and tooling:
  - To VW Functions
  - Reset
  - Easings
- Hooks:
  - useDebug
  - useFrame
  - useInterval
  - useIsTouchDevice
  - useMediaQuery
  - useRect
  - useSlots
- Custom Cursor support
- Real Viewport component
- Grid Debugger
- Stats

<br/>

## With-Shopify

[Preview Link](https://shopify.satus.studiofreight.com/)

This branch adds integration to Shopify through the [GraphQL storefront API](https://shopify.dev/api/storefront#top).

- Set Up:

  1. Create a [private app](https://shopify.dev/api/storefront/getting-started#accessing-the-storefront-graphql-endpoint):

     - For local development, create a [.env.local file](https://nextjs.org/docs/basic-features/environment-variables) and add following keys:

       - NEXT_SHOPIFY_STOREFRONT_ACCESS_TOKEN=
       - NEXT_PUBLIC_SHOPIFY_DOMAIN=
       - NEXT_PUBLIC_LOCAL_STORAGE_CHECKOUT_ID= 'Add your ID of choice for local storage'

       Same envs must be added to production environment if needed.

  2. Add testing products to your store and don't forget to set Product status to active for each product 😅.

  3. Run localhost server and you are integrated to Shopify 🚀🚀🚀

- Current Features on this branch:

  - Custom GraphQL queries for cart and products. On lib folder you can customize your queries to fulfill your needs, [docs](https://shopify.dev/api/storefront#development_frameworks_and_sdks).
  - Basic Product Page:
    - Products Routes set up with GetStaticPaths using shopify handles.
    - Add to cart functionality.
    - Disabled out of stock variants.
  - Cart with optimistic UI built with [SWR hooks](https://swr.vercel.app/):
    - Modify quantity of products.
    - Change Variant of selected products.
    - Remove products from cart.

<br/>

## Authors

This toolkit is curated and maintained by the Studio Freight Things team:

- Clement Roche ([@clementroche\_](https://twitter.com/clementroche_)) – [Studio Freight](https://studiofreight.com)
- Guido Fier ([@uido15](https://twitter.com/uido15)) – [Studio Freight](https://studiofreight.com)
- Leandro Soengas ([@lsoengas](https://twitter.com/lsoengas)) - [Studio Freight](https://studiofreight.com)
- Franco Arza ([@arzafran](https://twitter.com/arzafran)) - [Studio Freight](https://studiofreight.com)

<br/>

## License

[The MIT License.](https://opensource.org/licenses/MIT)
