import type { CSSProperties } from "react";

export type StoreHeroMode = "none" | "images" | "products" | "both";

export type StoreSocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "telegram"
  | "x"
  | "whatsapp"
  | "other";

export type StoreSocialLink = {
  id: string;
  platform: StoreSocialPlatform;
  url: string;
  label: string;
};

export type StoreFooterPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

export type StoreFooter = {
  about: string | null;
  socials: StoreSocialLink[];
  pages: StoreFooterPage[];
};

export type StoreTheme = {
  primary: string;
  accent: string;
  font: string;
  logo_url: string | null;
  banners: string[];
  tagline: string | null;
  /** What appears as storefront hero: product slider, image banners, or both */
  hero_mode: StoreHeroMode;
  /** Fallback count when no products are explicitly selected */
  product_slider_count: number;
  /** Explicit product IDs for the hero slider (order preserved). Empty = latest products. */
  product_slider_ids: string[];
  footer: StoreFooter;
};

export const DEFAULT_STORE_FOOTER: StoreFooter = {
  about: null,
  socials: [],
  pages: [],
};

export const DEFAULT_STORE_THEME: StoreTheme = {
  primary: "#163a59",
  accent: "#f5a623",
  font: "Cairo",
  logo_url: null,
  banners: [],
  tagline: null,
  hero_mode: "products",
  product_slider_count: 8,
  product_slider_ids: [],
  footer: { ...DEFAULT_STORE_FOOTER },
};

export const STORE_FONTS = [
  { id: "Cairo", label: "Cairo", google: "Cairo:wght@400;600;700;800" },
  { id: "Tajawal", label: "Tajawal", google: "Tajawal:wght@400;500;700;800" },
  { id: "Almarai", label: "Almarai", google: "Almarai:wght@400;700;800" },
  { id: "Noto Kufi Arabic", label: "Noto Kufi Arabic", google: "Noto+Kufi+Arabic:wght@400;600;700" },
  { id: "Inter", label: "Inter", google: "Inter:wght@400;500;600;700" },
] as const;

export const STORE_SOCIAL_PLATFORMS: { id: StoreSocialPlatform; label: string }[] = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "telegram", label: "Telegram" },
  { id: "x", label: "X (Twitter)" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "other", label: "رابط آخر" },
];

export const MAX_STORE_BANNERS = 5;
export const MIN_PRODUCT_SLIDER = 2;
export const MAX_PRODUCT_SLIDER = 20;
export const MAX_FOOTER_SOCIALS = 8;
export const MAX_FOOTER_PAGES = 10;

const HERO_MODES: StoreHeroMode[] = ["none", "images", "products", "both"];
const SOCIAL_IDS = new Set(STORE_SOCIAL_PLATFORMS.map((p) => p.id));

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeFooterPageSlug(title: string, existing: string[]): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `page-${Date.now().toString(36)}`;
  let slug = base.slice(0, 48);
  let n = 2;
  while (existing.includes(slug)) {
    slug = `${base.slice(0, 40)}-${n}`;
    n += 1;
  }
  return slug;
}

export function createFooterPage(title: string, content = "", existingSlugs: string[] = []): StoreFooterPage {
  return {
    id: newId(),
    slug: makeFooterPageSlug(title, existingSlugs),
    title: title.trim() || "صفحة جديدة",
    content,
  };
}

export function createSocialLink(
  platform: StoreSocialPlatform = "instagram",
  url = "",
): StoreSocialLink {
  return {
    id: newId(),
    platform,
    url,
    label: STORE_SOCIAL_PLATFORMS.find((p) => p.id === platform)?.label || platform,
  };
}

export function parseStoreFooter(raw: unknown): StoreFooter {
  if (!raw || typeof raw !== "object") return { about: null, socials: [], pages: [] };
  const f = raw as Record<string, unknown>;
  const socials: StoreSocialLink[] = Array.isArray(f.socials)
    ? f.socials
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => {
          const platform = (
            typeof s.platform === "string" && SOCIAL_IDS.has(s.platform as StoreSocialPlatform)
              ? s.platform
              : "other"
          ) as StoreSocialPlatform;
          return {
            id: typeof s.id === "string" && s.id ? s.id : newId(),
            platform,
            url: typeof s.url === "string" ? s.url.trim() : "",
            label:
              typeof s.label === "string" && s.label.trim()
                ? s.label.trim()
                : STORE_SOCIAL_PLATFORMS.find((p) => p.id === platform)?.label || "رابط",
          };
        })
        .filter((s) => !!s.url)
        .slice(0, MAX_FOOTER_SOCIALS)
    : [];

  const pages: StoreFooterPage[] = Array.isArray(f.pages)
    ? f.pages
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => {
          const title = typeof p.title === "string" && p.title.trim() ? p.title.trim() : "صفحة";
          const slug =
            typeof p.slug === "string" && p.slug.trim()
              ? p.slug.trim()
              : makeFooterPageSlug(title, []);
          return {
            id: typeof p.id === "string" && p.id ? p.id : newId(),
            slug,
            title,
            content: typeof p.content === "string" ? p.content : "",
          };
        })
        .slice(0, MAX_FOOTER_PAGES)
    : [];

  return {
    about: typeof f.about === "string" && f.about.trim() ? f.about.trim() : null,
    socials,
    pages,
  };
}

export function hasStoreFooterContent(footer: StoreFooter): boolean {
  return !!(footer.about || footer.socials.length > 0 || footer.pages.length > 0);
}

