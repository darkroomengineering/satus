# Satus Code Boundaries Guide

This guide defines **clear boundaries** between starter code (provided by Darkroom) and project code (safe for you to customize). Understanding these boundaries is crucial for:

- **🎯 Safe Customization** - Know what you can modify without breaking upgrades
- **🤖 Agentic Development** - AI assistants understand modification boundaries
- **👥 Team Handoffs** - Clear guidelines for external developers
- **🔄 Upgrade Safety** - Starter updates won't conflict with your customizations

## 📂 Directory Structure & Boundaries

### 🔒 **STARTER CODE** (Preserve Structure)

**Core Utilities & Components** - *Preserve structure, customize content only*
```
components/
├── ui/              # Base UI primitives (@category starter-core)
│   ├── button/      # @modification-level structure-only
│   ├── image/       # @modification-level structure-only  
│   └── form/        # @modification-level structure-only
├── layout/          # Layout components (@category starter-layout)
│   ├── wrapper/     # @modification-level content-only
│   ├── header/      # @modification-level content-only
│   └── footer/      # @modification-level content-only
└── effects/         # Animation effects (@category starter-optional)

lib/
├── utils/           # Core utilities (@category starter-core)
├── styles/          # Design system (@category starter-core)
├── integrations/    # Service integrations (@category starter-optional)
├── webgl/           # WebGL system (@category starter-optional)
├── hooks/           # Shared hooks (@category starter-core)
└── scripts/         # Build tools (@category starter-scripts)
```

### 🎨 **PROJECT CODE** (Safe to Modify)

**Your Custom Code** - *Full modification freedom*
```
app/                 # Your pages & routes (@category project-page)
├── page.tsx         # @modification-level full
├── layout.tsx       # @modification-level content-only
├── (routes)/        # @modification-level full
└── globals.css      # @modification-level full

project/             # Your custom code (@category project-code)
├── components/      # @modification-level full
├── hooks/          # @modification-level full
├── utils/          # @modification-level full
├── content/        # @modification-level full
└── config/         # @modification-level full

public/             # Static assets (@category project-assets)
└── assets/         # @modification-level full
```

### ⚙️ **CONFIGURATION** (Customize via Settings)

**Control via satus.config.ts** - *No file modifications needed*
```
satus.config.ts     # Central configuration (@category project-config)
.env.local          # Environment variables (@category project-config)
tailwind.config.ts  # Styling overrides (@category project-config)
```

## 🏷️ Boundary Markers Reference

### File Header Annotations

Files contain boundary markers for both humans and AI:

```typescript
/**
 * @category starter-core | starter-layout | starter-optional | project-page | project-code
 * @modification-level full | content-only | structure-only | config-only
 * @preserve-structure true | false
 */
```

### Modification Levels

| Level | Description | What You Can Do |
|-------|-------------|------------------|
| **`full`** | Complete freedom | Add, modify, delete anything |
| **`content-only`** | Content customization | Change content/styling, preserve structure |
| **`structure-only`** | Props and styling only | Customize props/CSS, preserve component logic |
| **`config-only`** | Configuration driven | Use `satus.config.ts` to customize behavior |

### Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **`starter-core`** | Essential utilities | UI components, utils, hooks |
| **`starter-layout`** | Page structure | Wrapper, Header, Footer |
| **`starter-optional`** | Optional features | WebGL, integrations, effects |
| **`starter-scripts`** | Build tools | Setup scripts, generators |
| **`project-page`** | Your pages | Routes, page components |
| **`project-code`** | Your custom code | Business logic, custom components |
| **`project-config`** | Configuration | Settings, environment variables |

## 🎯 Practical Guidelines

### ✅ **Safe Customizations**

**Starter Components (structure-only)**
```tsx
// ✅ GOOD - Customize props and styling
<Image 
  src="/my-image.jpg" 
  alt="My custom alt text"
  className="my-custom-styling"
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// ✅ GOOD - Override via satus.config.ts  
// satus.config.ts
export default {
  components: {
    header: 'project/components/custom-header'
  }
}
```

