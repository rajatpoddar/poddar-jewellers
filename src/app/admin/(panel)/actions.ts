'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { rupeesToPaise } from '@/lib/money';
import { getShop, getMetalTypes } from '@/lib/shop';
import { getCurrentAdmin } from '@/auth/session';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

export type SaveRateState = { error?: string; savedAt?: string };

export async function saveRate(_prev: SaveRateState, formData: FormData): Promise<SaveRateState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: 'Session khatam ho gaya. Dobara login kariye.' };

  const shop = await getShop();
  const metals = await getMetalTypes();
  if (metals.length === 0) {
    return { error: 'Pehle Metal types me kam se kam ek metal jodiye.' };
  }

  // One field per metal type, so adding a metal type needs no change here.
  const lines: Array<{ metalTypeId: string; pricePerGramPaise: number }> = [];
  for (const metal of metals) {
    const raw = String(formData.get(`rate_${metal.id}`) ?? '').trim();
    const rupees = Number(raw);

    if (raw === '' || !Number.isFinite(rupees) || rupees <= 0 || rupees > 1_000_000) {
      return { error: `${metal.label} ka rate sahi number me bhariye.` };
    }
    lines.push({ metalTypeId: metal.id, pricePerGramPaise: rupeesToPaise(rupees) });
  }

  await db.rate.create({
    data: { shopId: shop.id, enteredBy: admin.name, lines: { create: lines } },
  });

  await recomputeAllPriceCaches();
  revalidatePath('/', 'layout');

  return { savedAt: new Date().toISOString() };
}
