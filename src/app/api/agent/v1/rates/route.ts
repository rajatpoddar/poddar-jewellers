import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateAgentRequest } from '@/lib/agent-auth.server';
import { rupeesToPaise } from '@/lib/money';
import { recomputeProductPrices } from '@/lib/price-cache.server';

export async function POST(request: Request) {
  const auth = await authenticateAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.rates) || body.rates.length === 0) {
    return NextResponse.json(
      { error: 'Invalid rates payload. Expected non-empty rates array.' },
      { status: 400 }
    );
  }

  const shopMetals = await db.metalType.findMany({
    where: { shopId: auth.shop.id, isActive: true },
  });
  const metalMap = new Map(shopMetals.map((m) => [m.key, m]));

  const lines: Array<{ metalTypeId: string; pricePerGramPaise: number }> = [];

  for (const item of body.rates) {
    if (!item || typeof item.metalKey !== 'string') continue;
    const metal = metalMap.get(item.metalKey);
    if (!metal) continue;

    let paise: number | null = null;
    if (typeof item.ratePerGramPaise === 'number' && Number.isFinite(item.ratePerGramPaise)) {
      paise = Math.round(item.ratePerGramPaise);
    } else if (typeof item.ratePerGramRupees === 'number' && Number.isFinite(item.ratePerGramRupees)) {
      paise = rupeesToPaise(item.ratePerGramRupees);
    }

    if (paise !== null && paise > 0) {
      lines.push({
        metalTypeId: metal.id,
        pricePerGramPaise: paise,
      });
    }
  }

  if (lines.length === 0) {
    return NextResponse.json(
      { error: 'No valid rate lines matched active shop metal types.' },
      { status: 400 }
    );
  }

  const rate = await db.rate.create({
    data: {
      shopId: auth.shop.id,
      enteredBy: auth.apiKey.name || 'Hermes Agent',
      lines: {
        create: lines,
      },
    },
  });

  await recomputeProductPrices(auth.shop.id);

  return NextResponse.json(
    {
      success: true,
      effectiveAt: rate.createdAt.toISOString(),
      ratesUpdatedCount: lines.length,
    },
    { status: 200 }
  );
}
