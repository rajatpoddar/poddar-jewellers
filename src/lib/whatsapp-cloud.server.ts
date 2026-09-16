export interface MetaCloudMessageOptions {
  recipientPhone: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

export function formatMetaCloudPayload(options: MetaCloudMessageOptions) {
  const { recipientPhone, templateName, languageCode = 'hi', parameters = [] } = options;

  const cleanedPhone = recipientPhone.replace(/\D/g, '');
  const to = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: parameters.map((param) => ({
            type: 'text',
            text: param,
          })),
        },
      ],
    },
  };
}

export async function sendMetaCloudTemplateMessage(
  options: MetaCloudMessageOptions & { phoneNumberId: string; accessToken: string }
) {
  if (!options.phoneNumberId || !options.accessToken) {
    throw new Error('Missing Meta Cloud API credentials (phoneNumberId or accessToken)');
  }

  const url = `https://graph.facebook.com/v19.0/${options.phoneNumberId}/messages`;
  const body = formatMetaCloudPayload(options);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Meta API error (${res.status}): ${JSON.stringify(errorData)}`);
  }

  return await res.json();
}
