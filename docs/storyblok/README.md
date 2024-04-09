# Storyblok

## Installation

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

Once that `mkcert` is installed, use the following command for development:

```bash
npm run dev:storyblok
```

## Usage

First, you need to setup .env file with your Storyblok Access Tokens. You can get them from your Storyblok dashboard, add them to your `.env` file:

```
STORYBLOK_PUBLIC_ACCESS_TOKEN="your-public-access-token"
STORYBLOK_PREVIEW_ACCESS_TOKEN="your-preview-access-token"
```

Then you can use the following code to fetch data from Storyblok into your page:

```jsx
export default async function Home() {
  const isDraftMode =
    draftMode().isEnabled || process.env.NODE_ENV === 'development'

  const { data } = await new StoryblokApi({
    draft: isDraftMode,
  })
    .get('cdn/stories/home', {
      resolve_relations: [],
    })
    .catch(() => {
      notFound()
    })

  const content = data?.story?.content

  return /* ... */
}
```

See the [Storyblok Content Delivery API](https://www.storyblok.com/docs/api/content-delivery/v2/getting-started/introduction) for more information.

## Draft Mode

To enable draft mode you need a secret key, you can generate one by running this code in your browser console:

```js
Math.random().toString(36).substr(2)
```

Then add this token to your `.env` file:

`DRAFT_MODE_TOKEN="your-draft-mode-token"`

Use the following url as your Visual Editor default location in Storyblok settings:

`https://your-website.url/api/draft?secret=DRAFT_MODE_TOKEN&slug=/`

Now you can use the Visual Editor to edit your website.

See the [Next.js Draft Mode documentation](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode) for more information.

## Revalidation

Production website caches the Storyblok data until the next deployment. To be able to update production data without deploying, you have to setup a revalidation mechanism. For that you need to create a Storyblok webhook that will trigger a revalidation on any Story published, unpublished, deleted or moved. Here is the endpoint URL:

`https://your-website.url/api/revalidate`

See the [Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) documentation for more information.