**Layout Components (content-only)**
```tsx
// ✅ GOOD - Customize Header/Footer content
export function Header() {
  return (
    <header className="my-styling">
      <MyLogo />
      <MyNavigation />
    </header>
  )
}
```

**Project Code (full)**
```tsx
// ✅ GOOD - Full freedom in project directory
// project/components/product-grid.tsx
export function ProductGrid() {
  // Your custom business logic
  // Full modification freedom
}
```

### ❌ **Avoid These Modifications**

```tsx
// ❌ BAD - Modifying starter component internals
// components/ui/image/index.tsx
export function Image({ src, alt, ...props }) {
  // Don't modify the internal logic
  // This breaks upgrade safety
}

// ❌ BAD - Modifying core utilities
// lib/utils/math.ts  
export function clamp(value, min, max) {
  // Don't modify core utility functions
  // Create custom versions in project/utils instead
}
```

## 🔄 Override Patterns

### Component Overrides

Instead of modifying starter components, override them:

**1. Via satus.config.ts (Recommended)**
```typescript
// satus.config.ts
export default {
  components: {
    header: 'project/components/custom-header',
    footer: 'project/components/custom-footer'
  }
}
```

**2. Via Direct Import (For specific use cases)**
```tsx
// Use starter component
import { Button } from '@/components/ui/button'

// Override for specific page
import { CustomButton } from '@/project/components/custom-button'
```

### Utility Extensions

Extend starter utilities without modifying them:

```typescript
// project/utils/extended-math.ts
import { clamp as baseClamp } from '@/utils/math'

export function clamp(value: number, min: number, max: number) {
  // Your custom clamp with additional logic
  const result = baseClamp(value, min, max)
  // Add your customizations
  return result
}
```

## 🚀 Upgrade Safety

Following these boundaries ensures:

### ✅ **Safe Upgrades**
- Starter code updates don't break your customizations
- Clear separation between framework and application code
- Automated migration tools can work safely

### ✅ **Team Collaboration**  
- New developers know where to make changes
- AI assistants respect boundaries
- Code reviews focus on the right areas

### ✅ **Maintenance**
- Bugs in starter code get fixed with updates
- Performance improvements benefit your project
- Security patches apply automatically

## 🤖 AI Assistant Guidelines

For AI development tools, these boundaries mean:

- **`@category starter-*`** files: Preserve structure, suggest configuration changes
- **`@category project-*`** files: Full modification freedom
- **`@modification-level full`**: Complete customization allowed
- **`@modification-level content-only`**: Modify content, preserve component structure
- **`@modification-level structure-only`**: Props and styling only
- **`@preserve-structure true`**: Maintain existing component architecture

## 📚 Examples

### Customizing the Header

**❌ Don't modify the starter header directly**
```tsx
// components/layout/header/index.tsx - DON'T EDIT
export function Header() {
  // Don't modify this file
}
```

**✅ Create a custom header in project directory**
```tsx
// project/components/custom-header.tsx
import { Link } from '@/components/ui/link'

export function CustomHeader() {
  return (
    <header className="my-custom-styling">
      <Link href="/">My Logo</Link>
      <nav>
        {/* Your custom navigation */}
      </nav>
    </header>
  )
}
```

**✅ Configure it in satus.config.ts**
```typescript
export default {
  components: {
    header: 'project/components/custom-header'
  }
}
```

### Adding Custom Utilities

**❌ Don't modify starter utils**
```typescript
// lib/utils/strings.ts - DON'T EDIT
export function slugify(text: string) {
  // Don't modify starter utilities
}
```

**✅ Create custom utilities in project directory**
```typescript
// project/utils/custom-strings.ts
export function customSlugify(text: string) {
  // Your custom implementation
  return text.toLowerCase().replace(/\s+/g, '-')
}
```

## 🎯 Summary

**Remember the Golden Rule:**

- **🔒 Starter Code**: Preserve structure, customize via configuration
- **🎨 Project Code**: Full modification freedom
- **⚙️ Configuration**: Use `satus.config.ts` for customization without modification

This approach ensures your project remains upgradeable while giving you complete customization freedom where it matters most.

Happy coding! 🚀