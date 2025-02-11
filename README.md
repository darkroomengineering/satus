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
└── webgl/                        # WebGL and 3D graphics
    ├── components/               # WebGL components
    ├── hooks/                    # WebGL-specific hooks
    └── utils/                    # WebGL utilities
```

## Core Technologies

- **Framework & Runtime**
  - [Next.js](https://nextjs.org) App Router
  - [Bun](https://bun.sh) as JavaScript runtime and package manager
  - TypeScript for type safety

- **3D & Graphics**
  - [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) & [Drei](https://github.com/pmndrs/drei)
  - Custom WebGL shaders and materials
  - Advanced gradient animations with flowmap support
  - Three.js integration with optimized performance

- **Animation & Interaction**
  - [Theatre.js](https://www.theatrejs.com/) for animation tooling
  - [GSAP](https://greensock.com/gsap/) for advanced animations
  - [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling
  - [Hamo](https://github.com/darkroomengineering/hamo) utilities

- **Content Management**
  - [Storyblok](https://www.storyblok.com/) headless CMS
  - [Shopify](https://www.shopify.com/) e-commerce integration

- **Development Tools**
  - [Biome](https://biomejs.dev/) for linting & formatting
  - Theatre.js Studio for animation debugging
  - Built-in debug tools at `/orchestra`
  - Hot module replacement
  - VSCode configuration included

## Development Tools

### Available Scripts
- `bun dev` - Start development server with Turbo
- `bun dev:https` - Start development server with HTTPS
- `bun setup:styles` - Generate style configuration files
- `bun typecheck` - Run TypeScript type checking
- `bun lint` - Run Biome linting

### Debug Features (at `/orchestra`)
- Theatre.js Studio
- FPS Meter
- Grid Debugger
- Minimap

## Styling Architecture

- PostCSS with custom functions and utilities
- Tailwind CSS integration
- Typography system with [SERVER MONO](https://github.com/internet-development/www-server-mono) font
- Responsive units (mobile-vw, desktop-vw)
- CSS Modules for component styles
- Custom grid system (4 columns mobile, 12 columns desktop)
- Automatic dark/light theme support

## Git Workflow

### Automated Git Hooks (via Lefthook)
- **Pre-commit**: Runs Biome to check and format staged files
- **Post-merge**: Automatically pulls latest environment variables from Vercel

## Documentation

- Detailed documentation available in the `docs` folder
- Component-specific documentation in respective directories
- HOW-TO.md for common procedures and best practices
- See [GSAP Documentation](docs/gsap/README.md) and [Storyblok Documentation](docs/storyblok/README.md) for integration details

## Deployment

The project can be deployed on Vercel, Netlify, or any service supporting Next.js. See PROD-README.md for production-specific details.

## License

MIT © [darkroom.engineering](https://github.com/darkroomengineering)