import type { CSSProperties } from "react";

export type StoreHeroMode = "none" | "images" | "products" | "both";

export type StoreTheme = {
  primary: string;
  accent: string;
  font: string;
  logo_url: string | null;
  banners: string[];
  tagline: string | null;
  /** What appears as storefront hero: product slider, image banners, or both */
  hero_mode: StoreHeroMode;
  /** How many products feed the hero slider */
  product_slider_count: number;
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
};

export const STORE_FONTS = [
  { id: "Cairo", label: "Cairo", google: "Cairo:wght@400;600;700;800" },
  { id: "Tajawal", label: "Tajawal", google: "Tajawal:wght@400;500;700;800" },
  { id: "Almarai", label: "Almarai", google: "Almarai:wght@400;700;800" },
  { id: "Noto Kufi Arabic", label: "Noto Kufi Arabic", google: "Noto+Kufi+Arabic:wght@400;600;700" },
  { id: "Inter", label: "Inter", google: "Inter:wght@400;500;600;700" },
] as const;

export const MAX_STORE_BANNERS = 5;
export const MIN_PRODUCT_SLIDER = 2;
export const MAX_PRODUCT_SLIDER = 20;

const HERO_MODES: StoreHeroMode[] = ["none", "images", "products", "both"];

export function parseStoreTheme(raw: unknown): StoreTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STORE_THEME };
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
    // Older themes that only had image banners
    hero_mode = "images";
  }

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
  };
}

/** Convert #RRGGBB to "H S% L%" for CSS vars used as hsl(var(--x)) */
export function hexToHslChannels(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "0 0% 0%";
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
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

export function themeToCssVars(theme: StoreTheme): CSSProperties {
  const primary = hexToHslChannels(theme.primary);
  const accent = hexToHslChannels(theme.accent);
  const stack = `"${theme.font}", Cairo, Inter, sans-serif`;
  return {
    ["--primary" as string]: primary,
    ["--primary-foreground" as string]: contrastForeground(theme.primary),
    ["--secondary" as string]: accent,
    ["--secondary-foreground" as string]: contrastForeground(theme.accent),
    ["--accent" as string]: accent,
    ["--accent-foreground" as string]: contrastForeground(theme.accent),
    ["--ring" as string]: primary,
    ["--font-sans" as string]: stack,
    ["--font-display" as string]: stack,
    fontFamily: stack,
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
