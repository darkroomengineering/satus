[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern React application template with advanced features including WebGL graphics, animations, and CMS integration. Satūs means "start" or "beginning" in Latin, serving as a foundation for new projects.

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

## Project Structure

```
├── app/                          # Next.js application pages and routes
│   └── (pages)/                  # Page components and layouts
├── components/                   # Reusable UI components
│   ├── button/                   # Button components
│   ├── form/                     # Form components
│   ├── animation/                # Animation components
│   └── ...                       # Other UI components
├── hooks/                        # Custom React hooks
├── intergrations/                # Third party integrations
│   ├── hubspot/                  # Hubspot form integration
│   ├── storyblok/                # Storyblok CMS integration
│   └── shopify/                  # Shopify integration
├── libs/                         # Utility libraries and functions
├── orchestra/                    # Debugging and development tools
├── styles/                       # Styling system configuration and utilities
└── webgl/                        # WebGL and 3D graphics
    ├── components/               # WebGL components
    ├── hooks/                    # WebGL-specific hooks
    └── utils/                    # WebGL utilities
```

## Core Technologies

- **Framework & Runtime**
  - [Next.js 15.2](https://nextjs.org) App Router with React Server Components
  - [React 19.0](https://react.dev) with React Compiler for improved performance
  - [Bun](https://bun.sh) as JavaScript runtime and package manager
  - TypeScript with strict type checking

- **3D & Graphics**
  - [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) & [Drei](https://github.com/pmndrs/drei)
  - [Three.js 0.174.0](https://threejs.org/) for 3D rendering
  - Custom WebGL shaders and materials
  - Advanced gradient animations with flowmap support
  - [Postprocessing](https://pmndrs.github.io/postprocessing) for visual effects

- **Animation & Interaction**
  - [Theatre.js 0.7](https://www.theatrejs.com/) for animation tooling
  - [GSAP 3.12](https://greensock.com/gsap/) (Business Edition) for advanced animations
  - [Lenis 1.1](https://github.com/darkroomengineering/lenis) for smooth scrolling
  - [Hamo](https://github.com/darkroomengineering/hamo) utilities
  - [Tempus](https://github.com/darkroomengineering/tempus) timing utilities

- **Content Management**
  - [Storyblok 3.2](https://www.storyblok.com/) headless CMS
  - [Shopify](https://www.shopify.com/) e-commerce integration
  - [HubSpot](https://www.hubspot.com/) form management

- **Development Tools**
  - [Biome 1.9.4](https://biomejs.dev/) for linting & formatting
  - [Lefthook](https://github.com/evilmartians/lefthook) for Git hooks automation
  - Theatre.js Studio for animation debugging
  - Built-in debug tools at `/orchestra`
  - Hot module replacement
  - VSCode configuration included

## Development Tools

### Available Scripts
- `bun dev` - Start development server with Turbo
- `bun dev:https` - Start development server with HTTPS
- `bun build` - Build the project for production
- `bun start` - Start the production server
- `bun setup:styles` - Generate style configuration files
- `bun watch:styles` - Watch and rebuild styles on changes
- `bun typecheck` - Run TypeScript type checking
- `bun lint` - Run Biome linting
- `bun analyze` - Analyze bundle sizes

### Debug Features (at `/orchestra`)
- Theatre.js Studio
- FPS Meter
- Grid Debugger
- Minimap

## Styling Architecture

- **System Overview**
  - Tailwind CSS v4.0.9 with custom utilities
  - PostCSS with advanced configuration and functions
  - CSS Modules for component styles
  - Responsive viewport-based units

- **Key Features**
  - Viewport-relative units (`mobile-vw`, `desktop-vw`)
  - Custom responsive grid system (configurable [in styles/layout.mjs](/styles/layout.mjs))
  - Pre-defined breakpoints (800px desktop threshold)
  - Typography system with [SERVER MONO](https://github.com/internet-development/www-server-mono) font
  - Theme support
  - Custom scaling utilities with 's' prefix

- **Build Process**
  - Automated style generation with `setup:styles` script
  - CSS optimization with cssnano in production
  - Type-safe theme properties and configuration

For more details on the styling system, see [styles/README.md](/styles/README.md).

## Git Workflow

### Automated Git Hooks (via Lefthook)
- **Pre-commit**: Runs Biome to check and format staged files
- **Post-merge**: Automatically pulls latest environment variables from Vercel

## Documentation

- Detailed documentation available in the respective folders:
  - [`libs/readme.md`](/libs/readme.md)
  - [`styles/readme.md`](/styles/readme.md)
  - [`integrations/readme.md`](/integrations/readme.md)
  - [`hooks/readme.md`](/hooks/readme.md)
  - [`components/readme.md`](/components/readme.md)

## Deployment

The project can be deployed on Vercel, Netlify, or any service supporting Next.js. See PROD-README.md for production-specific details.

## License

MIT © [darkroom.engineering](https://github.com/darkroomengineering)