import type { JsonLdSchema } from './schemas'

/**
 * Renders a single JSON-LD `<script>` tag.
 *
 * JSON-LD, not microdata: microdata attributes live on the visible DOM nodes
 * and get lost or duplicated across client-side re-renders (React re-mounts,
 * route transitions). A standalone `<script type="application/ld+json">` is
 * inert to hydration and is what Google and answer engines parse most
 * reliably, so structured data goes here instead of inline `itemProp`s.
 */
export function JsonLd({ data }: { data: JsonLdSchema }) {
  // `<` is escaped to `<` before injection: without it, a CMS-sourced
  // string value containing "</script>" would close the script tag early and
  // turn the remainder of the JSON into executable HTML. This is the same
  // escape Next.js itself applies internally for streamed script content.
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      // oxlint-disable-next-line react/no-danger -- JSON-LD has no safe non-dangerouslySetInnerHTML API; the `<` escape above is the XSS mitigation
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
