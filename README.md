[![SATUS](https://assets.darkroom.engineering/satus/header.png)](https://github.com/darkroomengineering/satus)

## Introduction

Satūs means start, beginning, planting, to be used as a template when starting a new project.

<br/>

## Composition

This starter kit has an opinionated setting using the following:

- [Next.js](https://nextjs.org) App router
- [react-three-fiber](https://github.com/pmndrs/react-three-fiber)
- [Lenis](https://github.com/darkroomengineering/lenis)
- [Theatre.js](https://www.theatrejs.com/)
- [GSAP](https://greensock.com/gsap/) | [See Documentation](https://github.com/darkroomengineering/satus/blob/main/docs/gsap/README.md)
- [Hamo](https://github.com/darkroomengineering/hamo)
- [Storyblok](https://www.storyblok.com/) | [See Documentation](https://github.com/darkroomengineering/satus/blob/main/docs/storyblok/README.md)
- [Shopify](https://www.shopify.com/)
- [SERVER MONO](https://github.com/internet-development/www-server-mono) Open Source font
- SVG import through [@svgr/webpack](https://www.npmjs.com/package/@svgr/webpack)
- Sass architecture and tooling:
  - Config file
  - Viewport based sizes
  - Reset
  - Easings
  - Themes
- Debug tools:
  - Theatre.js Studio [@theatre/studio](https://www.npmjs.com/package/@theatre/studio)
  - FPS Meter
  - Grid Debugger
- Github workflow to display lighthouse report on slack:
  make sure you update the `vercel_project_id` in `.github/workflows/lighthouse-on-vercel-preview-url.yml` to your Vercel project id.

<br/>

## Docs

There is a `docs` folder with documentation on how to use tools such as GSAP and Storyblok at Darkroom. There is also a HOW-TO.md file serving as a catch-all file for any other tools or processes that are too straigthforward to warrant a full documentation file.

[See Storybook](https://satus-storybook.vercel.app/)

<br/>

## Going Live

To deploy your project you can use Vercel, Netlify, or any other service that supports Next.js.
there is a PROD-README.md file expanding on the specifics of the deployed project, when going live don't forget to replace this README with the Production one.

<br/>

## Debug

To toggle debug modes you need to access the page `/debug/orchestra`.

example: `https://satus.darkroom.engineering/debug/orchestra`

<br/>

## Authors

This set of hooks is curated and maintained by the darkroom.engineering team:

- Clément Roche ([@clementroche\_](https://twitter.com/clementroche_)) – [darkroom.engineering](https://darkroom.engineering)
- Guido Fier ([@uido15](https://twitter.com/uido15)) – [darkroom.engineering](https://darkroom.engineering)
- Leandro Soengas ([@lsoengas](https://twitter.com/lsoengas)) - [darkroom.engineering](https://darkroom.engineering)
- Fermin Fernandez ([@Fermin_FerBridd](https://twitter.com/Fermin_FerBridd)) - [darkroom.engineering](https://darkroom.engineering)
- Felix Mayr ([@feledori](https://twitter.com/feledori)) - [darkroom.engineering](https://darkroom.engineering)
- Franco Arza ([@arzafran](https://twitter.com/arzafran)) - [darkroom.engineering](https://darkroom.engineering)

<br/>

## License

[The MIT License.](https://opensource.org/licenses/MIT)
