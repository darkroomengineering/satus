# Components

**Single source of truth for all UI components.**

## Structure

```
components/
├── ui/        → Primitives (reusable across any project)
├── layout/    → Site chrome (customize per project)
└── effects/   → Animation & visual enhancements
```

## Quick Reference

| Category | Components | Import |
|----------|------------|--------|
| **UI** | image, link, form, select, menu, accordion, tabs, tooltip, switch, checkbox, alert-dialog, toast, fold, scrollbar | `~/components/ui/[name]` |
| **Layout** | wrapper, navigation, footer, theme, lenis | `~/components/layout/[name]` |
| **Effects** | gsap, marquee, split-text, progress-text, animated-gradient | `~/components/effects/[name]` |

## Usage

```tsx
// Direct imports (recommended)
import { Image } from '~/components/ui/image'
import { Menu } from '~/components/ui/menu'
import { Wrapper } from '~/components/layout/wrapper'

// Category barrel imports
import { Image, Link, Menu, Select, Tabs, Toast } from '~/components/ui'
import { Wrapper, Navigation, Footer } from '~/components/layout'
import { Marquee, GSAPRuntime } from '~/components/effects'
```

## UI Components

Reusable primitives built on [Base UI](https://base-ui.com/) for accessibility.

### Core

- **`image/`** - Optimized images (always use this, never `next/image` directly)
- **`link/`** - Smart navigation (auto-detects external links, prefetching)
- **`form/`** - Form components with validation and server actions
- **`select/`** - Custom select/dropdown with controlled mode support

### Interactive (Base UI)

- **`accordion/`** - Expandable sections with Activity optimization
- **`menu/`** - Dropdown menus with keyboard navigation
- **`tabs/`** - Tab navigation with Activity optimization
- **`tooltip/`** - Hover hints
- **`alert-dialog/`** - Confirmation dialogs
- **`toast/`** - Notification toasts

### Form Controls (Base UI)

- **`checkbox/`** - Accessible checkboxes
- **`switch/`** - Toggle switches

### Utilities

- **`fold/`** - Scroll-based folding animations
- **`scrollbar/`** - Custom scrollbars
- **`real-viewport/`** - Accurate viewport dimensions (CSS custom properties)
- **`scroll-restoration/`** - Preserve scroll position
- **`sanity-image/`** - Sanity CMS image wrapper

### Deprecated

- **`dropdown/`** - Use `menu/` instead

## Component Examples

### Menu (replaces Dropdown)

```tsx
import { Menu } from '~/components/ui/menu'

<Menu.Root>
  <Menu.Trigger>Options</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner>
      <Menu.Popup>
        <Menu.Item onClick={() => console.log('Edit')}>Edit</Menu.Item>
        <Menu.Separator />
        <Menu.Item onClick={() => console.log('Delete')}>Delete</Menu.Item>
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

### Accordion

```tsx
import { Accordion } from '~/components/ui/accordion'

<Accordion.Group>
  <Accordion.Root>
    {({ isOpen }) => (
      <>
        <Accordion.Button>{isOpen ? 'Close' : 'Open'}</Accordion.Button>
        <Accordion.Body>Content here</Accordion.Body>
      </>
    )}
  </Accordion.Root>
</Accordion.Group>
```

### Tabs

```tsx
import { Tabs } from '~/components/ui/tabs'

<Tabs.Root defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
    <Tabs.Indicator />
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs.Root>
```

### Select (Controlled)

```tsx
import { Select } from '~/components/ui/select'

const [value, setValue] = useState('apple')

<Select
  options={[
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
  ]}
  value={value}
  onValueChange={setValue}
  placeholder="Choose a fruit"
/>
```

### Toast

```tsx
import { Toast, useToast } from '~/components/ui/toast'

// In your root layout
<Toast.Provider>
  <App />
  <Toast.Viewport />
</Toast.Provider>

// In any component
function MyComponent() {
  const { toast } = useToast()
  
  return (
    <button onClick={() => toast.success('Saved!')}>Save</button>
  )
}
```

### AlertDialog

```tsx
import { AlertDialog } from '~/components/ui/alert-dialog'

<AlertDialog
  trigger={<button>Delete</button>}
  title="Delete item?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  destructive
  onConfirm={() => deleteItem()}
/>
```

### Tooltip

```tsx
import { Tooltip } from '~/components/ui/tooltip'

<Tooltip content="This is helpful info" side="top">
  <button>Hover me</button>
</Tooltip>
```

### Form

```tsx
import { Form, SubmitButton, Messages } from '~/components/ui/form'
import { InputField } from '~/components/ui/form/fields'

async function submitAction(prevState, formData) {
  'use server'
  const email = formData.get('email')
  // Process...
  return { status: 200, message: 'Success!' }
}

<Form action={submitAction} onSuccess={(state) => console.log('Done!', state)}>
  <InputField id="email" type="email" label="Email" idx={0} required />
  <Messages />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

## Layout Components

Site structure components - customize these per project.

- **`wrapper/`** - Page wrapper with theme, WebGL canvas, and Lenis
- **`navigation/`** - Site navigation
- **`footer/`** - Site footer
- **`theme/`** - Theme provider and context
- **`lenis/`** - Smooth scrolling wrapper

```tsx
import { Wrapper } from '~/components/layout/wrapper'

export default function Page() {
  return (
    <Wrapper theme="dark" webgl lenis>
      <section>Your content</section>
    </Wrapper>
  )
}
```

## Effects Components

Animation and visual enhancements.

- **`gsap/`** - GSAP integration with Tempus
- **`marquee/`** - Infinite scrolling text
- **`split-text/`** - Text animation utilities
- **`progress-text/`** - Animated progress indicators
- **`animated-gradient/`** - WebGL gradient animations

```tsx
import { GSAPRuntime } from '~/components/effects/gsap'
import { Marquee } from '~/components/effects/marquee'

// Add to root layout
<GSAPRuntime />

// Use in components
<Marquee speed={2}>Scrolling text</Marquee>
```

## Best Practices

### Images

Always use the custom Image component:

```tsx
import { Image } from '~/components/ui/image'

// ✅ Do this
<Image src="/photo.jpg" alt="Photo" aspectRatio={16/9} />

// ❌ Never do this
import Image from 'next/image'
```

### Links

Use the smart Link component [[memory:2999114]]:

```tsx
import { Link } from '~/components/ui/link'

// Automatically handles internal vs external
<Link href="/about">Internal</Link>
<Link href="https://example.com">External (opens new tab)</Link>
```

### Styling

Use CSS modules (import as `s`) + Tailwind utilities:

```tsx
import s from './component.module.css'

<div className={cn(s.wrapper, 'flex items-center')}>
```

## Related

- [Image Component](ui/image/README.md)
- [Real Viewport](ui/real-viewport/README.md)
- [WebGL Components](../lib/webgl/README.md)
- [Base UI Documentation](https://base-ui.com/)
