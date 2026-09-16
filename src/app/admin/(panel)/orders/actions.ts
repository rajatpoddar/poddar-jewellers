'use server';

import { getCurrentAdmin } from '@/auth/session';
import { resendNotification } from '@/lib/whatsapp-notifications.server';
import { revalidatePath } from 'next/cache';

export async function resendNotificationAction(
  queueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!queueId) {
      return { success: false, error: 'Queue ID aavashyak hai.' };
    }

    await resendNotification(queueId);
    revalidatePath('/admin/orders');
    return { success: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Notification resend fail ho gaya.';
    return { success: false, error: msg };
  }
}
