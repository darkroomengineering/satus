# Project Code

This directory contains **project-specific code** that is safe to modify, customize, and extend for your needs.

**🎨 Project Code Boundaries - SAFE TO MODIFY**

## What's in here?

- **`components/`** - Your custom components that extend or replace starter components
- **`hooks/`** - Your custom React hooks for business logic
- **`utils/`** - Your project-specific utility functions
- **`content/`** - Static content, copy, and project-specific data
- **`config/`** - Project-specific configuration files

## Guidelines

### ✅ **Safe to Modify**
- Add new components, hooks, and utilities freely
- Customize styling, content, and business logic
- Override starter components by configuring paths in `satus.config.ts`
- Modify, delete, or refactor anything in this directory

### 🔄 **Integration with Starter Code**
- Use starter components by importing from `@/components/ui/*`
- Leverage starter utilities from `@/utils/*`
- Follow starter patterns for consistency
- Override starter components via `satus.config.ts` configuration

## Examples

### Custom Component Override
```tsx
// project/components/custom-header.tsx
import { Link } from '@/components/ui/link'

export function CustomHeader() {
  return (
    <header className="custom-styling">
      <Link href="/">My Custom Logo</Link>
      {/* Your custom navigation */}
    </header>
  )
}
```

Then in `satus.config.ts`:
```typescript
export default {
  components: {
    header: 'project/components/custom-header'
  }
}
```

### Custom Business Logic
```tsx
// project/hooks/use-cart.ts
import { useState } from 'react'

export function useCart() {
  // Your custom cart logic
  const [items, setItems] = useState([])
  // ... custom implementation
  return { items, addItem, removeItem }
}
```

### Project-Specific Utils
```typescript
// project/utils/validation.ts
export function validateEmail(email: string) {
  // Your custom validation logic
  return email.includes('@')
}
```

## Architecture Benefits

This separation provides:

- **🎯 Clear Boundaries** - Obvious what's yours vs. starter code
- **🔄 Upgrade Safety** - Starter updates won't break your customizations  
- **👥 Team Clarity** - New team members know where to make changes
- **🤖 AI-Friendly** - AI assistants understand modification boundaries

Happy coding! 🚀