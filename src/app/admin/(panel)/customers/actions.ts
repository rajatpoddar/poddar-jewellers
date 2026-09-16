'use server';

import { revalidatePath } from 'next/cache';
import { getShop } from '@/lib/shop';
import { parseDiaryContacts } from '@/lib/crm/import';
import { importDiaryContacts } from '@/lib/crm/import.server';
import {
  assignTagToCustomer,
  removeTagFromCustomer,
  createCustomerTag,
} from '@/lib/crm.server';
import { getCurrentAdmin } from '@/auth/session';


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

export async function assignCustomerTagAction(customerId: string, tagId: string) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }
    await assignTagToCustomer(customerId, tagId);
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tag jodne me samasya aayi.';
    return { success: false, error: msg };
  }
}

export async function removeCustomerTagAction(customerId: string, tagId: string) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }
    await removeTagFromCustomer(customerId, tagId);
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tag hatane me samasya aayi.';
    return { success: false, error: msg };
  }
}

export async function createAndAssignTagAction(customerId: string, tagName: string) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }
    const cleanName = tagName.trim();
    if (!cleanName) {
      return { success: false, error: 'Tag ka naam khali nahi ho sakta.' };
    }
    const tag = await createCustomerTag(cleanName);
    await assignTagToCustomer(customerId, tag.id);
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${customerId}`);
    return {
      success: true,
      tag: { id: tag.id, name: tag.name, color: tag.color },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tag banane me samasya aayi.';
    return { success: false, error: msg };
  }
}

