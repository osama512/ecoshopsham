/** Platform hosts that serve the main app (dashboard, marketing). Not merchant domains. */
const DEFAULT_PLATFORM_HOSTS = [
  "localhost",
  "127.0.0.1",
  "ecoshopsham.shop",
  "www.ecoshopsham.shop",
];

function envPlatformHosts(): string[] {
  const fromList = import.meta.env.VITE_PLATFORM_HOSTS as string | undefined;
  const hosts: string[] = [];
  if (fromList?.trim()) {
    hosts.push(
      ...fromList
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  const siteUrl = import.meta.env.VITE_SITE_URL as string | undefined;
  if (siteUrl?.trim()) {
    try {
      hosts.push(new URL(siteUrl).hostname.toLowerCase());
    } catch {
      /* ignore invalid URL */
    }
  }
  return hosts;
}

/** True when this host serves the main platform (dashboard), not a merchant store domain. */
export function isPlatformHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (DEFAULT_PLATFORM_HOSTS.includes(host)) return true;
  if (envPlatformHosts().includes(host)) return true;
  // Preview / default deploy hosts
  if (host.endsWith(".vercel.app")) return true;
  if (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return true;
  return false;
}

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function isValidCustomDomain(domain: string): boolean {
  const d = normalizeDomain(domain);
  if (!d || d.length > 253) return false;
  if (isPlatformHost(d)) return false;
  return DOMAIN_RE.test(d);
}

export function isApexDomain(domain: string): boolean {
  const parts = normalizeDomain(domain).split(".");
  return parts.length === 2;
}

/**
 * Merchant custom domain host (e.g. shop.example.com).
 * Set VITE_PLATFORM_HOSTS=www.yoursite.com,yoursite.com (or VITE_SITE_URL)
 * so your main domain is never treated as a store domain.
 */
export function isCustomDomainHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || isPlatformHost(host)) return false;
  return DOMAIN_RE.test(host);
}

export type DomainStatus = "pending" | "verifying" | "active" | "error" | null;

export function storefrontPathForMerchant(opts: {
  storeSlug?: string | null;
  merchantId: string;
  customDomain?: string | null;
  domainStatus?: string | null;
}): string {
  if (opts.customDomain && opts.domainStatus === "active" && isCustomDomainHost()) {
    return "/";
  }
  const slug = opts.storeSlug?.trim();
  if (slug) return `/s/${slug}`;
  return `/s/${opts.merchantId}`;
}
