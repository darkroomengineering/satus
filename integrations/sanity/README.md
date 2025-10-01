# Sanity CMS Integration Guide

This comprehensive guide covers everything you need to know about using Sanity CMS with this Next.js application, including visual editing, creating new pages, and content management.

## Table of Contents

- [Quick Start](#quick-start)
- [For Developers](#for-developers)
  - [Visual Editor Setup](#visual-editor-setup)
  - [Creating New Pages](#creating-new-pages)
  - [Schema Management](#schema-management)
  - [Best Practices](#best-practices)
- [For Content Editors](#for-content-editors)
  - [Getting Started](#getting-started)
  - [Using the Visual Editor](#using-the-visual-editor)
  - [Content Management](#content-management)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+ and Bun installed
- Sanity account and project created
- Environment variables configured

### Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-write-token"
```

### Quick Setup

1. **Install dependencies**: `bun install`
2. **Start development server**: `bun dev`
3. **Access Sanity Studio**: Visit `http://localhost:3000/studio`
4. **Create content**: Add pages and articles in the Studio
5. **Enable Visual Editor**: Click "Present" in the Studio to start visual editing

---

## For Developers

### Visual Editor Setup

The visual editor is already configured in this project. Here's how it works:

#### Core Components

**1. Layout Integration (`app/layout.tsx`)**
```tsx
import { VisualEditing } from 'next-sanity/visual-editing'
import { DisableDraftMode } from '~/integrations/sanity/components/disable-draft-mode'

export default async function Layout({ children }) {
  const isDraftMode = (await draftMode()).isEnabled
  
  return (
    <html>
      <body>
        {children}
        {isDraftMode && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  )
}
```

**2. Data Fetching with Draft Mode / Live**
```tsx
import { draftMode } from 'next/headers'
import { sanityFetch } from '~/integrations/sanity/live'
import { pageQuery } from '~/integrations/sanity/queries'

export default async function Page() {
  const { data } = await sanityFetch({ query: pageQuery, params: { slug: 'home' } })
  return <YourComponent data={data} />
}
```

**3. Context Provider**
```tsx
import { SanityContextProvider } from '~/integrations/sanity'

export default function Page({ data }) {
  return (
    <SanityContextProvider document={data}>
      {/* Your components */}
    </SanityContextProvider>
  )
}
```

#### Visual Editing Attributes

Add `data-sanity` attributes to make elements editable:

```tsx
export function MyComponent() {
  const { document } = useSanityContext()
  
  return (
    <div data-sanity={document._id}>
      <h1 data-sanity="title">{document.title}</h1>
      <div data-sanity="content">
        <RichText content={document.content} />
      </div>
    </div>
  )
}
```

**Attribute Patterns:**
- `data-sanity={document._id}` - Root element
- `data-sanity="fieldName"` - Specific field
- `data-sanity="array.0.field"` - Array items
- `data-sanity="object.field"` - Object fields

### Creating New Pages

#### Step 1: Create Schema (if needed)

Create a new schema in `sanity/schemaTypes/`:

```typescript
// sanity/schemaTypes/landing.ts
import { defineField, defineType } from 'sanity'

export const landing = defineType({
  name: 'landing',
  title: 'Landing Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        {
          name: 'headline',
          title: 'Headline',
          type: 'string',
        },
        {
          name: 'subheadline',
          title: 'Subheadline',
          type: 'text',
        },
        {
          name: 'image',
          title: 'Hero Image',
          type: 'image',
        },
      ],
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'richText',
    }),
  ],
})
```

#### Step 2: Add to Schema Index

```typescript
// sanity/schemaTypes/index.ts
import { landing } from './landing'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // ... existing types
    landing,
  ],
}
```

#### Step 3: Create Query Functions

```typescript
// sanity/queries.ts
export const landingQuery = groq`
  *[_type == "landing" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    hero,
    content,
    _updatedAt
  }
`

export async function fetchSanityLanding(slug: string, isDraftMode = false) {
  try {
    const landing = await client.fetch(
      landingQuery,
      { slug },
      isDraftMode
        ? {
            perspective: 'previewDrafts',
            stega: true,
            cache: 'no-store',
          }
        : {
            next: { revalidate: 3600, tags: ['landing', `landing:${slug}`] },
          }
    )
    return { data: landing, error: null }
  } catch (error) {
    console.error('fetchSanityLanding error:', error)
    return { data: null, error }
  }
}
```

#### Step 4: Create Page Component

```tsx
// app/(pages)/landing/[slug]/page.tsx
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchSanityLanding, SanityContextProvider } from '~/integrations/sanity'
import { LandingComponent } from './landing-component'

export default async function LandingPage({ params }) {
  const { slug } = await params
  const isDraftMode = (await draftMode()).isEnabled
  const { data } = await fetchSanityLanding(slug, isDraftMode)

  if (!data) return notFound()

  return (
    <SanityContextProvider document={data}>
      <LandingComponent />
    </SanityContextProvider>
  )
}

// Force dynamic for draft mode
export const dynamic = 'force-dynamic'
```

#### Step 5: Create Component with Visual Editing

```tsx
// app/(pages)/landing/[slug]/landing-component.tsx
'use client'

import { useSanityContext, RichText } from '~/integrations/sanity'
import { SanityImage } from '~/components/sanity-image'

export function LandingComponent() {
  const { document } = useSanityContext()

  return (
    <div data-sanity={document._id}>
      <section data-sanity="hero">
        <h1 data-sanity="hero.headline">{document.hero?.headline}</h1>
        <p data-sanity="hero.subheadline">{document.hero?.subheadline}</p>
        {document.hero?.image && (
          <div data-sanity="hero.image">
            <SanityImage image={document.hero.image} maxWidth={1200} />
          </div>
        )}
      </section>
      
      <section data-sanity="content">
        <RichText content={document.content} />
      </section>
    </div>
  )
}
```

#### Step 6: Update Presentation Tool Configuration

```typescript
// sanity/sanity.config.ts
export default defineConfig({
  plugins: [
    presentationTool({
      resolve: {
        mainDocuments: [
          // ... existing documents
          {
            route: '/landing/:slug',
            filter: `_type == "landing" && slug.current == $slug && defined(slug.current)`,
          },
        ],
        locations: {
          // ... existing locations
          landing: {
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => {
              if (!doc?.slug) return null
              return {
                locations: [
                  {
                    title: doc?.title || 'Untitled Landing',
                    href: `/landing/${doc.slug}`,
                  },
                ],
              }
            },
          },
        },
      },
    }),
  ],
})
```

### Schema Management

#### Basic Field Types

```typescript
// String field
defineField({
  name: 'title',
  title: 'Title',
  type: 'string',
  validation: (Rule) => Rule.required().max(100),
})

// Text field
defineField({
  name: 'description',
  title: 'Description',
  type: 'text',
  rows: 4,
})

// Rich text
defineField({
  name: 'content',
  title: 'Content',
  type: 'richText', // Custom type defined in richText.ts
})

// Image with metadata
defineField({
  name: 'image',
  title: 'Image',
  type: 'image',
  options: {
    hotspot: true,
  },
  fields: [
    {
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
    },
  ],
})

// Array of strings
defineField({
  name: 'tags',
  title: 'Tags',
  type: 'array',
  of: [{ type: 'string' }],
  options: {
    layout: 'tags',
  },
})

// Object field
defineField({
  name: 'hero',
  title: 'Hero Section',
  type: 'object',
  fields: [
    {
      name: 'headline',
      title: 'Headline',
      type: 'string',
    },
    // ... more fields
  ],
})
```

#### Advanced Schema Patterns

**Conditional Fields:**
```typescript
defineField({
  name: 'showCTA',
  title: 'Show Call to Action',
  type: 'boolean',
  initialValue: false,
})

defineField({
  name: 'ctaText',
  title: 'CTA Text',
  type: 'string',
  hidden: ({ parent }) => !parent?.showCTA,
})
```

**Custom Validation:**
```typescript
defineField({
  name: 'email',
  title: 'Email',
  type: 'string',
  validation: (Rule) =>
    Rule.required()
      .email()
      .error('Please enter a valid email address'),
})
```

### Best Practices

#### 1. Performance Optimization

```typescript
// Use ISR for published content
export const revalidate = 3600

// Use proper caching strategies
const cacheOptions = isDraftMode
  ? {
      perspective: 'previewDrafts',
      stega: true,
      cache: 'no-store',
    }
  : {
      next: { revalidate: 3600, tags: ['page', `page:${slug}`] },
    }
```

#### 2. Error Handling

```typescript
export async function fetchSanityPage(slug: string, isDraftMode = false) {
  try {
    const page = await client.fetch(pageQuery, { slug }, options)
    return { data: page, error: null }
  } catch (error) {
    console.error('fetchSanityPage error:', error)
    return { data: null, error }
  }
}
```

#### 3. TypeScript Integration

```typescript
// Define types for your content
interface Page {
  _id: string
  title: string
  slug: { current: string }
  content: PortableTextBlock[]
  publishedAt: string
}

// Use with queries
export async function fetchSanityPage(slug: string): Promise<{
  data: Page | null
  error: Error | null
}> {
  // ... implementation
}
```

#### 4. SEO Optimization

Use the metadata helper for consistent SEO across pages:

```typescript
import { generateSanityMetadata } from '~/libs/metadata'

export async function generateMetadata({ params }) {
  const { data } = await sanityFetch({ query: pageQuery, params })
  
  if (!data) return
  
  return generateSanityMetadata({
    document: data,
    url: `/page/${params.slug}`,
    type: 'article', // or 'website'
  })
}
```

The helper automatically handles:
- Title and description
- OpenGraph and Twitter cards
- Image optimization
- noIndex flag from Sanity
- Canonical URLs
- Published/modified times

---

## For Content Editors

### Getting Started

#### Accessing the Studio

1. **Visit the Studio**: Go to `http://localhost:3000/studio` (or your production URL + `/studio`)
2. **Sign In**: Use your Sanity account credentials
3. **Navigate**: Use the sidebar to browse content types (Pages, Articles, etc.)

#### Studio Interface Overview

- **Sidebar**: Content types and navigation
- **Main Area**: Content editor
- **Top Bar**: Save, publish, and preview options
- **Present Button**: Launch visual editor (top right)

### Using the Visual Editor

#### Starting Visual Editing

1. **Open Studio**: Navigate to `/studio`
2. **Select Content**: Choose a page or article to edit
3. **Click "Present"**: Button in the top-right corner
4. **Wait for Load**: The visual editor will open in a new panel

#### Visual Editor Interface

The visual editor has two panels:

**Left Panel (Studio):**
- Content fields and forms
- Save and publish buttons
- Content history and versions

**Right Panel (Preview):**
- Live preview of your website
- Editable overlays on content
- Real-time updates as you type

#### Making Edits

1. **Direct Editing**: Click on any editable text in the preview panel
2. **Form Editing**: Use the form fields in the left panel
3. **Live Updates**: Changes appear instantly in the preview
4. **Save**: Click "Save" to save as draft
5. **Publish**: Click "Publish" to make live

#### Visual Editing Tips

- **Hover Effects**: Hover over elements to see edit outlines
- **Click to Edit**: Click directly on text to edit inline
- **Use Form Fields**: Complex edits are easier in the left panel
- **Preview Modes**: Toggle between desktop and mobile views
- **Exit Draft Mode**: Use the "Disable draft mode" button when done

### Content Management

#### Creating New Content

**Pages:**
1. Go to "Pages" in the sidebar
2. Click "Create" button
3. Fill in required fields (Title, Slug)
4. Add content using the rich text editor
5. Save as draft or publish immediately

**Articles:**
1. Go to "Articles" in the sidebar
2. Click "Create" button
3. Add title, excerpt, and content
4. Upload a featured image
5. Add categories and tags
6. Save and publish

#### Content Fields Guide

**Title Field:**
- Keep under 60 characters for SEO
- Make it descriptive and unique
- Avoid special characters

**Slug Field:**
- Auto-generated from title
- Edit if needed (lowercase, hyphens only)
- Must be unique per content type

**Rich Text Editor:**
- **Bold/Italic**: Use toolbar buttons or keyboard shortcuts
- **Headers**: Use heading styles (H1-H6)
- **Lists**: Bullet or numbered lists
- **Links**: Select text and click link button
- **Images**: Upload via the image tool

**Image Fields:**
- **Upload**: Drag and drop or click to browse
- **Alt Text**: Always add for accessibility
- **Hotspot**: Click to set focal point
- **Crop**: Adjust cropping if needed

#### SEO & Metadata

**SEO Fields (in Page/Article):**
- **Meta Title**: 50-60 characters optimal
- **Meta Description**: 150-160 characters
- **Keywords**: Add relevant search terms
- **Social Image**: 1200x630px recommended

**Best Practices:**
- Write unique meta titles and descriptions
- Include target keywords naturally
- Use descriptive alt text for images
- Keep URLs short and descriptive

#### Publishing Workflow

**Draft Mode:**
- Save work without publishing
- Preview changes before going live
- Collaborate with team members

**Publishing:**
- Review all content carefully
- Check preview in visual editor
- Publish when ready
- Content appears live immediately

**Scheduling:**
- Set future publish dates
- Content goes live automatically
- Plan content calendar effectively

#### Content Organization

**Categories & Tags:**
- Use categories for broad topics
- Tags for specific keywords
- Be consistent with naming
- Don't over-categorize

**Content Planning:**
- Plan content calendar
- Use drafts for work-in-progress
- Regular content audits
- Update outdated information

---

## Troubleshooting

### Common Issues

#### Visual Editor Not Loading

**Symptoms:**
- Present button doesn't work
- Visual editor shows blank screen
- No edit overlays visible

**Solutions:**
1. **Check Environment Variables:**
   ```bash
   # Verify these are set correctly
   NEXT_PUBLIC_SANITY_PROJECT_ID
   NEXT_PUBLIC_SANITY_DATASET
   NEXT_PUBLIC_SANITY_STUDIO_URL
   SANITY_API_WRITE_TOKEN
   ```

2. **Verify Draft Mode Configuration:**
   ```typescript
   // Check app/api/draft/route.ts exists
   // Check app/api/disable-draft/route.ts exists
   ```

3. **Check Console for Errors:**
   - Open browser developer tools
   - Look for JavaScript errors
   - Check network tab for failed requests

#### Content Not Updating

**Symptoms:**
- Changes don't appear in preview
- Published content shows old version
- Draft mode shows stale content

**Solutions:**
1. **Clear Cache:**
   ```bash
   # Hard refresh browser
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Check Revalidation:**
   ```typescript
   // Verify revalidation webhook is configured
   // Check app/api/revalidate/route.ts
   ```

3. **Verify Fetch Configuration:**
   ```typescript
   // Ensure proper cache settings
   isDraftMode
     ? {
         perspective: 'previewDrafts',
         stega: true,
         cache: 'no-store',
       }
     : {
         next: { revalidate: 3600, tags: ['page'] },
       }
   ```

#### Schema Validation Errors

**Symptoms:**
- Content won't save
- Validation error messages
- Required fields not working

**Solutions:**
1. **Check Field Validation:**
   ```typescript
   validation: (Rule) => Rule.required().max(100)
   ```

2. **Verify Data Types:**
   - Ensure field types match content
   - Check array and object structures
   - Validate image and file uploads

3. **Review Schema Definition:**
   - Check for typos in field names
   - Verify required fields are present
   - Ensure proper schema export

#### Performance Issues

**Symptoms:**
- Slow loading times
- Visual editor laggy
- High memory usage

**Solutions:**
1. **Optimize Images:**
   - Use appropriate image sizes
   - Enable CDN (useCdn: true)
   - Add proper alt text

2. **Review Queries:**
   - Don't over-fetch data
   - Use proper projections
   - Implement pagination for large datasets

3. **Check Bundle Size:**
   ```bash
   bun analyze
   ```

#### Development Environment Issues

**Symptoms:**
- Hot reload not working
- Changes require server restart
- CORS errors in development

**Solutions:**
1. **Check Development Server:**
   ```bash
   # Restart development server
   bun dev
   ```

2. **Verify CORS Settings:**
   ```javascript
   // Check sanity/sanity.config.ts
   // Verify CORS settings in Sanity dashboard
   ```

3. **Clear Node Modules:**
   ```bash
   rm -rf node_modules bun.lockb
   bun install
   ```

### Getting Help

#### Debug Information

When reporting issues, include:

1. **Environment Details:**
   - Node.js version
   - Bun version
   - Operating system
   - Browser and version

2. **Error Messages:**
   - Complete error logs
   - Console errors
   - Network request failures

3. **Configuration:**
   - Sanity schema definitions
   - Component code
   - Environment variables (redacted)

#### Support Resources

- **Sanity Documentation**: https://www.sanity.io/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Project Repository**: Check README and issues
- **Community**: Stack Overflow, Discord, forums

---

## Advanced Topics

### Custom Components

#### Creating Custom Input Components

```typescript
// sanity/components/CustomInput.tsx
import { set, unset } from 'sanity'

export function CustomInput(props) {
  const { elementProps, onChange, value = '' } = props

  return (
    <input
      {...elementProps}
      value={value}
      onChange={(event) =>
        onChange(event.target.value ? set(event.target.value) : unset())
      }
    />
  )
}
```

#### Custom Preview Components

```typescript
// Custom preview in schema
preview: {
  select: {
    title: 'title',
    subtitle: 'slug.current',
    media: 'image',
  },
  prepare({ title, subtitle, media }) {
    return {
      title,
      subtitle: subtitle ? `/${subtitle}` : 'No slug',
      media,
    }
  },
},
```

### Advanced Queries

#### Complex GROQ Queries

```typescript
// Advanced query with joins and filtering
const complexQuery = groq`
  *[_type == "page" && defined(slug.current)] {
    _id,
    title,
    slug,
    content,
    "relatedArticles": *[_type == "article" && references(^._id)] {
      _id,
      title,
      slug,
      excerpt
    }
  }
`
```

#### Filtering and Sorting

```typescript
// Query with filters and sorting
const filteredQuery = groq`
  *[_type == "article" && defined(slug.current) && publishedAt < now()] 
  | order(publishedAt desc) 
  | [0...10] {
    _id,
    title,
    slug,
    publishedAt,
    excerpt
  }
`
```

### Performance Optimization

#### Image Optimization

```typescript
// Optimized image component
export function OptimizedSanityImage({ image, sizes = "100vw" }) {
  if (!image?.asset) return null

  const { width, height } = getImageDimensions(image.asset)
  
  return (
    <img
      src={urlForImage(image).width(800).format('webp').url()}
      srcSet={`
        ${urlForImage(image).width(400).format('webp').url()} 400w,
        ${urlForImage(image).width(800).format('webp').url()} 800w,
        ${urlForImage(image).width(1200).format('webp').url()} 1200w
      `}
      sizes={sizes}
      alt={image.alt || ''}
      loading="lazy"
    />
  )
}
```

#### Caching Strategies

```typescript
// Advanced caching with tags
export async function fetchWithCache(query, params, tags = []) {
  const isDraftMode = draftMode().isEnabled
  
  if (isDraftMode) {
    return client.fetch(query, params, {
      perspective: 'previewDrafts',
      stega: true,
      cache: 'no-store',
    })
  }
  
  return client.fetch(query, params, {
    next: { 
      revalidate: 3600, 
      tags: ['sanity', ...tags] 
    },
  })
}
```

---

This documentation provides a comprehensive guide for both developers and content editors. For specific implementation details, refer to the existing code examples in the project. 