export function parseStoreTheme(raw: unknown): StoreTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STORE_THEME, footer: { ...DEFAULT_STORE_FOOTER } };
  const t = raw as Record<string, unknown>;

  let product_slider_count = DEFAULT_STORE_THEME.product_slider_count;
  if (typeof t.product_slider_count === "number" && Number.isFinite(t.product_slider_count)) {
    product_slider_count = Math.min(
      MAX_PRODUCT_SLIDER,
      Math.max(MIN_PRODUCT_SLIDER, Math.round(t.product_slider_count)),
    );
  }

  let hero_mode: StoreHeroMode = DEFAULT_STORE_THEME.hero_mode;
  if (typeof t.hero_mode === "string" && HERO_MODES.includes(t.hero_mode as StoreHeroMode)) {
    hero_mode = t.hero_mode as StoreHeroMode;
  } else if (Array.isArray(t.banners) && t.banners.length > 0) {
    hero_mode = "images";
  }

  const product_slider_ids = Array.isArray(t.product_slider_ids)
    ? [
        ...new Set(
          t.product_slider_ids.filter((id): id is string => typeof id === "string" && !!id),
        ),
      ].slice(0, MAX_PRODUCT_SLIDER)
    : [];

  return {
    primary: typeof t.primary === "string" && /^#[0-9a-fA-F]{6}$/.test(t.primary)
      ? t.primary
      : DEFAULT_STORE_THEME.primary,
    accent: typeof t.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(t.accent)
      ? t.accent
      : DEFAULT_STORE_THEME.accent,
    font: typeof t.font === "string" && STORE_FONTS.some((f) => f.id === t.font)
      ? t.font
      : DEFAULT_STORE_THEME.font,
    logo_url: typeof t.logo_url === "string" && t.logo_url ? t.logo_url : null,
    banners: Array.isArray(t.banners)
      ? t.banners.filter((u): u is string => typeof u === "string" && !!u).slice(0, MAX_STORE_BANNERS)
      : [],
    tagline: typeof t.tagline === "string" && t.tagline.trim() ? t.tagline.trim() : null,
    hero_mode,
    product_slider_count,
    product_slider_ids,
    footer: parseStoreFooter(t.footer),
  };
}

/** Resolve which products appear in the storefront hero slider. */
export function pickSliderProducts<T extends { id: string }>(
  products: T[],
  theme: Pick<StoreTheme, "product_slider_ids" | "product_slider_count">,
): T[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  if (theme.product_slider_ids.length > 0) {
    return theme.product_slider_ids
      .map((id) => byId.get(id))
      .filter((p): p is T => !!p)
      .slice(0, MAX_PRODUCT_SLIDER);
  }
  return products.slice(0, theme.product_slider_count);
}

/** Convert #RRGGBB to "H S% L%" for CSS vars used as hsl(var(--x)) */
export function hexToHslChannels(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return { h: 0, s: 0, l: 0 };
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function channels(h: number, s: number, l: number): string {
  return `${h} ${Math.max(0, Math.min(100, Math.round(s)))}% ${Math.max(0, Math.min(100, Math.round(l)))}%`;
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLin(parseInt(raw.slice(0, 2), 16));
  const g = toLin(parseInt(raw.slice(2, 4), 16));
  const b = toLin(parseInt(raw.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastForeground(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.45 ? "220 25% 12%" : "40 33% 98%";
}

/** Full storefront palette derived from merchant primary + accent. */
export function themeToCssVars(theme: StoreTheme): CSSProperties {
  const p = hexToHsl(theme.primary);
  const a = hexToHsl(theme.accent);
  const primary = channels(p.h, p.s, p.l);
  const accent = channels(a.h, a.s, a.l);
  const stack = `"${theme.font}", Cairo, Inter, sans-serif`;

  // Soft page wash from primary hue; keep cards near-white for readability
  const background = channels(p.h, Math.min(28, Math.max(8, p.s * 0.35)), 97);
  const foreground = channels(p.h, Math.min(40, p.s), Math.min(18, Math.max(10, p.l > 50 ? 14 : p.l)));
  const muted = channels(p.h, Math.min(22, Math.max(6, p.s * 0.3)), 93);
  const mutedFg = channels(p.h, Math.min(18, p.s * 0.25), 42);
  const border = channels(p.h, Math.min(20, Math.max(6, p.s * 0.25)), 88);
  const card = channels(p.h, Math.min(16, p.s * 0.15), 99);

  return {
    ["--background" as string]: background,
    ["--foreground" as string]: foreground,
    ["--card" as string]: card,
    ["--card-foreground" as string]: foreground,
    ["--popover" as string]: card,
    ["--popover-foreground" as string]: foreground,
    ["--primary" as string]: primary,
    ["--primary-foreground" as string]: contrastForeground(theme.primary),
    ["--secondary" as string]: accent,
    ["--secondary-foreground" as string]: contrastForeground(theme.accent),
    ["--muted" as string]: muted,
    ["--muted-foreground" as string]: mutedFg,
    ["--accent" as string]: accent,
    ["--accent-foreground" as string]: contrastForeground(theme.accent),
    ["--border" as string]: border,
    ["--input" as string]: border,
    ["--ring" as string]: primary,
    ["--font-sans" as string]: stack,
    ["--font-display" as string]: stack,
    fontFamily: stack,
    backgroundColor: `hsl(${background})`,
    color: `hsl(${foreground})`,
  };
}

const loadedFonts = new Set<string>();

export function ensureStoreFont(fontId: string) {
  if (loadedFonts.has(fontId) || typeof document === "undefined") return;
  const entry = STORE_FONTS.find((f) => f.id === fontId);
  if (!entry || fontId === "Cairo" || fontId === "Inter") {
    loadedFonts.add(fontId);
    return;
  }
  const href = `https://fonts.googleapis.com/css2?family=${entry.google}&display=swap`;
  if (document.querySelector(`link[href="${href}"]`)) {
    loadedFonts.add(fontId);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  loadedFonts.add(fontId);
}
