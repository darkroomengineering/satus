import { useEffect } from "react";

/**
 * Preserves CSS Module stylesheets that React Router's <Links> removes on navigation.
 * CSS Modules are scoped, cached, and harmless to keep — re-adds any removed stylesheet.
 * See: https://github.com/remix-run/react-router/issues/14413
 */
export function useStylesheetFix() {
  useEffect(() => {
    const preserved = new Set<string>();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (
            node instanceof HTMLLinkElement &&
            node.rel === "stylesheet" &&
            node.href &&
            !preserved.has(node.href)
          ) {
            preserved.add(node.href);
            const clone = node.cloneNode(true) as HTMLLinkElement;
            document.head.appendChild(clone);
          }
        }
      }
    });

    observer.observe(document.head, { childList: true });

    return () => {
      observer.disconnect();
    };
  }, []);
}
