'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { generateApiKey, deleteApiKey } from '@/lib/agent-auth.server';

export interface CreateApiKeyResult {
  success: boolean;
  rawKey?: string;
  error?: string;
}

export interface DeleteApiKeyResult {
  success: boolean;
  error?: string;
}

export async function createApiKeyAction(name: string): Promise<CreateApiKeyResult> {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }

    const cleanName = name?.trim();
    if (!cleanName) {
      return { success: false, error: 'API Key ka naam zaroori hai.' };
    }

    const shop = await getShop();
    const { rawKey } = await generateApiKey(shop.id, cleanName);

    revalidatePath('/admin/api-keys');

    return {
      success: true,
      rawKey,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'API Key banane me samasya aayi.';
    return { success: false, error: msg };
  }
}

export async function deleteApiKeyAction(id: string): Promise<DeleteApiKeyResult> {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!id) {
      return { success: false, error: 'Invalid key ID' };
    }

    await deleteApiKey(id);
    revalidatePath('/admin/api-keys');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'API Key revoke karne me samasya aayi.';
    return { success: false, error: msg };
  }
}
