import { formatEvolutionPhone, normalizePhone } from '@/lib/phone';

export interface EvolutionShopConfig {
  evolutionApiUrl: string;
  evolutionApiKey?: string | null;
  evolutionInstance: string;
}

export interface SendOtpResult {
  success: boolean;
  fallback: boolean;
  error?: string;
}

export { normalizePhone };

/**
 * Legacy alias for formatEvolutionPhone to maintain backward compatibility.
 */
export function sanitizeIndianPhone(phone: string): string {
  return formatEvolutionPhone(phone);
}

/**
 * Builds the JSON payload for Evolution API sendText endpoint.
 */
export function buildEvolutionPayload(phone: string, text: string) {
  const number = formatEvolutionPhone(phone);
  return {
    number,
    text,
  };
}

/**
 * Sends a WhatsApp OTP to the specified phone number via Evolution API HTTP POST.
 * If the API call fails or the server is offline, logs to stdout as a dev fallback.
 */
export async function sendWhatsAppOtp(
  shop: EvolutionShopConfig,
  phone: string,
  otp: string
): Promise<SendOtpResult> {
  const formattedPhone = formatEvolutionPhone(phone);
  const message = `Aapka OTP hai ${otp}`;
  const payload = buildEvolutionPayload(formattedPhone, message);

  try {
    const url = `${shop.evolutionApiUrl.replace(/\/$/, '')}/message/sendText/${shop.evolutionInstance}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (shop.evolutionApiKey) {
      headers['apikey'] = shop.evolutionApiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Evolution API HTTP error ${response.status}`);
    }

    return { success: true, fallback: false };
  } catch {
    console.log(`[WhatsApp OTP Fallback] Phone: ${formattedPhone} OTP: ${otp}`);
    return { success: true, fallback: true };
  }
}
