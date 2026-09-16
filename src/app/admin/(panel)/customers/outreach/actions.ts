'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentAdmin } from '@/auth/session';
import {
  saveCampaignTemplate,
  deleteCampaignTemplate,
  logOutreachSent,
} from '@/lib/crm.server';

export async function saveCampaignTemplateAction(
  name: string,
  bodyText: string,
  id?: string
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }
    const cleanName = name.trim();
    const cleanBody = bodyText.trim();
    if (!cleanName) {
      return { success: false, error: 'Template ka naam khali nahi ho sakta.' };
    }
    if (!cleanBody) {
      return { success: false, error: 'Template ka body text khali nahi ho sakta.' };
    }

    const template = await saveCampaignTemplate(cleanName, cleanBody, id);
    revalidatePath('/admin/customers/outreach');
    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        bodyText: template.bodyText,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Template save karne me samasya aayi.';
    return { success: false, error: msg };
  }
}

export async function deleteCampaignTemplateAction(id: string) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }
    await deleteCampaignTemplate(id);
    revalidatePath('/admin/customers/outreach');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Template delete karne me samasya aayi.';
    return { success: false, error: msg };
  }
}

export async function logOutreachSentAction(
  customerId: string,
  templateId: string | null,
  messageText: string
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized' };
    }
    const log = await logOutreachSent(customerId, templateId, messageText);
    revalidatePath('/admin/customers/outreach');
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: true, logId: log.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Outreach log save karne me samasya aayi.';
    return { success: false, error: msg };
  }
}
