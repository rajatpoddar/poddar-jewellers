import { normalizePhone } from '@/lib/phone';

export interface ParsedContact {
  name: string;
  phone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  notes?: string;
}

export function sanitizePhone(phone: string): string {
  return normalizePhone(phone);
}

/**
 * Parses raw multi-line diary/CSV text into structured ParsedContact objects.
 * Format: Name, Phone, AddressLine1, City, Pincode
 */
export function parseDiaryContacts(rawText: string): ParsedContact[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const results: ParsedContact[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length < 2) continue;

    const name = parts[0];
    const rawPhone = parts[1];
    const phone = normalizePhone(rawPhone);

    if (!name || !phone) continue;

    const addressLine1: string | undefined = parts[2] || undefined;
    let city: string | undefined = undefined;
    let pincode: string | undefined = undefined;
    let notes: string | undefined = undefined;

    if (parts.length > 3) {
      const remaining = parts.slice(3);
      for (const part of remaining) {
        if (!part) continue;
        if (/^\d{6}$/.test(part)) {
          pincode = part;
        } else if (!city) {
          city = part;
        } else if (!notes) {
          notes = part;
        } else {
          notes += `, ${part}`;
        }
      }
    }

    results.push({
      name,
      phone,
      ...(addressLine1 ? { addressLine1 } : {}),
      ...(city ? { city } : {}),
      ...(pincode ? { pincode } : {}),
      ...(notes ? { notes } : {}),
    });
  }

  return results;
}
