[![SATUS](https://assets.darkroom.engineering/satus/header.png)](https://github.com/darkroomengineering/satus)

## Introduction

Satūs means start, beginning, planting, it's a set of tools we use as a template when starting a new project.

<br/>

## Composition

This starter kit is composed of:

- [Next.js](https://nextjs.org) App router
- [react-three-fiber](https://github.com/pmndrs/react-three-fiber)
- [Lenis](https://github.com/darkroomengineering/lenis)
- [Theatre.js](https://www.theatrejs.com/)
- [GSAP](https://greensock.com/gsap/) | [See Documentation](https://github.com/darkroomengineering/satus/blob/main/docs/gsap/README.md)
- [Hamo](https://github.com/darkroomengineering/hamo)
- [Storyblok](https://www.storyblok.com/) | [See Documentation](https://github.com/darkroomengineering/satus/blob/main/docs/storyblok/README.md)
- [Shopify](https://www.shopify.com/)
- SVG import through [@svgr/webpack](https://www.npmjs.com/package/@svgr/webpack)
- Sass architecture and tooling:
  - Config file
  - Viewport based sizes
  - Reset
  - Easings
  - Themes
- Debug tools:
  - Theatre.js Studio
  - FPS Meter
  - Grid Debugger
- Github workflow to display lighthouse report on slack:
  make sure you update the `vercel_project_id` in `.github/workflows/lighthouse-on-vercel-preview-url.yml` to your Vercel project id.

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
- Franco Arza ([@arzafran](https://twitter.com/arzafran)) - [darkroom.engineering](https://darkroom.engineering)

<br/>

## License

[The MIT License.](https://opensource.org/licenses/MIT)
