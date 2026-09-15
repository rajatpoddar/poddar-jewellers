/**
 * Normalizes any Indian phone number into a standard 10-digit string (e.g. "9876543210").
 * Strips all non-digit characters, leading +91, 91, or leading 0.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Formats a phone number for Evolution API REST requests (91XXXXXXXXXX).
 */
export function formatEvolutionPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return normalized ? `91${normalized}` : '';
}
