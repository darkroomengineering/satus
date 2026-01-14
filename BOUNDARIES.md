# Satus Philosophy: Simple Customization

Satus is designed to be **simple to use** while remaining **upgrade-safe**. No complex rules or folder decisions - just common sense.

## 🎯 Simple Rule

**One decision to make**: *Am I building my project or extending the starter?*

- **Building your project** → Modify freely (pages, styling, content)
- **Extending the starter** → Use `satus.config.ts` or create alongside

## 📂 What You'll Find

```
app/                 # Your pages & routes - customize freely
components/          # Mix of starter + your components 
├── ui/              # Starter UI primitives
├── layout/          # Starter layout (Header/Footer) 
└── effects/         # Starter animations
lib/
├── utils/           # Starter utilities
├── integrations/    # Starter service integrations
├── webgl/           # Starter WebGL system  
└── styles/          # Starter design system
satus.config.ts      # Your customization hub
```

## 🔧 How to Customize

### Your Pages & Content
```tsx
// app/page.tsx - Your homepage
export default function Home() {
  return (
    <Wrapper theme="dark">
      <h1>My Project</h1>
      {/* Your content here */}
    </Wrapper>
  )
}
```

### Your Components  
```tsx
// components/my-hero.tsx - Add alongside starter components
export function MyHero() {
  return <section>My custom hero section</section>
}
```

### Customize Starter Features
```typescript
// satus.config.ts - Control features without file edits
export default {
  features: {
    webgl: false,      // Disable WebGL if not needed
    sanity: true,      // Enable CMS
    shopify: false,    // Disable e-commerce
  },
  
  components: {
    header: './components/my-header',  // Use your header
  },
  
  theme: {
    defaultTheme: 'light'  // Change default theme
  }
}
```

## 🤖 For AI Assistants

Simple rule: **Modify pages and content freely, extend starter components through configuration or by creating new ones alongside.**

## ⚠️ Upgrade Safety

**Want starter updates to work smoothly?**
- Customize through `satus.config.ts` when possible
- Create new components instead of modifying existing ones
- Keep your pages and content separate from starter utilities

That's it! No complex rules, just common sense. 🚀