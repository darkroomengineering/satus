[![SATUS](https://assets.darkroom.engineering/satus/header.png)](https://github.com/darkroomengineering/satus)

# Satūs

Satūs means start, beginning, planting, to be used as a template when starting a new project.

# Getting Started

## Quick Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Setup Vercel and environment variables:
   ```bash
   vercel link
   vercel env pull
   ```

3. Start development server:
   ```bash
   bun dev
   ```

## Development Tools

### Available Scripts
- `bun dev` or `npm run dev` - Start development server with Turbo
- `bun dev:https` - Start development server with HTTPS (useful for Storyblok)
- `bun setup:styles` - Generate style configuration files
- `bun typecheck` - Run TypeScript type checking
- `bun lint` - Run Biome linting

### VSCode Configuration
The project includes preconfigured settings:
- Biome as the default formatter
- Custom file associations
- Organized imports on save
- Path aliases support

### Debug Tools
Access debug features at `/debug/orchestra`
- Theatre.js Studio
- FPS Meter
- Grid Debugger
- Minimap

# Project Architecture

## Core Technologies
This starter kit has an opinionated setting using the following:
- [Next.js](https://nextjs.org) App router
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction) & [Drei](https://github.com/pmndrs/drei)
- [Lenis](https://github.com/darkroomengineering/lenis)
- [Theatre.js](https://www.theatrejs.com/) (Animation tooling)
- [GSAP](https://greensock.com/gsap/) | [See Documentation](https://github.com/darkroomengineering/satus/blob/main/docs/gsap/README.md)
- [Hamo](https://github.com/darkroomengineering/hamo)
- [Storyblok](https://www.storyblok.com/) | [See Documentation](https://github.com/darkroomengineering/satus/blob/main/docs/storyblok/README.md)
- [Shopify](https://www.shopify.com/)
- [SERVER MONO](https://github.com/internet-development/www-server-mono) Open Source font
- [Biome](https://biomejs.dev/) (Linting & Formatting)
- [Bun](https://bun.sh) as JavaScript runtime and package manager
- SVG import through [@svgr/webpack](https://www.npmjs.com/package/@svgr/webpack)
- Styling:
  - PostCSS architecture with custom functions and utilities
  - Tailwind CSS integration
  - Typography system with custom configuration
  - Root CSS variables for consistent theming

## Styling Architecture
The project uses a hybrid styling approach combining:
- Tailwind CSS with custom configuration
- PostCSS functions for responsive units (mobile-vw, desktop-vw)
- CSS Modules for component styles
- Custom grid system (4 columns mobile, 12 columns desktop)
- Automatic dark/light theme support

[See Styling Documentation](docs/styles/README.md)

# Development Workflow

## Git Hooks & Automation
The project uses Lefthook to manage Git hooks:

- **Pre-commit**: 
  - Runs Biome to check and format staged files (`.js`, `.mjs`, `.ts`, `.jsx`, `.tsx`, `.css`, `.scss`)
- **Post-merge**:
  - Automatically pulls latest environment variables from Vercel after merging

These hooks help maintain code quality and keep environment variables in sync across the team.

# Documentation

There is a `docs` folder with documentation on how to use tools such as GSAP and Storyblok at Darkroom. There is also a HOW-TO.md file serving as a catch-all file for any other tools or processes that are too straigthforward to warrant a full documentation file.


# Deployment

To deploy your project you can use Vercel, Netlify, or any other service that supports Next.js.
there is a PROD-README.md file expanding on the specifics of the deployed project, when going live don't forget to replace this README with the Production one.

# About

## Authors

This repository has been open sourced by the team at [darkroom.engineering](https://darkroom.engineering)

## License

[The MIT License.](https://opensource.org/licenses/MIT)
