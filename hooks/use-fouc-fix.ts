import { useEffect } from 'react'

// Temporary fix to avoid flash of unstyled content (FOUC) during route transitions.
// Keep an eye on this issue and remove this code when resolved: https://github.com/vercel/next.js/issues/17464
export function useFoucFix() {
  useEffect(() => {
    // Gather all server-side rendered stylesheet entries.
    let stylesheets = Array.from(
      document.querySelectorAll('link[rel="stylesheet"][data-n-p]')
    ).map((element) => ({
      element,
      href: element.getAttribute('href'),
    }))

    // Remove the `data-n-p` attribute to prevent Next.js from removing it early.
    for (const { element } of stylesheets) {
      element.removeAttribute('data-n-p')
    }

    const hrefs: string[] = []

    const mutationHandler = (mutations: MutationRecord[]) => {
      // Gather all <style data-n-href="/..."> elements.
      const entries = mutations
        .filter(
          ({ target }) =>
            target.nodeName === 'STYLE' &&
            (target as Element).hasAttribute('data-n-href')
        )
        .map(({ target }) => ({
          element: target,
          href: (target as Element).getAttribute('data-n-href'),
        }))

      // Cycle through them and either:
      // - Remove the `data-n-href` attribute to prevent Next.js from removing it early.
      // - Remove the element if it's already present.
      for (const { element, href } of entries) {
        if (href === null) continue

        const exists = hrefs.includes(href)

        if (exists) {
          element.parentNode?.removeChild(element)
        } else {
          if (element instanceof Element) {
            element.setAttribute('data-fouc-fix-n-href', href)
            element.removeAttribute('data-n-href')
          }
          hrefs.push(href)
        }
      }

      // Cycle through the server-side rendered stylesheets and remove the ones that
      // are already present as inline <style> tags added by Next.js, so that we don't have duplicate styles.
      stylesheets = stylesheets.reduce(
        (entries, entry) => {
          const { element, href } = entry
          if (href === null) return entries

          const exists = hrefs.includes(href)

          if (exists) {
            element.remove()
          } else {
            entries.push(entry as { element: Element; href: string | null })
          }

          return entries
        },
        [] as { element: Element; href: string | null }[]
      )
    }

    const observer = new MutationObserver(mutationHandler)

    observer.observe(document.head, {
      subtree: true,
      attributeFilter: ['media'],
    })

    return () => observer.disconnect()
  }, [])
}
