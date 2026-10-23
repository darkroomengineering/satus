import type { JsonLdSchema } from './schemas'

/**
 * Renders a single JSON-LD `<script>` tag. Not microdata: its attributes live
 * on visible DOM nodes and get lost or duplicated across client re-renders,
 * while a standalone script is inert to hydration and what Google and answer
 * engines parse most reliably.
 */
export function JsonLd({ data }: { data: JsonLdSchema }) {
  // Escape `<` so a CMS-sourced string containing "</script>" can't close the
  // tag early and turn the rest of the JSON into executable HTML (Next.js
  // applies the same escape to streamed scripts).
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      // oxlint-disable-next-line react/no-danger -- JSON-LD has no safe non-dangerouslySetInnerHTML API; the `<` escape above is the XSS mitigation
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
