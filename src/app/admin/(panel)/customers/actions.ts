'use server';

import { revalidatePath } from 'next/cache';
import { getShop } from '@/lib/shop';
import { parseDiaryContacts } from '@/lib/crm/import';
import { importDiaryContacts } from '@/lib/crm/import.server';

export async function importContactsAction(rawText: string) {
  try {
    const shop = await getShop();
    const contacts = parseDiaryContacts(rawText);

    if (contacts.length === 0) {
      return { success: false, error: 'Koi valid contact nahi mila. Format: Name, Phone, Address' };
    }

    const result = await importDiaryContacts(shop.id, contacts);

    revalidatePath('/admin/customers');
    return {
      success: true,
      count: result.count,
      errors: result.errors,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Import me samasya aayi.';
    return { success: false, error: msg };
  }
}
