import { useEffect } from 'react'

// Temporary fix to avoid flash of unstyled content (FOUC) during route transitions.
// Keep an eye on this issue and remove this code when resolved: https://github.com/vercel/next.js/issues/17464
export function useFoucFix() {
  useEffect(() => {
    // Gather all server-side rendered stylesheet entries.
    let stylesheets = Array.from(
      document.querySelectorAll('link[rel="stylesheet"][data-n-p]'),
    ).map((element) => ({
      element,
      href: element.getAttribute('href'),
    }))

    // Remove the `data-n-p` attribute to prevent Next.js from removing it early.
    stylesheets.forEach(({ element }) => element.removeAttribute('data-n-p'))

    const hrefs = []

    const mutationHandler = (mutations) => {
      // Gather all <style data-n-href="/..."> elements.
      const entries = mutations
        .filter(
          ({ target }) =>
            target.nodeName === 'STYLE' && target.hasAttribute('data-n-href'),
        )
        .map(({ target }) => ({
          element: target,
          href: target.getAttribute('data-n-href'),
        }))

      // Cycle through them and either:
      // - Remove the `data-n-href` attribute to prevent Next.js from removing it early.
      // - Remove the element if it's already present.
      entries.forEach(({ element, href }) => {
        const exists = hrefs.includes(href)

        if (exists) {
          element.remove()
        } else {
          element.setAttribute('data-fouc-fix-n-href', href)
          element.removeAttribute('data-n-href')
          hrefs.push(href)
        }
      })

      // Cycle through the server-side rendered stylesheets and remove the ones that
      // are already present as inline <style> tags added by Next.js, so that we don't have duplicate styles.
      stylesheets = stylesheets.reduce((entries, entry) => {
        const { element, href } = entry
        const exists = hrefs.includes(href)

        if (exists) {
          element.remove()
        } else {
          entries.push(entry)
        }

        return entries
      }, [])
    }

    const observer = new MutationObserver(mutationHandler)

    observer.observe(document.head, {
      subtree: true,
      attributeFilter: ['media'],
    })

    return () => observer.disconnect()
  }, [])
}
