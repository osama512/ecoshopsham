/**
 * Generate a URL-safe slug from product name + id.
 * Format: {short-id}-{transliterated-name}
 * e.g. "a1b2c3-aleppo-soap" or "a1b2c3-صابون-حلبي"
 */
export function productSlug(id: string, name: string): string {
  const shortId = id.replace(/-/g, "").slice(0, 8);
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // keep letters, numbers, spaces, hyphens
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${shortId}-${slug || "product"}`;
}

/**
 * Extract the short ID (first 8 hex chars) from a product slug.
 */
export function extractIdFromSlug(slug: string): string {
  return slug.split("-")[0] || slug;
}
