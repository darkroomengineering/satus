# Storyblok Integration

## Setup

### SSL Certificate
For local development with Storyblok's Visual Editor, you need an SSL certificate:

```bash
# MacOS
brew install mkcert

# Windows
choco install mkcert
```

```bash
mkcert -install
mkcert localhost
```

### Environment Variables
Add your Storyblok Access Tokens to the `.env` file:

```
STORYBLOK_PUBLIC_ACCESS_TOKEN="your-public-access-token"
STORYBLOK_PREVIEW_ACCESS_TOKEN="your-preview-access-token"
```

### Development Server
Once everything is set up, start the development server:

```bash
bun dev:https
```

## Content Management

### Fetching Content
Use the following pattern to fetch and display Storyblok content in your pages:

```jsx
import { fetchStoryblokStory } from '~/libs/storyblok'
import { StoryblokContextProvider } from '~/libs/storyblok/context'

const SLUG = 'cdn/stories/home'

export default async function Page() {
  const { data } = await fetchStoryblokStory(SLUG)

  if (!data) return notFound()

  return (
    <StoryblokContextProvider {...data}>
      {/* Your components here */}
    </StoryblokContextProvider>
  )
}
```

### Client Components
For client-side components, access content using the `useStoryblokContext` hook:

```jsx
'use client'

import { storyblokEditable } from '@storyblok/js'
import { useStoryblokContext } from '~/libs/storyblok/context'

export function Component() {
  const {
    story: { content },
  } = useStoryblokContext()

  return (
    <div {...storyblokEditable(content)}>
      <h1>{content?.title}</h1>
    </div>
  )
}
```

### Rich Text Rendering
For Rich Text fields, use the built-in renderer:

```jsx
import { renderRichText } from '~/libs/storyblok/renderer'

export function Component() {
  const {
    story: { content },
  } = useStoryblokContext()

  return renderRichText(content.rich_text)
}
```

Customize the rendering with resolvers:

```jsx
renderRichText(content.rich_text, {
  markResolvers: {...},
  nodeResolvers: {...},
  blokResolvers: {...}
})
```

### Metadata Generation
Generate page metadata from Storyblok content:

```jsx
export async function generateMetadata() {
  const { data } = await fetchStoryblokStory(SLUG)
  const metadata = data?.story?.content?.metadata?.[0]

  if (!metadata) return

  return {
    title: metadata?.title,
    description: metadata?.description,
    images: metadata?.image?.filename,
    keywords: metadata?.keywords?.value,
    openGraph: {
      title: metadata?.title,
      description: metadata?.description,
      images: metadata?.image?.filename,
      url: process.env.NEXT_PUBLIC_BASE_URL,
    },
    twitter: {
      title: metadata?.title,
      description: metadata?.description,
      images: metadata?.image?.filename,
    },
  }
}
```

## Visual Editor

### Draft Mode Setup
1. Generate a secret token:
```js
Math.random().toString(36).substr(2)
```

2. Add to `.env`:
```
DRAFT_MODE_TOKEN="your-draft-mode-token"
```

3. Configure Visual Editor URL in Storyblok settings:
```
https://your-website.url/api/draft?secret=DRAFT_MODE_TOKEN&slug=/
```

The Visual Editor will automatically be enabled when accessing your site through Storyblok's interface.

## Production

### Content Revalidation
To update content without redeployment, set up a Storyblok webhook with this endpoint:

```
https://your-website.url/api/revalidate
```

This webhook should trigger on content being published, unpublished, deleted, or moved.

## References
- [Storyblok Content Delivery API](https://www.storyblok.com/docs/api/content-delivery/v2/getting-started/introduction)
- [Next.js Draft Mode](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode)
- [Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
