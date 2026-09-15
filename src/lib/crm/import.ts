import { db } from '@/lib/db';

export interface ParsedContact {
  name: string;
  phone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  notes?: string;
}

/**
 * Sanitizes phone numbers to standard 10-digit mobile format for India.
 * E.g., "+91 98351 12345" or "09835112345" -> "9835112345"
 */
export function sanitizePhone(phone: string): string {
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
    const phone = sanitizePhone(rawPhone);

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

/**
 * Upserts a list of parsed contacts into db.customer for the specified shopId.
 */
export async function importDiaryContacts(
  shopId: string,
  contacts: ParsedContact[]
): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    try {
      await db.customer.upsert({
        where: {
          shopId_phone: {
            shopId,
            phone: contact.phone,
          },
        },
        create: {
          shopId,
          phone: contact.phone,
          name: contact.name,
          addressLine1: contact.addressLine1 || null,
          addressLine2: contact.addressLine2 || null,
          city: contact.city || null,
          pincode: contact.pincode || null,
          notes: contact.notes || null,
        },
        update: {
          name: contact.name,
          ...(contact.addressLine1 ? { addressLine1: contact.addressLine1 } : {}),
          ...(contact.city ? { city: contact.city } : {}),
          ...(contact.pincode ? { pincode: contact.pincode } : {}),
          ...(contact.notes ? { notes: contact.notes } : {}),
        },
      });
      count++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to import ${contact.name} (${contact.phone}): ${msg}`);
    }
  }

  return { count, errors };
}
