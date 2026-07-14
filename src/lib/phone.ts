/**
 * Formats a phone number for WhatsApp API usage.
 * - Removes spaces, dashes, parentheses, and + signs
 * - Converts Syrian local format (09xx) to international (9639xx)
 * - Strips leading 00 from international format
 * - Keeps all other international numbers as-is
 */
export function formatSyrianWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s\-\+\(\)]/g, "");
  cleaned = cleaned.replace(/[^0-9]/g, "");
  // Syrian local: starts with 09 → replace leading 0 with 963
  if (cleaned.startsWith("09")) {
    cleaned = "963" + cleaned.slice(1);
  }
  // If starts with 00, strip leading 00
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/** Deterministic auth email used for phone-only signup/login (must stay in sync). */
export function phoneToAuthEmail(phone: string): string {
  return `${formatSyrianWhatsApp(phone)}@syriabiz.local`;
}

/**
 * Validates a phone number.
 * Accepts:
 * - Syrian local: 09xxxxxxxx (10 digits)
 * - Syrian international: 9639xxxxxxxx (12 digits)
 * - Any international: +<country_code><number> (7-15 digits total after +)
 * - Any digits-only international: 7-15 digits
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // International with +: 7-15 digits after +
  if (/^\+\d{7,15}$/.test(cleaned)) return true;
  // Syrian local: 09xxxxxxxx
  if (/^09\d{8}$/.test(cleaned)) return true;
  // Syrian international: 9639xxxxxxxx
  if (/^9639\d{8}$/.test(cleaned)) return true;
  // Generic international without +: 7-15 digits
  if (/^\d{7,15}$/.test(cleaned)) return true;
  return false;
}

/** @deprecated Use isValidPhone instead */
export const isValidSyrianPhone = isValidPhone;
