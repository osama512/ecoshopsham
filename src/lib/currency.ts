export type CurrencyCode = "SYP" | "USD" | "EUR" | "TRY";

export type CurrencyDisplayMode = "base" | "convert" | "dual";

export type StoreCurrency = {
  /** Currency of stored product prices */
  base: CurrencyCode;
  display_mode: CurrencyDisplayMode;
  /** Second currency for convert / dual modes */
  secondary: CurrencyCode;
  /**
   * Fixed merchant rate: how many base units = 1 secondary unit.
   * Example: base SYP, secondary USD, rate 15000 → 1 USD = 15000 ل.س
   */
  rate: number;
};

export const DEFAULT_STORE_CURRENCY: StoreCurrency = {
  base: "SYP",
  display_mode: "base",
  secondary: "USD",
  rate: 15000,
};

export const CURRENCY_OPTIONS: {
  code: CurrencyCode;
  label: string;
  symbol: string;
}[] = [
  { code: "SYP", label: "ليرة سورية", symbol: "ل.س" },
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "EUR", label: "يورو", symbol: "€" },
  { code: "TRY", label: "ليرة تركية", symbol: "₺" },
];

export function currencyMeta(code: CurrencyCode) {
  return CURRENCY_OPTIONS.find((c) => c.code === code) || CURRENCY_OPTIONS[0];
}

export function parseStoreCurrency(raw: unknown): StoreCurrency {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STORE_CURRENCY };
  const c = raw as Record<string, unknown>;
  const codes = new Set(CURRENCY_OPTIONS.map((x) => x.code));
  const base = typeof c.base === "string" && codes.has(c.base as CurrencyCode)
    ? (c.base as CurrencyCode)
    : DEFAULT_STORE_CURRENCY.base;
  const secondary =
    typeof c.secondary === "string" && codes.has(c.secondary as CurrencyCode)
      ? (c.secondary as CurrencyCode)
      : DEFAULT_STORE_CURRENCY.secondary;
  const modes: CurrencyDisplayMode[] = ["base", "convert", "dual"];
  const display_mode =
    typeof c.display_mode === "string" && modes.includes(c.display_mode as CurrencyDisplayMode)
      ? (c.display_mode as CurrencyDisplayMode)
      : DEFAULT_STORE_CURRENCY.display_mode;
  let rate = DEFAULT_STORE_CURRENCY.rate;
  if (typeof c.rate === "number" && Number.isFinite(c.rate) && c.rate > 0) {
    rate = c.rate;
  }
  return { base, secondary, display_mode, rate };
}

/** Convert base amount → secondary using merchant fixed rate */
export function toSecondary(amountBase: number, currency: StoreCurrency): number {
  if (!currency.rate || currency.rate <= 0) return amountBase;
  return amountBase / currency.rate;
}

export function formatMoney(amount: number, code: CurrencyCode, opts?: { compact?: boolean }): string {
  const meta = currencyMeta(code);
  const formatted = Number(amount).toLocaleString(undefined, {
    maximumFractionDigits: code === "SYP" ? 0 : 2,
    minimumFractionDigits: code === "SYP" ? 0 : amount % 1 === 0 ? 0 : 2,
  });
  if (code === "SYP") return `${formatted} ${meta.symbol}`;
  if (code === "USD" || code === "EUR") return `${meta.symbol}${formatted}`;
  return `${formatted} ${meta.symbol}`;
}

/** Display helper for UI based on merchant currency settings */
export function formatStorePrice(amountBase: number, currency: StoreCurrency): string {
  const { display_mode, base, secondary } = currency;
  if (display_mode === "convert" && base !== secondary) {
    return formatMoney(toSecondary(amountBase, currency), secondary);
  }
  if (display_mode === "dual" && base !== secondary) {
    return `${formatMoney(amountBase, base)} · ${formatMoney(toSecondary(amountBase, currency), secondary)}`;
  }
  return formatMoney(amountBase, base);
}
