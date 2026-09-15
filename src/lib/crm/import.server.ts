import { db } from '@/lib/db';
import type { ParsedContact } from './import';

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
