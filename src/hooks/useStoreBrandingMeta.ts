import { useEffect } from "react";

const DEFAULT_TITLE = "ecoshopsham";
const DEFAULT_FAVICON = "/favicon.png?v=2";

function setFaviconHref(href: string) {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
    return;
  }
  links.forEach((link) => {
    link.href = href;
  });
}

/**
 * Sets browser tab title + favicon for a public storefront page.
 * Restores platform defaults on unmount.
 */
export function useStoreBrandingMeta(storeName: string | null | undefined, logoUrl?: string | null) {
  useEffect(() => {
    const title = storeName?.trim() || DEFAULT_TITLE;
    const previousTitle = document.title;
    document.title = title;

    const favicon = logoUrl?.trim() || DEFAULT_FAVICON;
    setFaviconHref(favicon);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const prevOg = ogTitle?.getAttribute("content") ?? null;
    ogTitle?.setAttribute("content", title);

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      setFaviconHref(DEFAULT_FAVICON);
      if (ogTitle && prevOg != null) ogTitle.setAttribute("content", prevOg);
    };
  }, [storeName, logoUrl]);
}
