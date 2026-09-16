import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateAgentRequest } from '@/lib/agent-auth.server';
import { enqueueNotification } from '@/lib/whatsapp-notifications.server';
import { formatEvolutionPhone } from '@/lib/phone';

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

  const { customerPhone, messageText, productId } = body || {};

  if (!customerPhone || typeof customerPhone !== 'string' || !customerPhone.trim()) {
    return NextResponse.json(
      { error: 'customerPhone is required' },
      { status: 400 }
    );
  }

  if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
    return NextResponse.json(
      { error: 'messageText is required' },
      { status: 400 }
    );
  }

  const phone = customerPhone.trim();
  const text = messageText.trim();

  const customer = await db.customer.upsert({
    where: {
      shopId_phone: {
        shopId: auth.shop.id,
        phone,
      },
    },
    update: {},
    create: {
      shopId: auth.shop.id,
      phone,
      name: 'Grahak',
    },
  });

  await db.outreachLog.create({
    data: {
      shopId: auth.shop.id,
      customerId: customer.id,
      messageText: text,
      channel: 'WHATSAPP',
    },
  });

  await enqueueNotification({
    shopId: auth.shop.id,
    type: 'MARKETING_OUTREACH',
    recipient: phone,
    payload: { message: text, productId },
    customerId: customer.id,
  });

  const formattedPhone = formatEvolutionPhone(phone) || phone.replace(/\D/g, '');
  const whatsappDeepLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;

  return NextResponse.json(
    {
      success: true,
      deliveryMethod: 'WHATSAPP',
      whatsappDeepLink,
    },
    { status: 200 }
  );
}
