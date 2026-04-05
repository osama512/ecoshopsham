/**
 * Formats a Syrian phone number for WhatsApp API usage.
 * - Removes spaces, dashes, and + signs
 * - Converts local format (09xx) to international (96309xx → 9639xx)
 * - Keeps numbers already starting with 963
 */
export function formatSyrianWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s\-\+]/g, "");
  // Remove any remaining non-digit chars
  cleaned = cleaned.replace(/[^0-9]/g, "");
  // Syrian local: starts with 09 → replace leading 0 with 963
  if (cleaned.startsWith("09")) {
    cleaned = "963" + cleaned.slice(1);
  }
  // If starts with 00963, strip leading 00
  if (cleaned.startsWith("00963")) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Validates a Syrian phone number (accepts 09xxxxxxxx or 963xxxxxxxxx).
 */
export function isValidSyrianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  // 10-digit local: 09xxxxxxxx
  if (/^09\d{8}$/.test(cleaned)) return true;
  // International: 963 9x xxxx xxxx
  if (/^9639\d{8}$/.test(cleaned)) return true;
  return false;
}
