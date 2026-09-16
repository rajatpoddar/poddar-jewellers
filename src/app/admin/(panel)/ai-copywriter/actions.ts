'use server';

import { getCurrentAdmin } from '@/auth/session';
import { enhanceCopy, type CopyContext } from '@/lib/ai-copywriter';

export async function rewriteCopyAction(text: string, context: CopyContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error('Unauthorized');
  }

  const enhancedText = enhanceCopy({ text, context });
  return { success: true, enhancedText };
}
