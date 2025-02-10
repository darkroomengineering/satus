[![SATUS](https://assets.darkroom.engineering/satus/header.png)](https://github.com/darkroomengineering/satus)

# Satus

A modern React application with advanced features including WebGL graphics, animations, and CMS integration.

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
│   ├── use-scroll-trigger.ts
│   ├── use-transform.tsx
│   └── use-device-detection.ts
├── intergrations/                # Third party integrations
│   ├── hubspot/                  # Hubspot form integration
│   ├── storyblok/                # Storyblok CMS integration
│   └── shopify/                  # Shopify integration
├── libs/                         # Utility libraries and functions
│   ├── utils.ts
│   ├── maths.ts
│   └── store.ts
├── orchestra/                    # Debugging and development tools
└── webgl/                        # WebGL and 3D graphics
    ├── components/               # WebGL components
    ├── hooks/                    # WebGL-specific hooks
    └── utils/                    # WebGL utilities
```

## Features

- **Modern React Development**
  - Next.js for server-side rendering and routing
  - TypeScript for type safety
  - Custom hooks for reusable logic

- **Rich UI Components**
  - Extensive component library
  - Animation and interaction capabilities
  - Responsive and accessible design

- **3D Graphics and WebGL**
  - Three.js integration
  - Custom WebGL shaders
  - React Three Fiber (R3F) implementation

- **CMS Integration**
  - Storyblok for content management
  - Shopify for e-commerce
  - Headless CMS architecture

- **Developer Experience**
  - Hot module replacement
  - Development tools and debugging
  - Comprehensive documentation

## Getting Started

1. Install dependencies:
```bash
bun install
```

2. Run the development server:
```bash
bun dev
```

3. Build for production:
```bash
bun build
```

## Documentation

Each major directory contains its own README with specific documentation:

- [Components Documentation](./components/README.md)
- [Hooks Documentation](./hooks/README.md)
- [WebGL Documentation](./webgl/README.md)
- [Integration Documentation](./intergrations/README.md)
- [Utility Libraries Documentation](./libs/README.md)

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

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
Access debug features at `/orchestra`
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
